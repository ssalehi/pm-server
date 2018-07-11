const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');

// describe('Set Address', () => {
//   let customerObj = {};
//   let customerObj2 = {};
//   beforeEach(done => {
//     lib.dbHelpers.dropAll()
//       .then(res => {
//         return lib.dbHelpers.addAndLoginCustomer('sa', '123', {first_name: 'test first name', surname: 'test surname'})
//       }).then(res => {
//       let rpJar = null;
//       customerObj.cid = res.cid;
//       customerObj.jar = res.rpJar;
//       return lib.dbHelpers.addAndLoginCustomer('sareh', '123456', {
//         first_name: 'test second name',
//         surname: 'test second surname'
//       })
//     })
//       .then(res => {
//         let rpJar = null;
//         customerObj2.cid = res.cid;
//         customerObj2.jar = res.rpJar;
//         done();
//       })
//       .catch(err => {
//         console.log(err);
//         done();
//       });
//   });
//
//   it('should add new address for existing valid user', function (done) {
//     this.done = done;
//     rp({
//       method: 'post',
//       body: {
//         city: 'Tehran',
//         street: 'Valiasr',
//         province: 'Tehran',
//         recipient_title: 'm',
//         recipient_name: 'Sasan',
//         recipient_surname: 'Vaziri',
//         recipient_national_id: '123321',
//         recipient_mobile_no: '091212121212',
//         unit: 13,
//         no: 18,
//         postal_code: 13445,
//         loc: {long: 2345, lat: 3445}
//       },
//       jar: customerObj.jar,
//       json: true,
//       uri: lib.helpers.apiTestURL('user/address'),
//       resolveWithFullResponse: true,
//     }).then(res => {
//       expect(res.statusCode).toBe(200);
//       return models()['CustomerTest'].findOne({username: 'sa'})
//     }).then(res => {
//       expect(res.addresses.length).toBe(1);
//       expect(res.addresses[0].city).toBe('Tehran');
//       done();
//     }).catch(lib.helpers.errorHandler.bind(this));
//   });
//
//   it('should add second address for customer', function (done) {
//     this.done = done;
//     models()['CustomerTest'].update({
//       username: 'sa',
//     }, {
//       $addToSet: {
//         'addresses': {
//           city: 'Rasht',
//           street: 'Zartosht',
//           province: 'Gilan',
//           recipient_title: 'f',
//           recipient_name: 'Sima',
//           recipient_surname: 'Vaziri',
//           recipient_national_id: '11111',
//           recipient_mobile_no: '091212121212',
//           unit: 23,
//           no: 34,
//           postal_code: 8738,
//           loc: {long: 5435, lat: 8943}
//         }
//       }
//     })
//       .then(res =>
//         rp({
//           method: 'post',
//           body: {
//             city: 'Sari',
//             street: 'Valiasr',
//             province: 'Mazandaran',
//             recipient_title: 'm',
//             recipient_name: 'Sia',
//             recipient_surname: 'Vaziri',
//             recipient_national_id: '55555',
//             recipient_mobile_no: '0911111111',
//             unit: 15,
//             no: 5,
//             postal_code: 25456,
//             loc: {long: 2345, lat: 3445}
//           },
//           jar: customerObj.jar,
//           json: true,
//           uri: lib.helpers.apiTestURL('user/address'),
//           resolveWithFullResponse: true,
//         })
//       )
//       .then(res => {
//         expect(res.statusCode).toBe(200);
//         return models()['CustomerTest'].findOne({username: 'sa'})
//       }).then(res => {
//       expect(res.addresses.length).toBe(2);
//       expect(res.addresses[0].city).toBe('Rasht');
//       expect(res.addresses[1].city).toBe('Sari');
//       expect(res.addresses[1].recipient_name).toBe('Sia');
//       done();
//
//     }).catch(lib.helpers.errorHandler.bind(this));
//   });
//
//   it('should edit address for customer', function (done) {
//     this.done = done;
//     let tempId = 1;
//     models()['CustomerTest'].update({
//       username: 'sa',
//     }, {
//       $addToSet: {
//         'addresses': {
//           city: 'Rasht',
//           street: 'Zartosht',
//           province: 'Gilan',
//           recipient_title: 'f',
//           recipient_name: 'Simin',
//           recipient_surname: 'Vaziri',
//           recipient_national_id: '11111',
//           recipient_mobile_no: '091212121212',
//           unit: 23,
//           no: 34,
//           postal_code: 8738,
//           loc: {long: 5435, lat: 8943}
//         }
//       }
//     })
//       .then(res => {
//         return models()['CustomerTest'].findOne({username: 'sa'})
//       })
//       .then(res => {
//           expect(res.addresses.length).toBe(1);
//           expect(res.addresses[0].city).toBe('Rasht');
//           expect(res.addresses[0].street).toBe('Zartosht');
//           expect(res.addresses[0].recipient_name).toBe('Simin');
//           console.log(res.addresses[0]._id);
//           return rp({
//             method: 'post',
//             body: {
//               _id: res.addresses[0]._id,
//               city: 'Rasht',
//               street: 'Zartosht Gharbi',
//               province: 'Gilan',
//               recipient_title: 'm',
//               recipient_name: 'Soroush',
//               recipient_surname: 'Vaziri',
//               recipient_national_id: '212121',
//               recipient_mobile_no: '091212121212',
//               unit: 23,
//               no: 34,
//               postal_code: 8738,
//               loc: {long: 5435, lat: 8943}
//             },
//             jar: customerObj.jar,
//             json: true,
//             uri: lib.helpers.apiTestURL('user/address'),
//             resolveWithFullResponse: true,
//           })
//         }
//       )
//       .then(res => {
//         expect(res.statusCode).toBe(200);
//         return models()['CustomerTest'].findOne({username: 'sa'})
//       }).then(res => {
//       expect(res.addresses.length).toBe(1);
//       expect(res.addresses[0].city).toBe('Rasht');
//       expect(res.addresses[0].street).toBe('Zartosht Gharbi');
//       expect(res.addresses[0].recipient_name).toBe('Soroush');
//       done();
//
//     }).catch(lib.helpers.errorHandler.bind(this));
//   });
//
//   it('should add new address for another logged in customer', function (done) {
//     this.done = done;
//     return models()['CustomerTest'].find()
//       .then(res => {
//         expect(res.length).toBe(2);
//         return rp({
//           method: 'post',
//           body: {
//             city: 'Qom',
//             street: 'Honarestan',
//             province: 'Qom',
//             recipient_title: 'f',
//             recipient_name: 'Zahra',
//             recipient_surname: 'Salehi',
//             recipient_national_id: '558822',
//             recipient_mobile_no: '09120000000',
//             unit: 4,
//             no: 20,
//             postal_code: 3715976155,
//             loc: {long: 1245, lat: 3478}
//           },
//           jar: customerObj2.jar,
//           json: true,
//           uri: lib.helpers.apiTestURL('user/address'),
//           resolveWithFullResponse: true,
//         })
//       })
//       .then(res => {
//         expect(res.statusCode).toBe(200);
//         return models()['CustomerTest'].findOne({username: 'sareh'})
//       }).then(res => {
//         expect(res.addresses.length).toBe(1);
//         expect(res.addresses[0].city).toBe('Qom');
//         done();
//       }).catch(lib.helpers.errorHandler.bind(this));
//   })
// });

