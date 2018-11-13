const rp = require('request-promise');
const lib = require('../../../lib');
const _const = require('../../../lib/const.list');
const errors = require('../../../lib/errors.list');
const warehouses = require('../../../warehouses');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');

describe("Fetch Delivery Items POST API", () => {
  let
    deliveryAgents = [],
    deliveries = [],
    orders = [],
    products = [],
    salesManager,
    shopClerk,
    hubClerk,
    customer,
    centralId,
    warehouseId,
    hubId;

  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll();
      await models()['WarehouseTest'].insertMany(warehouses);
      deliveryAgents = (await Promise.all([
        lib.dbHelpers.addAndLoginAgent('da1', _const.ACCESS_LEVEL.DeliveryAgent),
        lib.dbHelpers.addAndLoginAgent('da2', _const.ACCESS_LEVEL.DeliveryAgent)
      ]));
      centralId = warehouses.find(el => !el.is_hub && !el.has_customer_pickup)._id;
      warehouseId = warehouses.find(el => !el.is_hub && el.has_customer_pickup)._id;
      hubId = warehouses.find(el => el.is_hub)._id;

      salesManager = (await lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, centralId));
      shopClerk = (await lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouseId));
      hubClerk = (await lib.dbHelpers.addAndLoginAgent('hc', _const.ACCESS_LEVEL.HubClerk, hubId));

      const address = {
        _id: mongoose.Types.ObjectId(),
        province: 'Tehran',
        city: 'Tehran',
        district: '3',
        street: 'Shariati',
        unit: '10',
        no: '20',
        postal_code: '30405060',
        recipient_title: 'm',
        recipient_name: 'Ali',
        recipient_surname: 'Alavi',
        recipient_national_id: '0123456789',
        recipient_mobile_no: '09092301202'
      };
      const ticket = {
        status: _const.ORDER_STATUS.DeliverySet,
        desc: "descccc",
        timeStamp: new Date(),
        is_processed: false,
        referral_advice: 1123,
        agent_id: mongoose.Types.ObjectId()
      };
      const deliveryStatus = {
        agent_id: mongoose.Types.ObjectId(),
        status: _const.ORDER_STATUS.DeliverySet,
        is_processed: false,
        timeStamp: new Date()
      };

      customer = {
        _id: mongoose.Types.ObjectId(),
        first_name: 'AA',
        surname: 'BB',
        username: 'AB',
        is_verified: 3,
        addresses: [address]
      };

      await models()['CustomerTest'].insertMany([customer]);

      products = [
        {
          _id: mongoose.Types.ObjectId(),
          name: 'Product 1',
          product_type: {name: 'Nike', product_type_id: mongoose.Types.ObjectId()},
          brand: {name: 'Puma', brand_id: mongoose.Types.ObjectId()},
          base_price: 30000,
          desc: 'some description for this product',
          details: 'some details for this product',
          article_no: 'ABCD',
          colors: [
            {
              _id: mongoose.Types.ObjectId(),
              color_id: mongoose.Types.ObjectId(),
              name: 'green',
              image: {
                thumbnail: 'one thumbnail',
                angels: ['some url 11', 'some url 12']
              }
            },
            {
              _id: mongoose.Types.ObjectId(),
              color_id: mongoose.Types.ObjectId(),
              name: 'red',
              image: {
                thumbnail: 'another thumbnail',
                angels: ['some url 21', 'some url 22', 'some url 23']
              }
            }
          ],
          instances: [
            {
              _id: mongoose.Types.ObjectId(),
              product_color_id: mongoose.Types.ObjectId(),
              size: '12',
              price: 123,
              barcode: '123456789',
            },
            {
              _id: mongoose.Types.ObjectId(),
              product_color_id: mongoose.Types.ObjectId(),
              size: '8',
              barcode: '123456780',
            },
            {
              _id: mongoose.Types.ObjectId(),
              product_color_id: mongoose.Types.ObjectId(),
              size: '15',
              barcode: '123456700',
            }
          ]
        },
        {
          _id: mongoose.Types.ObjectId(),
          name: 'Product 2',
          product_type: {name: 'Nike', product_type_id: mongoose.Types.ObjectId()},
          brand: {name: 'Puma', brand_id: mongoose.Types.ObjectId()},
          base_price: 50000,
          desc: 'some description for this product',
          details: 'some details for this product',
          article_no: 'ABCD12',
          colors: [
            {
              _id: mongoose.Types.ObjectId(),
              color_id: mongoose.Types.ObjectId(),
              name: 'green',
              image: {
                thumbnail: 'one thumbnail',
                angels: ['some url 11', 'some url 12']
              }
            },
            {
              _id: mongoose.Types.ObjectId(),
              color_id: mongoose.Types.ObjectId(),
              name: 'red',
              image: {
                thumbnail: 'another thumbnail',
                angels: ['some url 21', 'some url 22', 'some url 23']
              }
            }
          ],
          instances: [
            {
              _id: mongoose.Types.ObjectId(),
              product_color_id: mongoose.Types.ObjectId(),
              size: '12',
              price: '123',
              barcode: '123456789',
            }
          ]
        }
      ];

      await models()['ProductTest'].insertMany(products);

      orders = [
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customer._id,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: products[0]._id,
            product_instance_id: products[0].instances[0]._id,
          }, {
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: products[0]._id,
            product_instance_id: products[0].instances[1]._id,
          }],
          adding_time: new Date(),
        },
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customer._id,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: products[0]._id,
            product_instance_id: products[0].instances[0]._id,
          }, {
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: products[1]._id,
            product_instance_id: products[1].instances[0]._id,
          }],
          adding_time: new Date(),
        },
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customer._id,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: products[0]._id,
            product_instance_id: products[0].instances[2]._id,
          }],
          adding_time: new Date(),
        },
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customer._id,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: products[1]._id,
            product_instance_id: products[1].instances[0]._id,
          }, {
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: products[0]._id,
            product_instance_id: products[0].instances[2]._id,
          }],
          adding_time: new Date(),
        },
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customer._id,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: products[1]._id,
            product_instance_id: products[1].instances[0]._id,
          }],
          adding_time: new Date(),
        },
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customer._id,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: products[0]._id,
            product_instance_id: products[0].instances[1]._id,
          }],
          adding_time: new Date(),
        },
      ];

      await models()['OrderTest'].insertMany(orders);

      deliveries = [
        {
          _id: mongoose.Types.ObjectId(),
          order_details: [
            {
              order_id: orders[0]._id,
              order_line_ids: orders[0].order_lines.map(el => el._id)
            },
            {
              order_id: orders[1]._id,
              order_line_ids: orders[1].order_lines.map(el => el._id)
            }
          ],
          status_list: [deliveryStatus],
          from: {
            warehouse_id: warehouseId
          },
          to: {
            warehouse_id: hubId
          },
          start:new  Date(2010, 10, 10),
          end: new Date(2010, 10, 12),
          delivery_start: new Date(2010, 10, 10),
          delivery_end: new Date(2010, 10, 10)
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: [
            {
              order_id: orders[2]._id,
              order_line_ids: orders[2].order_lines.map(el => el._id)
            }
          ],
          from: {
            warehouse_id: hubId
          },
          to: {
            customer: {
              _id: orders[0].customer_id,
              address_id: orders[0].address._id,
            }
          },
          status_list: [deliveryStatus],
          start: new Date(2010, 10, 11),
          end: new Date(2010, 10, 14),
          delivery_start: new Date(2010, 10, 13),
          delivery_end: new Date(2010, 10, 14)
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: [
            {
              order_id: orders[3]._id,
              order_line_ids: orders[3].order_lines.map(el => el._id)
            },
          ],
          from: {
            warehouse_id: hubId
          },
          to: {
            warehouse_id: warehouseId
          },
          delivery_agent: deliveryAgents[0].aid,
          status_list: [deliveryStatus],
          start: new Date(2010, 10, 13),
          end: new Date(2010, 10, 15),
          delivery_start: new Date(2010, 10, 14),
          delivery_end: new Date(2010, 10, 15),
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: [
            {
              order_id: orders[4]._id,
              order_line_ids: orders[4].order_lines.map(el => el._id)
            }
          ],
          from: {
            customer: {
              _id: orders[4].customer_id,
              address_id: orders[4].address._id,
            }
          },
          to: {
            warehouse_id: hubId
          },
          is_return: true,
          status_list: [deliveryStatus],
          start: new Date(2010, 11, 15),
          end: new Date(2010, 11, 20)
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: [
            {
              order_id: orders[5]._id,
              order_line_ids: orders[5].order_lines.map(el => el._id)
            }
          ],
          from: {
            warehouse_id: centralId
          },
          to: {
            warehouse_id: hubId
          },
          status_list: [{
            agent_id: mongoose.Types.ObjectId(),
            status: _const.ORDER_STATUS.Delivered,
            is_processed: true,
            timeStamp: new Date()
          }],
          delivered_evidence: 'abcd',
          delivery_agent: deliveryAgents[0].aid,
          start: new Date(2010, 11, 16),
          end: new Date(2010, 11, 19)
        },
      ];

      await models()['DeliveryTest'].insertMany(deliveries);

      done();
    } catch (err) {
      console.log('Error in beforeEach: ', err);
      done();
    }
  }, 10000);

  it("Sales manager should get all delivery items", async function (done) {
    this.done = done;

    try {
      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`delivery/items/0/10`),
        body: {
          sort_column: '',
          agentName: '',
          transferee: '',
          direction: '',
          endDate: '',
          isDelivered: '',
          isInternal: '',
        },
        jar: salesManager.rpJar,
        json: true,
        resolveWithFullResponse: true
      });

      expect(res.statusCode).toBe(200);

      res = res.body;

      expect(res.total).toBe(5);

      res = res.result;

      const agentDetails = (await models()['AgentTest'].findOne({_id: deliveryAgents[0].aid}));

      const returnedDelivery = res.find(el => el._id.toString() === deliveries[3]._id.toString());
      expect(returnedDelivery.product_intances.map(el => el.product_id.toString())).toContain(products[1]._id.toString());
      expect(returnedDelivery.is_return).toBe(true);
      expect(returnedDelivery.from.customer.first_name).toBe(customer.first_name);
      expect(returnedDelivery.from.customer.surname).toBe(customer.surname);
      expect(returnedDelivery.to.warehouse._id).toBe(hubId.toString());

      const fromCentral = res.find(el => el._id.toString() === deliveries[4]._id.toString());
      expect(fromCentral.product_intances.map(el => el.product_id.toString())).toContain(products[0]._id.toString());
      expect(fromCentral.delivery_agent.first_name).toBe(agentDetails.first_name);
      expect(fromCentral.from.warehouse._id.toString()).toBe(centralId.toString());
      expect(fromCentral.to.warehouse._id.toString()).toBe(hubId.toString());
      expect(fromCentral.to.customer).toBeUndefined();

      const toWarehouse = res.find(el => el._id.toString() === deliveries[2]._id.toString());
      expect(toWarehouse.product_intances.map(el => el.product_id.toString())).toContain(products[0]._id.toString());
      expect(toWarehouse.product_intances.map(el => el.product_id.toString())).toContain(products[1]._id.toString());
      expect(toWarehouse.delivery_agent.first_name).toBe(agentDetails.first_name);
      expect(toWarehouse.from.warehouse._id.toString()).toBe(hubId.toString());
      expect(toWarehouse.to.warehouse._id.toString()).toBe(warehouseId.toString());
      expect(toWarehouse.to.customer).toBeUndefined();

      const toCustomer = res.find(el => el._id.toString() === deliveries[1]._id.toString());
      expect(toCustomer.product_intances.map(el => el.product_id.toString())).toContain(products[0]._id.toString());
      expect(toCustomer.from.warehouse._id.toString()).toBe(hubId.toString());
      expect(toCustomer.to.customer.first_name).toBe(orders[0].address.recipient_name);

      console.log(' ==> to.customer ==> ', toCustomer.to.customer);

      expect(toCustomer.to.customer.surname).toBe(orders[0].address.recipient_surname);
      expect(toCustomer.to.warehouse).toBeUndefined();

      const fromWarehouse = res.find(el => el._id.toString() === deliveries[0]._id.toString());
      expect(fromWarehouse.product_intances.map(el => el.product_id.toString())).toContain(products[0]._id.toString());
      expect(fromWarehouse.from.warehouse._id.toString()).toBe(warehouseId.toString());
      expect(fromWarehouse.to.warehouse._id.toString()).toBe(hubId.toString());
      expect(fromWarehouse.to.customer).toBeUndefined();

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  // it("Sales manager should get deliveries based on offset and limit (default soft is based on end field in document)", async function (done) {
  //   this.done = done;

  //   try {
  //     let res = await rp({
  //       method: 'post',
  //       uri: lib.helpers.apiTestURL(`delivery/items/3/3`),
  //       body: {
  //         sort_column: '',
  //         agentName: '',
  //         transferee: '',
  //         direction: '',
  //         endDate: '',
  //         isDelivered: '',
  //         isInternal: '',
  //       },
  //       jar: salesManager.rpJar,
  //       json: true,
  //       resolveWithFullResponse: true
  //     });

  //     expect(res.statusCode).toBe(200);

  //     res = res.body;

  //     expect(res.total).toBe(5);

  //     res = res.result;

  //     expect(res.length).toBe(2);

  //     const agentDetails = (await models()['AgentTest'].findOne({_id: deliveryAgents[0].aid}));

  //     const returnedDelivery = res.find(el => el._id.toString() === deliveries[3]._id.toString());
  //     expect(returnedDelivery.product_intances.map(el => el.product_id.toString())).toContain(products[1]._id.toString());
  //     expect(returnedDelivery.is_return).toBe(true);
  //     expect(returnedDelivery.from.customer.first_name).toBe(customer.first_name);
  //     expect(returnedDelivery.to.warehouse._id).toBe(hubId.toString());

  //     const fromCentral = res.find(el => el._id.toString() === deliveries[4]._id.toString());
  //     expect(fromCentral.product_intances.map(el => el.product_id.toString())).toContain(products[0]._id.toString());
  //     expect(fromCentral.delivery_agent.first_name).toBe(agentDetails.first_name);
  //     expect(fromCentral.from.warehouse._id.toString()).toBe(centralId.toString());
  //     expect(fromCentral.to.warehouse._id.toString()).toBe(hubId.toString());
  //     expect(fromCentral.to.customer).toBeUndefined();
      
  //     done();
  //   } catch (err) {
  //     lib.helpers.errorHandler.bind(this)(err);
  //   }
  // })

  // it("Sales manager should get only returned deliveries", async function (done) {
  //   this.done = done;

  //   try {
  //     let res = await rp({
  //       method: 'post',
  //       uri: lib.helpers.apiTestURL(`delivery/items/0/1`),
  //       body: {
  //         sort_column: '',
  //         agentName: '',
  //         transferee: '',
  //         direction: '',
  //         endDate: '',
  //         isReturn: true,
  //       },
  //       jar: salesManager.rpJar,
  //       json: true,
  //       resolveWithFullResponse: true
  //     });

  //     expect(res.statusCode).toBe(200);

  //     res = res.body;

  //     expect(res.total).toBe(1);

  //     res = res.result;

  //     expect(res.length).toBe(1);

  //     const agentDetails = (await models()['AgentTest'].findOne({_id: deliveryAgents[0].aid}));

  //     const returnedDelivery = res.find(el => el._id.toString() === deliveries[3]._id.toString());
  //     expect(returnedDelivery.product_intances.map(el => el.product_id.toString())).toContain(products[1]._id.toString());
  //     expect(returnedDelivery.is_return).toBe(true);
  //     expect(returnedDelivery.from.customer.first_name).toBe(customer.first_name);
  //     expect(returnedDelivery.to.warehouse._id).toBe(hubId.toString());

  //     done();
  //   } catch (err) {
  //     lib.helpers.errorHandler.bind(this)(err);
  //   }
  // });

  // it("Sales manager should get only internal deliveries", async function (done) {
  //   this.done = done;

  //   try {
  //     let res = await rp({
  //       method: 'post',
  //       uri: lib.helpers.apiTestURL(`delivery/items/1/2`),
  //       body: {
  //         sort_column: '',
  //         agentName: '',
  //         transferee: '',
  //         direction: '',
  //         endDate: '',
  //         isInternal: true,
  //       },
  //       jar: salesManager.rpJar,
  //       json: true,
  //       resolveWithFullResponse: true
  //     });

  //     expect(res.statusCode).toBe(200);

  //     res = res.body;

  //     expect(res.total).toBe(3);

  //     res = res.result;

  //     expect(res.length).toBe(2);

  //     const agentDetails = (await models()['AgentTest'].findOne({_id: deliveryAgents[0].aid}));

  //     const fromCentral = res.find(el => el._id.toString() === deliveries[4]._id.toString());
  //     expect(fromCentral.product_intances.map(el => el.product_id.toString())).toContain(products[0]._id.toString());
  //     expect(fromCentral.delivery_agent.first_name).toBe(agentDetails.first_name);
  //     expect(fromCentral.from.warehouse._id.toString()).toBe(centralId.toString());
  //     expect(fromCentral.to.warehouse._id.toString()).toBe(hubId.toString());
  //     expect(fromCentral.to.customer).toBeUndefined();

  //     const toWarehouse = res.find(el => el._id.toString() === deliveries[2]._id.toString());
  //     expect(toWarehouse.product_intances.map(el => el.product_id.toString())).toContain(products[0]._id.toString());
  //     expect(toWarehouse.product_intances.map(el => el.product_id.toString())).toContain(products[1]._id.toString());
  //     expect(toWarehouse.delivery_agent.first_name).toBe(agentDetails.first_name);
  //     expect(toWarehouse.from.warehouse._id.toString()).toBe(hubId.toString());
  //     expect(toWarehouse.to.warehouse._id.toString()).toBe(warehouseId.toString());
  //     expect(toWarehouse.to.customer).toBeUndefined();

  //     done();
  //   } catch (err) {
  //     lib.helpers.errorHandler.bind(this)(err);
  //   }
  // });

  // it("Shop clerk should get delivery items sent from current shop", async function (done) {
  //   this.done = done;

  //   try {
  //     let res = await rp({
  //       method: 'post',
  //       uri: lib.helpers.apiTestURL(`delivery/items/0/1`),
  //       body: {
  //         sort_column: '',
  //         agentName: '',
  //         transferee: '',
  //         direction: '',
  //         endDate: '',
  //         isDelivered: '',
  //         isInternal: '',
  //       },
  //       jar: shopClerk.rpJar,
  //       json: true,
  //       resolveWithFullResponse: true
  //     });

  //     expect(res.statusCode).toBe(200);

  //     res = res.body;

  //     expect(res.total).toBe(1);
      
  //     res = res.result;

  //     expect(res.length).toBe(1);

  //     const fromWarehouse = res.find(el => el._id.toString() === deliveries[0]._id.toString());
  //     expect(fromWarehouse.product_intances.map(el => el.product_id.toString())).toContain(products[0]._id.toString());
  //     expect(fromWarehouse.from.warehouse._id.toString()).toBe(warehouseId.toString());
  //     expect(fromWarehouse.to.warehouse._id.toString()).toBe(hubId.toString());
  //     expect(fromWarehouse.to.customer).toBeUndefined();

  //     done();
  //   } catch (err) {
  //     lib.helpers.errorHandler.bind(this)(err);
  //   }
  // });

  // it("Hub clerk should get delivery items sent from hub", async function (done) {
  //   this.done = done;

  //   try {
  //     let res = await rp({
  //       method: 'post',
  //       uri: lib.helpers.apiTestURL(`delivery/items/0/10`),
  //       body: {
  //         sort_column: '',
  //         agentName: '',
  //         transferee: '',
  //         direction: '',
  //         endDate: '',
  //         isDelivered: '',
  //         isInternal: '',
  //       },
  //       jar: hubClerk.rpJar,
  //       json: true,
  //       resolveWithFullResponse: true
  //     });

  //     expect(res.statusCode).toBe(200);

  //     res = res.body;

  //     expect(res.total).toBe(2);

  //     res = res.result;

  //     expect(res.length).toBe(2);

  //     const agentDetails = (await models()['AgentTest'].findOne({_id: deliveryAgents[0].aid}));

  //     const toWarehouse = res.find(el => el._id.toString() === deliveries[2]._id.toString());
  //     expect(toWarehouse.product_intances.map(el => el.product_id.toString())).toContain(products[0]._id.toString());
  //     expect(toWarehouse.product_intances.map(el => el.product_id.toString())).toContain(products[1]._id.toString());
  //     expect(toWarehouse.delivery_agent.first_name).toBe(agentDetails.first_name);
  //     expect(toWarehouse.from.warehouse._id.toString()).toBe(hubId.toString());
  //     expect(toWarehouse.to.warehouse._id.toString()).toBe(warehouseId.toString());
  //     expect(toWarehouse.to.customer).toBeUndefined();

  //     const toCustomer = res.find(el => el._id.toString() === deliveries[1]._id.toString());
  //     expect(toCustomer.product_intances.map(el => el.product_id.toString())).toContain(products[0]._id.toString());
  //     expect(toCustomer.from.warehouse._id.toString()).toBe(hubId.toString());
  //     expect(toCustomer.to.customer.first_name).toBe(orders[0].address.recipient_name);
  //     expect(toCustomer.to.warehouse).toBeUndefined();

  //     done();
  //   } catch (err) {
  //     lib.helpers.errorHandler.bind(this)(err);
  //   }
  // });

  // it("Hub clerk should get delivery items sent between two specified dates", async function (done) {
  //   this.done = done;

  //   try {
  //     let res = await rp({
  //       method: 'post',
  //       uri: lib.helpers.apiTestURL(`delivery/items/1/10`),
  //       body: {
  //         sort_column: '',
  //         agentName: '',
  //         transferee: '',
  //         direction: '',
  //         endDate: '',
  //         isDelivered: '',
  //         isInternal: '',
  //         delivery_start: new Date(2010, 10, 12),
  //         delivery_end: new Date(2010, 10, 20)
  //       },
  //       jar: hubClerk.rpJar,
  //       json: true,
  //       resolveWithFullResponse: true
  //     });

  //     expect(res.statusCode).toBe(200);

  //     res = res.body;

  //     expect(res.total).toBe(2);

  //     res = res.result;

  //     expect(res.length).toBe(1);

  //     const agentDetails = (await models()['AgentTest'].findOne({_id: deliveryAgents[0].aid}));

  //     const toWarehouse = res.find(el => el._id.toString() === deliveries[2]._id.toString());
  //     expect(toWarehouse.product_intances.map(el => el.product_id.toString())).toContain(products[0]._id.toString());
  //     expect(toWarehouse.product_intances.map(el => el.product_id.toString())).toContain(products[1]._id.toString());
  //     expect(toWarehouse.delivery_agent.first_name).toBe(agentDetails.first_name);
  //     expect(toWarehouse.from.warehouse._id.toString()).toBe(hubId.toString());
  //     expect(toWarehouse.to.warehouse._id.toString()).toBe(warehouseId.toString());
  //     expect(toWarehouse.to.customer).toBeUndefined();

  //     done();
  //   } catch (err) {
  //     lib.helpers.errorHandler.bind(this)(err);
  //   }
  // });
});

