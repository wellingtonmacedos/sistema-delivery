const EmbeddedPostgres = require('embedded-postgres').default

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: '.pgdata',
    user: 'postgres',
    password: 'postgres',
    port: 5433,
    persistent: true
  })
  await pg.initialise()
  await pg.start()
  // keep process alive
  console.log('Postgres iniciado em localhost:5433 (usuario=postgres, senha=postgres)')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
