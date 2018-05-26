const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const CustomerModel = require('./customer.model');
const helpers = require('./helpers');
const socket = require('../socket');
const _const = require('./const.list');
const env = require('../env');

class Ticket {

  constructor(test) {
    this.test = test;
  }

  // setManualTicket(type, body, user) {

  //   return this.checkCurrentStatus(type, body)
  //     .then(res => {
  //       if (res.isActive) {
  //         return Promise.reject(error.existingActiveTicket);
  //       }
  //       if (typeof this[type] === 'function') {
  //         // some tickets such as invoice needs to be refreshed (to send new request to offline system)
  //         return this[type](body, res.order, user);
  //       }
  //     });
  // }

  checkCurrentStatus(orderId, orderLineId, status) {
    if (!orderId || !orderLineId)
      return Promise.reject(error.orderLineNotFound);

    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(orderLineId))
      return Promise.reject(error.invalidId);

    return this.OrderModel.findById(mongoose.Types.ObjectId(orderId)).lean()
      .then(res => {
        if (!res)
          return Promise.reject(error.orderNotFound);

        const foundOrderLine = res.order_lines.find(x => x._id.toString() === orderLineId);

        return Promise.resolve({
          order: res,
          isActive: (foundOrderLine.tickets.find(x => !x.is_processed && x.status === status))
        })

      });


  }

  closeCurrentTicket(orderId, orderLineId, userId = null) {

    let query = {
      _id: mongoose.Types.ObjectId(orderId)
    }
    return this.OrderModel.update(query, {
      '$set': {
        'order_lines.$[i].tickets.$[j].is_processed': true,
        'order_lines.$[i].tickets.$[j].agent_id': userId,
      }
    }, {
        arrayFilters: [
          {'i._id': mongoose.Types.ObjectId(orderLineId)},
          {'j.is_processed': false}
        ]
      })

  }

  /**
   * 
   * @param {*} orderId 
   * @param {*} orderLineId 
   * @param {*} status 
   * @param {*} recieverId : reciever might be warehosue or agents
   * @param {*} desc 
   */
  addNewTicket(orderId, orderLineId, status, recieverId = null, desc = '') {
    let query = {
      '_id': mongoose.Types.ObjectId(orderId),
      'order_lines._id': mongoose.Types.ObjectId(orderLineId)
    };

    let update = {
      'status': status,
      'desc': desc
    };
    if (toWarehouseId)
      update['reciever_id'] = mongoose.Types.ObjectId(recieverId);

    let newTicketUpdate = {
      '$addToSet': {
        'order_lines.$.tickets': update
      }
    };

    return this.OrderModel.update(query, newTicketUpdate);

  }

  setTicket(orderId, orderLineId, status, recieverId, userId) {
    return this.checkCurrentStatus(orderId, orderLineId, status)
      .then(res => {
        if (res.isActive)
          return Promise.reject(error.existingActiveTicket);

        if (!Object.keys(_const.ORDER_STATUS).find(x => x === status))
          return Promise.reject(error.invalidTicket)

        return this.closeCurrentTicket(orderId, orderLineId, userId)
          .then(res => this.addNewTicket(orderId, orderLineId, status, recieverId, body.desc))
          .then(res => {
            socket.sendToNS(recieverId, {
              type: status,
              data: {

              }
            });

          })

      });
  }


  search(options, offset, limit, user) {

    if (!user.warehouse_id)
      return Promise.reject(error.agentWarehouseIdRequired);


    let pre = [
      {
        $match: {
          $and: [
            {is_cart: false},
            {transaction_id: {$ne: null}},
          ]
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$order_lines',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'product',
          localField: 'order_lines.product_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$product.instances', // it makes product.instances, single element array for each instance
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          customer: {
            '_id': '$customer._id',
            'name': '$customer.first_name',
            'surname': '$customer.surname',
            'addresses': '$customer.addresses'
          },
          transaction_id: 1,
          total_amount: 1,
          used_point: 1,
          used_balance: 1,
          is_collect: 1,
          order_line_id: '$order_lines._id',
          paid_price: '$order_lines.paid_price',
          adding_time: '$order_lines.adding_time',
          warehouse_id: '$order_lines.warehouse_id',
          tickets: '$order_lines.tickets',
          product_id: '$product._id',
          product_name: '$product.name',
          product_colors: '$product.colors',
          instance: {
            '_id': '$product.instances._id',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
          },
          address: 1,
          cmp_value: {$cmp: ['$order_lines.product_instance_id', '$product.instances._id']}
        }
      }
    ];

    let post = [
      {
        $sort: {
          'adding_time': 1,
        }
      },
      {
        $skip: Number.parseInt(offset)
      },
      {
        $limit: Number.parseInt(limit)
      }
    ];

    let search;

    if (options && options.type) {

      switch (options.type) {
        case 'inbox':
          search = this.searchInbox(user.warehouse_id);
          break;
        case 'readyToDeliver':
          search = this.searchReadyToDelivers(user.warehouse_id);
          break;
        case 'outbox':
          search = this.searchOutbox(user.warehouse_id);
          break;
        default:
          search = this.searchInbox(user.warehouse_id);
      }
    } else {
      search = this.searchInbox(user.warehouse_id);
    }

    let result;

    return this.OrderModel.aggregate(pre.concat(search, post)).then(res => {
      result = res;
      pre = [
        {
          $match: {
            $and: [
              {is_cart: false},
              {transaction_id: {$ne: null}},
            ]
          }
        },
        {
          $unwind: {
            path: '$order_lines',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'product',
            localField: 'order_lines.product_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: {
            path: '$product',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$product.instances', // it makes product.instances, single element array for each instance
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            tickets: '$order_lines.tickets',
            cmp_value: {$cmp: ['$order_lines.product_instance_id', '$product.instances._id']}
          }
        },
      ];
      post = [
        {
          $count: 'count'
        }
      ];

      return this.OrderModel.aggregate(pre.concat(search, post))

    })
      .then(res => {
        let totalCount = res[0] ? res[0].count : 0;
        return Promise.resolve({
          data: result,
          total: totalCount,
        });
      });
  }

  searchInbox(recieverId) {
    return [
      {
        $match: {
          cmp_value: {$eq: 0}
        }
      },
      {
        $unwind: {
          path: '$tickets',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          $and: [
            {'tickets.reciever_id': mongoose.Types.ObjectId(recieverId)},
            {'tickets.is_processed': false},
            {
              'tickets.status': {
                $nin: [
                  _const.ORDER_STATUS.ReadyToDeliver
                ]
              }
            }
          ]
        }
      },
    ]
  }

  // searchReadyToDelivers(warehouseId) {
  //   return [
  //     {
  //       $match: {
  //         cmp_value: {$eq: 0},
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$tickets',
  //         preserveNullAndEmptyArrays:
  //           true
  //       }
  //     },
  //     {
  //       $match: {
  //         $and: [
  //           {'tickets.warehouse_id': mongoose.Types.ObjectId(warehouseId)},
  //           {'tickets.is_processed': false},
  //           {'tickets.status': _const.ORDER_STATUS.ReadyToDeliver}
  //         ]
  //       }
  //     },
  //   ]
  // }

  // searchOutbox(warehouseId) {
  //   return [
  //     {
  //       $match: {
  //         cmp_value: {$eq: 0},
  //         $and: [{'tickets.warehouse_id': mongoose.Types.ObjectId(warehouseId)}, {'tickets.is_processed': true}]
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$tickets',
  //         preserveNullAndEmptyArrays:
  //           true
  //       }
  //     },
  //     {
  //       $match: {
  //         'tickets.is_processed': false
  //       }
  //     },
  //   ]
  // }


}

module.exports = Ticket;

