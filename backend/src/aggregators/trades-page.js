function createHandlers({queries}) {
    return {
        Placed: event => queries.updateTrades(event.metadata.traceId, event.data)
    }
}

function createQueries({db}) {
    function updateTrades(trade_id, trade_data) {
          const queryString = `
            INSERT INTO
              trades(trade_id, date, orders)
            VALUES
              (:trade_id, :date, :trade_data)
            ON CONFLICT DO NOTHING
          `
          //console.log("db is ", db, db.query)
          return db.then(client => client.raw(queryString, {trade_id, date:new Date().toISOString(), trade_data}))
    }

    return {updateTrades}

}

function build({db, messageStore}) {
    const queries = createQueries({db})
    const handlers = createHandlers({queries})
    const subscription = messageStore.createSubscription({
        streamName: 'order',
        handlers,
        subscriberId: 'aggregators:trade-page'
    })

    function start() {
        subscription.start()
    }

    function stop() {
        subscription.stop()
    }

    return {
        start, 
        stop
    }

}

module.exports = build