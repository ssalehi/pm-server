const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const mongoose = require('mongoose');
const error = require('../../../lib/errors.list');
const _const = require('../../../lib/const.list');
const _warehouses = require('../../../warehouses');
const moment = require('moment');


xdescribe('POST Search Collection', () => {

  let adminObj = {
    aid: null,
    jar: null,
  };

  beforeEach((done) => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('admin');
      })
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
        let collectionArr = [{
          name: 'collection 001',
          name_fa: 'کالکشن 1',
        }, {
          name: 'collection 0012',
          name_fa: 'کالکشن 2',
        }, {
          name: 'collection 003',
          name_fa: 'کالکشن 3',
        }, {
          name: 'collection 004',
          name_fa: 'کالکشن 4',
        }, {
          name: 'collection 005',
          name_fa: 'کالکشن 5',
        }, {
          name: 'collection 006',
          name_fa: 'کالکشن 6',
        }];
        models()['CollectionTest'].insertMany(collectionArr).then(res => {
          done();
        });
      }).catch(err => {
        console.log(err);
        done();
      });
  });


  it('expect return all collections when phrase is empty', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`/search/Collection`),
      body: {
        options: {
          phrase: ''
        },
        offset: 0,
        limit: 10
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      res = res.body.data;
      expect(res.length).toEqual(6);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect return all collections which contains the phrase name', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`/search/Collection`),
      body: {
        options: {
          phrase: '001'
        },
        offset: 0,
        limit: 10
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      res = res.body.data;
      expect(res.length).toEqual(2);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when some one other than content manager is calling api', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`search/Collection`),
      body: {
        options: {
          phrase: "",
          is_smart: true
        },
        offset: 0,
        limit: 10,
      },
      json: true,
      // jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('some one other than content manager could call api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.noAccess.status);
        expect(err.error).toBe(error.noAccess.message);
        done();
      });
  });

});

xdescribe('POST Search Page', () => {

  let page1, page2, collection1, collection2;
  let adminObj = {
    aid: null,
    jar: null,
  };

  beforeEach((done) => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('admin');
      })
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
        let inserts = [];
        let n = 0;
        while (n < 5) {
          let newPage = models()['PageTest']({
            address: `testAddress${n + 1}`,
            is_app: false,
          });
          inserts.push(newPage.save());
          n++;
        }

        collection1 = models()['CollectionTest']({
          name: 'collection1', name_fa: 'کالکشن 1'
        });
        collection2 = models()['CollectionTest']({
          name: 'collection2', name_fa: 'کالکشن 2'
        });

        page1 = models()['PageTest']({
          address: 'testAddress6',
          is_app: false,
          page_info: {
            collection_id: collection1._id
          }
        });
        page2 = models()['PageTest']({
          address: 'testAddress7',
          is_app: true,
          page_info: {
            collection_id: collection2._id,
            content: 'some html content'
          }
        });

        inserts.push([collection1.save(), collection2.save(), page1.save(), page2.save()]);
        return Promise.all(inserts);
      })
      .then(res => {
        done()
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should get first 5 pages order by their address", function (done) {
    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`search/Page`),
      body: {
        options: {
          phrase: ''
        },
        offset: 0,
        limit: 5
      },
      json: true,
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(7);
      res = res.body.data;
      let n = 0;
      while (n < 5) {
        expect(res[n].address).toBe(`testAddress${n + 1}`);
        expect(res[n].is_app).toBe(false);
        n++;
      }
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get 2 pages after offset of 5", function (done) {
    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`search/Page`),
      body: {
        options: {
          phrase: ''
        },
        offset: 5,
        limit: 5
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {

      expect(res.statusCode).toBe(200);
      res = res.body.data;
      expect(res.length).toBe(2);
      expect(res[0].address).toBe(`testAddress6`);
      expect(res[1].address).toBe(`testAddress7`);
      expect(res[0].collection.name).toBe(`collection1`);
      expect(res[1].collection.name).toBe(`collection2`);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when some one other than content manager is calling api', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`search/Page`),
      body: {
        options: {
          phrase: "",
          is_smart: true
        },
        offset: 0,
        limit: 10,
      },
      json: true,
      // jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('some one other than content manager could call api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.noAccess.status);
        expect(err.error).toBe(error.noAccess.message);
        done();
      });
  });

});

