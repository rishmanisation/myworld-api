import { pool } from './pool';


class Model {
  constructor(table) {
    this.pool = pool
    this.table = table;
    this.pool.on('error', (err, client) => `Error, ${err}, on idle client${client}`);
  }

  async select(columns, clause) {
    let query = `SELECT ${columns} FROM public.${this.table}`;
    if (clause) query = query + ' ' + clause;
    console.log(query);
    return this.pool.query(query);
  }

  async insertInto(columns, values) {
    let query = `INSERT INTO ${this.table}(${columns}) VALUES(${values})`;
    console.log(query);
    return this.pool.query(query);
  }
}

export default Model;