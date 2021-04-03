import { getPasswordHash, verifyPassword } from '../utils/security';

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
//const FacebookStrategy = require('passport-facebook').Strategy;
const JWTStrategy = require('passport-jwt').Strategy;

const User = require('../models/user');

/**
 * Retrieves the JWT from the cookie.
 * @param {Object} req 
 */
var cookieExtractor = function(req: any) {
  var token = null;
  if(req && req.cookies) {
      token = req.cookies['jwt'];
  }
  return token;
}

// Username/Password Authentication
passport.use(new LocalStrategy({
  usernameField: 'email'
},
  function (username: string, password: string, done: any) {
    return User.findOne(username).then((user: any) => {
      console.log(user);
      if (!user || user.rowCount === 0) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      verifyPassword(user.rows[0]["password"], password).then((result: boolean) => {
        console.log(result);
        if(!result) {
          return done(null, false, { message: 'Incorrect password.' });
        } else {
          return done(null, user);
        }
      }, (err: any) => {
        console.log(err);
        return;
      });
    }, (error: any) => {
      if (error) { 
        console.log(error);
        return done(error); 
      }
    });
  }
));

/*
// Facebook OAuth2 using Passport JS
passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: '/api/tempFB',
    profileFields: ['id', 'emails', 'name'],
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  })
);
*/

passport.serializeUser(function(user: any, cb: any) {
    cb(null, user);
});

passport.deserializeUser(function(user: any, cb: any) {
    cb(null, user);
});

// JWT authentication using Passport JS
passport.use(new JWTStrategy({
    jwtFromRequest: cookieExtractor,
    secretOrKey: 'secret'
  }, function(payload: any, done: any){
    return done(null, payload.sub);
  })
);