const { Client } = require('pg');
const client = new Client({ user: 'postgres', host: 'localhost', database: 'viora_elite', password: 'venky2319@', port: 5432 });
client.connect()
  .then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'event_admin_assignments'"))
  .then(res => { console.log(res.rows); client.end(); })
  .catch(console.error);
