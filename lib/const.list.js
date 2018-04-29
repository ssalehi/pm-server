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
  ReadyToDeliver: 5,
  NotExists: 6,
  Refund: 7,
};

module.exports = {
  ACCESS_LEVEL,
  ORDER_STATUS
};

