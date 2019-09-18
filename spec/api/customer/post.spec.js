const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');


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