const knex = require('knex')

function createKnexClient({connectionString, migrationsTableName}) {
    const client = knex(connectionString)
    const migrationOptions = {
        tableName: migrationsTableName || 'knex_migrations'
    }

    return Promise.resolve(client.migrate.latest(migrationOptions))
                .then(() => client)

}

module.exports = createKnexClient