const mongoose = require('mongoose');


let deliveryDurationInfo = [
  {
    _id: mongoose.Types.ObjectId(),
    add_point: null,
    cities: [
      {
        name: "تهران",
        delivery_cost: 30000
      }
    ],
    delivery_days: 1,
    delivery_loyalty: [
      {
        name: "White",
        price: 10,
        discount: null
      },
      {
        name: "Orange",
        price: 15,
        discount: null
      },
      {
        name: "Black",
        price: 20,
        discount: null
      }
    ],
    is_collect: false,
    name: "یک روزه"
  }
  ,
  {
    _id: mongoose.Types.ObjectId(),

    add_point: null,
    cities: [
      {
        name: "تهران",
        delivery_cost: 15000
      }
    ],
    delivery_days: 3,
    delivery_loyalty: [
      {
        name: "White",
        price: 8,
        discount: null
      },
      {
        name: "Orange",
        price: 10,
        discount: null
      },
      {
        name: "Black",
        price: 12,
        discount: null
      }
    ],
    is_collect: false,
    name: "سه روزه"
  }
  ,
  {
    _id: mongoose.Types.ObjectId(),

    add_point: null,
    cities: [
      {
        name: "تهران",
        delivery_cost: 12000
      }
    ],
    delivery_days: 5,
    delivery_loyalty: [
      {
        name: "White",
        price: 15,
        discount: null
      },
      {
        name: "Orange",
        price: 20,
        discount: null
      },
      {
        name: "Black",
        price: 25,
        discount: null
      }
    ],
    is_collect: false,
    name: "پنج روزه"
  },
  {
    _id: mongoose.Types.ObjectId(),
    add_point: [
      {
        added_point: "100",
        name: "White"
      },
      {
        added_point: "500",
        name: "Orange"
      },
      {
        added_point: "900",
        name: "Black"
      }
    ],
    is_collect: true
  }
]

module.exports = deliveryDurationInfo;