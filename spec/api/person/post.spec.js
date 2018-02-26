const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const moment = require('moment');

describe('Person POST API', () => {
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        let obj = new lib.Agent(true);
        return obj.save({
          first_name: 'admin',
          surname: 'admin',
          username: 'admin@gmail.com',
          secret: '123456',
          mobile_no: '01256993730',
          gender: 'm',
          access_level: 0,
          is_verified: true,
        });
      })
      .then(res => {
        let obj = new lib.Agent(true);
        return obj.save({
          first_name: 's',
          surname: 'c',
          username: 'sc@gmail.com',
          secret: '123456',
          mobile_no: '09391999852',
          gender: 'f',
          access_level: 1,
          is_verified: true,
        });
      })
      .then(res => {
        let obj = new lib.Customer(true);
        return obj.save({
          first_name: 'ali',
          surname: 'alavi',
          username: 'aa@gmail.com',
          secret: '123456',
          mobile_no: '+989391993730',
          gender: 'm',
          dob: '1993-03-02',
          address: [
            {
              city: 'Tehran',
              street: 'beheshti',
            },
          ],
          is_verified: true,
        });
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.error('Error in before each: ', err);
        done();
      });
  });

  it('admin should login', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        username: 'admin@gmail.com',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('agent/login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('admin@gmail.com');
        expect(res.body.personType).toBe('agent');
        expect(res.body.access_level).toBe(0);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('shipping clerk should login', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        username: 'sc@gmail.com',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('agent/login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('sc@gmail.com');
        expect(res.body.personType).toBe('agent');
        expect(res.body.access_level).toBe(1);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('normal user cannot login in agent domain', function (done) {
    rp({
      method: 'post',
      body: {
        username: 'aa@gmail.com',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('agent/login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Normal user logged in in agent domain');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.noUser.status);
        done();
      });
  });

  it('normal user should login', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        username: 'aa@gmail.com',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('aa@gmail.com');
        expect(res.body.personType).toBe('customer');
        expect(res.body.access_level).toBeUndefined();
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('normal user should login from app', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        username: 'aa@gmail.com',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('app/login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('aa@gmail.com');
        expect(res.body.personType).toBe('customer');
        expect(res.body.access_level).toBeUndefined();
        expect(res.body.token).toBeDefined();
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('normal user should be able to verify his phone number', function (done) {
    this.done = done;
    (models['CustomerTest'].update({'username': 'aa@gmail.com'}, {$set: {verification_code: '123456', is_verified: false}}))
      .then(res => {
        return rp({
          method: 'post',
          body: {
            code: '123456',
            username: 'aa@gmail.com',
          },
          uri: lib.helpers.apiTestURL('register/verify'),
          json: true,
          resolveWithFullResponse: true,
        });
      })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['CustomerTest'].find({username: 'aa@gmail.com'}).lean();
      })
      .then(res => {
        expect(res.length).toBe(1);
        res = res[0];
        expect(res.username).toBe('aa@gmail.com');
        expect(res.first_name.toLowerCase()).toBe('ali');
        expect(res.surname.toLowerCase()).toBe('alavi');
        expect(moment(res.dob).format('YYYY-MM-DD')).toBe('1993-03-02');
        expect(res.gender).toBe('m');
        expect(res.secret).toBeDefined();
        expect(res.is_verified).toBe(true);
        expect(res.verification_code).toBeNull();
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should reject when code not found in registerVerification collection', function (done) {
    (models['CustomerTest'].update({'username': 'aa@gmail.com'}, {$set: {verification_code: '123465', is_verified: false}}))
      .then(res => {
        return rp({
          method: 'post',
          body: {
            code: '987612',
            username: 'aa@gmail.com',
          },
          uri: lib.helpers.apiTestURL('register/verify'),
          json: true,
          resolveWithFullResponse: true,
        });
      })
      .then(res => {
        this.fail('Customer can verify with non-exist code');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.codeNotFound.status);
        expect(err.error).toBe(error.codeNotFound.message);
        done();
      });
  });

  it('should get error when username is not defined', function (done) {
    (models['CustomerTest'].update({username: 'aa@gmail.com'}, {$set: {verification_code: '123456', is_verified: false}}))
      .then(res => {
        return rp({
          method: 'post',
          body: {
            code: '987612',
          },
          uri: lib.helpers.apiTestURL('register/verify'),
          json: true,
          resolveWithFullResponse: true,
        });
      })
      .then(res => {
        this.fail('Customer can verify with non-exist code');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.noCodeUsername.status);
        expect(err.error).toBe(error.noCodeUsername.message);
        done();
      });
  });

  it('should get error when code is not defined', function (done) {
    (models['CustomerTest'].update({username: 'aa@gmail.com'}, {$set: {verification_code: '123465', is_verified: false}}))
      .then(res => {
        return rp({
          method: 'post',
          body: {
            username: 'aa@gmail.com',
          },
          uri: lib.helpers.apiTestURL('register/verify'),
          json: true,
          resolveWithFullResponse: true,
        });
      })
      .then(res => {
        this.fail('Customer can verify with non-exist code');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.noCodeUsername.status);
        expect(err.error).toBe(error.noCodeUsername.message);
        done();
      });
  });

  it('should apply for new code', function (done) {
    this.done = done;
    (models['CustomerTest'].update({username: 'aa@gmail.com'}, {$set: {verification_code: '123456', is_verified: false}}))
      .then(res => {
        return rp({
          method: 'post',
          body: {
            username: 'aa@gmail.com',
          },
          uri: lib.helpers.apiTestURL('register/resend'),
          json: true,
          resolveWithFullResponse: true,
        });
      })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['RegisterVerificationTest'].find({'customer_data.username': 'aa@gmail.com'}).lean();
      })
      .then(res => {
        expect(res.verification_code).not.toBe('123456');
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});