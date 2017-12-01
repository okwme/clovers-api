var Promise = require('bluebird');
r = require('rethinkdb');
xss = require('xss');

var {
  abi,
  bigNumberify,
  address,
  genesisBlock,
  provider,
  iface,
  logTypes
} = require('../../scraper/util/ethers.js');

var {processLog} = require('../../scraper/util/processLogs.js')

var connection = null;
let usernames = []
let clovernames = []

try {
  r.connect( {host: 'localhost', port: 28015}, function(err, conn) {
    if (err) throw new Error(err);
    connection = conn;
    rebuildDatabases()
  })
  console.log('connection');
} catch (err) {
  console.log('connection failed');
  console.error(err)
}

function rebuildDatabases() {
  console.log('rebuildDatabases')
  createDB()
  .then(createTables)
  .then(populateLogs)
  .then(nameClovers)
  .then(nameUsers)
  .then(populateClovers)
  .then((res) => {
    console.log('done!')
    process.exit()
  })
  .catch((err) => {
    console.log(err)
  })
}
function createDB () {
  console.log('createDB')
  return new Promise((resolve, reject) => {
    r.dbList().run(connection, (err, res) => {
      if (err) throw new Error(err)
      if (res.findIndex((a) => a === 'clovers') > -1) {
        console.log('dbDrop clovers')
        r.dbDrop('clovers').run(connection, (err, res) => {
          if (err) throw new Error(err)
          createDB().then(resolve)
        })
      } else {
        console.log('dbCreate clovers')
        r.dbCreate('clovers').run(connection, (err, res) => {
          if (err) throw new Error(err)
          resolve()
        })
      }
    })
  })
}
const tables = [
  {
    name: 'clovers',
    index: 'board'
  }, {
    name: 'users',
    index: 'address'
  }, {
    name: 'chats',
    index: 'id'
  }, {
    name: 'logs',
    index: 'transactionHash'
  }]

function createTables (i = 0) {
  console.log('createTables')
  return new Promise((resolve, reject) => {
    if (i >= tables.length) {
      resolve()
    } else {

      let table = tables[i]
      console.log('tableCreate ' + table.name)
      r.db('clovers')
      .tableCreate(table.name, {primaryKey: table.index})
      .run(connection, (err, result) => {
        if (err) throw new Error(err)
        createTables(i + 1).then(() => {
          resolve()
        })
      })
    }
  })
}

let currBlock = null

function populateLogs () {
  console.log('populateLogs')
  return new Promise((resolve, reject) => {
    provider.getBlockNumber().then((blockNumber) => {
      currBlock = blockNumber
      console.log("Current block number: " + blockNumber);
      populateLog().then(resolve).catch(reject)
    });
  })
}

function populateLog (key = 0) {
  console.log('populateLog')
  return new Promise((resolve, reject) => {
    if (key >= logTypes.length) {
      resolve()
    } else {
      const logType = logTypes[key]
      provider.getLogs({
        address: address,
        topics: logType.topics,
        fromBlock: genesisBlock,
        toBlock: 'latest'
      }).then((logs, error) => {
        let event = abi.find((a) => a.name === logType.name)
        let names = event.inputs.map((o) => o.name)
        let types = event.inputs.map((o) => o.type)

        logs.map((l) => {
          let decoded = iface.decodeParams(names, types, l.data)
          l.data = decoded
          if (logType.name === 'Registered') {
            l.data.lastPaidAmount = l.data.lastPaidAmount.toString()
            l.data.created = l.data.modified.toString()
            l.data.modified = l.data.modified.toString()
            l.data.findersFee = l.data.findersFee.toString()
          }
          l.name = logType.name
          return l
        })
        console.log(logType.name + ': ' + logs.length + ' logs')
        return r.db('clovers').table('logs').insert(logs).run(connection, (err, results) => {
          if (err) throw new Error(err)
          return populateLog(key + 1).then(resolve).catch(reject)
        })
      })
    }
  })
}

