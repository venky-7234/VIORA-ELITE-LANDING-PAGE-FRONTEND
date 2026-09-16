const { Client } = require('pg');
const client = new Client({ user: 'postgres', host: 'localhost', database: 'viora_elite', password: 'venky2319@', port: 5432 });
client.connect()
  .then(() => client.query("INSERT INTO event_admin_assignments(event_id,admin_id,assigned_by,status) VALUES(3,4,1,'ACTIVE')"))
  .then(res => { console.log('success'); client.end(); })
  .catch(console.error);