// Guest User
// describe('Guest User', () => {
//   beforeEach(done => {
//     lib.dbHelpers.dropAll()
//       .then(() => {
//         return lib.dbHelpers.addCustomer('sareh@gmail.com', '12131111', {  // add a guest (not verified) user first
//           is_verified: false,
//           is_guest: true,
//           first_name: 'Sareh',
//           surname: 'Salehi',
//           addresses: [{
//             city: 'Tehran',
//             street: 'Zartosht',
//             province: 'Tehran',
//             recipient_title: 'f',
//             recipient_name: 'Sima',
//             recipient_surname: 'Salehi',
//             recipient_national_id: '123321',
//             recipient_mobile_no: '091212121212',
//             district: '',
//             unit: 13,
//             no: 18,
//             postal_code: 13445,
//             loc: {long: 2345, lat: 3445},
//           }],
//         });
//       })
//       .then(res => {
//         done();
//       })
//       .catch(err => {
//         console.log(err);
//         done();
//       });
//   });
//
//   it("should get error when email exist", function (done) {
//     this.done = done;
//     (new models()['CustomerTest']({ // add a verified user (not guest) to database first
//       username: 'sam@gmail.com',
//       first_name: 'saman',
//       surname: 'vaziri',
//       mobile_no: '0912000000',
//       addresses: [],
//       is_verified: true,
//       is_guest: false
//     })).save()
//       .then(res => {
//         return rp({
//           method: 'post',
//           body: {
//             username: 'sam@gmail.com',
//             first_name: 'asd',
//             surname: 'ad',
//             mobile_no: '2343424324',
//             addresses: [{
//               province: 'Tehran',
//               city: 'tehran',
//               street: 'zartosht',
//               recipient_title: 'm',
//               recipient_name: 'Sasan',
//               recipient_surname: 'Vaziri',
//               recipient_national_id: '123321',
//               recipient_mobile_no: '091212121212',
//               unit: 13,
//               no: 18,
//               postal_code: 13445,
//               loc: {long: 2345, lat: 3445},
//             }
//             ],
//             is_verified: true,
//             is_guest: false
//           },
//           json: true,
//           uri: lib.helpers.apiTestURL('user/guest/address'),
//           resolveWithFullResponse: true,
//         })
//       })
//       .then(res => {
//         this.fail('Email already exists!');
//         done();
//       })
//       .catch(err => {
//         expect(err.statusCode).toBe(error.customerExist.status);
//         expect(err.error).toBe(error.customerExist.message);
//         done();
//       });
//   });
//
//   it('should update guest information that already exist', function (done) {
//     this.done = done;
//     models()['CustomerTest'].update({
//         username: 'sareh@gmail.com',
//         is_verified: false,
//         is_guest: true,
//       }
//     ).then(res => {
//         console.log(res);
//         return rp({
//           method: 'post',
//           body: {
//             username: 'sareh@gmail.com',
//             first_name: 'asd',
//             surname: 'ad',
//             mobile_no: '2343424324',
//             addresses: [{
//               city: 'Tehran',
//               street: 'Zartosht Gharbi',
//               province: 'Tehran',
//               recipient_title: 'f',
//               recipient_name: 'Sahar',
//               recipient_surname: 'Salehi',
//               recipient_national_id: '123321',
//               recipient_mobile_no: '09112233333',
//               district: '',
//               unit: 13,
//               no: 18,
//               postal_code: 13445,
//               loc: {long: 2345, lat: 3445},
//             }],
//             gender: 'f',
//           },
//           json: true,
//           uri: lib.helpers.apiTestURL('user/guest/address'),
//           resolveWithFullResponse: true,
//         })
//       }
//     )
//       .then(res => {
//         expect(res.statusCode).toBe(200);
//         return models()['CustomerTest'].find().lean();
//       }).then(res => {
//       expect(res.length).toBe(1);
//       res = res[0];
//       expect(res.username).toBe('sareh@gmail.com');
//       expect(res.first_name).toBe('asd');
//       expect(res.surname).toBe('ad');
//       expect(res.gender).toBe('f');
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
//         addresses: [
//           {
//             province: 'Tehran',
//             city: 'Tajrish',
//             street: 'emam',
//             recipient_title: 'f',
//             recipient_name: 'Zahra',
//             recipient_surname: 'Salehi',
//             recipient_national_id: '558822',
//             recipient_mobile_no: '0912111111',
//             unit: 4,
//             no: 20,
//             postal_code: 3715976155,
//             loc: {long: 1245, lat: 3478}
//           },
//           {
//             province: 'Qom',
//             city: 'Qom',
//             street: 'Honarestan',
//             recipient_title: 'm',
//             recipient_name: 'Ali',
//             recipient_surname: 'Salehi',
//             recipient_national_id: '55881111',
//             recipient_mobile_no: '0912111111',
//             unit: 3,
//             no: 13,
//             postal_code: 3715976155,
//             loc: {long: 1245, lat: 3478}
//           }
//         ],
//         is_guest: true
//       },
//       json: true,
//       uri: lib.helpers.apiTestURL('user/guest/address'),
//       resolveWithFullResponse: true,
//     }).then(res => {
//       expect(res.statusCode).toBe(200);
//       return models()['CustomerTest'].find().lean();
//     }).then(res => {
//       expect(res.length).toBe(2);
//       expect(res[1].username).toBe('saman@gmail.com');
//       expect(res[1].first_name).toBe('saman');
//       expect(res[1].surname).toBe('vaziri');
//       expect(res[1].mobile_no).toBe('1234567890');
//       expect(res[1].gender).toBe('m');
//       expect(res[1].is_verified).toBe(false);
//       done();
//     }).catch(lib.helpers.errorHandler.bind(this));
//   });
//
//   // TODO add spec for this state
//   // it('should add address to a exist guest user',function (done){
//   // })
// });