xdescribe('POST Order - Search over order lines by tickets', () => {

  let customer1 = {
    cid: null,
    jar: null
  };
  let customer2 = {
    cid: null,
    jar: null
  };
  let SMAgent = {
    cid: null,
    jar: null
  };
  let SCAgent = {
    cid: null,
    jar: null
  };
  let CMAgent = {
    cid: null,
    jar: null
  };

  let productInstanceIds = [
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId()
  ];
  let colorIds = [
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId()
  ];
  let productIds = [];
  let orderIds = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return models()['WarehouseTest'].insertMany(warehouses)
      })
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('bm', _const.ACCESS_LEVEL.SalesManager, warehouses.find(x => x.is_center)._id)
      })
      .then(res => {
        SMAgent.cid = res.cid;
        SMAgent.jar = res.rpJar;
        return lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(x => x.name === 'سانا')._id)
      })
      .then(res => {
        SCAgent.cid = res.cid;
        SCAgent.jar = res.rpJar;
        return lib.dbHelpers.addAndLoginAgent('cm')
      })
      .then(res => {
        CMAgent.cid = res.cid;
        CMAgent.jar = res.rpJar;
        return lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
          first_name: 'test 1',
          surname: 'test 1',
        })
      })
      .then(res => {
        customer1.cid = res.cid;
        customer1.jar = res.rpJar;
        return lib.dbHelpers.addAndLoginCustomer('customer2', '123456', {
          first_name: 'test 2',
          surname: 'test 2',
        })
      })
      .then(res => {
        customer2.cid = res.cid;
        customer2.jar = res.rpJar;
        let products = [{
          _id: productIds[0],
          name: 'sample 1',
          product_type: {
            name: 'sample type',
            product_type_id: mongoose.Types.mongoose.Types.ObjectId()
          },
          brand: {
            name: 'sample brand',
            brand_id: mongoose.Types.mongoose.Types.ObjectId()
          },
          base_price: 30000,
          desc: 'some description for this product',
          colors: [
            {
              color_id: colorIds[0],
              name: 'green'
            },
            {
              color_id: colorIds[1],
              name: 'yellow'
            },
            {
              color_id: colorIds[2],
              name: 'red'
            }
          ],
          instances: [
            {
              _id: productInstanceIds[0],
              product_color_id: colorIds[0],
              size: "9",
              price: 2000,
              barcode: '0394081341'
            },
            {
              _id: productInstanceIds[1],
              product_color_id: colorIds[1],
              size: "10",
              price: 4000,
              barcode: '19231213123'
            }
          ]
        },
        {
          _id: productIds[1],
          name: 'simple 2',
          product_type: {
            name: 'sample type',
            product_type_id: mongoose.Types.mongoose.Types.ObjectId()
          },
          brand: {
            name: 'sample brand',
            brand_id: mongoose.Types.mongoose.Types.ObjectId()
          },
          base_price: 600000,
          desc: "some else description for this product",
          colors: [
            {
              color_id: colorIds[2],
              name: 'red'
            }, {
              color_id: colorIds[3],
              name: 'purple'
            },
          ],
          instances: [
            {
              _id: productInstanceIds[2],
              product_color_id: colorIds[2],
              size: "11",
              price: 50000,
              barcode: '9303850203',
              tickets: [
                {}
              ]
            },
            {
              _id: productInstanceIds[3],
              product_color_id: colorIds[3],
              size: "11",
              price: 50000,
              barcode: '9303850203',
            }
          ]
        }];
        return models()['ProductTest'].insertMany(products);
      })
      .then(res => {

        productIds = res.map(x => x._id);

        let orders = [{
          customer_id: customer1.cid,
          total_amount: 2,
          order_time: new Date(),
          is_cart: false,
          address: warehouses[0].address,
          transaction_id: mongoose.Types.mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: [ // sales manager ticket
              {
                warehouse_id: warehouses.find(x => x.is_center)._id,
                status: _const.ORDER_STATUS.default,
                is_processed: true
              }
            ]
          }, { // shop clerk ticket
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1],
            tickets: [
              {
                warehouse_id: warehouses.find(x => x.is_center)._id,
                status: _const.ORDER_STATUS.default,
                // is_processed: true,
                agent_id: SMAgent.cid
              },
              {
                warehouse_id: warehouses.find(x => x.name === 'سانا')._id,
                referral_advice: _const.REFERRAL_ADVICE.SendToCustomer,
                is_processed: true
              }
            ]
          }]
        }, {
          customer_id: customer2.cid,
          total_amount: 1,
          order_time: new Date(),
          is_cart: false,
          address: warehouses[0].address,
          transaction_id: mongoose.Types.mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[1],
            product_instance_id: productInstanceIds[2],
            tickets: [ // sales manager ticket
              {
                warehouse_id: warehouses.find(x => x.is_center)._id,
                status: _const.ORDER_STATUS.default,
                // is_processed: true,
                agent_id: SMAgent.cid
              },
              {
                warehouse_id: warehouses.find(x => x.name === 'سانا')._id,
                referral_advice: _const.REFERRAL_ADVICE.SendToCentral,
                // is_processed: true,
                agent_id: SCAgent.cid
              }, {
                warehouse_id: warehouses.find(x => x.is_center)._id,
                status: _const.ORDER_STATUS.SCSentToCentral,
                is_processed: true,
              }
            ]
          }]
        }];

        return models()['OrderTest'].insertMany(orders);
      })
      .then(res => {
        orderIds = res.map(x => x._id);
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      })
  });
  it('sales manager should get all unprocessed tickets for central warehouse', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`search/Order`),
      body: {
        options: {
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: SMAgent.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.total).toEqual(2);
      res.body.data.forEach(x => {
        expect(x.tickets.warehouse_id).toBe(warehouses.find(x => x.is_center)._id.toString())
      });
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('shop clerk should get all unprocessed tickets for his/her warehouse', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`search/Order`),
      body: {
        options: {
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: SCAgent.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.total).toEqual(1);
      res.body.data.forEach(x => {
        expect(x.tickets.warehouse_id).toBe(warehouses.find(x => x.name === 'سانا')._id.toString())
      });
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('content manager should not be able to see order lines', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`search/Order`),
      body: {
        options: {
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: CMAgent.jar,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('content manager can search over order lines');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.noAccess.status);
        expect(err.error).toBe(error.noAccess.message);
        done();
      });
  });
  it('expect should return ticket of order lines references', function (done) {
    this.done = done;

    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`search/Order`),
      body: {
        options: {
          output: true
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: SMAgent.jar,
      resolveWithFullResponse: true
    })
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(3);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});

