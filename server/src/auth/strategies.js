const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const JWTStrategy = require('passport-jwt').Strategy;

const User = require('../models/user');

/**
 * Retrieves the JWT from the cookie.
 * @param {Object} req 
 */
var cookieExtractor = function(req) {
  var token = null;
  if(req && req.cookies) {
      token = req.cookies['jwt'];
  }
  return token;
}

// Facebook OAuth2 using Passport JS
passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: '/api/profile',
    profileFields: ['id', 'emails', 'name'],
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  })
);

passport.serializeUser(function(user, cb) {
    cb(null, user);
});

passport.deserializeUser(function(user, cb) {
    cb(null, user);
});

// JWT authentication using Passport JS
passport.use(new JWTStrategy({
    jwtFromRequest: cookieExtractor,
    secretOrKey: 'secret'
  }, function(payload, done){
    return done(null, payload.sub);
  })
);