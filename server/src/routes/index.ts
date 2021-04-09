import * as express from 'express';
import { uploadPage, renderPage } from '../controllers';
import * as multer from "multer";

const passport = require('passport');
const path = require('path');
const User = require('../models/user');
const ensureLogin = require('connect-ensure-login');
const { check } = require('express-validator/check');

/**
 * Authentication Strategies
 */
require('../auth/strategies');

// JSON Web Tokens
const requireJWT = passport.authenticate('jwt', { session: false });
// Username-password authentication
const callback = passport.authenticate('local');

/*
FACEBOOK OAUTH - Work in progress
const requireLogin = passport.authenticate('facebook', { scope: ['email'], authType: 'reauthenticate' });
const callbackFB = passport.authenticate('facebook', { failureRedirect: '/api/login' });
*/

const indexRouter = express.Router();

// Multer middleware to handle file uploading to Google Cloud Storage
const m = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024  // Currently restricting upload filesize to 5MB
  }
});

/**
 * POST /api/upload - Endpoint to handle file uploads to Google Cloud Storage
 * 
 * Hit the endpoint with a form-data payload. This should contain:
 * 1. The files to be uploaded (selected from the UI)
 * 2. The cards from which the endpoint is called (this is used to decide the folder structure in Google Cloud. Set two fields
 * 'card' and 'title' in the payload - these are optional).
 * 3. Any user defined metadata that needs to be uploaded along with the file (Set a field called 'metadata' and assign to it
 * a stringified JSON array containing one JSON string for each file that is being uploaded).
 * 
 * On success, the endpoint will return a JSON containing details about each of the uploaded files.
 * 
 * Use as a ref for a file upload button.
 */
indexRouter.post('/upload', requireJWT, m.array("file"), uploadPage, (req: express.Request, res: express.Response, next: any) => {
  res.status(200).json({ success: true, files: req.files })
});

/**
 * POST /api/login - Endpoint to handle the user session management flow using PassportJS middleware.
 * 
 * Hit the endpoint with a form-data payload containing:
 * 1. Email address (store in field 'email')
 * 2. Password (store in field 'password')
 * 
 * Upon successful authentication, a JSON with success message is returned. Additionally, a JWT is created
 * and is added to the cookie. 
 * 
 * Use this endpoint as the ref for a login button.
 */
indexRouter.post('/login', callback, (req: express.Request, res: express.Response) => {
  const user = req.user;
  User.isWhitelisted(user.rows[0]["user_id"]).then((result: any) => {
    // If user is not whitelisted do not proceed 
    // any further.
    if (result.rows[0].count === 0) {
      res.status(401).json({ success: false, status: "Unauthorized" });
    } else {
      // Generate JWT, store it in cookie and display the 
      // profile page.
      User.getPayload(user).then((result: any) => {
        req.session.payload = result;
        res.cookie('jwt', result.token);
        res.status(200).json({ success: true, status: "Success", token: "JWT " + result.token });
        //res.redirect('/api');
      });
    }
  }, (error: any) => { res.status(500).json({ success: false, status: "Error", errorMessage: error }) }
  )
});

// Social login button
//indexRouter.get('/login/facebook', requireLogin);

// Route to take user back to the welcome screen.
indexRouter.get('/logout', (req: express.Request, res: express.Response) => {
  req.session.destroy((err: any) => {
    if (err) {
      throw err;
    }
    req.logout();
    //res.redirect('/api');
  });
});

indexRouter.post('/:path', requireJWT, renderPage);

export default indexRouter;