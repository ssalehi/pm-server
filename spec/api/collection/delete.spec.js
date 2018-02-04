const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');


describe('DELETE Collection', () => {

    beforeEach(done => {

    });

    it('should delete one collection', function (done) {
        this.done = done;
        rp({
            method: 'delete',
            uri: lib.helpers.apiTestURL(`collection/:uid`),
            json: true,
            resolveWithFullResponse: true
        }).then(res => {
            expect(res.statusCode).toBe(200);
            expect();

            done();
        }).catch(err => {
            console.log(err);
            done();
        });
    });
});