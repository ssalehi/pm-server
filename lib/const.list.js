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
  OnlineWarehouseVerified: 3,
  ReadyToDeliver: 4,
  DeliverySet: 5,
  OnDelivery: 6,
  Delivered: 7,
  Recieved: 8,
  FinalCheck: 9,
  Checked: 10,
  NotExists: 11,
  Return: 12,
  CustomerCancel: 13,
  StoreCancel: 14,
  Renew: 15
};

let ORDER_STATUS = {
  WaitForAggregation: 1,
  WaitForInvoice: 2,
  InvoiceVerified: 3,
  ReadyToDeliver: 4,
  DeliverySet: 5,
  OnDelivery: 6,
  Delivered: 7,
  Return: 8,
  CustomerCancel: 9,
};

let VERIFICATION = {
  notVerified: 0,
  mobileVerified: 1,
  emailVerified: 2,
  bothVerified: 3,
};

let MISMATCH_TRIGGER = {
  Inbox: 1,
  Send: 2,
  Deliver: 3
}

let SCAN_TRIGGER = {
  Inbox: 1,
  SendInternal: 2,
  SendExternal: 3,
  CCDelivery: 4,
}

let LOGISTIC_SEARCH = {
  Inbox: "Inbox",
  ScanInternalDelivery: "ScanInternalDelivery",
  ScanExternalDelivery: "ScanExternalDelivery",
  ScanToCustomerDelivery: "ScanToCustomerDelivery",
  InternalUnassignedDelivery: "InternalUnassignedDelivery",
  InternalAssignedDelivery: "InternalAssignedDelivery",
  ExternalUnassignedDelivery: "ExternalUnassignedDelivery",
  ShelvesList: "ShelvesList",
  OnDelivery: "OnDelivery",
  AgentFinishedDelivery: "AgentFinishedDelivery"
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

module.exports = {
  ACCESS_LEVEL,
  ORDER_STATUS,
  ORDER_LINE_STATUS,
  DELIVERY_STATUS,
  VERIFICATION,
  MISMATCH_TRIGGER,
  SCAN_TRIGGER,
  LOGISTIC_SEARCH,
  EXPIRE_ADD_ORDER_TIME,
  REFUND_FORM_STATUS
};

