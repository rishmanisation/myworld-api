import express from 'express';
import { uploadPage, renderPage } from '../controllers';
const indexRouter = express.Router();

indexRouter.post('/upload', uploadPage);
indexRouter.post('/:path', renderPage);

export default indexRouter;