const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');


describe('PUT Dictionary ', () => {

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

        }).then(res => {
            dictionaryId = res[0]._id;
            done();
        }).catch(err => {
            console.log('error', err);
            done();
        });

    });

    it('expect insert new dictionary', function (done) {
        this.done = done;

        rp({
            method: 'PUT',
            uri: lib.helpers.apiTestURL(`dictionary`),
            body: {
                name: 'name 4',
                value: 'value 4',
                type: 'type 4'
            },
            json: true,
            resolveWithFullResponse: true
        }).then(res => {
            expect(res.statusCode).toBe(200);
            return models['DictionaryTest'].find();
        }).then((res) => {
            expect(res.length).toEqual(4)
            done();
        }).catch(lib.helpers.errorHandler.bind(this));
    });

    it('expect error when dictionary is duplicate', function (done) {
        this.done = done;

        rp({
            method: 'PUT',
            uri: lib.helpers.apiTestURL(`dictionary`),
            body: {
                name: 'name 3',
                value: 'value 3',
                type: 'type 3'
            },
            json: true,
            resolveWithFullResponse: true
        }).then(res => {
            this.fail('expect error when dictionary is duplicate');
            done();
        }).catch(err => {
            expect(err.statusCode).toBe(error.duplicateDictionary.status);
            expect(err.error).toEqual(error.duplicateDictionary.message);
            done();
        });
    });

    it('expect error when dictionary name is undefined', function (done) {
        this.done = done;
        rp({
            method: 'PUT',
            uri: lib.helpers.apiTestURL(`dictionary`),
            body: {
                // name: 'new name ha ha!!',
                value: 'new value ha ha!!',
                type: 'new type ha ha!!'
                
            },
            resolveWithFullResponse: true,
            json: true
        }).then(res => {
            this.fail('expect error when dictionary name is undefined');
            done();
        }).catch(err => {
            expect(err.statusCode).toBe(error.dictionaryNameRequired.status);
            expect(err.error).toEqual(error.dictionaryNameRequired.message);
            done();
        });
    });

    it('expect error when dictionary value is undefined', function (done) {
        this.done = done;
        rp({
            method: 'PUT',
            uri: lib.helpers.apiTestURL(`dictionary`),
            body: {
                name: 'new name ha ha!!',
                // value: 'new value ha ha!!',
                type: 'new type ha ha!!'
                
            },
            resolveWithFullResponse: true,
            json: true
        }).then(res => {
            this.fail('expect error when dictionary value is undefined');
            done();
        }).catch(err => {
            expect(err.statusCode).toBe(error.dictionaryValueRequired.status);
            expect(err.error).toEqual(error.dictionaryValueRequired.message);
            done();
        });
    });

    it('expect error when dictionary type is undefined', function (done) {
        this.done = done;
        rp({
            method: 'PUT',
            uri: lib.helpers.apiTestURL(`dictionary`),
            body: {
                name: 'new name ha ha!!',
                value: 'new value ha ha!!',
                // type: 'new type ha ha!!'
                
            },
            resolveWithFullResponse: true,
            json: true
        }).then(res => {
            this.fail('expect error when dictionary type is undefined');
            done();
        }).catch(err => {
            expect(err.statusCode).toBe(error.dictionaryTypeRequired.status);
            expect(err.error).toEqual(error.dictionaryTypeRequired.message);
            done();
        });
    });
});
