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
  Invoice: 4, 
  ReadyToDeliver: 5, 
};
let REFERRAL_ADVICE = {
  SendToCentral: 1,
  SendToCustomer: 2,
};

module.exports = {
  ACCESS_LEVEL,
  ORDER_STATUS,
  REFERRAL_ADVICE
};

