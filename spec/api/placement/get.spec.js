const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const error = require('../../../lib/errors.list');
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

        placement1 = models['PlacementTest']({
          component_name: 'main', // menu, main, slider, ...
          variable_name: '', // sub component
          start_date: '', // for scheduling
          end_date: '',
          info: {
            panel_type: "half-test",
            imgUrl:
              "../../../../assets/pictures/nike-first-page-pic/half-1.png",
            href:
              "#",
            areas:
              [
                {
                  pos: "left-center-test",
                  title: "تست کاملا گرم",
                  text: "تست محصولات پشمی مناسب زمستان",
                  color: ""
                }
              ]
          },
        });

        placement2 = models['PlacementTest']({
          component_name: 'main',
          variable_name: '',
          start_date: '',
          end_date: '',
          info: {
            panel_type: "quarter-test",
            topTitle:
              {
                title: "تست رنگهای جدید، دلخواه شما",
                text: "",
                color:
                  "black"
              }
            ,
            imgUrl: "../../../../assets/pictures/nike-first-page-pic/q1.png",
            href:
              "#",
            subTitle:
              {
                title: "تست کفش راحتی زنانه، مدل ژاکلین",
                text: "تست کفش زنانه",
                color: "black",
                textColor:
                  "gray"
              }
            ,
            areas: []
          },
        });

        page1 = models['PageTest']({
          address: 'testAddress6',
          is_app: false,
          placement: [placement1._id, placement2._id],
          page_info: {
            collection_id: collection1._id
          }
        });
        page2 = models['PageTest']({
          address: 'testAddress7',
          is_app: true,
          placement: [placement2._id],
          page_info: {
            collection_id: collection2._id,
            content: 'some html content'
          }
        });

        inserts.push([collection1.save(), collection2.save(), placement1.save(), placement2.save(), page1.save(), page2.save(), ]);
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

  it("should return 404 error code while calling api", function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`pagePlacementt/${page1._id}`),
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('Api is not found');
      done();
    })
    .catch(err => {
      expect(err.statusCode).toBe(404);
      console.log(err.message);
      done();
    });
  });

  it("should threw an error when calling api with invalid pageId", function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`pagePlacement/1`),
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('Page id should not be null');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.pageIdIsNotValid.status);
        expect(err.statusCode).toBe(500);
        // expect(err.message).toEqual(error.pageIdIsNotValid.message);
        console.log(err.message);
        done();
      });
  });

  it('should return placement of page with details', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`pagePlacement/${page1._id}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      // let result = JSON.parse(res[0].body);
      console.log('res : ', res.body);
      expect(res.statusCode).toBe(200);
      // expect(res.length).toBe(2);
      // expect(res[0].component_name).toBe('main');
      // expect(res[0].info.panel_type).toBe('half-test');
      // expect(res[0].info.topTitle.title).toBe('تست رنگهای جدید، دلخواه شما');
      done();
    }).catch(err => {
        lib.helpers.errorHandler.bind(this)
      });
  });

});




