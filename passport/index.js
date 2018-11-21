let lib = require('../lib');
let passport = require('passport');
let LocalStrategy = require('passport-local');
let GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const env = require('../env');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

let setup = (app) => {
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser(lib.Person.serialize);
  passport.deserializeUser(lib.Person.deserialize);
  passport.use(new LocalStrategy(
    {
      passReqToCallback: true,
    },
    lib.Person.passportLocalStrategy
  ));
  
  console.log(' ------> ',env.googleAuth.clientID);
  console.log(' ------> ',env.googleAuth.clientSecret);
  console.log(' ------> ',env.googleAuth.callBackURL);
  
  passport.use(new GoogleStrategy({
    clientID: env.googleAuth.clientID,
    clientSecret: env.googleAuth.clientSecret,
    callbackURL: env.googleAuth.callBackURL,
    passReqToCallback: true,
  }, lib.Person.passportOAuthStrategy));
};

module.exports = {
  setup
};
