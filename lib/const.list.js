let ACCESS_LEVEL = {
  ContentManager: 0,
  SalesManager: 1,
  ShopClerk: 2,
  DeliveryAgent: 3
};
let ORDER_STATUS = {
  default: 0,
  SMAssignToWarehouse: 1,
  SMRefund: 2,
  SCAccepted: 3,
  SCDeclined: 4,
  Invoice: 5,
  OnDelivery: 6,
  DeliverySuccess: 7,
  DeliveryFailed: 8,
  Cancel: 9,
  Return: 10
};
let REFERRAL_ADVICE = {
  SendToCentral: 0,
  SendToCustomer: 1,
};

module.exports = {
  ACCESS_LEVEL,
  ORDER_STATUS,
  REFERRAL_ADVICE
};