xdescribe('POST Suggest Product / Tag / Color', () => {

  let productTypeIds = [
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId()];
  let brandIds = [
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId(),
    mongoose.Types.mongoose.Types.ObjectId()];
  let tgIds = [mongoose.Types.mongoose.Types.ObjectId(),
  mongoose.Types.mongoose.Types.ObjectId(),
  mongoose.Types.mongoose.Types.ObjectId(),
  mongoose.Types.mongoose.Types.ObjectId()];
  let productIds = [];
  let tagIds = [];
  let colorIds = [];

  let adminObj = {
    aid: null,
    jar: null,
  };
  beforeEach((done) => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('admin');
      })
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
        let products = [{
          name: 'shoe2',
          product_type: {name: 'type 1', product_type_id: productTypeIds[0]},
          brand: {name: 'type 1', brand_id: brandIds[0]},
          base_price: 1000
        }, {
          name: 'shoe3',
          product_type: {name: 'type 2', product_type_id: productTypeIds[1]},
          brand: {name: 'type 2', brand_id: brandIds[1]},
          base_price: 2000
        }, {
          name: 'shoe1',
          product_type: {name: 'type 3', product_type_id: productTypeIds[2]},
          brand: {name: 'type 3', brand_id: brandIds[2]},
          base_price: 3000
        }, {
          name: 'sneak',
          product_type: {name: 'type 4', product_type_id: productTypeIds[3]},
          brand: {name: 'type 4', brand_id: brandIds[3]},
          base_price: 4000
        }];
        let tags = [
          {name: 'tag002', tg_id: tgIds[0]},
          {name: 'tag001', tg_id: tgIds[1]},
          {name: 'tag003', tg_id: tgIds[2]},
          {name: 'toog', tg_id: tgIds[3]},
        ];
        let colors = [
          {name: 'col1'},
          {name: 'col2'},
          {name: 'roloc3'}
        ];
        models()['ProductTest'].insertMany(products).then(res => {
          productIds[0] = res[0]._id;
          productIds[1] = res[1]._id;
          productIds[2] = res[2]._id;
          productIds[3] = res[3]._id;

          models()['TagTest'].insertMany(tags).then(res => {
            tagIds[0] = res[0]._id;
            tagIds[1] = res[1]._id;
            tagIds[2] = res[2]._id;
            tagIds[3] = res[3]._id;

            models()['ColorTest'].insertMany(colors).then(res => {
              colorIds[0] = res[0]._id;
              colorIds[1] = res[1]._id;
              colorIds[2] = res[2]._id;

              done();
            });
          });
        });
      });
  });

  it('should give suggestion over products', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/suggest/Product`),
      body: {
        phrase: 'sho',
      },
      json: true,
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(3);
      expect(res.body[0].name).toBe('shoe1');
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should give suggestion over tags', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/suggest/Tag`),
      body: {
        phrase: 'tag00',
      },
      json: true,
      jar: adminObj.jar,

      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(3);
      expect(res.body[0].name).toBe('tag001');
      expect(res.body[1].name).toBe('tag002');
      expect(res.body[2].name).toBe('tag003');
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should give suggestion over colors', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/suggest/Color`),
      body: {
        phrase: 'col',
      },
      json: true,
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(2);
      expect(res.body[0].name).toBe('col1');
      expect(res.body[1]._id).toContain(colorIds[1]);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when some one other than content manager is calling api', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`search/Color`),
      body: {
        options: {
          phrase: "",
          is_smart: true
        },
        offset: 0,
        limit: 10,
      },
      json: true,
      // jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('some one other than content manager could call api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.noAccess.status);
        expect(err.error).toBe(error.noAccess.message);
        done();
      });
  });


});

