let mongoose = require('mongoose');

const brand = [{
  "_id": mongoose.Types.ObjectId("5b793626065a163ad0912ed9"),
  "name": "Nike",
  "__v": 0
}];

color = [
  {
    "_id": mongoose.Types.ObjectId("5b793626065a163ad0912f82"),
    "name": "BLACK/BLACK",
    "__v": 0
  },
  {
    "_id": mongoose.Types.ObjectId("5b793626065a163ad0912f95"),
    "name": "BLACK/WHITE-DARK GREY",
    "__v": 0
  }
];

const delivery_duration_info = [
  {
    "_id": mongoose.Types.ObjectId("5b793f49065a163ad091b3a6"),
    "__v": 0,
    "add_point": null,
    "cities": [
      {
        "_id": mongoose.Types.ObjectId("5b793f49065a163ad091b3a7"),
        "name": "تهران",
        "delivery_cost": 15000
      }
    ],
    "delivery_days": 1,
    "delivery_loyalty": [
      {
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb13"),
        "name": "White",
        "price": 5,
        "discount": 1
      },
      {
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb14"),
        "name": "Orange",
        "price": 7,
        "discount": 2
      },
      {
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb15"),
        "name": "Black",
        "price": 10,
        "discount": 5
      }
    ],
    "is_c_and_c": false,
    "name": "یک روزه"
  }
  , {
    "_id": mongoose.Types.ObjectId("5b79407b065a163ad091b3a9"),
    "__v": 0,
    "add_point": null,
    "cities": [
      {
        "_id": mongoose.Types.ObjectId("5b79407b065a163ad091b3aa"),
        "name": "تهران",
        "delivery_cost": 10000
      }
    ],
    "delivery_days": 3,
    "delivery_loyalty": [
      {
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb13"),
        "name": "White",
        "price": 1,
        "discount": 1
      },
      {
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb14"),
        "name": "Orange",
        "price": 5,
        "discount": 3
      },
      {
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb15"),
        "name": "Black",
        "price": 7,
        "discount": 5
      }
    ],
    "is_c_and_c": false,
    "name": "سه روزه"
  }
  , {
    "_id": mongoose.Types.ObjectId("5b7940a0065a163ad091b3ab"),
    "__v": 0,
    "add_point": null,
    "cities": [
      {
        "_id": mongoose.Types.ObjectId("5b7940a0065a163ad091b3ac"),
        "name": "تهران",
        "delivery_cost": 8000
      }
    ],
    "delivery_days": 5,
    "delivery_loyalty": [
      {
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb13"),
        "name": "White",
        "price": 1,
        "discount": 2
      },
      {
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb14"),
        "name": "Orange",
        "price": 2,
        "discount": 4
      },
      {
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb15"),
        "name": "Black",
        "price": 4,
        "discount": 6
      }
    ],
    "is_c_and_c": false,
    "name": "پنج روزه"
  }
  , {
    "_id": mongoose.Types.ObjectId("5b7940de065a163ad091b3ad"),
    "__v": 0,
    "add_point": [
      {
        "added_point": "200",
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb13"),
        "name": "White"
      },
      {
        "added_point": "500",
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb14"),
        "name": "Orange"
      },
      {
        "added_point": "1000",
        "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb15"),
        "name": "Black"
      }
    ],
    "is_c_and_c": true
  }
]

const loyalty_group = [
  {
    "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb13"),
    "name": "White",
    "min_score": 0,
    "__v": 0
  }
  , {
    "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb14"),
    "name": "Orange",
    "min_score": 5000,
    "__v": 0
  }
  , {
    "_id": mongoose.Types.ObjectId("5b7935fd127b61076824eb15"),
    "name": "Black",
    "min_score": 11000,
    "__v": 0
  }
];


const product_type = [
  {
  "_id" : mongoose.Types.ObjectId("5b793626065a163ad0912eda"),
  "name" : "ACCESSORIES",
  "__v" : 0
}
,{
  "_id" : mongoose.Types.ObjectId("5b793626065a163ad0912edb"),
  "name" : "EQUIPMENT",
  "__v" : 0
}
,{
  "_id" : mongoose.Types.ObjectId("5b793626065a163ad0912edc"),
  "name" : "APPAREL",
  "__v" : 0
}
,{
  "_id" : mongoose.Types.ObjectId("5b793626065a163ad0912edd"),
  "name" : "FOOTWEAR",
  "__v" : 0
}
]

