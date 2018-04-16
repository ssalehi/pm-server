let ACCESS_LEVEL = {
  ContentManager: 0,
  SalesManager: 1,
  ShopClerk: 2,
  DeliveryAgent: 3
};
let ORDER_STATUS = {
  default: 1,
  SMAssignToWarehouse: 2,
  SMRefund: 3,
  SCDeclined: 4,
  SCSentToCentral: 5,
  Invoice: 6,
  ReadyToDeliver: 7,
  OnDelivery: 8,
  DeliverySuccess: 9,
  DeliveryFailed: 10,
  Cancel: 11,
  Return: 12
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

