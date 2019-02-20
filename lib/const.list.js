const moment = require('moment');


let ACCESS_LEVEL = {
  ContentManager: 0,
  SalesManager: 1,
  ShopClerk: 2,
  HubClerk: 3,
  DeliveryAgent: 4,
  InternalDeliveryAgent: 5,
  OfflineSystem: 6
};
let ORDER_LINE_STATUS = {
  default: 1,
  WaitForOnlineWarehouse: 2,
  WaitForOnlineWarehouseCancel: 3,
  OnlineWarehouseVerified: 4,
  OnlineWarehouseCanceled: 5,
  ReadyToDeliver: 6,
  DeliverySet: 7,
  OnDelivery: 8,
  Delivered: 9,
  Recieved: 10,
  FinalCheck: 11,
  Checked: 12,
  NotExists: 13,
  ReturnRequested: 14,
  WaitForLostWarehouse: 15,
  LostWarehouseVerified: 16,
  Canceled: 17,
  Renew: 18,
  WaitForDamage: 19,
  DamageVerified: 20,

};

let ORDER_STATUS = {
  WaitForAggregation: 1,
  WaitForInvoice: 2,
  InvoiceVerified: 3,
  ReadyToDeliver: 4,
  DeliverySet: 5,
  OnDelivery: 6,
  Delivered: 7
};

let VERIFICATION = {
  notVerified: 0,
  mobileVerified: 1,
  emailVerified: 2,
  bothVerified: 3,
};

let SCAN_TRIGGER = {
  Inbox: 1,
  SendInternal: 2,
  SendExternal: 3,
  CCDelivery: 4,
  ReturnDelivery: 5,
}

let SM_MESSAGE = {
  ReturnRequest: 1,
  NotExists: 2,
  Lost: 3,
  Damage: 4,

}

let LOGISTIC_SEARCH = {
  Inbox: "Inbox",
  ScanInternalDelivery: "ScanInternalDelivery",
  ScanExternalDelivery: "ScanExternalDelivery",
  ScanToCustomerDelivery: "ScanToCustomerDelivery",
  ScanReturnDelivery: "ScanReturnDelivery",
  InternalUnassignedDelivery: "InternalUnassignedDelivery",
  InternalAssignedDelivery: "InternalAssignedDelivery",
  ExternalUnassignedDelivery: "ExternalUnassignedDelivery",
  ShelvesList: "ShelvesList",
  OnDelivery: "OnDelivery",
  AgentFinishedDelivery: "AgentFinishedDelivery",
  OrdersHistory: "OrdersHistory",
  SMInbox: "SMInbox",
  SMHistory: "SMHistory",
  DeliveryHistory: "DeliveryHistory"

}

let EXPIRE_ADD_ORDER_TIME = moment({hour: 16, minute: 30});


let DELIVERY_STATUS = {

  default: 1,
  agentSet: 2,
  requestPackage: 3,
  started: 4,
  ended: 5,

}

let REFUND_FORM_STATUS = {
  Pending: 1,
  Paid: 2,
  Refused: 3
}


let PAYMENT_TYPE = {
  cash: 0,
  balance: 1,
  loyaltyPoint: 2,
}

let TRANSFER_TYPE = {
  WarehouseToOnline: 0,
  OnlineToWarehouse: 1,
  WarehouseToDamageLost: 2,
  OnlineToDamageLost: 3
}

let RECEIVE_TYPE = {
  DamageLost: 0,
  Warehouse: 1,
}

module.exports = {
  ACCESS_LEVEL,
  ORDER_STATUS,
  ORDER_LINE_STATUS,
  DELIVERY_STATUS,
  VERIFICATION,
  SCAN_TRIGGER,
  LOGISTIC_SEARCH,
  EXPIRE_ADD_ORDER_TIME,
  REFUND_FORM_STATUS,
  SM_MESSAGE,
  PAYMENT_TYPE,
  TRANSFER_TYPE,
  RECEIVE_TYPE
};

