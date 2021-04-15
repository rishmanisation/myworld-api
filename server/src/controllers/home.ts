//import Model from '../models/model';
import { executeQuery, renderCard } from '../utils/queryFunctions';

const data = require('../../resources/cards.json');

const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = 'rishabh-test-bkt';
const bucket = storage.bucket(bucketName);


/**
 * This is the main API endpoint. Every API call hits this function and returns data
 * depending on what card is to be displayed.
 */
export const renderPage = async (req: any, res: any) => {
  try {
    const cards: Array<string> = req.body["cards"];
    const response: { [key: string]: any } = {
      [req.body["key"]]: {}
    };

    cards.forEach(card => {
      renderCard(card, req.body["loggedInUser"], [])
        .then((result) => {
          response[req.body["key"]][card] = result;
        }, (error) => {
          return res.status(500).json({ response: error });
        });
    });

    return res.status(200).json({ response: response });
  } catch (err) {
    return res.status(500).json({ response: err.stack });
  }

};


