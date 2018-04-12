const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');


describe('Get User All Orders', () => {
  let customerObj = {
    cid: null,
    jar: null
  };
  let type1, brand1;
  let products = [];
  let productIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let existingOrderId;
  let existingOrderForSecondCustomer;
  let colorIds = [];
  let address= {
    province: "assd",
    city: "dsgg",
    district: "sdgsdg",
    street: "sdgsdgdsg",
    unit: "2",
    no: "4",
    postal_code: "512123456",
    loc: {
      type: {
        long: 12,
        lat: 12,
      }
    }
  };


  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
        .then(() =>
            lib.dbHelpers.addAndLoginCustomer('test@test', "123456", {
              addresses: [address]
            }))
        .then(res => {
          models['CustomerTest'].find({_id: res.cid}).then(r => {
          }).catch(e => console.log(e));
          console.log(res.cid);
          customerObj.cid = res.cid;
          customerObj.jar = res.rpJar;
          type1 = models['ProductTypeTest']({
            name: 'type1'
          });
          brand1 = models['BrandTest']({
            name: 'Nike'
          });

          return Promise.all([type1.save(), brand1.save()]);
        })
        .then(() => {
          products.push(models['ProductTest']({
            _id: productIds[0],
            name: 'sample name',
            product_type: {
              name: type1.name,
              product_type_id: type1._id
            },
            brand: {
              name: brand1.name,
              brand_id: brand1._id
            },
            base_price: 30000,
            desc: 'some description for this product',
            instances: [
              {
                _id: productInstanceIds[0],
                product_color_id: mongoose.Types.ObjectId(),
                size: "9",
                price: 2000,
                barcode: '0394081341'
              },
              {
                _id: productInstanceIds[1],
                product_color_id: mongoose.Types.ObjectId(),
                size: "10",
                price: 4000,
                barcode: '19231213123'
              }
            ]
          }));
          products.push(models['ProductTest']({
            _id: productIds[1],
            name: 'another simple name',
            product_type: {
              name: type1.name,
              product_type_id: type1._id
            },
            brand: {
              name: brand1.name,
              brand_id: brand1._id,
            },
            base_price: 600000,
            desc: "some else description for this product",
            instances: [
              {
                _id: productInstanceIds[2],
                product_color_id: mongoose.Types.ObjectId(),
                size: "11",
                price: 50000,
                barcode: '9303850203',
              }
            ]
          }));
          return Promise.all([products[0].save(), products[1].save()]);
        })
        .then(() => {
          existingOrderForSecondCustomer = {
            customer_id: customerObj.cid,
            address:address,
            total_amount: 0,
            order_time: new Date(),
            is_cart: false,
            transaction_id: mongoose.Types.ObjectId(),
            order_lines: [{
              product_id: productIds[0],
              product_instance_id: productInstanceIds[0]
            }, {
              product_id: productIds[1],
              product_instance_id: productInstanceIds[1]
            }]
          };

          return models['OrderTest'].insertMany([existingOrderForSecondCustomer]);
        })
        .then(res => {
          existingOrderId = res[0]._id;
          return models['CustomerTest'].update({_id: customerObj.cid}, {$addToSet: {orders: existingOrderId}});
        })
        .then(() => {
          done();
        })
        .catch(err => {
          console.log(err);
          done();
        });
  });
  it('should return user only order', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL('orders'),
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(3);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
});