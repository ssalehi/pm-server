const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');

describe('GET Collection', () => {
    let imageUrls = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
    let parentId = mongoose.Types.ObjectId();

    beforeEach(done => {
        lib.dbHelpers.dropAll().then(res => {
            models['CollectionTest'].insertMany([{
                name: 'collection test 1',
                image_url: imageUrls[0],
                // productIds: [mongoose.Types.ObjectId()]
            }, {
                name: 'collection test 2',
                image_url: imageUrls[1],
                productIds: [/*mongoose.Types.ObjectId()*/]
            }, {
                name: 'collection test 3',
                image_url: imageUrls[2],
                productIds: [mongoose.Types.ObjectId()]
            }, {
                name: 'collection test 4',
                image_url: imageUrls[3],
                productIds: [mongoose.Types.ObjectId()],
                parent_id: parentId
            }]);


            done();
        }).catch(err => {
            console.log(err);
            done();
        });
    });


    it('should get all collection', function (done) {
        this.done = done;
        rp({
            method: 'get',
            uri: lib.helpers.apiTestURL(`collection`),
            json: true,
            resolveWithFullResponse: true
        }).then(res => {
            expect(res.statusCode).toBe(200);
            return models['CollectionTest'].find({});
        }).then(res => {
            expect(res.length).toBe(4);
            expect(res[0].productIds.length).toBe(0);
            expect(res[1].productIds.length).toBe(0);
            expect(res[2].image_url).toEqual(imageUrls[2]);
            expect(res[3].parent_id).toEqual(parentId);
            done();
        }).catch(lib.helpers.errorHandler.bind(this));
    });

});