describe('Set User Favorite Shoes Type', () => {
  const custData = {
    first_name: 'c',
    surname: 'v',
    balance: 20,
    shoesType: "US",
    loyalty_points: 10,
    addresses: [
      {
        province: 'Tehran',
        city: 'Shemiran',
        street: 'Darband',
        no: 14,
        unit: 1,
        postal_code: 1044940912,
        loc: {
          long: 35.817191,
          lat: 51.427251,
        },
        recipient_name: 'علی علوی',
        recipient_mobile_no: '09121212121',
        recipient_national_id: '06423442',
        recipient_title: 'm',
      }
    ]
  };
  let customerObj = {
    cid: null,
    jar: null,
  };
  const custData2 = {
    first_name: 'cc',
    surname: 'vv',
    balance: 202,
    shoesType: "EU",
    loyalty_points: 102,
    addresses: [
      {
        province: 'Tehran',
        city: 'Shemiran',
        street: 'Darband',
        no: 14,
        unit: 1,
        postal_code: 1044940912,
        loc: {
          long: 35.817191,
          lat: 51.427251,
        },
        recipient_name: 'علی علوی',
        recipient_mobile_no: '09121212121',
        recipient_national_id: '06423442',
        recipient_title: 'm',
      }
    ]
  };
  let customerObj2 = {
    cid: null,
    jar: null,
  };

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginCustomer('cust', 'pass', custData))
      .then(res => {
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;
        return lib.dbHelpers.addAndLoginCustomer('cust2', 'pass2', custData2)
      })
      .then(res => {
        customerObj2.cid = res.cid;
        customerObj2.jar = res.rpJar;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });
  it('should set user shoes type from US to EU', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        shoesType: "EU"
      },
      jar: customerObj.jar,
      json: true,
      uri: lib.helpers.apiTestURL('/customer/shoesType'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].findOne({_id: customerObj.cid}, 'shoesType')
      })
      .then(res => {
        expect(res.shoesType).toBe("EU");
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should set user shoes type from EU to US', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        shoesType: "US"
      },
      jar: customerObj2.jar,
      json: true,
      uri: lib.helpers.apiTestURL('/customer/shoesType'),
      resolveWithFullResponse: true,
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models()['CustomerTest'].findOne({_id: customerObj2.cid}, 'shoesType')
    }).then(res => {
      expect(res.shoesType).toBe("US");
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
});


