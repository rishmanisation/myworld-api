import express from 'express';
import { indexPage, userDetails, userProfilePage, userItemsPage, userSubscriptionsPage } from '../controllers';
const indexRouter = express.Router();

indexRouter.get('/', indexPage);
indexRouter.get('/userDetails', userDetails);
indexRouter.get('/home', userProfilePage);
indexRouter.get('/items', userItemsPage);
indexRouter.get('/subscriptions', userSubscriptionsPage);

export default indexRouter;