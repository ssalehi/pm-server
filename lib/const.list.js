const moment = require('moment');

let ACCESS_LEVEL = {
  ContentManager: 0,
  SalesManager: 1,
  ShopClerk: 2,
  HubClerk: 3,
  DeliveryAgent: 4,
  InternalDeliveryAgent: 5
};
let ORDER_LINE_STATUS = {
  default: 1,
  WaitForOnlineWarehouse: 2,
  OnlineWarehouseVerified: 3,
  ReadyToDeliver: 4,
  DeliverySet: 5,
  OnDelivery: 6,
  Delivered: 7,
  Recieved: 8,
  NotExists: 9,
  Refund: 10,
  Return: 11,
  CustomerCancel: 12,
  StoreCancel: 13,
  Renew: 14
};

let ORDER_STATUS = {
  WaitForAggregation: 1,
  ReadyForInvoice: 2,
  WaitForInvoice: 3,
  InvoiceVerified: 4,
  ReadyToDeliver: 5,
  DeliverySet: 6,
  OnDelivery: 7,
  Delivered: 8,
  Refund: 9,
  Return: 10,
  CustomerCancel: 11,
};

let VERIFICATION = {
  notVerified: 0,
  mobileVerified: 1,
  emailVerified: 2,
  bothVerified: 3,
};

let MISMATCH_TRIGGER = {
  Inbox: 1,
  Send: 2,
  Deliver: 3
}

let SCAN_TRIGGER = {
  Inbox: 1,
  SendInternal: 2,
  SendCustomer: 3,
  CCDelivery: 4
}

let LOGISTIC_SEARCH = {
  ScanInbox : 'sacnInbox',
  ToCustomerBox : 'toCustomerBox'
}

let EXPIRE_ADD_ORDER_TIME = moment({hour: 16, minute: 30});

let REFUND_FORM_STATUS = {
  Pending: 1,
  Paid: 2,
  Refused: 3
}

module.exports = {
  ACCESS_LEVEL,
  ORDER_STATUS,
  ORDER_LINE_STATUS,
  VERIFICATION,
  MISMATCH_TRIGGER,
  SCAN_TRIGGER,
  LOGISTIC_SEARCH,
  EXPIRE_ADD_ORDER_TIME,
  REFUND_FORM_STATUS
};