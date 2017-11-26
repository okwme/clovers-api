r = require('rethinkdb');
xss = require('xss');

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


var {
  abi,
  address,
  genesisBlock,
  provider,
  iface,
  logTypes
} = require('../../scraper/util/ethers.js');

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
        logs.map((l) => l.name = logType.name)
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
        let event = abi.find((a) => a.name === 'newCloverName')
        let names = event.inputs.map((o) => o.name)
        let types = event.inputs.map((o) => o.type)
        result.forEach((log) => {
          let decoded = iface.decodeParams(names, types, log.data)

          let cloverKey = clovernames.findIndex((clover) => clover.board === decoded.board)
          if (cloverKey > -1) {
            let clover = clovernames[cloverKey]
            clover.name = xss(decoded.name)
            clovernames.splice(cloverKey, 1, clover)
          } else {
            clovernames.push({board: decoded.board, name: xss(decoded.name)})
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
        let event = abi.find((a) => a.name === 'newUserName')
        let names = event.inputs.map((o) => o.name)
        let types = event.inputs.map((o) => o.type)
        result.forEach((log) => {
          let decoded = iface.decodeParams(names, types, log.data)

          let userKey = usernames.findIndex((user) => user.address === decoded.player)
          if (userKey > -1) {
            let username = usernames[userKey]
            username.name = xss(decoded.name)
            usernames.splice(userKey, 1, username)
          } else {
            usernames.push({address: decoded.player, name: xss(decoded.name)})
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
        let event = abi.find((a) => a.name === 'Registered')
        let names = event.inputs.map((o) => o.name)
        let types = event.inputs.map((o) => o.type)
        result.forEach((log) => {
          let decoded = iface.decodeParams(names, types, log.data)
          let clovername = clovernames.find((cn) => cn.board === decoded.board) || {name: decoded.board}
          if (decoded.newBoard) {
            clovers.push({
              name: clovername.name,
              board: decoded.board,
              first32Moves: decoded.first32Moves,
              lastMoves: decoded.lastMoves,
              lastPaidAmount: decoded.lastPaidAmount.toString(),
              previousOwners: [decoded.newOwner],
              created: decoded.modified.toString(),
              modified: decoded.modified.toString(),
              findersFee: decoded.findersFee.toString()
            })
          } else {
            let cloverKey = clovers.findIndex((c) => c.board === decoded.board)
            if (cloverKey > -1) {
              let clover = clovers[cloverKey]
              clover.modified = decoded.modified.toString()
              clover.lastPaidAmount = decoded.lastPaidAmount.toString()
              clover.previousOwners.push(decoded.newOwner)
              clovers.splice(cloverKey, 1, clover)
            } else {
              console.log(decoded.board)
              console.log(clovers.map((cl) => cl.board))
              console.error('Registered Event for board not yet in array', e)
              reject('Registered Event for board not yet in array')
            }
          }

          let userKey = users.findIndex((u) => u.address === decoded.newOwner)
          if (userKey > -1) {
            let user = users[userKey]
            user.clovers.push(decoded.board)
            users.splice(userKey, 1, user)
          } else {
            let username = usernames.find((un) => un.address === decoded.newOwner) || {name: decoded.newOwner}
            users.push({
              name: username.name,
              address: decoded.newOwner,
              clovers: [decoded.board]
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
