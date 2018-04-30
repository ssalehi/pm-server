let ACCESS_LEVEL = {
  ContentManager: 0,
  SalesManager: 1,
  ShopClerk: 2,
  DeliveryAgent: 3
};
let ORDER_STATUS = {
  default: 1,
  WaitForOnlineWarehouse: 2,
  WaitForInvoice: 3,
  InternalDelivery: 4,
  Receive: 5,
  ReadyToDeliver: 6,
  NotExists: 7,
  Refund: 8,
};

module.exports = {
  ACCESS_LEVEL,
  ORDER_STATUS
};

