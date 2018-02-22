const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
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
        return models['CustomerTest'].find({}).lean();
      })
      .then(res => {
        expect(res.length).toBe(1);
        res = res[0];
        expect(res.username).toBe('aa@gmail.com');
        expect(res.first_name.toLowerCase()).toBe('ali');
        expect(res.surname.toLowerCase()).toBe('alavi');
        expect(moment(res.dob).format('YYYY-MM-DD')).toBe('1993-03-02');
        expect(res.gender).toBe('m');
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

  // ['username', 'password', 'first_name']
});