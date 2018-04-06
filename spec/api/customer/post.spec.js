const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const moment = require('moment');
const mongoose = require('mongoose');

describe('Set Address', () => {
  let customerObj = {};
  let customerObj2 = {};
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        return lib.dbHelpers.addAndLoginCustomer('sa', '123', {first_name: 'test first name', surname: 'test surname'})
      }).then(res => {
      let rpJar = null;
      customerObj.cid = res.cid;
      customerObj.jar = res.rpJar;
      return lib.dbHelpers.addAndLoginCustomer('sareh', '123456', {
        first_name: 'test second name',
        surname: 'test second surname'
      })
    })
      .then(res => {
        let rpJar = null;
        customerObj2.cid = res.cid;
        customerObj2.jar = res.rpJar;
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
        province: 'Tehran',
        recipient_title: 'm',
        recipient_name: 'Sasan',
        recipient_surname: 'Vaziri',
        recipient_national_id: '123321',
        recipient_mobile_no: '091212121212',
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
          province: 'Gilan',
          recipient_title: 'f',
          recipient_name: 'Sima',
          recipient_surname: 'Vaziri',
          recipient_national_id: '11111',
          recipient_mobile_no: '091212121212',
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
            province: 'Mazandaran',
            recipient_title: 'm',
            recipient_name: 'Sia',
            recipient_surname: 'Vaziri',
            recipient_national_id: '55555',
            recipient_mobile_no: '0911111111',
            unit: 15,
            no: 5,
            postal_code: 25456,
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
      expect(res.addresses[1].recipient_name).toBe('Sia');
      done();

    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should edit address for customer', function (done) {
    this.done = done;
    let tempId = 1;
    models['CustomerTest'].update({
      username: 'sa',
    }, {
      $addToSet: {
        'addresses': {
          city: 'Rasht',
          street: 'Zartosht',
          province: 'Gilan',
          recipient_title: 'f',
          recipient_name: 'Simin',
          recipient_surname: 'Vaziri',
          recipient_national_id: '11111',
          recipient_mobile_no: '091212121212',
          unit: 23,
          no: 34,
          postal_code: 8738,
          loc: {long: 5435, lat: 8943}
        }
      }
    })
      .then(res => {
        return models['CustomerTest'].findOne({username: 'sa'})
      })
      .then(res => {
          expect(res.addresses.length).toBe(1);
          expect(res.addresses[0].city).toBe('Rasht');
          expect(res.addresses[0].street).toBe('Zartosht');
          expect(res.addresses[0].recipient_name).toBe('Simin');
          console.log(res.addresses[0]._id);
          return rp({
            method: 'post',
            body: {
              _id: res.addresses[0]._id,
              city: 'Rasht',
              street: 'Zartosht Gharbi',
              province: 'Gilan',
              recipient_title: 'm',
              recipient_name: 'Soroush',
              recipient_surname: 'Vaziri',
              recipient_national_id: '212121',
              recipient_mobile_no: '091212121212',
              unit: 23,
              no: 34,
              postal_code: 8738,
              loc: {long: 5435, lat: 8943}
            },
            jar: customerObj.jar,
            json: true,
            uri: lib.helpers.apiTestURL('user/address'),
            resolveWithFullResponse: true,
          })
        }
      )
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['CustomerTest'].findOne({username: 'sa'})
      }).then(res => {
      expect(res.addresses.length).toBe(1);
      expect(res.addresses[0].city).toBe('Rasht');
      expect(res.addresses[0].street).toBe('Zartosht Gharbi');
      expect(res.addresses[0].recipient_name).toBe('Soroush');
      done();

    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should add new address for another logged in customer', function (done) {
    this.done = done;
    return models['CustomerTest'].find()
      .then(res => {
        expect(res.length).toBe(2);
        return rp({
          method: 'post',
          body: {
            city: 'Qom',
            street: 'Honarestan',
            province: 'Qom',
            recipient_title: 'f',
            recipient_name: 'Zahra',
            recipient_surname: 'Salehi',
            recipient_national_id: '558822',
            recipient_mobile_no: '09120000000',
            unit: 4,
            no: 20,
            postal_code: 3715976155,
            loc: {long: 1245, lat: 3478}
          },
          jar: customerObj2.jar,
          json: true,
          uri: lib.helpers.apiTestURL('user/address'),
          resolveWithFullResponse: true,
        })
      })
      .then(res => {
          expect(res.statusCode).toBe(200);
          expect(res.body.n).toBe(1);
          return models['CustomerTest'].findOne({username: 'sareh'})
        }).then(res => {
          expect(res.addresses.length).toBe(1);
          expect(res.addresses[0].city).toBe('Qom');
          done();
        }).catch(lib.helpers.errorHandler.bind(this));
      })
  });

