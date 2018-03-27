const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');

describe('GET Customer', () => {
  const custData = {
    first_name: 'c',
    surname: 'v',
    balance: 20,
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
          long:35.817191,
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

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginCustomer('cust', 'pass', custData))
      .then(res => {
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;

        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it('should get balance and loyalty points of person a', function (done) {
    this.done = done;
    rp({
      method: 'get',
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

  it('should get addresses and other needed checkout data for person a', function(done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`customer/address`),
      jar: customerObj.jar,
      json: true,
    }).then( res => {
      expect(res.balance).toBe(20);
      expect(res.loyalty_points).toBe(10);
      expect(res.first_name).toBe(custData.first_name);
      expect(res.surname).toBe(custData.surname);
      expect(res.gender).toBe(custData.gender);
      expect(res.addresses.length).toBe(1);
      if (res.addresses.length){
        ['recipient_title', 'recipient_name', 'recipient_national_id', 'no', 'unit', 'street', 'postal_code', 'city', 'province'].forEach(r => {
          expect(res.addresses[0][r]).toBe(custData.addresses[0][r]);
        })


      }
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  })
});