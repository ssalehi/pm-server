let ACCESS_LEVEL = {
  ContentManager: 0,
  SalesManager: 1,
  ShopClerk: 2,
  HubClerk: 3,
  DeliveryAgent: 4
};
let ORDER_LINE_STATUS = {
  default: 1,
  WaitForOnlineWarehouse: 2,
  ReadyToDeliver: 7,
  DeliverySet: 8,
  OnDelivery: 9,
  Delivered: 10,
  NotExists: 11,
  Refund: 12,
  Return: 13,
  CustomerCancel: 14,
  StoreCancel: 15,
  Renew: 16
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
  Inbox : 1,
  Send : 2,
  Deliver : 3
}
module.exports = {
  ACCESS_LEVEL,
  ORDER_STATUS,
  ORDER_LINE_STATUS,
  VERIFICATION,
  MISMATCH_TRIGGER
};

