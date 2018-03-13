const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const moment = require('moment');

describe('Post Address', () => {

    let customerObj = {};
    beforeEach(done => {
        lib.dbHelpers.dropAll()
            .then(res => {
                return lib.dbHelpers.addAndLoginCustomer('sa')
            }).then(res => {
            let rpJar = null;
            customerObj.cid = res.cid;
            customerObj.jar = res.rpJar;
            done();
        })
            .catch(err => {
                console.log(err);
                done();
            });
    });

    it('should customer found', function (done) {
        this.done = done;
        rp({
            method: 'post',
            body: {
                city: 'Tehran',
                street: 'Valiasr',
                unit: 13,
                no: 18,
                postal_code: 13445,
                loc: {long: 2345, lat: 3445}
            },
            jar: customerObj.jar,
            json: true,
            uri: lib.helpers.apiTestURL('user/address'),
            resolveWithFullResponse: true,
        }).then(res => {
            expect(res.statusCode).toBe(200);
            expect(res.body.addresses.length).toBe(1);
            return models['CustomerTest'].findById(res.body._id)
        }).then(res => {
            expect(res.addresses.length).toBe(1);
            expect(res.addresses[0].city).toBe('Tehran');
            done();

        }).catch(lib.helpers.errorHandler.bind(this));
    });

    it('should add second address for customer', function (done) {
        this.done = done;
        models['CustomerTest'].findOneAndUpdate({
             _id: customerObj.cid,
             is_verified: true
        }, {
            $addToSet: {
                'addresses': {
                    city: 'Rasht',
                    street: 'Zartosht',
                    unit:  23,
                    no: 34,
                    postal_code: 8738,
                    loc: {long: 5435, lat: 8943}
                }
            }
        }, {new: true})
            .then(res =>
                rp({
                    method: 'post',
                    body: {
                        city: 'Sari',
                        street: 'Valiasr',
                        unit: 13,
                        no: 18,
                        postal_code: 13445,
                        loc: {long: 2345, lat: 3445}
                    },
                    jar: customerObj.jar,
                    json: true,
                    uri: lib.helpers.apiTestURL('user/address'),
                    resolveWithFullResponse: true,
                })
            )
            .then(res => {
                expect(res.statusCode).toBe(200);
                expect(res.body.addresses.length).toBe(1);
                return models['CustomerTest'].findById(res.body._id)
            }).then(res => {
            expect(res.addresses[0].city).toBe('Rasht');
            expect(res.addresses[1].city).toBe('Sari');
            done();

        }).catch(lib.helpers.errorHandler.bind(this));
    });
});


