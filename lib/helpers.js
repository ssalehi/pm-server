/**
 * Created by Eabasir on 02/03/2018.
 */
const nodeMailer = require('nodemailer');
const bcrypt = require('bcrypt-nodejs');
const env = require('../env')

SALT_WORK_FACTOR = 10;

function makeHash(plain) {
  return new Promise((resolve, reject) => {
    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
      if (err) return reject(err);
      // hash the password using our new salt
      bcrypt.hash(plain, salt, null, function (err, hash) {
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

let sendMail = function (plainContent, htmlContent, mailSubject, mailTo) {
  return new Promise((resolve, reject) => {
    let transporter = nodeMailer.createTransport(env.mailConfig);
    let mailOptions = {
      from: env.mailConfig.from,
      to: mailTo,
      subject: mailSubject,
      text: plainContent,
      html: htmlContent,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Error in sending Email', err);
        reject(err);
      } else {
        console.log('Email Sent: ', info);
        resolve('mail is sent');
      }
    })
  })
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

async function generateCode(lastCode, validityCheck) {
  let newCode;
  let index = 0;
  while (!newCode) {
    if (lastCode[index] < "Z") {
      newCode = lastCode.substr(0, index) + String.fromCharCode(lastCode.charCodeAt(index) + 1)
      if (!(await validityCheck(newCode)))
        newCode = null;

    } else {
      if (lastCode.length === index + 1) {
        newCode = lastCode + "A";
        if (!(await validityCheck(newCode)))
          newCode = null;
      }
      index++;
    }

  }
  return newCode;
}
module.exports = {
  parseServerError,
  parseServerErrorToString,
  parseJasmineErrorToString,
  sendMail,
  apiTestURL,
  errorHandler,
  makeHash,
  httpPost,
  generateCode
};