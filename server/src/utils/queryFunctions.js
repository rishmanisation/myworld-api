import { pool } from '../models/pool';
import * as queries from '../utils/queries';

const executeQuery = async (query, params) => {
    if(query === "foreignKey") {
        return pool.query(queries.getForeignKeyQuery(params["mainTable"], params["joinTable"]));
    }

    return null;
}

module.exports = {
    executeQuery
}

