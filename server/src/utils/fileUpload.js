const http = require('http');
const { PassThrough } = require('stream');

const { Storage } = require('@google-cloud/storage');

/*
const s3Client = new AWS.S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});
*/

const storage = new Storage();

const uploadStream = (filename) => {
  const pass = PassThrough();
  storage.bucket('rishabh-test-bkt').upload(pass, {
    destination: filename,
    metadata: {
      cacheControl: 'public, max-age=31536000'
    }
  }, (err, data) => {
    console.log(err, data);
  });
  return pass;
};

module.exports = {
    uploadStream
}