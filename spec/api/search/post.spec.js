const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const mongoose = require('mongoose');
const error = require('../../../lib/errors.list');

describe('POST Search Collection', () => {

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
        models['CollectionTest'].insertMany(collectionArr).then(res => {
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

describe('POST Search Page', () => {

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
          let newPage = models['PageTest']({
            address: `testAddress${n + 1}`,
            is_app: false,
          });
          inserts.push(newPage.save());
          n++;
        }

        collection1 = models['CollectionTest']({
          name: 'collection1', name_fa: 'کالکشن 1'
        });
        collection2 = models['CollectionTest']({
          name: 'collection2', name_fa: 'کالکشن 2'
        });

        page1 = models['PageTest']({
          address: 'testAddress6',
          is_app: false,
          page_info: {
            collection_id: collection1._id
          }
        });
        page2 = models['PageTest']({
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

describe('POST Suggest Product / Tag / Color', () => {

  let productTypeIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()];
  let brandIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()];
  let tgIds = [mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()];
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
        models['ProductTest'].insertMany(products).then(res => {
          productIds[0] = res[0]._id;
          productIds[1] = res[1]._id;
          productIds[2] = res[2]._id;
          productIds[3] = res[3]._id;

          models['TagTest'].insertMany(tags).then(res => {
            tagIds[0] = res[0]._id;
            tagIds[1] = res[1]._id;
            tagIds[2] = res[2]._id;
            tagIds[3] = res[3]._id;

            models['ColorTest'].insertMany(colors).then(res => {
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

describe('POST Suggest Collection', () => {

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
        models['CollectionTest'].insertMany(collectionArr).then(res => {
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