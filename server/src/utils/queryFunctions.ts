import { pool } from '../models/pool';
import * as queries from './queries';

export const executeQuery = async (query: string, params: any) => {
    if(query === "foreignKey") {
        return pool.query(queries.getForeignKeyQuery(params["mainTable"], params["joinTable"]));
    } else if(query === "checkIfFileExists") {
        return pool.query(queries.checkFileExistsQuery(params["username"], params["md5Hash"], params["crc32cHash"]));
    }

    return null;
}

