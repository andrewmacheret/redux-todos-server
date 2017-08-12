const sqlite = require('sqlite')

class TodoStore {
  constructor(file = ':memory:') {
    this.file = file
  }

  async open(logger) {
    if (this.db) {
      return
    }

    logger.log('Opening sqlite database:', this.file)
    this.db = await sqlite.open(this.file, { Promise })
    
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS todo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT,
        active BOOLEAN
      )
    `)
  }

  async close(logger) {
    await this.db.close()
    this.db = null
  }

  async addTodo(logger, {text, active}) {
    await this.open(logger)
    
    const statement = await this.db.prepare('INSERT INTO todo (text, active) VALUES (?, ?)')
    statement.run(text, active)
    await statement.finalize()

    const {id} = await this.db.get('SELECT last_insert_rowid() as id')
    return {id, text, active}
  }

  async updateTodo(logger, {id, text, active}) {
    await this.open(logger)
    
    const statement = await this.db.prepare('UPDATE todo SET (text, active) = (?, ?) where id = ?')
    statement.run(text, active, id)
    await statement.finalize()

    const {updated} = await this.db.get('SELECT changes() as updated')
    if (updated === 0) {
      throw `Failed to update todo with id=${id}`
    }

    return updated
  }

  async deleteTodo(logger, id) {
    await this.open(logger)

    const statement = await this.db.prepare('DELETE from todo where id = ?')
    statement.run(id)
    await statement.finalize()

    const {deleted} = await this.db.get('SELECT changes() as deleted')
    if (deleted === 0) {
      throw `Failed to delete todo with id=${id}`
    }
    return deleted
  }

  async getTodos(logger) {
    await this.open(logger)
    
    const todos = await this.db.all('SELECT rowid AS id, text, active FROM todo')
    return todos.map(todo =>
      ({ id: todo.id, text: todo.text, active: todo.active === 1 })
    )
  }
}

module.exports = (...args) => new TodoStore(...args)
