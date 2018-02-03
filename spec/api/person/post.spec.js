const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');

describe('Person POST API', () => {
  let needSetup = true;
  beforeEach(done => {
    if (needSetup)
      lib.dbHelpers.dropAll()
        .then(res => {
          let obj = new lib.Agent(true);
          return obj.save({
            username: 'admin',
            secret: '123456',
            access_level: 0
          });
        })
        .then(res => {
          let obj = new lib.Agent(true);
          return obj.save({
            username: 'shipping-clerk',
            secret: '123456',
            access_level: 1
          });
        })
        .then(res => {
          let obj = new lib.Customer(true);
          return obj.save({
            username: 'aa',
            secret: '123456',
            address: [
              {
                city: 'Tehran',
                street: 'beheshti',
              },
            ],
          });
        })
        .then(res => {
          needSetup = false;
          done();
        })
        .catch(err => {
          console.error('Error in before each: ', err);
          done();
        });
    else
      done();
  });

  it('admin should login', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        username: 'admin',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('agent/login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('admin');
        expect(res.body.personType).toBe('agent');
        expect(res.body.access_level).toBe(0);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('shipping clerk should login', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        username: 'shipping-clerk',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('agent/login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('shipping-clerk');
        expect(res.body.personType).toBe('agent');
        expect(res.body.access_level).toBe(1);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('normal user cannot login in agent domain', function (done) {
    rp({
      method: 'post',
      body: {
        username: 'aa',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('agent/login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Normal user loggedin in agent domain');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.noUser.status);
        done();
      });
  });

  it('normal user should login', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        username: 'aa',
        password: '123456',
      },
      json: true,
      uri: lib.helpers.apiTestURL('login'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('aa');
        expect(res.body.personType).toBe('customer');
        expect(res.body.access_level).toBeUndefined();
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});