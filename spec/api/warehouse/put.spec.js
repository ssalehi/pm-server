const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const warehouses = require('../../../warehouses');

describe('Warehouse PUT API', () => {
    beforeEach(done => {
        lib.dbHelpers.dropAll()
            .then(res => {
                return models()['WarehouseTest'].insertMany(warehouses);
                //   done();
            })
            .then(res => {
                done();
            })
            .catch(err => {
                console.error('Error in beforeEach block: ', err);
                done();
            });
    });

    it('should change priorities', function (done) {
        this.done = done;
        properties = [{
                    "_id": warehouses[0]._id,
                    "priority": 2,
                    "is_active": false
                },
                {
                    "_id": warehouses[1]._id,
                    "priority": 0,
                    "is_active": false
                },
                {
                    "_id": warehouses[2]._id,
                    "priority": 3,
                    "is_active": false
                }, {
                    "_id": warehouses[3]._id,
                    "priority": 1,
                    "is_active": true
                },
                {
                    "_id": warehouses[4]._id,
                    "priority": 4,
                    "is_active": false
                }
            ],
            rp({
                method: 'PUT',

                body: {
                    "warehouses": properties
                },

                json: true,
                uri: lib.helpers.apiTestURL('warehouse/update'),
                resolveWithFullResponse: true,
            })

            .then(res => {
                expect(res.statusCode).toBe(200);
                return models()['WarehouseTest'].find();
            }).then(res => {
                console.log('->', res);

                expect(res.length).toBe(5);

                // console.log( "properties", properties)
                // res.forEach(element => {
                //     const result=  properties.filter(o => !res.find(element => o.id === element.id))
                //     // const result = properties.filter(item=>{item._id == element._id} );
                //     console.log("results are:",result);
                //     expect(element.priority).toBe(result[0].priority)
                //     expect(element.is_active).toBe(result[0].is_active)
                // });

                expect(res[0].priority).toBe(2)
                expect(res[0].is_active).toBe(false)
                expect(res[1].priority).toBe(0)
                expect(res[1].is_active).toBe(false)
                expect(res[2].priority).toBe(3)
                expect(res[2].is_active).toBe(false)
                expect(res[3].priority).toBe(1)
                expect(res[3].is_active).toBe(true)
                expect(res[4].priority).toBe(4)
                expect(res[4].is_active).toBe(false)

                done();
            })
            .catch(lib.helpers.errorHandler.bind(this));
    });
})