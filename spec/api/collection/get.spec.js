const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('GET Collection', () => {

  let adminObj = {
    aid: null,
    jar: null,
  };


  let tagGroupId = new mongoose.Types.ObjectId();

  let productTypes, brands, colors, products, collections, tags, tagGroups;

  beforeEach(async (done) => {

    try {

      await lib.dbHelpers.dropAll();

      let res = await lib.dbHelpers.addAndLoginAgent('admin')
      adminObj.aid = res.aid;
      adminObj.jar = res.rpJar;

      tagGroups = await models()['TagGroupTest'].insertMany([
        {
          _id: tagGroupId,
          name: 'tg 1',
          is_required: false
        }
      ])

      productTypes = await models()['ProductTypeTest'].insertMany([
        {
          name: 'Shoes'
        }
      ]);

      colors = await models()['ColorTest'].insertMany([
        {
          color_id: 101,
          name: 'green',
        }]);

      brands = await models()['BrandTest'].insertMany([{
        name: 'NIKE'
      }]);

      tags = await models()['TagTest'].insertMany([{
        name: 'tag 1',
        tag_group_id: tagGroupId
      },
      {
        name: 'tag 2',
        tag_group_id: tagGroupId
      }]);

      products = await models()['ProductTest'].insertMany([
        {
          name: 'product one',
          product_type: {name: 'Shoes', product_type_id: productTypes[0].id},
          brand: {name: 'Nike', brand_id: brands[0].id},
          base_price: 1000,
          article_no: "123456",
          instances: [
            {sold_out: false, price: 2000, barcode: '123456', size: 'L'},
          ]
        },
        {
          name: 'product two',
          product_type: {name: 'Shoes', product_type_id: productTypes[0].id},
          brand: {name: 'Nike', brand_id: brands[0].id},
          base_price: 1000,
          article_no: "123457",
          instances: [
            {sold_out: false, price: 2000, barcode: '123456', size: 'L'},
          ]

        },
        {
          name: 'product three',
          product_type: {name: 'Shoes', product_type_id: productTypes[0].id},
          brand: {name: 'Nike', brand_id: brands[0].id},
          tags: [{name: 'tag 1', tg_name: 'tg 1', tag_id: tags[0].id}],
          base_price: 1000,
          article_no: "123458",
          instances: [
            {sold_out: false, price: 2000, barcode: '123456', size: 'L'},
          ]
        },
        {
          name: 'product four',
          product_type: {name: 'Shoes', product_type_id: productTypes[0].id},
          brand: {name: 'Nike', brand_id: brands[0].id},
          tags: [
            {name: 'tag 1', tg_name: 'tg 1', tag_id: tags[0].id},
            {name: 'tag 2', tg_name: 'tg 1', tag_id: tags[1].id},
          ],
          base_price: 1000,
          article_no: "123459",
          instances: [
            {sold_out: false, price: 2000, barcode: '123456', size: 'L'},
            {sold_out: true, price: 2000, barcode: '36547', size: 'L'},
          ]
        }
      ]);

      collections = await models()['CollectionTest'].insertMany([{
        name: 'collection 1',
        name_fa: 'کالکشن 1',
        productIds: [products[0].id, products[1].id],
        tagIds: tags.map(x => x.id),
        typeIds: productTypes.map(x => x.id)
      }]);


      done();
    } catch (err) {
      console.log('-> ', err);
    }
  }, 15000);

  it('should return collection info', async function (done) {

    try {
      this.done = done;
      let res = await rp({
        method: 'get',
        uri: lib.helpers.apiTestURL(`collection/${collections[0].id}`),
        jar: adminObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body._id.toString()).toBe(collections[0].id.toString());
      expect(res.body.name).toBe(collections[0].name);
      expect(res.body.name_fa).toBe(collections[0].name_fa);
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('should return collection types', async function (done) {
    try {
      this.done = done;
      let res = await rp({
        method: 'get',
        uri: lib.helpers.apiTestURL(`collection/type/${collections[0].id}`),
        jar: adminObj.jar,
        json: true,
        resolveWithFullResponse: true
      })
      expect(res.statusCode).toBe(200);
      let types = res.body.types;
      expect(types.length).toBe(1);
      types.map(x => x.name).forEach(name => expect(productTypes.map(y => y.name)).toContain(name));
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('should return collection tags', async function (done) {
    try {
      this.done = done;
      let res = await rp({
        method: 'get',
        uri: lib.helpers.apiTestURL(`collection/tag/${collections[0].id}`),
        jar: adminObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      let tags = res.body.tags;
      expect(tags.length).toBe(2);
      tags.map(x => x.name).forEach(name => expect(tags.map(y => y.name)).toContain(name));
      tags.map(x => x.tg_name).forEach(tg_name => expect(tagGroups.map(y => y.name)).toContain(tg_name));

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('should return collection manual products (2 products)', async function (done) {
    try {
      this.done = done;
      let res = await rp({
        method: 'get',
        uri: lib.helpers.apiTestURL(`collection/product/manual/${collections[0].id}`),
        jar: adminObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);

      expect(res.body.name).toBe(collections[0].name);
      let products = res.body.products;
      expect(products.length).toBe(2);
      products.map(x => x.name).forEach(name => expect(products.map(x => x.name)).toContain(name));
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('should return collection not sold out products  (only product 4 and two manual products)', async function (done) {
    try {
      this.done = done;
      let res = await rp({
        method: 'get',
        uri: lib.helpers.apiTestURL(`collection/product/${collections[0].id}`),
        jar: adminObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe(collections[0].name);
      expect(res.body.products.length).toBe(3);
      let product4 = res.body.products.find(x => x._id === products[3].id.toString());
      expect(product4.tags.length).toBe(2);
      expect(product4.instances.length).toBe(1);
      expect(product4.instances[0].barcode).toBe(products[3].instances[0].barcode); // not sold out instance
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('should return app page products', async function (done) {
    try {

      this.done = done;
      let appPage = models()['PageTest']({

        address: 'testAddress',
        is_app: true,
        page_info: {
          collection_id: collections[0].id
        }

      });

      await appPage.save();
      let res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`collection/app/products`),
        body: {
          address: 'testAddress'
        },
        jar: adminObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe(collections[0].name);
      expect(res.body.products.length).toBe(3);
      res.body.products.map(x => x.article_no).forEach(x => {
        expect([products[0], products[1], products[3]].map(y => y.article_no).includes(x)).toBeTruthy();
      })
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });

  it('should get error when request for products of page which is not for app', async function (done) {
    try {
      this.done = done;

      let appPage = models()['PageTest']({

        address: 'testAddress',
        is_app: false,
        page_info: {
          collection_id: collections[0].id
        }

      });
      await appPage.save();
      await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`collection/app/products`),
        body: {
          address: 'testAddress'
        },
        jar: adminObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      this.fail('did not failed when page is not for app');
      done();
    } catch (err) {
      expect(err.statusCode).toBe(error.appOnly.status);
      expect(err.error).toEqual(error.appOnly.message);
      done();
    }
  });
  it('should get error when request for products of page which is not defined', async function (done) {
    try {
      this.done = done;
      let res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`collection/app/products`),
        body: {
          address: 'testAddress'
        },
        jar: adminObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      this.fail('did not failed when page is not for app');
      done();
    } catch (err) {
      expect(err.statusCode).toBe(error.pageNotFound.status);
      expect(err.error).toEqual(error.pageNotFound.message);
      done();
    }
  });
  it('should get error when request for products of page which have no page info collection id', async function (done) {
    try {
      this.done = done;

      let appPage = models()['PageTest']({

        address: 'testAddress',
        is_app: false,
        page_info: {
          // collection_id: collections[0].id
        }

      });

      await appPage.save()
      await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`collection/app/products`),
        body: {
          address: 'testAddress'
        },
        jar: adminObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      this.fail('did not failed when page is not for app');
      done();
    } catch (err) {
      expect(err.statusCode).toBe(error.pageInfoError.status);
      expect(err.error).toEqual(error.pageInfoError.message);
      done();
    };
  });

  it('should get error when cid is not valid', async function (done) {
    try {
      this.done = done;
      await rp({
        method: 'get',
        uri: lib.helpers.apiTestURL(`collection/1`),
        jar: adminObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      this.fail('expect error when cid is not valid');
      done();
    } catch (err) {
      expect(err.statusCode).toBe(error.collectionIdIsNotValid.status);
      expect(err.error).toEqual(error.collectionIdIsNotValid.message);
      done();
    };
  });

  it('should get error when admin is not calling the api', async function (done) {
    try {
      this.done = done;
      await rp({
        method: 'get',
        uri: lib.helpers.apiTestURL(`collection/product/manual/${collections[0].id}`),
        // jar: adminObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      this.fail('did not failed when non admin user is calling the api');
      done();
    } catch (err) {
      expect(err.statusCode).toBe(error.adminOnly.status);
      expect(err.error).toEqual(error.adminOnly.message);
      done();
    };
  });

});
