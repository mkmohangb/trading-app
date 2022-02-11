const express = require('express')
const cors = require("cors")
const {v4:uuid} = require('uuid')
const login = require('../login')
const spot = require('../spot')


function updateRequestContext(req, res, next) {
    req.context = {
        traceId: uuid()
    }
    next()
}

function createExpressApp(config) {
    const app = express()
    app.use(express.json())
    app.use(cors())
    app.use(updateRequestContext)
    app.use('/login', login)
    app.use('/spot', spot)
    app.use('/atmStraddle', config.straddleApp.router)
    return app
}

module.exports = createExpressApp