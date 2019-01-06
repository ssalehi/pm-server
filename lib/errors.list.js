/**
 * Created by Eabasir on 30/01/2018.
 */

let adminOnly = new Error("Only admin can do this.");
adminOnly.status = 403;

let appOnly = new Error("Only app can request this page.");
appOnly.status = 403;

let invalidExpiredCouponCode = new Error("The coupon code is invalid or expired");
invalidExpiredCouponCode.status = 403;

let noCouponCode = new Error("No coupon code is declared");
noCouponCode.status = 404;

let noUsernameOrPassword = new Error("Username or password is not set");
noUsernameOrPassword.status = 404;

let noCompleteRegisterData = new Error("Registration data is not completed");
noCompleteRegisterData.status = 404;

let methodNotAllowed = new Error("This method is not allowed");
methodNotAllowed.status = 405;

let noCompleteChangesPassData = new Error("Change password data is not completed");
noCompleteChangesPassData.status = 500;

let retypePassNotCompatibleWithNewPass = new Error("new pass and retype one are not compatible");
retypePassNotCompatibleWithNewPass.status = 500;

// these 3 errors are better not to be changed, because they're used exactly in the client!
let notVerified = new Error("Customer is not verified yet");
notVerified.status = 420;

let notMobileVerified = new Error("Customer's mobile is not verified yet");
notMobileVerified.status = 421;

let notEmailVerified = new Error("Customer's email is not verified yet");
notEmailVerified.status = 422;

let orderVerificationFailed = new Error("Order Verification needs both transaction id and address");
orderVerificationFailed.status = 403;

let customerExist = new Error("customer already exist");
customerExist.status = 500;

let emailExist = new Error("email already exist");
emailExist.status = 500;

let noUsernameMobileNo = new Error("Username or mobile number is not set");
noUsernameMobileNo.status = 404;

let noMobileNo = new Error("Mobile number is not set");
noMobileNo.status = 404;

let badPass = new Error("Incorrect password");
badPass.status = 401;

let noUser = new Error('Person not found');
noUser.status = 404;

let noPass = new Error('No password is set up');
noPass.status = 500;

let noAccess = new Error('No access to this functionality');
noAccess.status = 403;

let invalidId = new Error('id is not valid');
invalidId.status = 403;

let productNameRequired = new Error("Product name is not specified");
productNameRequired.status = 404;

let productTypeRequired = new Error("Product type is not specified");
productTypeRequired.status = 404;

let productBrandRequired = new Error("Product brand is not specified");
productBrandRequired.status = 404;

let productIdRequired = new Error("Product id is not specified");
productIdRequired.status = 404;

let productBasePriceRequired = new Error("Product base price is not specified");
productBasePriceRequired.status = 404;

let productColorIdRequired = new Error("Product color id is not specified");
productColorIdRequired.status = 404;

let productImageNameRequired = new Error("Image is not specified to delete");
productImageNameRequired.status = 404;

let instanceDataRequired = new Error("Instance data is not specified");
instanceDataRequired.status = 404;

let productTagIdRequired = new Error("Product tag id is not specified");
productTagIdRequired.status = 404;

let productColorImagesRequired = new Error("Product color images are not specified");
productColorImagesRequired.status = 404;

let productColorNotExist = new Error("This product color is not exist for this product");
productColorNotExist.status = 404;

let productColorThumbnailNotFound = new Error("thumbnail is not added for this product color");
productColorThumbnailNotFound.status = 404;

let productInstanceSizeRequired = new Error("Product instance size is not specified");
productInstanceSizeRequired.status = 404;

let productInstanceBarcodeRequired = new Error("Product instance barcode is not specified");
productInstanceBarcodeRequired.status = 404;

let productInstanceNotExist = new Error("This product instance is not exist for this product");
productInstanceNotExist.status = 404;

let productInstanceIdRequired = new Error("product instance id is not specified");
productInstanceIdRequired.status = 400;

let productInstanceCountRequired = new Error("product instance count is not specified");
productInstanceCountRequired.status = 400;

let productInstancePriceRequired = new Error("product instance price is not specified");
productInstancePriceRequired.status = 400;

let productInstanceWarehouseIdRequired = new Error("product instance warehouse id is not specified");
productInstanceWarehouseIdRequired.status = 400;

let collectionIdIsNotValid = new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
collectionIdIsNotValid.status = 500;

let collectionNotFound = new Error("no collection found with this id");
collectionNotFound.status = 500;

let brandNotFound = new Error("no brand found with this id");
brandNotFound.status = 500;

let typeNotFound = new Error("no type found with this id");
typeNotFound.status = 500;

let tagNotFound = new Error("no tag found with this id");
tagNotFound.status = 500;

