import express from 'express';
import { indexPage, landingPage, userDetails, userProfilePage, userItemsPage, userSubscriptionsPage } from '../controllers';
const indexRouter = express.Router();

indexRouter.get('/', indexPage);
indexRouter.get('/landing', landingPage);
indexRouter.get('/userDetails', userDetails);
indexRouter.get('/userProfile', userProfilePage);
indexRouter.get('/items', userItemsPage);
indexRouter.get('/subscriptions', userSubscriptionsPage);

export default indexRouter;