xdescribe('POST Suggest Collection', () => {

  let adminObj = {
    aid: null,
    jar: null,
  };

  beforeEach((done) => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('admin');
      })
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
        let collectionArr = [{
          name: 'col1',
          name_fa: 'کالکشن 1',
        }, {
          name: 'col12',
          name_fa: 'کالکشن 2',
        }, {
          name: 'col13',
          name_fa: 'کالکشن 3',
        }, {
          name: 'collection 004',
          name_fa: 'کالکشن 4',
        }, {
          name: 'collection 005',
          name_fa: 'کالکشن 5',
        }, {
          name: 'collection 006',
          name_fa: 'کالکشن 6',
        }];
        models()['CollectionTest'].insertMany(collectionArr).then(res => {
          done();
        });
      }).catch(err => {
        console.log(err);
        done();
      });
  });

  it('should give suggestion over collections', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/suggest/Collection`),
      body: {
        phrase: 'col1',
      },
      json: true,
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(3);
      expect(res.body[0].name).toBe('col1');
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('should get error when some one other than content manager is calling api', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`search/Collection`),
      body: {
        options: {
          phrase: "",
          is_smart: true
        },
        offset: 0,
        limit: 10,
      },
      json: true,
      // jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('some one other than content manager could call api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.noAccess.status);
        expect(err.error).toBe(error.noAccess.message);
        done();
      });
  });
});

xdescribe('POST Suggest Page Address', () => {

  let page1, page2;
  let adminObj = {
    aid: null,
    jar: null,
  };

  beforeEach((done) => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('admin');
      })
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
        let inserts = [];
        let n = 0;
        while (n < 5) {
          let newPage = models()['PageTest']({
            address: `test${n + 1}`,
            is_app: false,
          });
          inserts.push(newPage.save());
          n++;
        }
        return Promise.all(inserts);
      })
      .then(res => {
        done()
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it('should give suggestion over page', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/suggest/Page`),
      body: {
        phrase: 'test1',
        options: {
          exceptionAddress: "test2",
        }
      },
      json: true,
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(1);
      expect(res.body[0].address).toBe('test1');
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should return addresses of two pages', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/suggest/Page`),
      body: {
        phrase: 'test',
        options: {
          exceptionAddress: "test2",
        }
      },
      json: true,
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(4);
      res.body.forEach(x => expect(x.address).toContain('test'));
      res.body.forEach(x => expect(x.address).not.toBe('test2'));
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when some one other than content manager is calling api', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`/suggest/Page`),
      body: {
        phrase: 'test1',
        options: {
          exceptionAddress: "test2",
        }
      },
      json: true,
      // jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('some one other than content manager could call api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.noAccess.status);
        expect(err.error).toBe(error.noAccess.message);
        done();
      });
  });
});

