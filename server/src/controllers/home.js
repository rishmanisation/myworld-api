import Model from '../models/model';
import * as data from '../../resources/cards.json';
import { executeQuery } from '../utils/queryFunctions';

const {Storage} = require('@google-cloud/storage');


const bucketName = 'rishabh-test-bkt';
const filename = '../myworld-tooling/tables.csv';
const destination = 'rishabh_test.csv';
//const projectId = 'probable-sprite-307302';
//const keyFile = '/controllers/My First Project-f872cd08333c.json';

const storage = new Storage();
/**
 * Function to obtain the data from DB based on which card has been requested
 * by the user.
 */
const renderCard = async (card, loggedInUser) => {
  try {
    const params = data[card];

    const mainModel = new Model(params["mainTable"]);

    let foreignKey = null;
    if (params["joinTable"] && params["joinCols"]) {
      const foreignKeyQuery = await executeQuery('foreignKey', params);
      foreignKey = foreignKeyQuery.rows[0]["fk_column"];
    }

    const resultQuery = await mainModel.executeQuery(params, foreignKey, loggedInUser);
    return resultQuery.rows;
  } catch (err) {
    return { err: err.stack };
  }
};

/**
 * This is the main API endpoint. Every API call hits this function and returns data
 * depending on what card is to be displayed.
 */
const renderPage = async (req, res) => {
  try {
    const cards = req.body["cards"];
    const response = {
      [req.body["key"]]: {}
    };

    for (const card of cards) {
      let resp = await renderCard(card, req.body["loggedInUser"]);
      if(resp["err"]) {
        return res.status(500).json({ response: resp["err"] });
      } else {
        response[req.body["key"]][card] = resp;
      }
    }

    return res.status(200).json({ response: response });
  } catch (err) {
    return res.status(500).json({ response: err.stack });
  }
};

const uploadPage = async (req, res) => {
  try {
    // Uploads a local file to the bucket
    await storage.bucket(bucketName).upload(filename, {
      // By setting the option `destination`, you can change the name of the
      // object you are uploading to a bucket.
      destination: destination,
      metadata: {
        // Enable long-lived HTTP caching headers
        // Use only if the contents of the file will never change
        // (If the contents will change, use cacheControl: 'no-cache')
        cacheControl: 'public, max-age=31536000',
      },
    });

    console.log(`${filename} uploaded to ${bucketName}.`);
    const response = { "status": "Success" };
    return res.status(200).json({ response: response });
  } catch (err) {
    return res.status(500).json({ response: err.stack });
  }
}

module.exports = {
  renderPage,
  uploadPage
} 
