const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const Joi = require('joi')
const validator = require('express-joi-validation')({passError: true})
const expressRequestId = require('express-request-id')

const Logger = require('./Logger')
const todoStore = require('./TodoStore')('./todos.db')

const app = express()
const port = process.env.PORT || 3001

const todoSchema = Joi.object({
  text: Joi.string().min(1).max(255).required(),
  active: Joi.boolean().required()
})
const todoIdSchema = Joi.object({
  id: Joi.number().integer().min(0).required()
})

const send = (res, json, status = 200) => {
  res.logger.log(`${status} ${JSON.stringify(json)}`)
  res.status(status).json(json)
}

app.use(expressRequestId())
app.use(bodyParser.json())
app.use(cors())

app.use((req, res, next) => {
  req.logger = res.logger = new Logger(req.id)
  req.logger.log(`${req.method} ${req.originalUrl} body=${JSON.stringify(req.body)}`)
  next()
})

app.get('/', (req, res) => {
  res.json({resources: ['/todos']})
})

// list todos
app.get('/todos', (req, res, next) => {
  todoStore.getTodos(req.logger)
    .then(todos => {
      send(res, {todos})
    })
    .catch(next)
})

// update todo
app.put('/todos/:id', validator.body(todoSchema), (req, res, next) => {
  //validator.params(todoIdSchema)
  const todo = req.body
  const id = todo.id = req.params.id
  todoStore.updateTodo(req.logger, todo)
    .then(updated => {
      send(res, {id, updated})
    })
    .catch(next)
})


// add todo
app.post('/todos', validator.body(todoSchema), (req, res, next) => {
  const todo = {
    text: req.body.text,
    active: req.body.active !== false
  }
  todoStore.addTodo(req.logger, todo)
    .then(todo => {
      send(res, {todo})
    })
    .catch(next)
})

// delete todo
app.delete('/todos/:id', validator.params(todoIdSchema), (req, res, next) => {
  const id = req.params.id
  todoStore.deleteTodo(req.logger, id)
    .then(deleted => {
      send(res, {id, deleted})
    })
    .catch(next)
})

// anything else is a 404
app.use((req, res, next) => {
  send(res, {
    code: 404,
    error: 'Not found'
  }, 404)
})

// validation error handler
app.use((err, req, res, next) => {
  if (err.error && err.error.isJoi) {
    send(res, {
      code: 400,
      location: err.type,
      error: err.error.toString()
    }, 400)
  } else {
    next(err)
  }
})

// generic error handler
app.use((err, req, res, next) => {
  res.logger.error(err)
  send(res, {
    code: 500,
    error: err.toString()
  }, 500)
})

app.listen(port)

new Logger().log(`Server started on port: ${port}`)

