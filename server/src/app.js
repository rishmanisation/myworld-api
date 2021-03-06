import logger from 'morgan';
import express from 'express';
import cookieParser from 'cookie-parser';
import indexRouter from './routes/index';

const passport = require('passport');
const expressSession = require('express-session');
const morgan = require('morgan')('combined');
const flash = require('connect-flash');

const app = express();
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan);
app.use(express.static('./views/static'));
app.use(expressSession({ secret: 'keyboard cat', resave: true, saveUninitialized: true, rolling: true, cookie: { expiresIn: 20000 } }));

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(flash()); // flash messages

app.use(function (req, res, next) {
    res.locals.success = req.flash('success');
    res.locals.info = req.flash('info');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.use('/api', indexRouter);

export default app;