// Guest User
// describe('Guest User', () => {
//   beforeEach(done => {
//     lib.dbHe
//     lpers.dropAll()
//       .then(res => {
//       done();
//     })
//       .catch(err => {
//         console.log(err);
//         done();
//       });
//   });
//
//   it("should get error when email exist", function (done) {
//     this.done = done;
//     (new models['CustomerTest']({
//       username: 'saman@gmail.com',
//       first_name: 'saman',
//       surname: 'vaziri',
//       mobile_no: '0912000000',
//       'addresses': {
//         city: 'tehran',
//         street: 'zartosht'},
//         is_verified: true,
//         is_guest: false
//     })).save()
//       .then(res => {
//         return rp({
//           method: 'post',
//           body: {
//             username: 'saman@gmail.com',
//             first_name: 'asd',
//             surname: 'ad',
//             mobile_no: '2343424324',
//             city: 'tehran',
//             street: 'zartosht',
//             is_verified: true,
//             is_guest: false
//           },
//           json: true,
//           uri: lib.helpers.apiTestURL('user/guest/address'),
//           resolveWithFullResponse: true,
//         })
//       })
//       .then(res => {
//        this.fail('Email already exists!');
//         done();
//       })
//       .catch(err => {
//        expect(err.statusCode).toBe(error.customerExist.status);
//        expect(err.error).toBe(error.customerExist.message);
//         done();
//       });
//   });
//
//   it('should update guest information that already exist', function (done) {
//     this.done = done;
//     models['CustomerTest'].update({
//       username: 'saman@gmail.com',
//       is_verified: false,
//       is_guest: true,
//     }, {
//       $set: {
//         first_name: 'saman',
//         surname: 'vaziri',
//         mobile_no: '0912000000',
//         'addresses': {
//           city: 'tehran',
//           street: 'zartosht'},
//       },
//     }).then(res =>
//         rp({
//           method: 'post',
//           body: {
//             username: 'saman@gmail.com',
//             first_name: 'asd',
//             surname: 'ad',
//             mobile_no: '2343424324',
//             city: 'tehran',
//             street: 'zartosht',
//             gender: 'm',
//             is_verified: false,
//             is_guest: false
//           },
//           json: true,
//           uri: lib.helpers.apiTestURL('user/guest/address'),
//           resolveWithFullResponse: true,
//         })
//       )
//       .then(res => {
//         expect(res.statusCode).toBe(200);
//         return models['CustomerTest'].find().lean();
//       }).then(res => {
//       expect(res.length).toBe(1);
//       res = res[0];
//       expect(res.username).toBe('saman@gmail.com');
//       expect(res.first_name).toBe('asd');
//       expect(res.surname).toBe('ad');
//       expect(res.gender).toBe('m');
//       expect(res.is_verified).toBe(false);
//       done();
//     }).catch(lib.helpers.errorHandler.bind(this));
//   });
//
//   it('should add new guest', function (done) {
//     this.done = done;
//     rp({
//       method: 'post',
//       body: {
//         username: 'saman@gmail.com',
//         first_name: 'saman',
//         surname: 'vaziri',
//         mobile_no: '1234567890',
//         gender: 'm',
//         is_verified: false,
//         is_guest: true
//       },
//       json: true,
//       uri: lib.helpers.apiTestURL('user/guest/address'),
//       resolveWithFullResponse: true,
//     }).then(res => {
//         expect(res.statusCode).toBe(200);
//         return models['CustomerTest'].find().lean();
//       }).then(res => {
//             expect(res.length).toBe(1);
//             res = res[0];
//             expect(res.username).toBe('saman@gmail.com');
//             expect(res.first_name).toBe('saman');
//             expect(res.surname).toBe('vaziri');
//             expect(res.mobile_no).toBe('1234567890');
//             expect(res.gender).toBe('m');
//             expect(res.is_verified).toBe(false);
//             done();
//           }).catch(lib.helpers.errorHandler.bind(this));
//     })
// });