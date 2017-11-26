var async = require('async-bluebird');
var processLogs = require('./util/processLogs.js');

var {
  address,
  genesisBlock,
  provider,
  logTypes
} = require('./util/ethers.js');


var error_logs = {};

var success_count = 0;


function printErrorLogs() {
  console.log('Non-critical errors:');
  for (var error in error_logs) {
    console.log('\t'+error);
  }
}

function getLog(key = 0) {
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
      }).then((logs) => {
        return async.each(logs, (log, callback) => {
          processLogs(logType, logs).then((errors) => {
            Object.assign(error_logs, errors);
            success_count++;
            callback();
          }).catch(callback);
        });
      }).then(() => {
        return getLog(key + 1).then(resolve).catch(reject)
      })
    }
  })
}

getLog().then(() => {
  printErrorLogs();
  console.log('Got', success_count, 'logs');
  process.exit();
}).catch((err) => {
  printErrorLogs();
  console.error('CRITICAL ERROR:\n', err);
  process.exit(1);
});

