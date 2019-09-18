const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const warehouses = require('../../../warehouses');
const _const = require('../../../lib/const.list');
describe('Warehouse PUT API', () => {
    let adminObj = {
        jar: null
    }
   let i=0;
   


    beforeEach(done => {
        lib.dbHelpers.dropAll()
            .then(() => {
                models()['WarehouseTest'].insertMany(warehouses);
            })
            .then(() => {
                return lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager)
            })
            .then(res => {
                adminObj.jar = res.rpJar;
               
                done()
            })
            .catch(err => {
                console.error('Error in beforeEach block: ', err);
                done();
            });
    }, 15000);

    it('should change priorities', function (done) {
        this.done = done;
        properties = [{
                    _id: warehouses[0]._id,
                    priority: i+2,
                    is_active: false
                },
                {
                    _id: warehouses[1]._id,
                    priority: i+0,
                    is_active: false
                },
                {
                    _id: warehouses[2]._id,
                    priority: i+3,
                    is_active: false
                }, {
                    _id: warehouses[3]._id,
                    priority: i+1,
                    is_active: true
                },
                {
                    _id: warehouses[4]._id,
                    priority: i+4,
                    is_active: false
                }
            ],
            rp({
                method: 'PUT',
                body: {
                    "warehouses": properties
                },
                jar: adminObj.jar,
                json: true,
                uri: lib.helpers.apiTestURL('warehouse/update'),
                resolveWithFullResponse: true,
            })
        
            .then(res => {
                expect(res.statusCode).toBe(200);
                return models()['WarehouseTest'].find();
            }).then(res => {


                expect(res.length).toBe(5);
                res.forEach(x => {
                    let preProp = properties.find(y => y._id.toString() === x._id.toString())
                    expect(preProp).toBeDefined();
                    expect(x.priority).toBe(preProp.priority)
                    expect(x.is_active).toBe(preProp.is_active)
                })
                i++;

                
                done()
            })
       
            .catch(lib.helpers.errorHandler.bind(this));
    
    });
    

    it("should check if when the database is dropped new data is fetched", function (done) {

        this.done = done;
    
        rp({
          method: 'get',
          uri: lib.helpers.apiTestURL(`warehouse/all`),
          resolveWithFullResponse: true
        }).then(res => {
          expect(res.statusCode).toBe(200);
          let result = JSON.parse(res.body);
          result.forEach(x => {
            let preProp = warehouses.find(y => y._id.toString() === x._id.toString())
            expect(preProp).toBeDefined();
            expect(x.priority).toBe(preProp.priority)
            expect(x.is_active).toBe(preProp.is_active)
        })



          done();
    
        })
          .catch(lib.helpers.errorHandler.bind(this));
      });



})

