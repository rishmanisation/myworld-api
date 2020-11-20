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

  async executeQuery(query) {
    console.log(query);
    return this.pool.query(query);
  }

  async executeJoinQuery(params, foreignKey) {
    let mainCols = ``;
    for(const col of params["mainCols"]) {
      mainCols = mainCols + `${params["mainTable"]}.${col}, `;
    }

    let joinCols = ``;
    for(const col of params["joinCols"]) {
      joinCols = joinCols + `${params["joinTable"]}.${col}, `;
    }
    joinCols = joinCols.slice(0, -2);

    let query = `SELECT ` + mainCols + joinCols + ` FROM ${params["mainTable"]} JOIN ${params["joinTable"]} ON ${params["joinTable"]}.${foreignKey} = ${params["mainTable"]}.${foreignKey}`;
    return this.pool.query(query);
  }
}

export default Model;