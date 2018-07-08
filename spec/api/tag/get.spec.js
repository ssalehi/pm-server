const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');

describe("GET Tags", () => {
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => {
        let tagGroupArr = [{
          name: 'Category'
        }, {
          name: 'Sub Division'
        }, {
          name: 'Gender'
        }];
        return models['TagGroupTest'].insertMany(tagGroupArr);
      }).then(tag_group => {
        let tagsArr = [{
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
        }];
        return models['TagTest'].insertMany(tagsArr);
      }).then(res => {
        done();
      }).catch(err => {
        console.log(err);
        done();
      });
  });

  it('expect return all tags have this group name', function (done) {
    this.done = done;
    let category = "Category";
    rp({
      method: 'GET',
      uri: lib.helpers.apiTestURL(`tags/${category}`),
      body: {},
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(4);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
});