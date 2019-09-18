const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');

describe('GET Customer', () => {
  const custData = {
    first_name: 'c',
    surname: 'v',
    balance: 20,
    shoesType: "EU",
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

  let preferred_brands, preferred_size, preferred_tags;
  let brands = [];
  let tagGroups = [];
  let tags = [];


  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginCustomer('cust', 'pass', custData))
      .then(res => {
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;

        brands = [
          {_id: mongoose.Types.ObjectId(), name: 'Nike'},
          {_id: mongoose.Types.ObjectId(), name: 'Puma'},
          {_id: mongoose.Types.ObjectId(), name: 'Addidas'}
        ];
        tagGroups = [
          {_id: mongoose.Types.ObjectId(), name: 'Category'},
          {_id: mongoose.Types.ObjectId(), name: 'Sub Division'},
          {_id: mongoose.Types.ObjectId(), name: 'Gender'}
        ];
        tags = [
          {_id: mongoose.Types.ObjectId(), name: 'ACTION SPORTS', tag_group_id: tagGroups[0]._id},
          {_id: mongoose.Types.ObjectId(), name: 'RUNNING', tag_group_id: tagGroups[0]._id},
          {_id: mongoose.Types.ObjectId(), name: 'FOOTBALL/SOCCER', tag_group_id: tagGroups[0]._id},
          {_id: mongoose.Types.ObjectId(), name: 'TRAINING', tag_group_id: tagGroups[0]._id},
          {_id: mongoose.Types.ObjectId(), name: 'BALL PUMP', tag_group_id: tagGroups[1]._id},
          {_id: mongoose.Types.ObjectId(), name: 'TOWEL', tag_group_id: tagGroups[1]._id},
          {_id: mongoose.Types.ObjectId(), name: 'SLIP-ON SHOES', tag_group_id: tagGroups[2]._id},
          {_id: mongoose.Types.ObjectId(), name: 'BASKETBALL', tag_group_id: tagGroups[2]._id},
          {_id: mongoose.Types.ObjectId(), name: 'BaseBall', tag_group_id: tagGroups[2]._id}
        ];

        return Promise.all([
          models()['BrandTest'].insertMany(brands),
          models()['TagGroupTest'].insertMany(tagGroups),
          models()['TagTest'].insertMany(tags),
        ]);
      })
      .then(res => {
        return models()['CustomerTest'].update(
          {
            _id: customerObj.cid,
          }, {
            $set: {
              preferred_brands: [brands[0]._id, brands[1]._id],
              preferred_tags: [tags[0]._id, tags[4]._id, tags[6]._id],
              preferred_size: '10',
              is_preferences_set: false,
            }
          });
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.error(err);
        done();
      });
  });

  it('should get balance and loyalty points of person a', function (done) {
    this.done = done;
    rp({
      method: 'GET',
      uri: lib.helpers.apiTestURL(`customer/balance`),
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.balance).toBe(20);
      expect(res.body.loyalty_points).toBe(10);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get addresses and other needed checkout data for person a', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`customer/address`),
      jar: customerObj.jar,
      json: true,
    }).then(res => {
      expect(res.balance).toBe(20);
      expect(res.loyalty_points).toBe(10);
      expect(res.first_name).toBe(custData.first_name);
      expect(res.surname).toBe(custData.surname);
      expect(res.gender).toBe(custData.gender);
      expect(res.addresses.length).toBe(1);
      if (res.addresses.length) {
        ['recipient_title', 'recipient_name', 'recipient_national_id', 'no', 'unit', 'street', 'postal_code', 'city', 'province'].forEach(r => {
          expect(res.addresses[0][r]).toBe(custData.addresses[0][r] + '');
        })


      }
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get current preference of customer', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL('customer/preferences'),
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        res = res.body;
        console.log('res: ', res);
        expect(res.preferred_size).toBe('10');
        expect(res.preferred_brands.map(el => el._id)).toContain(brands[0]._id.toString());
        expect(res.preferred_brands.map(el => el._id)).toContain(brands[1]._id.toString());
        expect(res.preferred_tags.map(el => el._id)).toContain(tags[0]._id.toString());
        expect(res.preferred_tags.map(el => el._id)).toContain(tags[4]._id.toString());
        expect(res.preferred_tags.map(el => el._id)).toContain(tags[6]._id.toString());
        expect(res.is_preferences_set).toBe(false);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});

describe('GET Customer Activation Email', () => {
  let customerObj = {
    cid: null,
    jar: null,
  };
  let activation_link = 'a3ys5u4d6fjtkuyglhef';

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginCustomer('cust', 'pass', {
        activation_link: activation_link,
        is_verified: _const.VERIFICATION.notVerified
      }))
      .then(res => {
        customerObj = {
          cid: res.cid,
          jar: res.rpJar,
        };
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      })
  });

  it('should email-verify the user via the sent link', function (done) {
    this.done = done;
    rp({
      method: 'GET',
      uri: lib.helpers.apiTestURL(`user/activate/link/${activation_link}`),
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].find({username: 'cust'}).lean();
      })
      .then(res => {
        expect(res.length).toBe(1);
        res = res[0];
        expect(res.activation_link).toBeNull();
        expect(res.is_verified).toBe(_const.VERIFICATION.emailVerified);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});