let colorNotFound = new Error("no color found with this id");
colorNotFound.status = 500;

let productColorEditFailed = new Error("could not update product color images");
productColorEditFailed.status = 500;

let tagIdIsNotValid = new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
tagIdIsNotValid.status = 500;

let typeIdIsNotValid = new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
typeIdIsNotValid.status = 500;

let productIdIsNotValid = new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
productIdIsNotValid.status = 500;

let TagIdIsNotValid = new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
TagIdIsNotValid.status = 500;

let CollectionNameRequired = new Error("Collection validation failed: name: Path `name` is required.");
CollectionNameRequired.status = 404;

let badUploadedFile = new Error("file has no data or path");
badUploadedFile.status = 404;

let pageAddressRequired = new Error("page address is not specified");
pageAddressRequired.status = 404;

let pageAddressNotValid = new Error("page address is not valid");
pageAddressNotValid.status = 500;

let pageTypeRequired = new Error("page type is not specified");
pageTypeRequired.status = 404;

let pageIdRequired = new Error("page id not specified");
pageIdRequired.status = 404;

let pageIdIsNotValid = new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
pageIdIsNotValid.status = 500;

let searchOffsetRequired = new Error("search offset is not specified");
searchOffsetRequired.status = 404;

let searchLimitRequired = new Error("search limit is not specified");
searchLimitRequired.status = 404;

let searchOptionsRequired = new Error("search options is not specified");
searchOptionsRequired.status = 404;

let suggestPhraseRequired = new Error("phrase is required for the suggest api");
suggestPhraseRequired.status = 404;

let noCodeUsername = new Error("Code or username is not defined");
noCodeUsername.status = 404;

let noCode = new Error("Code is not passed");
noCode.status = 404;

let codeNotFound = new Error("This code is expired");
codeNotFound.status = 404;

let excelFileRequired = new Error('excel file required');
excelFileRequired.status = 404;

let pageInfoError = new Error('page not have any info');
pageInfoError.status = 404;

let pageNotFound = new Error('page not found');
pageNotFound.status = 404;

let customerIdRequired = new Error('customer id is required');
customerIdRequired.status = 404;

let emailIsRequired = new Error('email is required');
emailIsRequired.status = 404;

let firstNameIsRequired = new Error('firstname is required');
firstNameIsRequired.status = 404;

let surNameIsRequired = new Error('surnames is required');
surNameIsRequired.status = 404;

let addressIsRequired = new Error('address is required');
addressIsRequired.status = 404;

let recipientInfoIsRequired = new Error('recipient full information is required');
recipientInfoIsRequired.status = 404;

let customerIdNotValid = new Error('no customer exist with such id');
customerIdNotValid.status = 404;

let bodyRequired = new Error('body is empty');
bodyRequired.status = 404;

let agentWarehouseIdRequired = new Error('warehouse id of agent is required');
agentWarehouseIdRequired.status = 404;

let warehouseIdRequired = new Error('warehouse id is required');
warehouseIdRequired.status = 404;

let OrderIdNotFound = new Error('order id not found');
OrderIdNotFound.status = 404;

let StatusIsNotValid = new Error('status is not valid');
StatusIsNotValid.status = 403;

let centralWarehouseNotFound = new Error('central warehouse is not found');
centralWarehouseNotFound.status = 404;

let placementDetailsRequired = new Error('Some placement details is required');
placementDetailsRequired.status = 404;

let duplicatePlacement = new Error('The placement data is exist');
duplicatePlacement.status = 500;

let placementIdRequired = new Error('The id of placement is required');
placementIdRequired.status = 404;

let orderNotFound = new Error('order not found');
orderNotFound.status = 404;

let orderLineNotFound = new Error('order line not found');
orderLineNotFound.status = 404;

let activeTicketNotFound = new Error('order line has no active ticket for this user');
activeTicketNotFound.status = 404;

let ticketReceiverRequired = new Error('ticket receiver is required');
ticketReceiverRequired.status = 404;

let existingActiveTicket = new Error('order line has already active ticket');
existingActiveTicket.status = 404;

let orderIdsIsRequired = new Error('order id and order line is is required');
orderIdsIsRequired.status = 404;

let invalidSocketMessageType = new Error('socket message should have type and data');
invalidSocketMessageType.status = 404;

let preInvoiceTicketIsNotExists = new Error('previous invoice ticket is not set for this order line');
preInvoiceTicketIsNotExists.status = 404;

let invalidWarehouseORP = new Error('invalid (not shop) warehouse can not be filtered in ORP');
invalidWarehouseORP.status = 404;

let invalidImagePath = new Error('The image path is not valid');
invalidImagePath.status = 500;

