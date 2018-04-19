let ACCESS_LEVEL = {
  ContentManager: 0,
  SalesManager: 1,
  ShopClerk: 2,
  DeliveryAgent: 3
};
let ORDER_STATUS = {
  default: 1, // needs warehouse id
  SMAssignToWarehouse: 2, // needs warehouse id
  SMRefund: 3,
  SCDeclined: 4, // needs warehouse id
  SCSentToCentral: 5, // needs warehouse id
  Invoice: 6, // needs warehouse id
  ReadyToDeliver: 7, // needs warehouse id
  OnDelivery: 8,
  DeliverySuccess: 9,
  DeliveryFailed: 10,
  Cancel: 11,
  Return: 12 // needs warehouse id
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

