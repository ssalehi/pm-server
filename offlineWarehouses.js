const mongoose = require('mongoose');

let warehouses = [
  {
    _id: mongoose.Types.ObjectId(),
    name: 'online',
    branch_code: '005',
    inventory_code: '001'
  },
  {
    _id: mongoose.Types.ObjectId(),
    name: 'damage-lost',
    branch_code: '001',
    inventory_code: '002'
  }
];


module.exports = warehouses;