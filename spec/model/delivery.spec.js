const lib = require('../../lib/index');
const models = require('../../mongo/models.mongo');
const mongoose = require('mongoose');
const Delivery = require('../../lib/delivery.model');
const warehouses = require('../../warehouses');


describe('making shelf code', () => {
  let deliveries;
  let hub_id;
  let deliveries_id;
  beforeEach(done => {
    lib.dbHelpers.dropAll().then(() => {
      return models['WarehouseTest'].insertMany(warehouses)
    }).then((res) => {
      hub_id = res.find(w => w.is_hub === true)._id;
      deliveries = [
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},
          shelf_code: "AZ",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},
          shelf_code: "AA",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: mongoose.Types.ObjectId()},
          to: {warehouse_id: hub_id},
          shelf_code: "BA",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},

        }
      ];

      deliveries_id = deliveries.map(d => d._id);
      return models['DeliveryTest'].insertMany(deliveries)
    }).then(() => {
      done();
    }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('should make return AB . First Code after AA', function (done) {
    this.done = done;
    let delivery = new Delivery(true);
    delivery.makeDeliveryShelfCode(deliveries_id[3]).then(data => {
      expect(data.exist).toBe(false);
      expect(data.shelf_code).toNotBe("AA");
      expect(data.shelf_code).toBe("AB");
      expect(data.shelf_code).toNotBe("AZ");
      expect(data.shelf_code.length).toBe(2);
      done();
    });
  });

  it('should make return  AA Because Delivery had shelf_id', function (done) {
    this.done = done;
    let delivery = new Delivery(true);
    delivery.makeDeliveryShelfCode(deliveries_id[1]).then(data => {
      expect(data.shelf_code).toBe("AA");
      expect(data.exist).toBe(true);
      expect(data.shelf_code.length).toBe(2);
      done();
    });
  });
  it('should make -- Because this Delivery is not from hub', function (done) {
    this.done = done;
    let delivery = new Delivery(true);
    delivery.makeDeliveryShelfCode(deliveries_id[2]).then(data => {
      expect(data.shelf_code).toBe("--");
      expect(data.shelf_code.length).toBe(2);
      expect(data.exist).toBe(false);
      done();
    });
  });
});

describe('making shelf code', () => {
  let deliveries;
  let hub_id;
  let deliveries_id;
  beforeEach(done => {
    lib.dbHelpers.dropAll().then(() => {
      return models['WarehouseTest'].insertMany(warehouses)
    }).then((res) => {
      hub_id = res.find(w => w.is_hub === true)._id;
      deliveries = [
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},
          shelf_code: "AZ",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},
          shelf_code: "AD",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: mongoose.Types.ObjectId()},
          to: {warehouse_id: hub_id},
          shelf_code: "BA",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},

        }
      ];
      deliveries_id = deliveries.map(d => d._id);
      return models['DeliveryTest'].insertMany(deliveries)
    }).then(() => {
      done();
    }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('should make return AA . First possible Code', function (done) {
    this.done = done;
    let delivery = new Delivery(true);
    delivery.makeDeliveryShelfCode(deliveries_id[3]).then(data => {
      expect(data.shelf_code).toBe("AA");
      expect(data.exist).toBe(false);
      done();
    });
  });

});