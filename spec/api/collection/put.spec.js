const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');


describe('Put Collection', () => {

    let imageUrl, productId, parentId;

    beforeEach(done => {
        lib.dbHelpers.dropAll()
            .then(res => {
                imageUrl = mongoose.Types.ObjectId();
                productId = mongoose.Types.ObjectId();
                parentId = mongoose.Types.ObjectId();

                done();
            })
            .catch(err => {
                console.log(err);
                done();
            });
    });

    it('should add a new collection ', function (done) {
        this.done = done;
        rp({
            method: 'put',
            uri: lib.helpers.apiTestURL('collection/new_collection'),
            body: {
                name: 'new collection',
                image_url: imageUrl,
                productIds: [
                    productId
                ],
                parent_Id: productId
            },
            json: true,
            resolveWithFullResponse: true
        }).then(res => {
            expect(res.statusCode).toBe(200);

            return models['CollectionTest'].find({});
        }).then(res => {
            expect(res.length).toBe(1);
            expect(res[0].productIds[0]).toEqual(productId);
            done();
        }).catch(lib.helpers.errorHandler.bind(this));
    });

    it('expect error when name of collection is not defined', function (done) {
        this.done = done;
        rp({
            method: 'put',
            uri: lib.helpers.apiTestURL(`collection/new_collection`),
            body: {
                // name: 'second name',
                image_url: imageUrl,
                productIds: [productId]
            },
            json: true,
            resolveWithFullResponse: true
        }).then(res => {
            this.fail('did not failed when other users are calling api');
            done();
        }).catch(err => {
            expect(err.statusCode).toBe(500);
            expect(err.error).toBe('Collection validation failed: name: Path `name` is required.');
            done()
        });


    });


});