describe("Delivery POST API", () => {
  let deliveryAgents = [], deliveries = [], orders = [];

  beforeEach(done => {
    deliveryAgents = [];
    lib.dbHelpers.dropAll()
      .then(() => models()['WarehouseTest'].insertMany(warehouses))
      .then(() => lib.dbHelpers.addAndLoginAgent('da1', _const.ACCESS_LEVEL.DeliveryAgent))
      .then(res => {
        deliveryAgents.push(res);
        return lib.dbHelpers.addAndLoginAgent('da2', _const.ACCESS_LEVEL.DeliveryAgent);
      })
      .then(res => {
        deliveryAgents.push(res);

        const customerId = mongoose.Types.ObjectId();
        const address = {
          _id: mongoose.Types.ObjectId(),
          province: 'Tehran',
          city: 'Tehran',
          street: 'Zafar'
        };
        const ticket = {
          status: _const.ORDER_STATUS.DeliverySet,
          desc: "descccc",
          timeStamp: new Date(),
          is_processed: false,
          referral_advice: 1123,
          agent_id: mongoose.Types.ObjectId()
        };

        return models()['OrderTest'].insertMany([
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }, {
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }, {
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }, {
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
        ]);
      })
      .then(res => {
        orders = res;

        const hubId = warehouses.find(el => el.is_hub)._id;
        deliveryStatus = {
          agent_id: mongoose.Types.ObjectId(),
          status: _const.ORDER_STATUS.DeliverySet,
          is_processed: false,
          timeStamp: new Date()
        }

        deliveries = [
          {
            _id: mongoose.Types.ObjectId(),
            order_details: [
              {
                order_id: orders[0]._id,
                order_line_ids: orders[0].order_lines.map(el => el._id)
              },
              {
                order_id: orders[1]._id,
                order_line_ids: orders[0].order_lines.map(el => el._id)
              }
            ],
            status_list: [deliveryStatus],
            from: {
              warehouse_id: hubId
            },
            to: {
              customer: {
                id: orders[0].customer_id,
                address_id: orders[0].address._id,
              }
            },
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_details: [
              {
                order_id: orders[2]._id,
                order_line_ids: orders[2].order_lines.map(el => el._id)
              }
            ],
            from: {
              warehouse_id: hubId
            },
            to: {
              customer: {
                id: orders[0].customer_id,
                address_id: orders[0].address._id,
              }
            },
            status_list: [deliveryStatus],
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_details: [
              {
                order_id: orders[3]._id,
                order_line_ids: orders[3].order_lines.map(el => el._id)
              },
            ],
            from: {
              warehouse_id: hubId
            },
            to: {
              customer: {
                id: orders[0].customer_id,
                address_id: orders[0].address._id,
              }
            },
            delivery_agent: deliveryAgents[0].aid,
            status_list: [deliveryStatus],
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_details: [
              {
                order_id: orders[4]._id,
                order_line_ids: orders[4].order_lines.map(el => el._id)
              }
            ],
            from: {
              customer: {
                id: orders[4].customer_id,
                address_id: orders[4].address._id,
              }
            },
            to: {
              warehouse_id: hubId
            },
            is_return: true,
            status_list: [deliveryStatus],
            start: Date(2010, 11, 10),
            end: Date(2010, 11, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_details: [
              {
                order_id: orders[5]._id,
                order_line_ids: orders[5].order_lines.map(el => el._id)
              }
            ],
            from: {
              customer: {
                id: orders[0].customer_id,
                address_id: orders[0].address._id,
              }
            },
            to: {
              warehouse_id: hubId
            },
            is_return: true,
            status_list: [deliveryStatus],
            delivery_agent: deliveryAgents[0].aid,
            start: new Date(),
          },
        ];

        return models()['DeliveryTest'].insertMany(deliveries);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.error(err);
        done();
      });
  }, 10000);

  it("Delivery agent should choose (and assign to himself) multiple delivery items", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/assign`),
      body: {
        delivery_ids: [deliveries[1]._id, deliveries[3]._id]
      },
      jar: deliveryAgents[1].rpJar,
      json: true,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['DeliveryTest'].find({
          delivery_agent: deliveryAgents[1].aid
        });
      })
      .then(res => {
        expect(res.length).toBe(2);
        expect(res.map(el => el._id.toString())).toContain(deliveries[1]._id.toString());
        expect(res.map(el => el._id.toString())).toContain(deliveries[3]._id.toString());
        // res.map(el => el.status_list[el.status_list.length - 1]).reduce((a, b) => a.concat(b), []).forEach(t => {
        // expect(t.status).toBe(_const.ORDER_STATUS.ReadyToDeliver);
        // });

        //   return models()['OrderTest'].find({
        //     _id: {
        //       $in: [orders[0]._id, orders[1]._id, orders[4]._id]
        //     }
        //   });
        // })
        // .then(res => {
        //   expect(res.length).toBe(3);
        //   expect(res
        //     .map(el => el.order_lines.map(i => i.tickets[i.tickets.length - 1])
        //       .reduce((a, b) => a.concat(b), []))
        //     .reduce((a, b) => a.concat(b), [])
        //     .map(el => el.status)).toContain(_const.ORDER_STATUS.ReadyToDeliver);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Should get nothing when passed id already was assigned to current delivery agent (not another perosn)", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/assign`),
      body: {
        delivery_ids: [deliveries[0]._id, deliveries[1]._id, deliveries[2]._id]
      },
      jar: deliveryAgents[0].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['DeliveryTest'].find({
          delivery_agent: deliveryAgents[0].aid,
        });
      })
      .then(res => {
        expect(res.length).toBe(4);
        expect(res.map(el => el._id.toString())).toContain(deliveries[0]._id.toString());
        expect(res.map(el => el._id.toString())).toContain(deliveries[1]._id.toString());
        expect(res.map(el => el._id.toString())).toContain(deliveries[2]._id.toString());
        expect(res.map(el => el._id.toString())).toContain(deliveries[4]._id.toString());
        //   return models()['OrderTest'].find({
        //     _id: {
        //       $in: [orders[0]._id, orders[1]._id, orders[2]._id, orders[3]._id]
        //     }
        //   });
        // })
        // .then(res => {
        //   expect(res.length).toBe(4);
        //   expect(res
        //     .map(el => el.order_lines.map(i => i.tickets[i.tickets.length - 1])
        //       .reduce((a, b) => a.concat(b), []))
        //     .reduce((a, b) => a.concat(b), [])
        //     .map(el => el.status)).toContain(_const.ORDER_STATUS.ReadyToDeliver);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Should do nothing when passed list ids is empty", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/assign`),
      body: {
        delivery_ids: []
      },
      jar: deliveryAgents[1].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['DeliveryTest'].find({
          delivery_agent: deliveryAgents[1].aid,
        });
      })
      .then(res => {
        expect(res.length).toBe(0);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  })

  it("Should get error when passed id already was assigned to another delivery agent", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/assign`),
      body: {
        delivery_ids: [deliveries[0]._id, deliveries[1]._id, deliveries[2]._id]
      },
      jar: deliveryAgents[1].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('Delivery agent can assign already assigned deliveries');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.deliveryItemIsAlreadyAssigned.status);
        expect(err.error).toBe(errors.deliveryItemIsAlreadyAssigned.message);
        done();
      });
  });

  it("Should get error passed data is incomplete", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/assign`),
      body: {

      },
      jar: deliveryAgents[1].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('Delivery agent can assign some deliveries with incomplete passed data');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.dataIsNotCompleted.status);
        expect(err.error).toBe(errors.dataIsNotCompleted.message);
        done();
      });
  });

  it("Delivery agent should unassign multiple delivery items", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/unassign`),
      body: {
        delivery_ids: [deliveries[2]._id, deliveries[4]._id]
      },
      jar: deliveryAgents[0].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['DeliveryTest'].find({
          delivery_agent: deliveryAgents[0].aid,
        });
      })
      .then(res => {
        expect(res.length).toBe(0);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Should do nothing when delivery_ids is empty (unassigning the delivery)", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/unassign`),
      body: {
        delivery_ids: []
      },
      jar: deliveryAgents[0].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['DeliveryTest'].find({
          delivery_agent: deliveryAgents[0].aid,
        });
      })
      .then(res => {
        expect(res.length).toBe(2);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Should get error when there is a delivery with another agent responsibility", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/unassign`),
      body: {
        delivery_ids: [deliveries[2]._id]
      },
      jar: deliveryAgents[1].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('Another delivery agent can unassign delivery with another one responsibility');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.notDeliveryResponsibility.status);
        expect(err.error).toBe(errors.notDeliveryResponsibility.message);
        done();
      });
  });

  it("Should get error when passed data is incomplete for unassinging", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/unassign`),
      body: {
      },
      jar: deliveryAgents[0].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('Delivery agent can unassign delivery with incomplete data');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.dataIsNotCompleted.status);
        expect(err.error).toBe(errors.dataIsNotCompleted.message);
        done();
      });
  });
});