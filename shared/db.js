
r = require('rethinkdb');
var config = require('./config.js');

var connection = null;

try {
  r.connect( {host: 'localhost', port: 28015}, function(err, conn) {
    if (err) throw err;
    connection = conn;
  })
  console.log('connection');
} catch (err) {
  console.log('connection failed');
  console.error(err)
}




module.exports.connection = connection
