let ACCESS_LEVEL = {
  ContentManager: 0,
  SalesManager: 1,
  ShopClerk: 2,
  DeliveryAgent: 3
};

let STATUS_ORDER = {
    default: 0,
    SMAccepted: 1,
    SMDeclined: 2,
    SMAssignToWarehouse: 3,
    SMRefund: 4,
    SCAccepted: 5,
    SCDeclined: 6,
    Invoice: 7,
    OnDelivery: 8,
    DeliverySuccess: 9,
    DeliveryFailed: 10,
    Cancel: 11,
    Return: 12
};
module.exports = {
  ACCESS_LEVEL,
  STATUS_ORDER
};