let productNotFound = new Error('product not found');
productNotFound.status = 500;

let ProductImageRemoveFailed = new Error('could not remove product image');
ProductImageRemoveFailed.status = 500;

let invalidInventoryCount = new Error('invalid count of inventory');
invalidInventoryCount.status = 500;

let WarehouseNotFound = new Error('warehouse not found with this id');
WarehouseNotFound.status = 500;

let duplicateDictionary = new Error('The Dictionary data is exist');
duplicateDictionary.status = 500;

let invalidDictionary = new Error('The Dictionary id  not valid');
invalidDictionary.status = 500;

let dictionaryNameRequired = new Error('The Dictionary name is required');
dictionaryNameRequired.status = 500;

let dictionaryValueRequired = new Error('The Dictionary value is required');
dictionaryValueRequired.status = 500;

let dictionaryTypeRequired = new Error('The Dictionary type is required');
dictionaryTypeRequired.status = 500;

let duplicateWishListItem = new Error('Duplicate WishList Item is not allowed');
duplicateWishListItem.statusCode = 500;

let wishItemIdIsRequired = new Error('Wish item id is required');
wishItemIdIsRequired.statusCode = 500;

let InvalidCampaignInfo = new Error('Campaign needs name, discount ref and start date');
InvalidCampaignInfo.statusCode = 500;

let invalidDate = new Error('Date is not valid or is past');
invalidDate.statusCode = 500;

let couponCodeCampaign = new Error('campaign is defined by coupon code');
couponCodeCampaign.statusCode = 500;

let campaignIsExpired = new Error('campaign is already expired');
campaignIsExpired.statusCode = 500;

let soldOutStatusIsRequired = new Error('soldOut status is required');
soldOutStatusIsRequired.statusCode = 500;

let orderIsNotCompleted = new Error('order is not completed yet');
orderIsNotCompleted.statusCode = 500;

let invalidTicket = new Error('ticket number is not valid');
invalidTicket.statusCode = 500;

let ticketStatusNotDelivered = new Error('ticket already status is not Delivered');
ticketStatusNotDelivered.status = 500;

let ticketAlreadySetOnDelivery = new Error('ticket already status is OnDelivery');
ticketAlreadySetOnDelivery.status = 500;

let invalidSearchQuery = new Error('invalid search query');
invalidSearchQuery.statusCode = 500;

let orderDestinationNotFound = new Error('order destination not found');
orderDestinationNotFound.statusCode = 500;

let dataIsNotCompleted = new Error("The passed data is not completed");
dataIsNotCompleted.status = 404;

let loyaltyGroupIdIsRequired = new Error("Loyalty group id is required");
loyaltyGroupIdIsRequired.status = 404;

let deliveryIdIsRequired = new Error("Delivery id is required");
deliveryIdIsRequired.status = 404;

let barcodeNotFound = new Error("product barcode not found");
barcodeNotFound.status = 404;

let scanTriggerNotFound = new Error("trigger of scan not found");
scanTriggerNotFound.status = 404;

let invalidOrderProcess = new Error("invalid path for order process");
invalidOrderProcess.status = 404;

let durationIdIsRequired = new Error("Duration id is required");
durationIdIsRequired.status = 404;

let deliveryStatusIsRequired = new Error("Delivery status is required");
deliveryStatusIsRequired.status = 404;

let targetDeliveryIdsAreRequired = new Error("The target delivery ids are required");
targetDeliveryIdsAreRequired.status = 404;

let noDeliveryWithoutEvidence = new Error("No delivery without evidence is found");
noDeliveryWithoutEvidence.status = 404;

let duplicateLink = new Error("Error. Duplicate link");
duplicateLink.status = 500;

// this'd better not be changed because it is used the same in the client
let expiredLink = new Error("Link is expired");
expiredLink.status = 437;

let duplicatedProvince = new Error("This province is used");
duplicatedProvince.status = 500;

let incompleteRecieverInfo = new Error("incompleted information of receiver");
incompleteRecieverInfo.status = 500;

let invalidMismatchTrigger = new Error("mismatch trigger is not valid");
invalidMismatchTrigger.status = 500;

let invalidScanTrigger = new Error("scan trigger is not valid");
invalidScanTrigger.status = 500;

let salesManagerNotFound = new Error("there must be at least one sales manager in the system");
salesManagerNotFound.status = 500;

let deliveryItemIsAlreadyAssigned = new Error("One of the delivery items is already assigned");
deliveryItemIsAlreadyAssigned.status = 500;

let notDeliveryResponsibility = new Error("Another one is responsible for this delivery");
notDeliveryResponsibility.status = 403;

let deliveryNotFound = new Error("delivery not found");
deliveryNotFound.status = 403;

