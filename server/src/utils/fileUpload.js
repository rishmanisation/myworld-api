import Base64 from 'crypto-js/enc-base64';
import Utf8 from 'crypto-js/enc-utf8'
import MD5 from 'crypto-js/md5';
import SparkMD5 from 'spark-md5';
import md5 from 'js-md5';


const File = require('file-class');
const FileReader = require('filereader');
const crc32c = require('fast-crc32c');

const getFileName = (req, file) => {
  var filepath = req.body.username + '/' + req.body.card + '/' + req.body.title + '/' + file.originalname;
  return filepath;
}

const getFileHashMD5 = (file) => {
  //return MD5(buffer);
  //return Base64.stringify(Utf8.parse(SparkMD5.ArrayBuffer.hash(file.buffer)));
  /*
  const hashStr = SparkMD5.ArrayBuffer.hash(file.buffer, true);
  const b64Hash = Buffer.from(hashStr, 'hex').toString('base64');
  return b64Hash;
  */
  console.log(md5(file.buffer));
  return md5.base64(file.buffer);
  //return crc32c.calculate(file.buffer);
}

const getFileHashCRC32C = (file) => {
  return Buffer.from(crc32c.calculate(file.buffer).toString()).toString('base64');
}

/*
const getFileHashTest = (file) => {
  //var file = new File(inp)
  return new Promise((resolve, reject) => {
    const chunkSize = 2097152; // Read in chunks of 2MB
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();

    let cursor = 0; // current cursor in file

    fileReader.onerror = () => {
      reject('MD5 computation failed - error reading the file');
    };

    // read chunk starting at `cursor` into memory
    var processChunk = (chunk_start) => {
      const chunk_end = Math.min(file.size, chunk_start + chunkSize);
      fileReader.readAsArrayBuffer(file.slice(chunk_start, chunk_end));
    }

    // when it's available in memory, process it
    // If using TS >= 3.6, you can use `FileReaderProgressEvent` type instead 
    // of `any` for `e` variable, otherwise stick with `any`
    // See https://github.com/Microsoft/TypeScript/issues/25510
    fileReader.onload = (e) => {
      spark.append(e.target.result); // Accumulate chunk to md5 computation
      cursor += chunkSize; // Move past this chunk

      if (cursor < file.size) {
        // Enqueue next chunk to be accumulated
        processChunk(cursor);
      } else {
        // Computation ended, last chunk has been processed. Return as Promise value.
        // This returns the base64 encoded md5 hash, which is what
        // Rails ActiveStorage or cloud services expect
        resolve(btoa(spark.end(true)));

        // If you prefer the hexdigest form (looking like
        // '7cf530335b8547945f1a48880bc421b2'), replace the above line with:
        // resolve(spark.end());
      }
    };

    processChunk(0);
  });
}
*/

module.exports = {
  getFileName,
  getFileHashMD5,
  getFileHashCRC32C
}
