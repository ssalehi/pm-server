/**
 * Created by Eabasir on 02/03/2018.
 */
const env = require('../env');

SALT_WORK_FACTOR = 10;

function generateToken(plain) {
  return new Promise((resolve, reject) => {
    // generate a salt
    env.bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
      if (err) return reject(err);
      // hash the password using our new salt
      env.bcrypt.hash(plain, salt, null, function (err, hash) {
        if (err) return reject(err);
        resolve(hash)
      });
    });

  });

}


function parseServerError(err) {
  try {
    let a;
    let dashPlace = err.message.indexOf('- ');
    let statusCode = err.message.substring(0, dashPlace);
    eval(`a=${err.message.substring(dashPlace + 2)}`);

    try {
      err = JSON.parse(a);
    } catch (e) {
      if (a) {
        err.Message = a;
      } else {
        throw e;
      }
    }
    err.statusCode = statusCode;
    return err;
  } catch (e) {
    return err;
  }
}

function parseServerErrorToString(err) {
  try {
    err = parseServerError(err);
    return `SERVER ERROR:\nStatus: ${err.statusCode}\nMessage: ${err.Message}${err.Stack ? '\nServer stack:\n' + err.Stack : ''}`;
  } catch (e) {
    return err;
  }
}

function parseJasmineErrorToString(err) {
  return `TEST ERROR:\nMessage: ${err.message}\nStack:${err.stack}`;
}


function apiTestURL(api) {
  return ["http://localhost:3000/api/", api, '?test=tEsT'].join('');
}

function errorHandler(err) {
  if (err.response)
    this.fail(parseServerErrorToString(err));
  else
    this.fail(parseJasmineErrorToString(err));
  this.done();
}

function httpPost(url, body) {
  const request = require('request');

  return new Promise((resolve, reject) => {

    request.post(
      {
        url,
        json: body
      },
      function (error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log('-> offline req result: ', response.body);
          resolve(response.body);
        } else {
          reject(error);
        }

      }
    );
  });


}

module.exports = {
  parseServerError,
  parseServerErrorToString,
  parseJasmineErrorToString,
  apiTestURL,
  errorHandler,
  generateToken,
  httpPost
};