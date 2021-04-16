import { Request, Response, Router } from 'express';
import { Session } from 'express-session';
import { renderPage, gcpUpload } from '../controllers';
import * as multer from "multer";
import * as fs from "fs";

const passport = require('passport');
const path = require('path');
const User = require('../models/user');
const ensureLogin = require('connect-ensure-login');
const { check } = require('express-validator/check');
const { Storage } = require('@google-cloud/storage');
const Quagga = require("@ericblade/quagga2").default;

const storage = new Storage();
const bucketName = 'rishabh-test-bkt';
const bucket = storage.bucket(bucketName);

export type MySession = Session & {
  payload?: { [key: string]: any }
}

export type MyRequest = Request & {
  user?: any;
  session: MySession
};

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

const indexRouter = Router();

// Multer middleware to handle file uploading to Google Cloud Storage
const m = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024  // Currently restricting upload filesize to 5MB
  }
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
indexRouter.post('/login', callback, (req: MyRequest, res: Response) => {
  const user = req.user;
  User.isWhitelisted(user!.rows[0]["user_id"]).then((result: any) => {
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
indexRouter.post('/upload', requireJWT, m.array("file"), async (req: MyRequest, res: Response, next: any) => {
  try {
    var metadataArr: Array<any> = [];
    if (req.body.metadata) {
      console.log(req.body.metadata);
      metadataArr = JSON.parse(req.body.metadata);
    } else {
      for (var i = 0; i < req.files.length; i++) {
        metadataArr.push({});
      }
    }

    const files = req.files as Express.Multer.File[];

    if (files) {
      var resFiles: Array<any> = [];
      var resResult: Array<any> = [];

      files.forEach((file: any, index: number) => {
        gcpUpload(bucket, req, file, metadataArr[index], index)
          .then((result: { [key: string]: any }) => {
            console.log(result);
            resFiles.push(result["file"]);
            resResult.push(result["result"]);
          });
      });

      return res.status(200).json({ success: true, files: files });
    } else {
      return res.status(404).send("File not found");
    }
  } catch (err) {
    return res.status(500).send(`Error. ${err}`);
  }
});

indexRouter.post('/barcode', requireJWT, m.array("file"), async (req: MyRequest, res: Response, next: any) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (files) {
      var codes: Array<any> = [];
      files.forEach((file: any, index: number) => {
        gcpUpload(bucket, req, file, {}, index)
          .then(() => {
            let fileName = `./tmp/${file.originalname}`;
            fs.writeFileSync(fileName, file.buffer);

            Quagga.decodeSingle({
              src: fileName,
              numOfWorkers: 0,  // Needs to be 0 when used within node
              inputStream: {
                size: 800  // restrict input-size to be 800px in width (long-side)
              },
              decoder: {
                readers: ["code_128_reader"],
                multiple: true
              },
            }, (result: any) => {
              console.log(result);
              if (result.codeResult) {
                console.log("result", result.codeResult.code);
                codes.push(result.codeResult.code);
              } else {
                console.log("not detected");
              }
            });
          });
      });

      return res.status(200).json({ "success": true, "codes": codes });
    }
    return res.status(404).send("File not found");
  } catch (err) {
    return res.status(500).send(`Error. ${err}`);
  }
});

// Social login button
//indexRouter.get('/login/facebook', requireLogin);

// Route to take user back to the welcome screen.
indexRouter.get('/logout', (req: MyRequest, res: Response) => {
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