var {address, logTypes, provider} = require('./util/ethers.js');
var processLogs = require('./util/processLogs.js');



logTypes.forEach((logType) => {
  provider.on(logType.topics, (log) => {
    var logFill = logType.parse(log.topics, log.data);

    processLogs(logType, logFill).then((errors) => {
      console.log(logType);
      console.log('Non-critical error(s)(?):', errors);
    }).catch((err) => {
      console.error('CRITICAL ERROR:\n', err);
    });
  });
  console.log('Listening for ' + logType.topics + ' events.');

})