const warehouse = [
{
  "_id" : mongoose.Types.ObjectId("5b7935f6127b61076824e9c6"),
  "has_customer_pickup" : false,
  "is_hub" : true,
  "name" : "مرکز تجمیع",
  "phone" : "نا مشخص",
  "address" : {
      "_id" : mongoose.Types.ObjectId("5b7935f6127b61076824e9c5"),
      "city" : "تهران",
      "street" : "نامشخص هاب",
      "province" : "تهران"
  },
  "priority" : 4,
  "__v" : 0
}
,{
  "_id" : mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
  "has_customer_pickup" : false,
  "is_hub" : false,
  "name" : "انبار مرکزی",
  "phone" : "نا مشخص",
  "address" : {
      "_id" : mongoose.Types.ObjectId("5b7935f6127b61076824e9c4"),
      "city" : "تهران",
      "street" : "نامشخص مرکزی",
      "province" : "تهران"
  },
  "priority" : 0,
  "ip_address" : "localhost:3001",
  "__v" : 0
}
,{
  "_id" : mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
  "has_customer_pickup" : true,
  "is_hub" : false,
  "name" : "پالادیوم",
  "phone" : " 021 2201 0600",
  "address" : {
      "_id" : mongoose.Types.ObjectId("5b7935fc127b61076824e9d0"),
      "city" : "تهران",
      "street" : "مقدس اردبیلی",
      "province" : "تهران"
  },
  "priority" : 1,
  "ip_address" : "localhost:3001",
  "__v" : 0
}
,{
  "_id" : mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
  "has_customer_pickup" : true,
  "is_hub" : false,
  "name" : "سانا",
  "phone" : "021 7443 8111",
  "address" : {
      "_id" : mongoose.Types.ObjectId("5b7935fc127b61076824e9d2"),
      "province" : "تهران",
      "city" : "تهران",
      "street" : "اندرزگو"
  },
  "priority" : 2,
  "ip_address" : "localhost:3001",
  "__v" : 0
}
,{
  "_id" : mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
  "has_customer_pickup" : true,
  "is_hub" : false,
  "name" : "ایران مال",
  "phone" : "نا مشخص",
  "address" : {
      "_id" : mongoose.Types.ObjectId("5b7935fc127b61076824e9d4"),
      "province" : "تهران",
      "city" : "تهران",
      "street" : "اتوبان خرازی"
  },
  "priority" : 3,
  "ip_address" : "localhost:3001",
  "__v" : 0
}
]


const agent = [
  {
    "_id": mongoose.Types.ObjectId("5b7935fd127b61076824e9d5"),
    "active": true,
    "username": "admin@persianmode.com",
    "secret": "$2a$10$GqN5lfxWGtF/ucQk2exvhu7.jZYsjHDqcr1W3J5jnMJBHqBFv/yjS",
    "access_level": 0,
    "first_name": "Content",
    "surname": "Manager",
    "__v": 0
  }
  ,
  {
    "_id": mongoose.Types.ObjectId("5b7935fd127b61076824e9d6"),
    "active": true,
    "username": "sm@persianmode.com",
    "secret": "$2a$10$GqN5lfxWGtF/ucQk2exvhu7.jZYsjHDqcr1W3J5jnMJBHqBFv/yjS",
    "access_level": 1,
    "first_name": "Sales",
    "surname": "Manager",
    "__v": 0
  }
  ,
  {
    "_id": mongoose.Types.ObjectId("5b7935fd127b61076824e9d7"),
    "active": true,
    "username": "hc@persianmode.com",
    "secret": "$2a$10$GqN5lfxWGtF/ucQk2exvhu7.jZYsjHDqcr1W3J5jnMJBHqBFv/yjS",
    "access_level": 3,
    "first_name": "hub",
    "surname": "clerck",
    "__v": 0
  }
  ,
  {
    "_id": mongoose.Types.ObjectId("5b7935fd127b61076824e9d8"),
    "active": true,
    "username": "shop@persianmode.com",
    "secret": "$2a$10$GqN5lfxWGtF/ucQk2exvhu7.jZYsjHDqcr1W3J5jnMJBHqBFv/yjS",
    "access_level": 2,
    "first_name": "shop",
    "surname": "clerck",
    "__v": 0
  }

  ,
  {
    "_id": mongoose.Types.ObjectId("5b794b0ec2c77a60648eee3a"),
    "active": true,
    "username": "delivery@persianmode.com",
    "secret": "$2a$10$GqN5lfxWGtF/ucQk2exvhu7.jZYsjHDqcr1W3J5jnMJBHqBFv/yjS",
    "access_level": 4,
    "first_name": "Delivery",
    "surname": "Agent",
    "__v": 0
  }
]