describe('POST Customer / ', () => {
  let username;
  let preferred_brands = [];
  let preferred_tags = [];
  let preferred_size;
  let customerObj = {cid: null, jar: null};

  beforeEach(done => {
    let info = {
      first_name: 'mohammadali',
      surname: 'farhad',
      active: true,
      shoesType: 'US',
      is_guest: false
    };
    let brandArr = [{
      name: 'nike'
    },{
      name: 'puma'
    },{
      name: 'adidas'
    }];
    let tagGroupArr = [{
      name: 'Category'
    }, {
      name: 'Sub Division'
    }, {
      name: 'Gender'
    }];
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginCustomer('cust', 'pass', info))
      .then((res) => {
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;
        return models()['TagGroupTest'].insertMany(tagGroupArr);
      }).then(tag_group => {
        return models()['TagTest'].insertMany([{
          name: 'ACTION SPORTS',
          tag_group_id: tag_group[0]._id
        }, {
          name: 'RUNNING',
          tag_group_id: tag_group[0]._id
        }, {
          name: 'FOOTBALL/SOCCER',
          tag_group_id: tag_group[0]._id
        }, {
          name: 'TRAINING',
          tag_group_id: tag_group[0]._id
        }, {
          name: 'BALL PUMP',
          tag_group_id: tag_group[1]._id
        }, {
          name: 'TOWEL',
          tag_group_id: tag_group[1]._id
        }, {
          name: 'SLIP-ON SHOES',
          tag_group_id: tag_group[2]._id
        }, {
          name: 'BASKETBALL',
          tag_group_id: tag_group[2]._id
        }, {
          name: 'BaseBall',
          tag_group_id: tag_group[2]._id
        }]);
      })
      .then(res => {
        preferred_tags = res.slice(0, 4).map(el => el._id);
        return models()['BrandTest'].insertMany(brandArr);
      })
      .then(res => {
        preferred_size = '7.5';
        preferred_brands =  res.slice(0, 1).map(el => el._id);
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it('expect preferences customer update', function (done) {
    this.done = done;

    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`customer/preferences`),
      body: {
        preferred_brands,
        preferred_tags,
        preferred_size
      },
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models()['CustomerTest'].findOne({username});
    }).then(res => {
      expect(res.preferred_size).toEqual('7.5');
      expect(res.preferred_tags.length).toBe(4);
      expect(res.preferred_brands.length).toBe(1);
      expect(res.is_preferences_set).toBe(true);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

});