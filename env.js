const app = require('express')();
let env = app.get('env');
if (env === 'test')
  env = 'development';
const isProd = env === 'production';
let isDev = env === 'development';


/**
 * read environment variable form .env.process
 * in dev or test mode the environment variables are read from ..env file
 * ..env file must at least contain:
 * APP_NAME
 * APP_ADDRESS
 * PORT
 * DATABASE
 * DB_URI
 * MONGO_HOST
 * MONGO_PORT
 * REDIS_HOST
 *
 * a ..env file that might work for many:
 ** START **
 # the values must not be initiated with '!!'
 APP_NAME=Persian-Mode
 APP_ADDRESS=http://localhost:3000    # For server, this should be e.g. http://bankofstyle.com
 OAUTH_ADDRESS=http://localhost:4200  # For server, this should be e.g. http://bankofstyle.com
 PORT=3000
 DATABASE=PersianMode
 DB_URI=mongodb://127.0.0.1:27017/PersianMode
 MONGO_HOST=localhost
 MONGO_PORT=27017
 REDIS_HOST=127.0.0.1
 GOOGLE_OAUTH_CLIENTID = 636231560622-k29avsd6knviv7bu7ni9sf6r6okac3bt.apps.googleusercontent.com
 GOOGLE_OAUTH_CLIENTSECRET = A7cwgIu3p8H37m69VqrjrW2J
 GOOGLE_OAUTH_CALLBACKURL = /api/login/google/callback
 TOKEN_URL = http://RestfulSms.com/api/Token
 UserApiKey = 3419c133c8da0e423fdbd34
 SecretKey = admin@123
 # REDIS_PASSWORD=123465
 ** END **
 */
if (isDev)
  require('dotenv').config(); // loads .env variables inside ..env file into process..env

console.log(`-> app is running in ${env} mode`);

/**
 *  App
 */
const appName = getEnvValue(process.env.APP_NAME);
const appAddress = getEnvValue(process.env.APP_ADDRESS);
const oauthAddress = getEnvValue(process.env.OAUTH_ADDRESS) || appAddress;
const port = getEnvValue(process.env.PORT);

/**
 * Database
 */
const database = getEnvValue(process.env.DATABASE);
const database_test = getEnvValue(process.env.DATABASE) + '_test';
const db_uri = getEnvValue(process.env.DB_URI);
const db_uri_test = getEnvValue(process.env.DB_URI_TEST);


const googleAuth_clientId = getEnvValue(process.env.GOOGLE_OAUTH_CLIENTID);
const googleAuth_clientSecret = getEnvValue(process.env.GOOGLE_OAUTH_CLIENTSECRET);
const googleAuth_callbackUrl = getEnvValue(process.env.APP_ADDRESS) + getEnvValue(process.env.GOOGLE_OAUTH_CALLBACKURL);

const token_url = getEnvValue(process.env.TOKEN_URL);
const api_key = getEnvValue(process.env.API_KEY);
const secret_key = getEnvValue(process.env.SECRET_KEY);
const send_sms_url = getEnvValue(process.env.SEND_SMS_URL);

const merchant_code = getEnvValue(process.env.MERCHANT_CODE);
const terminal_code = getEnvValue(process.env.TERMINAL_CODE);
const redirect_address = getEnvValue(process.env.REDIRECT_ADDRESS);
const check_transaction_result_url = getEnvValue(process.env.CHECK_TRANSACTION_RESULT_URL);
const verify_payment_url = getEnvValue(process.env.VERIFY_PAYMENT_URL);
const private_key = getEnvValue(process.env.PRIVATE_KEY);
const app_redirect_address = getEnvValue(process.env.APP_REDIRECT_ADDRESS)
const free_delivery_amount = getEnvValue(process.env.FREE_DELIVERY_AMOUNT);



/**
 * Mail Config
 */

const emailFrom = getEnvValue(process.env.EMAIL_FROM);
const emailDomain = getEnvValue(process.env.EMAIL_DOMAIN);
const emailAPIKey = getEnvValue(process.env.EMAIL_API_KEY);
const emailTemplateVerification = getEnvValue(process.env.EMAIL_TEMPLATE_VERIFICATION);


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
uploadDeliveryEvidencePath = "public/images/delivery";
uploadExcelPath = "public/excel/";
uploadMusicPath = "public/musics";

/**
 * offline system api
 */
const serviceAddress = getEnvValue(process.env.SERVICE_ADDRESS);
const serviceTransferAPI = getEnvValue(process.env.SERVICE_TRANSFER_API);
const serviceReturnAPI = getEnvValue(process.env.SERVICE_RETURN_API);
const servcieInvoiceAPI = getEnvValue(process.env.SERVICE_INVOICE_API);
const servcieTokenAPI = getEnvValue(process.env.SERVICE_TOKEN_API);
const servcieLoyaltyAPI = getEnvValue(process.env.SERVICE_LOYALTY_API);
const offlineServiceUsername = getEnvValue(process.env.OFFLINE_SERVICE_USERNAME);
const offlineServicePassword = getEnvValue(process.env.OFFLINE_SERVICE_PASS);
const offlineServiceGrantType = getEnvValue(process.env.OFFLINE_SERVICE_GRANT_TYPE);

/**
 *  in some cases .env var name which is declared in ..env file is not compatible with server .env var in production mode.
 *  for example in Heroku the name of .env var for database connection is DATABASE_URL, but it is declared as pg_connection in ..env file
 *  To resolve this if the name of .env var contains !! at first, its value will be extracted from name after this two character
 * @param procEnv
 * @returns {*}
 */
function getEnvValue(procEnv) {
  if (procEnv && procEnv.startsWith('!!'))
    return process.env[procEnv.substring(2)]; // remove two first char (!!)
  else
    return procEnv;
}

/**
 *  Daily Hour Report
 */
const dailyReportHour = getEnvValue(process.env.DAILY_REPORT_HOUR);
const validPassedDaysForReturn = getEnvValue(process.env.VALID_PASSED_DAYS_FOR_RETURN);

/**
 *  pricing
 */
const rounding_factor = parseInt(getEnvValue(process.env.ROUNDING_FACTOR));
const loyalty_value = parseInt(getEnvValue(process.env.LOYALTY_VALUE));

module.exports = {
  isProd: isProd,
  isDev: isDev,
  appAddress,
  oauthAddress,
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
  uploadDeliveryEvidencePath,
  uploadExcelPath,
  uploadMusicPath,
  googleAuth: {
    clientID: googleAuth_clientId,
    clientSecret: googleAuth_clientSecret,
    callBackURL: googleAuth_callbackUrl,
  },
  app_redirect_address,
  token_url,
  api_key,
  secret_key,
  send_sms_url,
  dailyReportHour,
  merchant_code,
  terminal_code,
  redirect_address,
  check_transaction_result_url,
  verify_payment_url,
  private_key,
  free_delivery_amount,
  validPassedDaysForReturn,
  rounding_factor,
  serviceAddress,
  serviceTransferAPI,
  serviceReturnAPI,
  servcieInvoiceAPI,
  servcieTokenAPI,
  servcieLoyaltyAPI,
  offlineServiceUsername,
  offlineServicePassword,
  offlineServiceGrantType,
  emailFrom,
  emailDomain,
  emailAPIKey,
  emailTemplateVerification,
  loyalty_value
};


