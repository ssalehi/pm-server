const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const _const = require('../../../lib/const.list');
const error = require('../../../lib/errors.list');
const moment = require('moment');

describe('Person PUT API', () => {
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        done();
      })
      .catch(err => {
        console.error('Error in beforeEach block: ', err);
        done();
      });
  });

  it('normal user should be able to register', function (done) {
    this.done = done;
    rp({
      method: 'put',
      body: {
        username: 'aa@gmail.COM',
        password: '123456',
        first_name: 'Ali',
        surname: 'Alavi',
        dob: '1993-03-02',
        gender: 'm',
        mobile_no: '1234567890',
      },
      json: true,
      uri: lib.helpers.apiTestURL('register'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].find({}).lean();
      })
      .then(res => {
        expect(res.length).toBe(1);
        res = res[0];
        expect(res.secret).toBeDefined();
        expect(res.username).toBe('aa@gmail.com');
        expect(res.first_name.toLowerCase()).toBe('ali');
        expect(res.surname.toLowerCase()).toBe('alavi');
        expect(moment(res.dob).format('YYYY-MM-DD')).toBe('1993-03-02');
        expect(res.gender).toBe('m');
        expect(res.is_verified).toBe(_const.VERIFICATION.notVerified);
        expect(res.activation_link).not.toBeNull();
        expect(res.verification_code).toBeDefined();
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should passed error when username is not declared', function (done) {
    rp({
      method: 'put',
      body: {
        password: '123456',
        first_name: 'Ali',
        surname: 'Alavi',
        dob: '1993-03-02',
        gender: 'm',
        mobile_no: '1234567890',
      },
      json: true,
      uri: lib.helpers.apiTestURL('register'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('user can register with not completed data');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.noCompleteRegisterData.status);
        expect(err.error).toBe(error.noCompleteRegisterData.message);
        done();
      });
  });

  it("should get error when username is exist", function (done) {
    (new models()['CustomerTest']({
      username: 'aa@gmail.com',
      password: '123456',
      first_name: 'Ali',
      surname: 'Alavi',
      dob: '1993-03-02',
      gender: 'm',
      mobile_no: '1234567890',
      is_verified: _const.VERIFICATION.bothVerified,
    })).save()
      .then(res => {
        return rp({
          method: 'put',
          body: {
            username: 'aa@gmail.com',
            password: '123456',
            first_name: 'Asghar',
            surname: 'Asghari',
            dob: '2000-10-10',
            gender: 'm',
            mobile_no: '1234121891',
          },
          json: true,
          uri: lib.helpers.apiTestURL('register'),
          resolveWithFullResponse: true,
        })
      })
      .then(res => {
        this.fail('User can register with existing username');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.customerExist.status);
        expect(err.error).toBe(error.customerExist.message);
        done();
      });
  });

  it("should get error when mobile_no is exist", function (done) {
    (new models()['CustomerTest']({
      username: 'aa@gmail.COM',
      password: '123456',
      first_name: 'Ali',
      surname: 'Alavi',
      dob: '1993-03-02',
      gender: 'm',
      mobile_no: '1234567890',
      is_verified: _const.VERIFICATION.bothVerified,
    })).save()
      .then(res => {
        return rp({
          method: 'put',
          body: {
            username: 'asghar@gmail.COM',
            password: '123456',
            first_name: 'Asghar',
            surname: 'Asghari',
            dob: '2000-10-10',
            gender: 'm',
            mobile_no: '1234567890',
          },
          json: true,
          uri: lib.helpers.apiTestURL('register'),
          resolveWithFullResponse: true,
        })
      })
      .then(res => {
        this.fail('User can register with existing mobile number');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.customerExist.status);
        expect(err.error).toBe(error.customerExist.message);
        done();
      });
  });
});