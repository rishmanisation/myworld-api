import MD5 from 'crypto-js/md5';
import SparkMD5 from 'spark-md5';

const File = require('file-class');
const FileReader = require('filereader');

const getFileName = (req, file) => {
  console.log(req);
  var filepath = req.body.username + '/' + req.body.card + '/' + req.body.title + '/' + file.originalname;
  return filepath;
}

const getFileHash = (buffer) => {
  return MD5(buffer);
}

const incrementalHash = (file) => {
  var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
      chunkSize = 2097152,                             // Read in chunks of 2MB
      chunks = Math.ceil(file.size / chunkSize),
      currentChunk = 0,
      spark = new SparkMD5.ArrayBuffer(),
      fileReader = new FileReader();

  fileReader.onload = function (e) {
      console.log('read chunk nr', currentChunk + 1, 'of', chunks);
      spark.append(e.target.result);                   // Append array buffer
      currentChunk++;

      if (currentChunk < chunks) {
          loadNext();
      } else {
          console.log('finished loading');
          console.info('computed hash', spark.end());  // Compute hash
      }
  };

  fileReader.onerror = function () {
      console.warn('oops, something went wrong.');
  };

  function loadNext() {
      var start = currentChunk * chunkSize,
          end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;

      fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
  }

  loadNext();
}

module.exports = {
  getFileName,
  getFileHash,
  incrementalHash
}
