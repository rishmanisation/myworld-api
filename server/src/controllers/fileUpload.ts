import { executeQuery, renderCard } from '../utils/queryFunctions';
import { getFileName, getFileHashCRC32C, getFileHashMD5 } from '../utils/fileUpload';

export const gcpUpload = async (bucket: any, req: any, file: any, metadata: any, index: number) => {
    const blob = bucket.file(getFileName(req, file));
    const fileHashMD5 = getFileHashMD5(file.buffer);
    const fileHashCRC32C = getFileHashCRC32C(file.buffer);
    const fileNameHash = getFileHashMD5(file.originalname);
  
    return new Promise<{[key: string]: any}>((resolve, reject) => {
      const blobStream = blob.createWriteStream({
        resumable: true,
        md5Hash: fileHashMD5,
        crc32c: fileHashCRC32C,
        metadata: {
          contentType: file.mimetype,
          metadata: metadata
        }
      });
  
      blobStream.end(file.buffer);
  
      blobStream.on("finish", async () => {
        try {
          console.log("FINALLY HERE");
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          blob.cloudStorageObject = file.originalname;
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
          
          blob.makePublic()
            .then(() => { blob.cloudStoragePublicUrl = publicUrl; return renderCard('fileUploadCard', req.body.username, values); })
            .then((result: any) => resolve({"file": file, "result": result}));
        } catch (err) {
          reject(err);
        }
      });
  
      blobStream.on("error", (err: any) => {
        blob.cloudStorageError = err
        reject(err);
      });
    });
  }