describe('POST Search Order Tickets', () => {

  let CWClerk = { // central warehosue clerk
    aid: null,
    jar: null,
  };

  let PAClerk = { // paladium warehosue clerk
    aid: null,
    jar: null,
  };



  let products, orders = [], customer;

  let counter = 0;
  beforeEach(async (done) => {
    try {

      await lib.dbHelpers.dropAll()

      let warehouses = await models()['WarehouseTest'].insertMany(_warehouses);

      let centralWarehouse = warehouses.find(x => !x.is_hub && !x.has_customer_pickup);
      let paladiumWarehoue = warehouses.find(x => x.name === 'پالادیوم');

      let res = await lib.dbHelpers.addAndLoginAgent('cwclerk', _const.ACCESS_LEVEL.ShopClerk, centralWarehouse.id);
      CWClerk.aid = res.aid;
      CWClerk.jar = res.rpJar;

      res = await lib.dbHelpers.addAndLoginAgent('paclerk', _const.ACCESS_LEVEL.ShopClerk, paladiumWarehoue.id);
      PAClerk.aid = res.aid;
      PAClerk.jar = res.rpJar;

      cusotmer

      products = await models()['ProductTest'].insertMany([
        {
          name: 'sample 1',
          base_price: 30000,
          article_no: "ar123",
          instances: [
            {
              size: "9",
              price: 2000,
              barcode: '0394081341',
            },
            {
              size: "10",
              price: 4000,
              barcode: '19231213123',
            }
          ]
        },
        {
          name: 'simple 2',
          base_price: 600000,
          article_no: "ar124",
          instances: [
            {
              size: "11",
              price: 50000,
              barcode: '9303850203',
            },
            {
              size: "12",
              price: 50000,
              barcode: '9303850203',
            }
          ]
        }
      ])



      /*
       order 1 => has 4 same order lines which 3 of them have ticket for central warehouse agent (not C&C) 
      
      */

      orders = [];

      orders.push({
        customer_id: mongoose.Types.ObjectId(),
        is_cart: false,
        transaction_id: "xyz12210",
        order_lines: [],
        address: {
          province: "تهران",
          city: "تهران",
          street: 'دولت'

        },
        duration_days: 1,
        is_collect: false,
        order_time: moment(),
        time_slot: {
          lower_bound: 10,
          upper_bound: 18
        },
        total_amount: 20,
        used_balance: 0,
        used_point: 0

      });

      // add 3 same order line
      for (let i = 0; i < 3; i++) {
        orders[0].order_lines.push({
          paid_price: 0,
          product_id: products[0].id,
          product_instance_id: products[0].instances[0].id,
          adding_time: moment(),
          tickets: [
            {
              is_processed: false,
              status: 1,
              desc: null,
              receiver_id: centralWarehouse.id,
              timestamp: moment()
            }
          ]
        })
      }

      // add 1 different order line
      orders[0].order_lines.push({
        paid_price: 0,
        product_id: products[1].id,
        product_instance_id: products[1].instances[1].id,
        adding_time: moment(),
        tickets: [
          {
            is_processed: false,
            status: 1,
            desc: null,
            receiver_id: paladiumWarehoue.id,
            timestamp: moment()
          }
        ]
      })


      /*
       order 2 => has 4 different order lines (not C&C)
      
      */

      orders.push({
        customer_id: mongoose.Types.ObjectId(),
        is_cart: false,
        transaction_id: "xyz12213",
        order_lines: [],
        address: {
          province: "تهران",
          city: "تهران",
          street: 'دولت'
        },
        duration_days: 3,
        is_collect: false,
        order_time: moment(),
        time_slot: {
          lower_bound: 10,
          upper_bound: 18
        },
        total_amount: 20,
        used_balance: 0,
        used_point: 0

      });

      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          orders[1].order_lines.push({
            paid_price: 0,
            product_id: products[0].id,
            product_instance_id: products[i].instances[j].id,
            adding_time: moment(),
            tickets: [
              {
                is_processed: false,
                status: 1,
                desc: null,
                receiver_id: centralWarehouse.id,
                timestamp: moment()
              }
            ]
          })
        }
      }

      /*
      order 3 => has 2 different order lines (C&C from paladium) 
   
      */

      orders.push({
        customer_id: mongoose.Types.ObjectId(),
        is_cart: false,
        transaction_id: "xyz12213",
        order_lines: [],
        address: paladiumWarehoue.address,
        duration_days: 3,
        is_collect: true,
        order_time: moment(),
        total_amount: 20,
        used_balance: 0,
        used_point: 0
      });

      for (let i = 0; i < 2; i++) {
        orders[2].order_lines.push({
          paid_price: 0,
          product_id: products[0].id,
          product_instance_id: products[0].instances[i].id,
          adding_time: moment(),
          tickets: [
            {
              is_processed: false,
              status: 1,
              desc: null,
              receiver_id: paladiumWarehoue.id,
              timestamp: moment()
            }
          ]
        })
      };

      orders = await models()['OrderTest'].insertMany(orders);
      done()
    }
    catch (err) {
      console.log(err);
    };
  }, 15000);


  it('central warehoues clerck should get not c&c inbox (7 order lines)', async function (done) {
    try {
      this.done = done;

      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`search/Ticket`),
        body: {
          options: {
            type: 'inbox',
          },
          offset: 0,
          limit: 5
        },
        json: true,
        jar: CWClerk.jar,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(5);
      expect(res.body.total).toBe(7);
      res.body.data.forEach(x => {
        expect([orders[0], orders[1]].map(y => y.id).includes(x._id)).toBeTruthy();
        expect(x.is_collect).toBeFalsy();
      });
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('paladium warehoues clerck should get not c&c inbox (1 order line from order 1)', async function (done) {
    try {
      this.done = done;

      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`search/Ticket`),
        body: {
          options: {
            type: 'inbox',
          },
          offset: 0,
          limit: 5
        },
        json: true,
        jar: PAClerk.jar,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0]._id).toBe(orders[0].id.toString());
      expect(res.body.data[0].is_collect).toBeFalsy();
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('paladium warehoues clerck should get c&c inbox (2 order line collapsed in one order (order 3)', async function (done) {
    try {
      this.done = done;

      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`search/Ticket`),
        body: {
          options: {
            type: 'inbox',
            isCollect: true
          },
          offset: 0,
          limit: 5
        },
        json: true,
        jar: PAClerk.jar,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0]._id).toBe(orders[2]._id.toString());
      expect(res.body.data[0].is_collect).toBeTruthy();

      res.body.data[0].order_lines.forEach(x => {
        expect(orders[2].order_lines.map(y => y._id.toString()).includes(x.order_line_id)).toBeTruthy();
      })
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

});
