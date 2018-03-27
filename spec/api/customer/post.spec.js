const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const moment = require('moment');
const mongoose = require('mongoose');

describe('Set Address', () => {
  let customerObj = {};
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        //console.log('s1111111', res);
        return lib.dbHelpers.addAndLoginCustomer('sa', '123', {first_name: 'test first name', surname: 'test surname'})

      }).then(res => {
        let rpJar = null;
      customerObj.cid = res.cid;
      customerObj.jar = res.rpJar;
      done();
    })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it('should add new address for existing valid user', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        city: 'Tehran',
        street: 'Valiasr',
        unit: 13,
        no: 18,
        postal_code: 13445,
        loc: {long: 2345, lat: 3445}
      },
      jar: customerObj.jar,
      json: true,
      uri: lib.helpers.apiTestURL('user/address'),
      resolveWithFullResponse: true,
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.n).toBe(1);
      return models['CustomerTest'].findOne({username: 'sa'})
    }).then(res => {
      expect(res.addresses.length).toBe(1);
      expect(res.addresses[0].city).toBe('Tehran');
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should add second address for customer', function (done) {
    this.done = done;
    models['CustomerTest'].update({
      username: 'sa',
    }, {
      $addToSet: {
        'addresses': {
          city: 'Rasht',
          street: 'Zartosht',
          unit: 23,
          no: 34,
          postal_code: 8738,
          loc: {long: 5435, lat: 8943}
        }
      }
    })
      .then(res =>
        rp({
          method: 'post',
          body: {
            city: 'Sari',
            street: 'Valiasr',
            unit: 13,
            no: 18,
            postal_code: 13445,
            loc: {long: 2345, lat: 3445}
          },
          jar: customerObj.jar,
          json: true,
          uri: lib.helpers.apiTestURL('user/address'),
          resolveWithFullResponse: true,
        })
      )
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['CustomerTest'].findOne({username: 'sa'})
      }).then(res => {
      expect(res.addresses.length).toBe(2);
      expect(res.addresses[0].city).toBe('Rasht');
      expect(res.addresses[1].city).toBe('Sari');
      done();

    }).catch(lib.helpers.errorHandler.bind(this));
  });
});

//Guest User
describe('Guest User', () => {
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
      done();
    })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it("should get error when email exist", function (done) {
    this.done = done;
    (new models['CustomerTest']({
      username: 'saman@gmail.com',
      first_name: 'saman',
      surname: 'vaziri',
      mobile_no: '0912000000',
      'addresses': {
        city: 'tehran',
        street: 'zartosht'},
        is_verified: true,
        is_guest: false
    })).save()
      .then(res => {
        return rp({
          method: 'post',
          body: {
            username: 'saman@gmail.com',
            first_name: 'asd',
            surname: 'ad',
            mobile_no: '2343424324',
            city: 'tehran',
            street: 'zartosht',
            is_verified: true,
            is_guest: false
          },
          json: true,
          uri: lib.helpers.apiTestURL('user/guest/address'),
          resolveWithFullResponse: true,
        })
      })
      .then(res => {
       this.fail('Email already exists!');
        done();
      })
      .catch(err => {
       expect(err.statusCode).toBe(error.customerExist.status);
       expect(err.error).toBe(error.customerExist.message);
        done();
      });
  });

  it('should update guest information that already exist', function (done) {
    this.done = done;
    models['CustomerTest'].update({
      username: 'saman@gmail.com',
      is_verified: false,
      is_guest: true,
    }, {
      $set: {
        first_name: 'saman',
        surname: 'vaziri',
        mobile_no: '0912000000',
        'addresses': {
          city: 'tehran',
          street: 'zartosht'},
      },
    }).then(res =>
        rp({
          method: 'post',
          body: {
            username: 'saman@gmail.com',
            first_name: 'asd',
            surname: 'ad',
            mobile_no: '2343424324',
            city: 'tehran',
            street: 'zartosht',
            gender: 'm',
            is_verified: false,
            is_guest: false
          },
          json: true,
          uri: lib.helpers.apiTestURL('user/guest/address'),
          resolveWithFullResponse: true,
        })
      )
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['CustomerTest'].find().lean();
      }).then(res => {
      expect(res.length).toBe(1);
      res = res[0];
      expect(res.username).toBe('saman@gmail.com');
      expect(res.first_name).toBe('asd');
      expect(res.surname).toBe('ad');
      expect(res.gender).toBe('m');
      expect(res.is_verified).toBe(false);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should add new guest', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        username: 'saman@gmail.com',
        first_name: 'saman',
        surname: 'vaziri',
        mobile_no: '1234567890',
        gender: 'm',
        is_verified: false,
        is_guest: true
      },
      json: true,
      uri: lib.helpers.apiTestURL('user/guest/address'),
      resolveWithFullResponse: true,
    }).then(res => {
        expect(res.statusCode).toBe(200);
        return models['CustomerTest'].find().lean();
      }).then(res => {
            expect(res.length).toBe(1);
            res = res[0];
            expect(res.username).toBe('saman@gmail.com');
            expect(res.first_name).toBe('saman');
            expect(res.surname).toBe('vaziri');
            expect(res.mobile_no).toBe('1234567890');
            expect(res.gender).toBe('m');
            expect(res.is_verified).toBe(false);
            done();
          }).catch(lib.helpers.errorHandler.bind(this));
    })
});