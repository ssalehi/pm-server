const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
describe("Get Page Placement", () => {

  let page1, page2, collection1, collection2, placement1, placement2, placementInfo1, placementInfo2;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        let inserts = [];
        let n = 0;
        while (n < 5) {
          let newPage = models['PageTest']({
            address: `testAddress${n + 1}`,
            is_app: false,
          });
          inserts.push(newPage.save());
          n++;
        }

        collection1 = models['CollectionTest']({
          name: 'collection1'
        });
        collection2 = models['CollectionTest']({
          name: 'collection2'
        });

        placementInfo1 = models['PlacementInfoSchema']({

        });
        placementInfo2 = models['PlacementInfoSchema']({

        });

        placement1 = models['PlacementTest']({
          component_name: 'main', // menu, main, slider, ...
          variable_name: '', // sub component
          start_date: '', // for scheduling
          end_date: '',
          info: [],
        })

        placement2 = models['PlacementTest']({
          component_name: 'main', // menu, main, slider, ...
          variable_name: '', // sub component
          start_date: '', // for scheduling
          end_date: '',
          info: [],
        })

        page1 = models['PageTest']({
          address: 'testAddress6',
          is_app: false,
          placement: []
          page_info: {
            collection_id: collection1._id
          }
        });
        page2 = models['PageTest']({
          address: 'testAddress7',
          is_app: true,
          page_info: {
            collection_id: collection2._id,
            content: 'some html content'
          }
        });

        inserts.push([collection1.save(), collection2.save(), page1.save(), page2.save()]);
        return Promise.all(inserts);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  // xit("should return 404 error code while calling api", function (done) {
  //   this.done = done;
  //   rp({
  //     method: 'get',
  //     uri: lib.helpers.apiTestURL(`pagePlacement/${page1._id}`),
  //     resolveWithFullResponse: true
  //   }).then(res => {
  //     this.fail('Api is not found');
  //     done();
  //
  //   })
  //     .catch(err => {
  //       expect(err.statusCode).toBe(404);
  //       console.log(err.message);
  //       done();
  //     });
  //
  // });



});




