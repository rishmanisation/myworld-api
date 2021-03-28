const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
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

// Username/Password Authentication
passport.use(new LocalStrategy({
  usernameField: 'email'
},
  function (username, password, done) {
    User.findOne(username).then((user) => {
      if (!user || user.rowCount === 0) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      
      if (user.rows[0]["password"] != password) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);
    }, (error) => {
      if (error) { 
        console.log(err);
        return done(err); 
      }
    });
  }
));

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