const product = [
  {
    "_id": mongoose.Types.ObjectId("5b793628c2c77a60648e4167"),
    "article_no": "NK861557",
    "__v": 0,
    "base_price": 511000,
    "brand": {
      "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b4e"),
      "name": "Nike",
      "brand_id": mongoose.Types.ObjectId("5b793626065a163ad0912ed9")
    },
    "date": ("2018-08-19T09:19:36.160Z"),
    "desc": "",
    "name": "23 ALPHA THERMA PANT",
    "product_type": {
      "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b4f"),
      "name": "APPAREL",
      "product_type_id": mongoose.Types.ObjectId("5b793626065a163ad0912edc")
    },
    "colors": [
      {
        "image": {
          "angles": [
            "8-1534670463341.jpg",
            "9-1534670463680.jpg",
            "10-1534670464018.jpg",
            "11-1534670464355.jpg"
          ],
          "thumbnail": "1-1534670451852.jpg"
        },
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b21"),
        "color_id": mongoose.Types.ObjectId("5b793626065a163ad0912f82"),
        "name": "BLACK/BLACK",
        "code": "010"
      }
    ],
    "instances": [
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b24"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913b21"),
        "size": "L",
        "price": 604000,
        "barcode": "884498638965",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b29"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b28"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b27"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b26"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      },
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b36"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913b21"),
        "size": "M",
        "price": 606000,
        "barcode": "884498638958",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b3b"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b3a"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b39"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b38"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      },
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b48"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913b21"),
        "size": "S",
        "price": 674000,
        "barcode": "884498638941",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b4d"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b4c"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b4b"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b4a"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      },
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b5a"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913b21"),
        "size": "XL",
        "price": 511000,
        "barcode": "884498638972",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b5f"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b5e"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b5d"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913b5c"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      }
    ],
    "campaigns": []
  },
  {
    "_id": mongoose.Types.ObjectId("5b793628c2c77a60648e434f"),
    "article_no": "NK918230",
    "__v": 0,
    "base_price": 316000,
    "brand": {
      "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d38"),
      "name": "Nike",
      "brand_id": mongoose.Types.ObjectId("5b793626065a163ad0912ed9")
    },
    "date": ("2018-08-19T09:19:36.800Z"),
    "desc": "",
    "name": "AIR MAX VISION",
    "product_type": {
      "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d39"),
      "name": "FOOTWEAR",
      "product_type_id": mongoose.Types.ObjectId("5b793626065a163ad0912edd")
    },
    "colors": [
      {
        "image": {
          "angles": [
            "5-1534670502679.jpg",
            "6-1534670503022.jpg",
            "7-1534670503357.jpg"
          ],
          "thumbnail": "flyknit-trainer-unisex-shoe-LBTgKDVL-1534670493360.jpg"
        },
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb1"),
        "color_id": mongoose.Types.ObjectId("5b793626065a163ad0912f95"),
        "name": "BLACK/WHITE-DARK GREY",
        "code": "005"
      }
    ],
    "instances": [
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb4"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb1"),
        "size": "10",
        "price": 176000,
        "barcode": "091206177337",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb9"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb8"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb7"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb6"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      },
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cc6"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb1"),
        "size": "10.5",
        "price": 996000,
        "barcode": "091206177351",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913ccb"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cca"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cc9"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cc8"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      },
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cd8"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb1"),
        "size": "11",
        "price": 865000,
        "barcode": "091206177368",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cdd"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cdc"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cdb"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cda"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      },
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cea"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb1"),
        "size": "11.5",
        "price": 412000,
        "barcode": "091206177771",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cef"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cee"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913ced"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cec"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      },
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cfc"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb1"),
        "size": "12",
        "price": 683000,
        "barcode": "091206177788",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d01"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d00"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cff"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913cfe"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      },
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d0e"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb1"),
        "size": "8",
        "price": 982000,
        "barcode": "091206173742",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d13"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d12"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d11"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d10"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      },
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d20"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb1"),
        "size": "8.5",
        "price": 896000,
        "barcode": "091206173797",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d25"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d24"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d23"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d22"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      },
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d32"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb1"),
        "size": "9",
        "price": 684000,
        "barcode": "091206173926",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d37"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d36"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d35"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d34"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      },
      {
        "sold_out": false,
        "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d44"),
        "product_color_id": mongoose.Types.ObjectId("5b793628065a163ad0913cb1"),
        "size": "9.5",
        "price": 316000,
        "barcode": "091206173933",
        "inventory": [
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d49"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c7"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d48"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c8"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d47"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9c9"),
            "count": 2
          },
          {
            "reserved": 0,
            "_id": mongoose.Types.ObjectId("5b793628065a163ad0913d46"),
            "warehouse_id": mongoose.Types.ObjectId("5b7935f6127b61076824e9ca"),
            "count": 2
          }
        ]
      }
    ],
    "campaigns": []
  }
]


module.exports = {
  brand,
  color,
  delivery_duration_info,
  loyalty_group,
  product_type,
  warehouse,
  agent,
  product
}