import * as crypto from 'crypto';
const crc32c = require('fast-crc32c');

import { executeQuery, renderCard } from './queryFunctions';

export const getFileName = (req: any, file: any) => {
  var filepath = req.body.username + '/' + req.body.card + '/' + req.body.title + '/' + file.originalname;
  return filepath;
}

export const getFileHashMD5 = (strOrBuffer: any) => {
  return crypto.createHash('md5').update(strOrBuffer).digest('base64');
}

export const getFileHashCRC32C = (strOrBuffer: any) => {
  return Buffer.from(crc32c.calculate(strOrBuffer).toString()).toString('base64');
}


