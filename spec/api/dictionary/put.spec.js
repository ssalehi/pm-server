const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');

describe('Dictionary PUT', () => {
    let dictionaryId;
    beforeEach(done => {
        lib.dbHelpers.dropAll()
        .then(() => {
            let dictionaries = [
                {name : 'name 1', value: 'value 1', type: 'type 1'},
                {name : 'name 2', value: 'value 2', type: 'type 2'},
                {name : 'name 3', value: 'value 3', type: 'type 3'},
              ];
              return models['DictionaryTest'].insertMany(dictionaries);
        })
        .then(res => {
            dictionaryId = res[0]._id;
            done();
        })
        .catch(err => {
            console.log('error', err);
            done();
        });
    });

    it('expect update dictionary', function (done) {
        this.done = done;
        
        rp({
            method: 'PUT',
            uri: lib.helpers.apiTestURL(`dictionary/${dictionaryId}`),
            body: {
                name: 'new name ha ha!!'
            },
            resolveWithFullResponse: true,
            json: true
        })
        .then(res => {
            expect(res.statusCode).toBe(200);
            return models['DictionaryTest'].findById(dictionaryId)
        })
        .then(res => {
            expect(res._id).toEqual(dictionaryId);
            expect(res.name).toEqual('new name ha ha!!');
            done();
        })
        .catch(lib.helpers.errorHandler.bind(this));
    });

    
    it('expect error when dictionary id not valid', function (done) {
        this.done = done;
        dictionaryId = dictionaryId + 'B';
        rp({
            method: 'PUT',
            uri: lib.helpers.apiTestURL(`dictionary/${dictionaryId}`),
            body: {
                name: 'new name ha ha!!'
            },
            resolveWithFullResponse: true,
            json: true
        })
        .then(res => {
            this.fail('expect error when dictionary id not valid');
            done();
        })
        .catch(err => {
            expect(err.statusCode).toBe(error.invalidDictionary.status);
            expect(err.error).toEqual(error.invalidDictionary.message);
            done();
        });
    });
});