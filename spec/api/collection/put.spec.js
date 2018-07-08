const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');


describe('PUT Collection', () => {

  let adminObj = {
    aid: null,
    jar: null
  };

  let collectionId;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
        done();
      }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('should add a new collection ', function (done) {
    this.done = done;
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL('collection'),
      body: {
        name: 'collection test',
        name_fa: 'کالکشن 1',
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      collectionId = res.body._id;
      expect(res.statusCode).toBe(200);
      return models['CollectionTest'].find();
    }).then(res => {
      expect(res.length).toEqual(1);
      expect(res[0]._id.toString()).toBe(collectionId.toString());

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });


  it('should get error when name of collection is not defined', function (done) {
    this.done = done;
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`collection`),
      body: {
        // name: 'second name',
        name_fa: 'کالکشن 1',
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('expect error when name of collection is not defined');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.CollectionNameRequired.status);
      expect(err.error).toBe(error.CollectionNameRequired.message);
      done();
    });
  });

  it('should get error when name fa of collection is not defined', function (done) {
    this.done = done;
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`collection`),
      body: {
        name: 'second name',
        // name_fa: 'کالکشن 1',
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('expect error when name of collection is not defined');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.CollectionNameRequired.status);
      expect(err.error).toBe(error.CollectionNameRequired.message);
      done();
    });
  });

  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`collection`),
      // jar: adminObj.jar,
      body: {
        name: 'second name',
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when non admin user is calling the api');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.adminOnly.status);
      expect(err.error).toEqual(error.adminOnly.message);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });


});
