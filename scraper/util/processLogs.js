

module.exports = function (logType, log) {
  return new Promise((resolve, revert) => {
    console.log(logType)
    console.log(log)
    resolve()
  })
}
