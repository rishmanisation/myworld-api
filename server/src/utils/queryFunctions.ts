import Model from '../models/model';
import { pool } from '../models/pool';
import * as queries from './queries';

const data = require('../../resources/cards.json');

export const executeQuery = async (query: string, params: any) => {
    if (query === "foreignKey") {
        return pool.query(queries.getForeignKeyQuery(params["mainTable"], params["joinTable"]));
    } else if (query === "checkIfFileExists") {
        return pool.query(queries.checkFileExistsQuery(params["username"], params["md5Hash"], params["crc32cHash"]));
    }

    return null;
}

/**
 * Function to obtain the data from DB based on which card has been requested
 * by the user.
 */

export const renderCard = async (card: string, loggedInUser: string, values: any) => {
    try {
        const params = data[card];
        const mainModel = new Model(params["mainTable"]);

        //var foreignKey = "";
        if (params["joinTable"] && params["joinCols"]) {
            return executeQuery('foreignKey', params)
                .then(result => { return result!.rows[0]["fk_column"]; }, error => { console.log(error); return; })
                .then(result => { return mainModel.executeQuery(params, result, loggedInUser); }, error => { console.log(error); return; })
                .then(result => { return result!.rows; }, error => { console.log(error); return; });
        } else if (params["method"] === "INSERT") {
            return mainModel.insertQuery(params, values)
                .then(result => { return result!.rows; });
        } else {
            return mainModel.executeQuery(params, "", loggedInUser)
                .then(result => { return result!.rows; });
        }
    } catch (error) {
        return { error: error.stack };
    }
};

