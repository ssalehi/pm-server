const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const env = require('./env');

const index = require('./routes/index');
const api = require('./routes/api');

const app = express();
app.use(compression())

let isReady = false;

const passport = require('./passport');
const session = require('./session');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger(env.isDev ? 'dev' : 'combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());


app.set("views", path.join(__dirname, 'views'));
app.set("view engine", "jade");


app.use(function (req, res, next) {
  const tk = req.headers['token'];
  if (tk) {
    req.jwtToken = tk;
  } else {
    req.jwtToken = null;
  }

  next();
});

if (env.isDev) {
  const cors = require('cors');
  app.use(cors());
  app.options('*', cors());
}

session.setup(app)
  .then(() => {
    isReady = true;
    passport.setup(app);
    // Redirect to HTTPS if available
    app.use( function(req, res, next) {
      if(req.get('Host').includes('lithium') && !req.secure) {
        return res.redirect(['https://', req.get('Host'), req.url].join(''));
      } else next();
    });
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/', index);
    app.use('/api', api);

    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
      const err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    // error handler
    app.use(function (err, req, res, next) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render('error');
    });
  });

module.exports = {
  get: () => app,
  isReady: () => isReady,
};

