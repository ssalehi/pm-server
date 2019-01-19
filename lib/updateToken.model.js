const env = require('../env');
const rp = require('request-promise');

const token_url = env.token_url;
const api_key = env.api_key;
const secure_key = env.secret_key;
let tokenObj = {
  TokenKey: null,
  IsSuccessful: false,
  Message: ' مقدار دهی اولیه '
};

// instantly, ...
initTokenRequest();
setInterval(() => { // ..., and every half hour, as setInterval doesn't run initially
  initTokenRequest();
}, 29 * 69 * 1000);

async function initTokenRequest() {
  try {
    let res = await rp({
      method: 'POST',
      body: {
        UserApiKey: api_key,
        SecretKey: secure_key,
      },
      uri: token_url,
      json: true,
      jar: null,
      resolveWithFullResponse: true,
    });
    tokenObj = res.body;
  } catch (err) {  // come here when methode is get for example
    tokenObj = {
      TokenKey: null,
      IsSuccessful: false,
      Message: ' خطا در راه‌اندازی سرویس پیامک'
    };
    console.error(err);
  }
  return Promise.resolve();
}

module.exports = {
  initTokenRequest,
  getToken: () => tokenObj,
};