let invalidDeliveryInfo = new Error("invalid delivery information");
invalidDeliveryInfo.status = 403;

let tokenFailed = new Error("Server can not send token");
tokenFailed.status = 500;

let invalidInvoice = new Error("Invalid Invoice");
invalidInvoice.status = 403;

let soldOutBeforePayment = new Error("Sold out before payment");
soldOutBeforePayment.status = 500;

let deliveryAgentHasIncompleteDelivery = new Error("selected delivery agent has prev incomplete delivery");
deliveryAgentHasIncompleteDelivery.status = 500;


module.exports = {
  adminOnly,
  appOnly,
  badPass,
  noUser,
  noPass,
  noAccess,
  invalidId,
  productIdRequired,
  productNameRequired,
  productTypeRequired,
  productBrandRequired,
  productBasePriceRequired,
  productColorIdRequired,
  productImageNameRequired,
  productTagIdRequired,
  productColorImagesRequired,
  productColorNotExist,
  productColorThumbnailNotFound,
  productInstanceNotExist,
  productInstanceSizeRequired,
  productInstanceBarcodeRequired,
  productInstanceIdRequired,
  productInstanceCountRequired,
  productInstancePriceRequired,
  productInstanceWarehouseIdRequired,
  badUploadedFile,
  collectionIdIsNotValid,
  collectionNotFound,
  methodNotAllowed,
  tagIdIsNotValid,
  typeIdIsNotValid,
  pageInfoError,
  CollectionNameRequired,
  TagIdIsNotValid,
  productIdIsNotValid,
  pageAddressRequired,
  pageAddressNotValid,
  pageTypeRequired,
  pageIdRequired,
  pageIdIsNotValid,
  searchOffsetRequired,
  searchLimitRequired,
  searchOptionsRequired,
  suggestPhraseRequired,
  noUsernameOrPassword,
  noCompleteRegisterData,
  noCompleteChangesPassData,
  noCodeUsername,
  codeNotFound,
  customerExist,
  emailExist,
  notVerified,
  notMobileVerified,
  notEmailVerified,
  noUsernameMobileNo,
  noMobileNo,
  pageNotFound,
  excelFileRequired,
  customerIdRequired,
  emailIsRequired,
  firstNameIsRequired,
  surNameIsRequired,
  addressIsRequired,
  recipientInfoIsRequired,
  customerIdNotValid,
  instanceDataRequired,
  brandNotFound,
  typeNotFound,
  tagNotFound,
  colorNotFound,
  bodyRequired,
  invalidExpiredCouponCode,
  noCouponCode,
  agentWarehouseIdRequired,
  centralWarehouseNotFound,
  orderNotFound,
  orderLineNotFound,
  activeTicketNotFound,
  existingActiveTicket,
  orderIdsIsRequired,
  placementDetailsRequired,
  duplicatePlacement,
  placementIdRequired,
  invalidSocketMessageType,
  retypePassNotCompatibleWithNewPass,
  preInvoiceTicketIsNotExists,
  warehouseIdRequired,
  invalidWarehouseORP,
  invalidImagePath,
  productColorEditFailed,
  productNotFound,
  ProductImageRemoveFailed,
  invalidInventoryCount,
  WarehouseNotFound,
  duplicateDictionary,
  invalidDictionary,
  dictionaryNameRequired,
  dictionaryValueRequired,
  dictionaryTypeRequired,
  duplicateWishListItem,
  wishItemIdIsRequired,
  orderVerificationFailed,
  InvalidCampaignInfo,
  noCode,
  invalidDate,
  couponCodeCampaign,
  campaignIsExpired,
  duplicateLink,
  expiredLink,
  soldOutStatusIsRequired,
  ticketReceiverRequired,
  invalidTicket,
  invalidSearchQuery,
  orderDestinationNotFound,
  dataIsNotCompleted,
  loyaltyGroupIdIsRequired,
  deliveryIdIsRequired,
  durationIdIsRequired,
  barcodeNotFound,
  scanTriggerNotFound,
  invalidOrderProcess,
  deliveryStatusIsRequired,
  targetDeliveryIdsAreRequired,
  noDeliveryWithoutEvidence,
  ticketStatusNotDelivered,
  ticketAlreadySetOnDelivery,
  incompleteRecieverInfo,
  invalidMismatchTrigger,
  invalidScanTrigger,
  salesManagerNotFound,
  duplicatedProvince,
  deliveryItemIsAlreadyAssigned,
  notDeliveryResponsibility,
  deliveryNotFound,
  invalidDeliveryInfo, 
  tokenFailed,
  invalidInvoice,
  soldOutBeforePayment,
};