function nameClovers () {
  console.log('nameClovers')
  return new Promise ((resolve, reject) => {
    r.db('clovers').table('logs').filter({name: "newCloverName"}).orderBy('blockNumber').run(connection, (err, cursor) => {
      if (err) throw new Error(err)
      cursor.toArray((err, result) => {
        if (err) throw new Error(err)
        result.forEach((log) => {
          let cloverKey = clovernames.findIndex((clover) => clover.board === log.data.board)
          if (cloverKey > -1) {
            let clover = clovernames[cloverKey]
            clover.name = xss(log.data.name)
            clovernames.splice(cloverKey, 1, clover)
          } else {
            clovernames.push({board: log.data.board, name: xss(log.data.name)})
          }
        })
        console.log(clovernames.length + ' clovernames')
        resolve()
      })
    })
  })
}


function nameUsers () {
  console.log('nameUsers')
  return new Promise ((resolve, reject) => {
    r.db('clovers').table('logs').filter({name: "newUserName"}).orderBy('blockNumber').run(connection, (err, cursor) => {
      if (err) throw new Error(err)
      cursor.toArray((err, result) => {
        if (err) throw new Error(err)
        result.forEach((log) => {
          let userKey = usernames.findIndex((user) => user.address === log.data.player)
          if (userKey > -1) {
            let username = usernames[userKey]
            username.name = xss(log.data.name)
            usernames.splice(userKey, 1, username)
          } else {
            usernames.push({address: log.data.player, name: xss(log.data.name)})
          }
        })
        console.log(usernames.length + ' usernames')
        resolve()
      })
    })
  })
}

function populateClovers () {
  console.log('populateClovers')
  return new Promise((resolve, reject) => {
    r.db('clovers').table('logs').filter({name: "Registered"}).orderBy('blockNumber').run(connection, (err, cursor) => {
      if (err) throw new Error(err);
      cursor.toArray((err, result) => {
        if (err) throw new Error(err);
        let clovers = []
        let users = []
        result.forEach((log) => {
          let clovername = clovernames.find((cn) => cn.board === log.data.board) || {name: log.data.board}
          if (log.data.newBoard) {
            clovers.push({
              name: clovername.name,
              board: log.data.board,
              first32Moves: log.data.first32Moves,
              lastMoves: log.data.lastMoves,
              lastPaidAmount: log.data.lastPaidAmount,
              previousOwners: [log.data.newOwner],
              created: log.data.modified,
              modified: log.data.modified,
              findersFee: log.data.findersFee
            })
          } else {
            let cloverKey = clovers.findIndex((c) => c.board === log.data.board)
            if (cloverKey > -1) {
              let clover = clovers[cloverKey]
              clover.modified = log.data.modified
              clover.lastPaidAmount = log.data.lastPaidAmount
              clover.previousOwners.push(log.data.newOwner)
              clovers.splice(cloverKey, 1, clover)
            } else {
              console.log(log.data.board)
              console.log(clovers.map((cl) => cl.board))
              console.error('Registered Event for board not yet in array', e)
              reject('Registered Event for board not yet in array')
            }
          }

          let userKey = users.findIndex((u) => u.address === log.data.newOwner)
          if (userKey > -1) {
            let user = users[userKey]
            user.clovers.push(log.data.board)
            users.splice(userKey, 1, user)
          } else {
            let username = usernames.find((un) => un.address === log.data.newOwner) || {name: log.data.newOwner}
            users.push({
              name: username.name,
              address: log.data.newOwner,
              clovers: [log.data.board]
            })
          }

        })
        return r.db('clovers').table('clovers').insert(clovers).run(connection, (err, results) => {
          if (err) throw new Error(err)
          console.log(clovers.length + ' clovers')
          return r.db('clovers').table('users').insert(users).run(connection, (err, results) => {
            if (err) throw new Error(err)
            console.log(users.length + ' users')
            return resolve()
          })
        })
      })
    })
  })
}
