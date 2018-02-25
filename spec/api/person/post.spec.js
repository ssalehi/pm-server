const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const moment = require('moment');

describe('Person POST API', () => {
  let needSetup = true;
  beforeEach(done => {
    // if (needSetup)
    lib.dbHelpers.dropAll()
      .then(res => {
        let obj = new lib.Agent(true);
        return obj.save({
          first_name: 'admin',
          surname: 'admin',
          username: 'admin',
          secret: '123456',
          mobile_no: '01256993730',
          gender: 'm',
          access_level: 0
        });
      })
      .then(res => {
        let obj = new lib.Agent(true);
        return obj.save({
          first_name: 's',
          surname: 'c',
          username: 'shipping-clerk',
          secret: '123456',
          mobile_no: '09391999852',
          gender: 'f',
          access_level: 1,
        });
      })
      .then(res => {
        let obj = new lib.Customer(true);
        return obj.save({
          first_name: 'ali',
          surname: 'alavi',
          username: 'aa',
          secret: '123456',
          mobile_no: '+989391993730',
          gender: 'm',
          address: [
            {
              city: 'Tehran',
              street: 'beheshti',
            },
          ],
        });
      })
      .then(res => {
        needSetup = false;
        done();
      })
      .catch(err => {
        console.error('Error in before each: ', err);
        done();
      });
    // else
    //   done();
  });

  it('admin should login', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        username: 'admin',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('agent/login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('admin');
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
        username: 'shipping-clerk',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('agent/login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('shipping-clerk');
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
        username: 'aa',
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
        username: 'aa',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('aa');
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
        username: 'aa',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('app/login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('aa');
        expect(res.body.personType).toBe('customer');
        expect(res.body.access_level).toBeUndefined();
        expect(res.body.token).toBeDefined();
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('normal user should be able to verify his phone number', function (done) {
    this.done = done;
    (new models['RegisterVerificationTest']({
      code: '123456',
      customer_data: {
        first_name: 'ali',
        surname: 'alavi',
        username: 'aa@gmail.com',
        mobile_no: '+98123456789',
        dob: '1993-03-02',
        gender: 'm',
      },
      secret: 'adsf@#GFSD21342sdfg-89asdf',
    })).save()
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

        return models['RegisterVerificationTest'].find({code: '123456'}).lean();
      })
      .then(res => {
        expect(res.length).toBe(0);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should reject when code not found in registerVerification collection", function (done) {
    (new models['RegisterVerificationTest']({
      code: '123456',
      customer_data: {
        first_name: 'ali',
        surname: 'alavi',
        username: 'aa@gmail.com',
        mobile_no: '+98123456789',
        dob: '1993-03-02',
        gender: 'm',
      },
      secret: 'adsf@#GFSD21342sdfg-89asdf',
    })).save()
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

  it("should get error when username is not defined", function (done) {
    (new models['RegisterVerificationTest']({
      code: '123456',
      customer_data: {
        first_name: 'ali',
        surname: 'alavi',
        username: 'aa@gmail.com',
        mobile_no: '+98123456789',
        dob: '1993-03-02',
        gender: 'm',
      },
      secret: 'adsf@#GFSD21342sdfg-89asdf',
    })).save()
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

  it("should get error when code is not defined", function (done) {
    (new models['RegisterVerificationTest']({
      code: '123456',
      customer_data: {
        first_name: 'ali',
        surname: 'alavi',
        username: 'aa@gmail.com',
        mobile_no: '+98123456789',
        dob: '1993-03-02',
        gender: 'm',
      },
      secret: 'adsf@#GFSD21342sdfg-89asdf',
    })).save()
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
});