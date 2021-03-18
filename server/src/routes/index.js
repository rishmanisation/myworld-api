import express from 'express';
import { uploadPage, renderPage } from '../controllers';
import multer, {memoryStorage} from "multer";

const path = require('path');
const indexRouter = express.Router();
const m = multer({
    storage: memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024 // no larger than 5mb
    }
  });

indexRouter.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'static/index.html'));
});
indexRouter.post('/upload', m.array("file"), uploadPage, (req, res, next) => {
  //console.log(req.files);
  res.status(200).json({ files: req.files })
});
indexRouter.post('/:path', renderPage);

export default indexRouter;