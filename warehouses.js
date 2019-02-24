const mongoose = require('mongoose');


centralAddress = {
  _id: mongoose.Types.ObjectId(),
  city: 'تهران',
  street: 'نامشخص مرکزی',
  province: 'تهران'
}
hubAddress = {
  _id: mongoose.Types.ObjectId(),
  city: 'تهران',
  street: 'نامشخص هاب',
  province: 'تهران'
}

let warehouses = [
  {
    _id: mongoose.Types.ObjectId(),
    name: 'مرکز تجمیع',
    phone: 'نا مشخص',
    address: hubAddress,
    is_hub: true,
    has_customer_pickup: false,
    priority: 4,
    is_active:true,
  },
  {
    _id: mongoose.Types.ObjectId(),
    name: 'انبار مرکزی',
    phone: 'نا مشخص',
    address: centralAddress,
    is_hub: false,
    has_customer_pickup: false,
    priority: 0,
    is_active:true,
    branch_code: '001',
    inventory_code: '001'
  },
  {
    _id: mongoose.Types.ObjectId(),
    name: 'پالادیوم',
    phone: ' 021 2201 0600',
    has_customer_pickup: true,
    address: {
      _id: mongoose.Types.ObjectId(),
      city: 'تهران',
      street: 'مقدس اردبیلی',
      province: 'تهران'
    },
    priority: 1,
    is_active:true,
    is_hub: false,
    has_customer_pickup: true,
    branch_code: '002',
    inventory_code: '001'
  },
  {
    _id: mongoose.Types.ObjectId(),
    name: 'سانا',
    phone: '021 7443 8111',
    has_customer_pickup: true,
    address: {
      _id: mongoose.Types.ObjectId(),
      province: 'تهران',
      city: 'تهران',
      street: 'اندرزگو',
    },
    priority: 2,
    is_active:true,
    is_hub: false,
    has_customer_pickup: true,
    branch_code: '003',
    inventory_code: '001'
  },
  {
    _id: mongoose.Types.ObjectId(),
    name: 'ایران مال',
    phone: 'نا مشخص',
    has_customer_pickup: true,
    address: {
      _id: mongoose.Types.ObjectId(),
      province: 'تهران',
      city: 'تهران',
      street: 'اتوبان خرازی',
    },
    priority: 3,
    is_active:true,
    is_hub: false,
    has_customer_pickup: true,
    branch_code: '004',
    inventory_code: '001'
  }
];


module.exports = warehouses;