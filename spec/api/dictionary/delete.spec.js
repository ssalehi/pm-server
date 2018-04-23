const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');

describe('Dictionary DELETE', () => {
    let dictionaryId;
    beforeEach(done => {
        lib.dbHelpers.dropAll().then(() => {
            let dictionaries = [{
                    name: 'name 1',
                    value: 'value 1',
                    type: 'type 1'
                },
                {
                    name: 'name 2',
                    value: 'value 2',
                    type: 'type 2'
                },
                {
                    name: 'name 3',
                    value: 'value 3',
                    type: 'type 3'
                },
            ];

            return models['DictionaryTest'].insertMany(dictionaries);
        }).then((res) => {
            dictionaryId = res[0]._id;
            done();
        }).catch(err => {
            console.log('error', err);
            done();
        });
    });


    it('expect delete dictionary', function (done) {
        this.done = done;

        rp({
            method: 'DELETE',
            uri: lib.helpers.apiTestURL(`dictionary/${dictionaryId}`),
            json: true,
            resolveWithFullResponse: true
        }).then(res => {
            expect(res.statusCode).toBe(200);
            return models['DictionaryTest'].find();
        }).then(res => {
            expect(res.length).toBe(2);
            done();
        }).catch(lib.helpers.errorHandler.bind(this));
    });


    it('expect error when dictionary id not valid', function (done) {
        this.done = done;
        
        dictionaryId = dictionaryId + 'A';
        rp({
            method: 'DELETE',
            uri: lib.helpers.apiTestURL(`dictionary/${dictionaryId}`),
            json: true,
            resolveWithFullResponse: true
        }).then(res => {
            this.fail('expect error when dictionary id not valid');
            done();
        }).catch(err => {
            expect(err.statusCode).toBe(error.invalidDictionary.status);
            expect(err.error).toBe(error.invalidDictionary.message);
            done();
        });
    });
});
