const bcrypt = require('bcrypt-nodejs');
const app = require('express')();
let env = app.get('env');
if (env === 'test')
  env = 'development';
const isProd = env === 'production';
const isDev = env === 'development';

/**
 * read environment variable form env.process
 * in dev or test mode the environment variables are made from .env file
 * .env file must at least contains:
 * APP_NAME
 * APP_ADDRESS
 * PORT
 * DATABASE
 * DB_URI
 * MONGO_HOST
 * MONGO_PORT
 * REDIS_HOST
 */
if (isDev)
  require('dotenv').config(); // loads env variables inside .env file into process.env

/**
 *  App
 */

const appName = getEnvValue(process.env.APP_NAME);
const appAddress = getEnvValue(process.env.APP_ADDRESS);
const port = getEnvValue(process.env.PORT);

/**
 * Database
 */
const database = getEnvValue(process.env.DATABASE);
const database_test = getEnvValue(process.env.DATABASE) + '_test';
const db_uri = getEnvValue(process.env.DB_URI);
const db_uri_test = getEnvValue(process.env.DB_URI)+ '_test';
const googleAuth_clientId = getEnvValue(process.env.GOOGLE_OAUTH_CLIENTID);
const googleAuth_clientSecret = getEnvValue(process.env.GOOGLE_OAUTH_CLIENTSECRET);
const googleAuth_callbackUrl = getEnvValue(process.env.GOOGLE_OAUTH_CALLBACKURL);

/**
 * Redis
 */
const redisURL = getEnvValue(process.env.REDIS_URL);
const redisHost = getEnvValue(process.env.REDIS_HOST);
const redisPass = getEnvValue(process.env.REDIS_PASSWORD);


/**
 * upload files
 */

uploadPath = "public/documents/product-image";


/**
 *  in some cases env var name which is declared in .env file is not compatible with server env var in production mode.
 *  for example in Heroku the name of env var for database connection is DATABASE_URL, but it is declared as pg_connection in .env file
 *  To resolve this if the name of env var contains !! at first, its value will be extracted from name after this two character
 * @param procEnv
 * @returns {*}
 */
function getEnvValue(procEnv) {
  if (procEnv && procEnv.startsWith('!!'))
    return process.env[procEnv.substring(2)]; // remove two first char (!!)
  else
    return procEnv;
}

module.exports = {
  bcrypt,
  isProd: isProd,
  isDev: isDev,
  appAddress,
  appName,
  app,
  port,
  database,
  database_test,
  db_uri,
  db_uri_test,
  redisURL,
  redisHost,
  redisPass,
  uploadPath,
  googleAuth: {
    clientID: googleAuth_clientId,
    clientSecret: googleAuth_clientSecret,
    callBackURL: googleAuth_callbackUrl,
  },
};