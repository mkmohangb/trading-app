const express = require('express')
const router = express.Router()
const broker = require('../broker')


router.get('/', (request, response) => {
    response.send("<h1>Hello from Node</h1>")
})

router.get("/url", (request, response) => {
    response.json({sessionValid: broker.isKiteSessionValid(),
                   url: broker.getKiteInstance().getLoginURL()})
})

router.post("/token", async (request, response) => {
    const body = request.body
    if (!body.requestToken) {
        return response.status(400).json({error: "token missing" })
    }
    try {
        await broker.initKiteInstance(body.requestToken)
        response.status(200).end()
    } catch (error) {
        console.log("error initializing kite ", error)
        response.status(500).end()
    }
})

module.exports = router

