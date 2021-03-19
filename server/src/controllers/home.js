import Model from '../models/model';
import * as data from '../../resources/cards.json';
import { executeQuery } from '../utils/queryFunctions';
import { getFileHash, getFileName, incrementalHash } from '../utils/fileUpload'

const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = 'rishabh-test-bkt';
const bucket = storage.bucket(bucketName);


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

const uploadPage = (req, res, next) => {
  if (!req.files) {
    res.status(400).send("No file uploaded.");
    return next();
  }
  console.log(req.files)
  let promises = [];

  req.files.forEach((file, index) => {
    const blob = bucket.file(getFileName(req, file));

    const promise = new Promise((resolve, reject) => {
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype
        }
      });

      blobStream.end(file.buffer);

      blobStream.on("finish", async () => {
        try {
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          req.files[index].cloudStorageObject = file.originalname;
          await blob.makePublic();
          req.files[index].cloudStoragePublicUrl = publicUrl;
          
          var model = new Model("UD_P_UPLOADED_FILES");
          var isactive = (index == 0) ? "Y" : "N";
          var values = {
            "USER_ID": req.body.username,
            "FILENAME": file.originalname,
            "FILE_GCP_PATH": blob.name,
            "FILE_HASH": getFileHash(file),
            "FILETYPE": file.mimetype,
            "ISACTIVE": isactive
          }
          await model.insertQuery(values);
          
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      blobStream.on("error", err => {
        req.files[index].cloudStorageError = err
        reject(err);
      });

    });
    promises.push(promise);
  })

  Promise.all(promises)
    .then(_ => {
      promises = [];
      next();
    })
    .catch(next);

}

module.exports = {
  renderPage,
  uploadPage
} 
