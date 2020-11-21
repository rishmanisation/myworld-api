import express from 'express';
import { renderPage } from '../controllers';
const indexRouter = express.Router();

indexRouter.post('/:path', renderPage);

export default indexRouter;