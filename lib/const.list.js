let ACCESS_LEVEL = {
  ContentManager: 0,
  SalesManager: 1,
  ShopClerk: 2,
  HubClerk: 3,
  DeliveryAgent: 4
};
// let ORDER_STATUS = {
//   default: 1,
//   WaitForOnlineWarehouse: 2,
//   WaitForAggregation: 3,
//   ReadyForInternalDelivery: 4,
//   OnInternalDelivery: 5,
//   ReadyForInvoice: 6,
//   WaitForInvoice: 7,
//   InvoiceVerified: 8,
//   ReadyToDeliver: 9,
//   DeliverySet: 10,
//   OnDelivery: 11,
//   Delivered: 12,
//   NotExists: 13,
//   Refund: 13,
//   Return: 14,
//   Cancel: 15
// };
let ORDER_STATUS = {
  default: 1,
  WaitForOnlineWarehouse: 2,
  WaitForAggregation: 3,
  ReadyForInvoice: 4,
  WaitForInvoice: 5,
  InvoiceVerified: 6,
  ReadyToDeliver: 7,
  DeliverySet: 8,
  OnDelivery: 9,
  Delivered: 10,
  NotExists: 11,
  Refund: 12,
  Return: 13,
  Cancel: 14,
};

module.exports = {
  ACCESS_LEVEL,
  ORDER_STATUS
};

