const express = require('express')


function createHandlers ({ queries }) {
    function trades (request, response) {
      return queries
        .loadTrades()
        .then(tradeData => response.json(tradeData))
        .catch(error=>{
            console.log('error retrieving trades ', error.message)
            response.json({error:"unable retrieve trades"})
        })
    }
  
    return {
      trades
    }
  }

  function createQueries ({ db }) {
    function loadTrades () {
      return db.then(client =>
        client('trades')
          .where( 'date', '>=', new Date().toISOString().slice(0,10))
      )
    }
  
    return {
      loadTrades
    }
  }


function createTrades({db}) {
    const queries = createQueries({ db })
    const handlers = createHandlers({ queries })
  
    const router = express.Router()
  
    router.route('/').get(handlers.trades)
  
    return { handlers, queries, router }


}

module.exports = createTrades