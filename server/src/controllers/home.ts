import Model from '../models/model';
import { executeQuery } from '../utils/queryFunctions';
import { getFileName, getFileHashMD5, getFileHashCRC32C } from '../utils/fileUpload'

const data = require('../../resources/cards.json');

const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = 'rishabh-test-bkt';
const bucket = storage.bucket(bucketName);


/**
 * Function to obtain the data from DB based on which card has been requested
 * by the user.
 */

const renderCard = async (card: string, loggedInUser: string, values: any) => {

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

export const uploadPage = (req: any, res: any, next: any) => {
  if (!req.files) {
    res.status(400).send("No file uploaded.");
    return next();
  }

  try {

    var promises: Array<Promise<void>> = [];

    var metadataArr: Array<any> = [];
    if (req.body.metadata) {
      console.log(req.body.metadata);
      metadataArr = JSON.parse(req.body.metadata);
    } else {
      for (var i = 0; i < req.files.length; i++) {
        metadataArr.push({});
      }
    }

    req.files.forEach((file: any, index: number) => {
      const blob = bucket.file(getFileName(req, file));
      const fileHashMD5 = getFileHashMD5(file.buffer);
      const fileHashCRC32C = getFileHashCRC32C(file.buffer);
      const fileNameHash = getFileHashMD5(file.originalname);

      var params = {
        "username": req.body.username,
        "md5Hash": fileHashMD5,
        "crc32cHash": fileHashCRC32C
      }

      var doesFileNameExist;
      var doesFileContentExist;

      blob.exists().then((result: boolean) => {
        doesFileNameExist = result;
      });


      executeQuery("checkIfFileExists", params).then((result) => {
        doesFileContentExist = (result!.rows[0] > 0);
      });

      if (doesFileNameExist && doesFileContentExist) {
        promises.push(Promise.resolve());
      } else {
        var promise = new Promise<void>((resolve, reject) => {
          const blobStream = blob.createWriteStream({
            resumable: true,
            md5Hash: fileHashMD5,
            crc32c: fileHashCRC32C,
            metadata: {
              contentType: file.mimetype,
              metadata: metadataArr[index]
            }
          });

          blobStream.end(file.buffer);

          blobStream.on("finish", async () => {
            try {
              const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
              blob.cloudStorageObject = file.originalname;
              await blob.makePublic();
              blob.cloudStoragePublicUrl = publicUrl;
              var values: { [key: string]: any } = {
                "FILE_NAME_HASH": fileNameHash,
                "USER_ID": req.body.username,
                "FILENAME": file.originalname,
                "FILE_GCP_PATH": blob.name,
                "FILE_HASH_CRC32C": fileHashCRC32C,
                "FILE_HASH_MD5": fileHashMD5,
                "FILETYPE": file.mimetype,
                "ISACTIVE": req.body.isactive
              }
              await renderCard('fileUploadCard', req.body.username, values);
              resolve();
            } catch (err) {
              reject(err);
            }
          });

          blobStream.on("error", (err: any) => {
            blob.cloudStorageError = err
            reject(err);
          });
        });

        promises.push(promise);
      }
    })

    Promise.all(promises)
      .then(_ => {
        promises = [];
        next();
      })
      .catch(next);
  } catch (err) {
    res.status(500).send(`Error. ${err}`);
  }
}

