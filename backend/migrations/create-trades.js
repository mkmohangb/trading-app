exports.up = knex => 
    knex.schema.createTable('trades', table => {
        table.string('trade_id').primary()
        table.timestamp('date')
        table.json('orders').defaultsTo('{}')
    })

exports.down = knex => knex.schema.dropTable('trades')

