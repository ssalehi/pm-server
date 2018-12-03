const env = require('../env');
const rp = require('request-promise');

const token_url = process.env.token_url;
const api_key = process.env.api_key;
const secure_key = process.env.secret_key;
let tokenObj = {};

function initTokenRequest() {
  let waitingTime = 10000;
  setInterval(() => {
    rp({
      method: 'POST',
      body: {
        UserApiKey: api_key,
        SecretKey: '454545'
      },
      uri: token_url,
      json: true,
      jar: null,
      resolveWithFullResponse: true,
    })
      .then(res => {
        tokenObj = res.body;
      })
      .catch(err => {
        tokenObj = {
          TokenKey: null,
          IsSuccessful: false,
          Message: ' یافت نشد apiKey '
        };
        console.error(err);
      });

  }, waitingTime);
}

module.exports = {
  initTokenRequest,
  getToken: () => tokenObj,
};