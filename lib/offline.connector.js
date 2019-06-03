const env = require('../env');
const rp = require('request-promise');

let token;

let requestToken = async () => {

  try {
    let res = await rp.post(`http://${env.serviceAddress}/${env.servcieTokenAPI}`, {
      form: {
        username: env.offlineServiceUsername,
        password: env.offlineServicePassword,
        grant_type: env.offlineServiceGrantType,
      },
      resolveWithFullResponse: true,
      json: true
    });

    if (res.body && res.body.access_token) {
      token = res.body.access_token
    }
    console.log('-> ', 'access token is taken successfuly');
    return;
  } catch (err) {  // come here when methode is get for example
    console.error(err.message);
  }

  console.error('could not get access token of offline system');
}

requestToken();



module.exports = {

  token: () => token,
  requestToken

};
