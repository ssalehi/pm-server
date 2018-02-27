const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
describe("Get Page", () => {

  let page1, page2, collection1, collection2, page3;

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

        page1 = models['PageTest']({
          address: 'testAddress6',
          is_app: false,
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

        page3 = models['PageTest']({
          address: 'testAddress8',
          is_app: false,
          page_info: {
            collection_id: collection2._id,
            content: 'some html content'
          },
          placement: [
            {
              component_name: 'main'
            },
            {
              component_name: 'slider'
            },
            {
              component_name: 'menu'
            },
            {
              component_name: 'slider'
            },
            {
              component_name: 'main'
            },
            {
              component_name: 'menu'
            },
            {
              component_name: 'menu'
            },



          ]
        });




        inserts.push([collection1.save(), collection2.save(), page1.save(), page2.save(), page3.save()]);
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



  it("should get specific page by its id", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`page/${page1._id}`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result[0]._id).toBe(page1._id.toString());
      expect(result[0].collection.name).toBe(collection1.name);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should get page info of a page its id", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`page/${page2._id}`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result[0]._id).toBe(page2._id.toString());
      expect(result[0].page_info.content).toBe(page2.page_info.content);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should get page placements brief for admin panel with offset and limit", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`page/placement/${page3._id}/0/5`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result.length).toBe(5);


      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});


describe("Get Page Placement", () => {
  let page1, page2, collection1, collection2, placement1, placement2;

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

        placement1 = {
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
        };

        placement2 = {
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
        };

        page1 = models['PageTest']({
          address: 'testAddress6',
          is_app: false,
          placement: [placement1, placement2],
          page_info: {
            collection_id: collection1._id
          }
        });
        page2 = models['PageTest']({
          address: 'testAddress7',
          is_app: true,
          placement: [placement2],
          page_info: {
            collection_id: collection2._id,
            content: 'some html content'
          }
        });

        inserts.push([collection1.save(), collection2.save(), page1.save(), page2.save(), ]);
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
      uri: lib.helpers.apiTestURL(`page/placementt/testAddress6`),
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

  it('should return placement of page with details', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`page/placement/testAddress6`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.placement.length).toBe(2);
      expect(res.body.placement[0].component_name).toBe('main');
      expect(res.body.placement[0].info.panel_type).toBe('half-test');
      expect(res.body.placement[0].info.panel_type).toBe('half-test');
      expect(res.body.is_app).toBe(false);

      done();
    }).catch(err => {
      lib.helpers.errorHandler.bind(this)
    });
  });
});