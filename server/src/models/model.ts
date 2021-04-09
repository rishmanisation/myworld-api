import { pool } from './pool';

/**
 * Model class
 * 
 * This class is used as the data model with which the API interacts with the DB.
 * 
 */
export class Model {
  pool: any;
  table: string;

  constructor(table: string) {
    this.pool = pool
    this.table = table;
    this.pool.on('error', (err: any, client: any) => `Error, ${err}, on idle client${client}`);
  }

  async executeQueryString(query: string) {
    return this.pool.query(query);
  }
  /**
   * Function to generate and execute the desired SQL query. 
   */
  async executeQuery(params: any, foreignKey: string, loggedInUser: string) {
    let mainCols = ``;
    if (params["mainCols"]) {
      for (const col of params["mainCols"]) {
        mainCols = mainCols + `${params["mainTable"]}.${col}, `;
      }
      mainCols = mainCols.slice(0, -2);
    } else {
      mainCols = `*`;
    }

    let joinCols = ``;
    if (params["joinCols"]) {
      joinCols = `,`;
      for (const col of params["joinCols"]) {
        joinCols = joinCols + `${params["joinTable"]}.${col}, `;
      }
      joinCols = joinCols.slice(0, -2);
    }

    let query = `SELECT ${mainCols} ${joinCols} FROM ${params["mainTable"]}`;
    if(params["joinCols"] && foreignKey) {
      query = query + ` JOIN ${params["joinTable"]} ON ${params["joinTable"]}.${foreignKey} = ${params["mainTable"]}.${foreignKey}`;
    }
    
    if(params["mainTable"].includes("ud")) {
      query = query + ` WHERE ${params["mainTable"]}.USERNAME LIKE '%${loggedInUser}%'`;
    }

    console.log(query);

    return this.pool.query(query);
  }


  async insertQuery(params: any, values: { [key: string]: any }) {
    let query = "INSERT INTO " + params["mainTable"] + " VALUES(";
    params["mainCols"].forEach((col: string) => {
      query += `'${values[col]}',`;
    });
    query = query.substring(0, query.length-1) + `) ON CONFLICT (${params["mainCols"][0]}) DO NOTHING`;
    console.log(query);
    return this.pool.query(query);
  }
}

export default Model;