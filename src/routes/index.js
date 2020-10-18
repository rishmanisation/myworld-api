import express from 'express';
import { indexPage, userProfilePage } from '../controllers';
const indexRouter = express.Router();

indexRouter.get('/', indexPage);
indexRouter.get('/userProfile', userProfilePage);

export default indexRouter;