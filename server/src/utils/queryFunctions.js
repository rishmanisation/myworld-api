import { pool } from '../models/pool';
import * as queries from '../utils/queries';

const executeQuery = async (query, params) => {
    if(query === "foreignKey") {
        return pool.query(queries.getForeignKeyQuery(params["mainTable"], params["joinTable"]));
    } else if(query === "checkIfFileExists") {
        return pool.query(queries.checkFileExistsQuery(params["username"], params["md5Hash"], params["crc32cHash"]));
    }

    return null;
}

module.exports = {
    executeQuery
}

