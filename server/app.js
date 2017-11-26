// var bodyParser = require('body-parser');
// var cors = require('cors');
// var CronJob = require('cron').CronJob;
// var express = require('express');
// var fs = require('fs');
// var http = require('http');


// var app = express();


// app.use(bodyParser.json()); // for parsing application/json
// app.use(cors());


// API Router

// app.use('/', require('./router.js'));

// app.use(function (req, res) {
//   res.send({ msg: "hello" });
// });

// Configure server and start listening.
// app.listen(3000, function() {
//   console.log('HTTP Express server listening on port 3000.');
// });
// const server = http.createServer(app);

// try {
//   https.createServer({
//     key: fs.readFileSync('privkey.pem'),
//     cert: fs.readFileSync('fullchain.pem')
//   }, app).listen(3001);
//   console.log('HTTPS Express server listening on port 3001.');
// } catch (err) {
//   console.warn('HTTPS server failed.');
// }

// require('../scraper/scraper.js');
// new CronJob({
//   cronTime: '00 */5 * * * *',
//   onTick: require('./scripts/purgeExpiredOrders.js'),
//   start: true
// });
r = require('rethinkdb');
var connection = null;
xss = require('xss')

var {
  abi,
  bigNumberify,
  address,
  genesisBlock,
  provider,
  iface,
  logTypes
} = require('../scraper/util/ethers.js');
console.log('hello world')


var io = require('socket.io')(3333);





// const express = require('express');
// const http = require('http');
// const url = require('url');
// const WebSocketServer = require('ws').Server;
// const cors = require('cors');

// const app = express();
// app.use(cors());

// app.use(function (req, res) {
//   console.log('request')
//   res.send({ msg: "hello" });
// });

// const server = http.createServer(app);
// const wss = new WebSocket.WebSocketServer({ server });
// const wss = new WebSocketServer({ port: 3333 });

// wss.on('connection', function connection(ws, req) {
//   const location = url.parse(req.url, true);
//   // You might use location.query.access_token to authenticate or share sessions
//   // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

//   ws.on('message', function incoming(message) {
//     console.log('received: %s', message);
//   });

//   ws.send('something');
// });

// server.listen(3333, function listening() {
//   console.log('Listening on %d', server.address().port);
// });








// const WebSocket = require('ws');

// const wss = new WebSocket.Server({ port: 3333 });

// var Server = require('simple-websocket/server')
 
// var server = new Server({ port: 3333 }) // see `ws` docs for other options



let key = 0 // newUserName
provider.on(logTypes[key].topics, (log) => {
  console.log('got a log')
  console.log(log)
  try {
    let event = abi.find((a) => a.name === logTypes[key].name)
    let names = event.inputs.map((o) => o.name)
    let types = event.inputs.map((o) => o.type)
    let decoded = iface.decodeParams(names, types, log.data)
    log.data = decoded
    log.name = logTypes[key].name

    r.db('clovers').table('logs').insert(log).run(connection, (err, results) => {
      if (err) throw new Error(err)
    })

    let name = xss(log.data.name)
    r.db('clovers').table('users').get(log.data.player).update({name}).run(connection, (err, user) => {
      if (err) throw new Error(err)
    })
    // console.log(server)
    // server.clients.forEach((client) => {
    //   console.log(client.readyState)
    //   client.send(JSON.stringify({type: 'newUserName', log}))
    // })
    console.log('newUserName Log');
  } catch(err) {
    console.log('didnt work')
    console.error(err)
  }
});
// provider.on(logTypes[1], (log) => {
//   socket.send(JSON.stringify({type: 'newCloverName', log}))
//   console.log('newCloverName Log');
// });
// provider.on(logTypes[2], (log) => {
//   socket.send(JSON.stringify({type: 'Registered', log}))
//   console.log('Registered Log');
// });

// provider.getLogs({
//   address: address,
//   topics: logType.topics,
//   fromBlock: genesisBlock,
//   toBlock: 'latest'
// }).then((logs, error) => {





var connections = 0
wss.on('connection', function (socket, req) {
  const location = url.parse(req.url, true)

  connections += 1
  console.log('opened, now ' + connections + ' connections')

  try {
    r.connect( {host: 'localhost', port: 28015}, function(err, conn) {
      console.log('db connection');
      if (err) throw new Error(err);
      connection = conn;
      r.db('clovers').table('clovers').run(connection, (err, clovers_) => {
        if (err) throw new Error(err)
        // console.log(cursor)
        clovers_.toArray((err, clovers) => {
          r.db('clovers').table('users').run(connection, (err, users_) => {
            if (err) throw new Error(err)
            // console.log(cursor)
            users_.toArray((err, users) => {
              r.db('clovers').table('logs').run(connection, (err, logs_) => {
                if (err) throw new Error(err)
                // console.log(cursor)
                logs_.toArray((err, logs) => {
                  socket.send(JSON.stringify({type: 'init', clovers, users, logs}))
                })
              })
            })
          })
        })
      })
    })
  } catch (err) {
    console.log('db connection failed');
    console.error(err)
  }

  socket.on('data', function (data) {
    console.log(data)
  })
  socket.on('close', function () {
    connections -= 1
    console.log('closed, now ' + connections + ' connections')
  })
  socket.on('error', function (err) {
    console.log('error')
  })
})

function sendDB (socket) {
  
}
 
