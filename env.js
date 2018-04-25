const bcrypt = require('bcrypt-nodejs');
const app = require('express')();
let env = app.get('env');
if (env === 'test')
  env = 'development';
const isProd = env === 'production';
const isDev = env === 'development';

/**
 * read environment variable form env.process
 * in dev or test mode the environment variables are read from .env file
 * .env file must at least contain:
 * APP_NAME
 * APP_ADDRESS
 * PORT
 * DATABASE
 * DB_URI
 * MONGO_HOST
 * MONGO_PORT
 * REDIS_HOST
 *
 * a .env file that might work for many:
 ** START **
 # the values must not be initiated with '!!'
 APP_NAME=Persian-Mode
 APP_ADDRESS=http://localhost:3000
 PORT=3000
 DATABASE=PersianMode
 DB_URI=mongodb://127.0.0.1:27017/PersianMode
 MONGO_HOST=localhost
 MONGO_PORT=27017
 REDIS_HOST=127.0.0.1
 GOOGLE_OAUTH_CLIENTID = 636231560622-k29avsd6knviv7bu7ni9sf6r6okac3bt.apps.googleusercontent.com
 GOOGLE_OAUTH_CLIENTSECRET = A7cwgIu3p8H37m69VqrjrW2J
 GOOGLE_OAUTH_CALLBACKURL = http://127.0.0.1:3000/api/login/google/callback
 # REDIS_PASSWORD=123465
 ** END **
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
const db_uri_test = getEnvValue(process.env.DB_URI) + '_test';
const googleAuth_clientId = getEnvValue(process.env.GOOGLE_OAUTH_CLIENTID);
const googleAuth_clientSecret = getEnvValue(process.env.GOOGLE_OAUTH_CLIENTSECRET);
const googleAuth_callbackUrl = getEnvValue(process.env.GOOGLE_OAUTH_CALLBACKURL);

/**
 * Redis
 */
const redisURL = getEnvValue(process.env.REDIS_URL);
const redisHost = getEnvValue(process.env.REDIS_HOST);
const redisPort = getEnvValue(process.env.REDIS_PORT);
const redisPass = getEnvValue(process.env.REDIS_PASSWORD);

/**
 * upload files
 */

uploadPath = "public/documents";
uploadProductImagePath = "public/images/product-image";
uploadPlacementImagePath = "public/images/placements";
uploadExcelPath = "public/excel/";

/**
 * offline system api
 */
const onlineWarehouseAPI = getEnvValue(process.env.ONLINE_WAREHOUSE_API);
const invoiceAPI = getEnvValue(process.env.INVOICE_API);

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
  redisPort,
  redisPass,
  uploadPath,
  uploadProductImagePath,
  uploadPlacementImagePath,
  uploadExcelPath,
  googleAuth: {
    clientID: googleAuth_clientId,
    clientSecret: googleAuth_clientSecret,
    callBackURL: googleAuth_callbackUrl,
  },
  onlineWarehouseAPI,
  invoiceAPI
};


