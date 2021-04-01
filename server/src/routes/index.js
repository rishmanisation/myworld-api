import express from 'express';
import { uploadPage, renderPage } from '../controllers';
import multer, { memoryStorage } from "multer";

const passport = require('passport');
const path = require('path');
const User = require('../models/user');
const ensureLogin = require('connect-ensure-login');
const { check } = require('express-validator/check');

require('../auth/strategies');

const requireJWT = passport.authenticate('jwt', { session: false });

const callback = passport.authenticate('local', {
  failureRedirect: '/api/login',
  failureFlash: true
});

/*
FACEBOOK OAUTH - Work in progress
const requireLogin = passport.authenticate('facebook', { scope: ['email'], authType: 'reauthenticate' });
const callbackFB = passport.authenticate('facebook', { failureRedirect: '/api/login' });
*/

const indexRouter = express.Router();
const m = multer({
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024  // Currently restricting upload filesize to 5MB
  }
});

indexRouter.get('/upload', requireJWT, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'static/index.html'));
});

indexRouter.post('/upload', requireJWT, m.array("file"), uploadPage, (req, res, next) => {
  res.status(200).json({ files: req.files })
});

indexRouter.get('/', function (req, res) {
  // Redirect user to the profile page on successful sign in
  if (req.user) {
    res.redirect('/api/profile');
  } else {
    res.render('home');
  }
});

// Login page
indexRouter.get('/login', function (req, res) {
  res.render('login');
});


indexRouter.post('/login', callback, (req, res) => {
  const user = req.user;
  User.isWhitelisted(user.rows[0]["user_id"]).then((result) => {
    // If user is not whitelisted do not proceed 
    // any further.
    if (result.rows[0].count === 0) {
      res.render('notwhitelist');
    } else {
      // Generate JWT, store it in cookie and display the 
      // profile page.
      User.getPayload(user).then((result) => {
        req.session.payload = result;
        res.cookie('jwt', result.token);
        res.redirect('/api');
      });
    }
  })
});

// Social login button
//indexRouter.get('/login/facebook', requireLogin);

// User profile page
indexRouter.get('/profile', requireJWT, (req, res) => {
  const payload = req.session.payload; 
  res.render('profile', payload);
});

// Page where a whitelisted user can whitelist other users. Requires valid JWT.
indexRouter.get('/whitelist', requireJWT, (req, res) => {
  res.render('whitelist', { success: req.session.success, errors: req.session.errors });
});

// Form for submitting the email ID of the person to be whitelisted by the user.
// Can currently whitelist one user at a time.
indexRouter.post('/whitelist', [requireJWT, check('email_id').not().isEmpty().withMessage('Email id cannot be empty').isEmail().withMessage('Invalid format for email id')], (req, res) => {
  var errors = req._validationErrors;

  // If there are any errors with the input email id then display the errors and 
  // prompt the user to enter the input again. This uses express-validation module.
  // The following checks are implemented for email id:
  // 1. Email id cannot be empty.
  // 2. Email id has to be of the format user@website.domain.
  // 3. Email id cannot already be in the database (this is checked later on).
  if (errors && errors.length) {
    req.session.errors = errors;
    req.session.success = false;
    res.redirect('whitelist');
  } else {
    // Entered email address is syntactically correct. Proceed to add the user to the
    // database.
    var email_id = req.body.email_id;
    User.whitelistUser(email_id).then((result) => {
      // No errors found. Email address will be stored in the database and the user is redirected
      // to the profile page.
      if (result) {
        req.session.success = true;
        res.redirect('whitelist');
      }
    }, (err) => {
      // Error here indicates that the entered email address is already present in the database.
      if (err) {
        req.session.errors = [{ msg: 'User with the provided email id is already whitelisted.' }];
        req.session.success = false;
        res.redirect('whitelist');
      }
    });
  }
});

// Route to take user back to the welcome screen.
indexRouter.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      throw err;
    }
    req.logout();
    res.redirect('/api');
  });
});

indexRouter.post('/:path', requireJWT, renderPage);

export default indexRouter;