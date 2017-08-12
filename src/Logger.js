class Logger {
  constructor(id = '__default__') {
    this.id = id
  }

  log(...args) {
    this._output(console.log, ...args)
  }

  error(...args) {
    this._output(console.error, ...args)
  }
  
  _output(consoleMethod, ...args) {
    consoleMethod(`${new Date().toISOString()} [${this.id}]`, ...args)
  }
}

module.exports = Logger
