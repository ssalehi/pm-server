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

let noCompleteChanegePassData = new Error("Change password data is not completed");
noCompleteChanegePassData.status = 500;

let retypePassNotCompatibleWithNewPass = new Error("new pass and retype one are not compatible");
retypePassNotCompatibleWithNewPass.status = 500;

let notVerified = new Error("Customer is not verified yet");
notVerified.status = 403;

let customerExist = new Error("customer already exist");
customerExist.status = 500;

let emailExist = new Error("email already exist");
emailExist.status = 500;

let noUsernameMobileNo = new Error("Username or mobile number is not set");
noUsernameMobileNo.status = 404;

let badPass = new Error("Incorrect password");
badPass.status = 401;

let noUser = new Error('Person not found');
noUser.status = 404;

let noPass = new Error('No password is set up');
noPass.status = 500;

let noAccess = new Error('No access to this functionality');
noAccess.status = 403;

let invalidId= new Error('id is not valid');
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

let productImageIdRequired = new Error("Image is not specified to delete");
productImageIdRequired.status = 404;

let instanceDataRequired = new Error("Instance data is not specified");
instanceDataRequired.status = 404;

let productTagIdRequired = new Error("Product tag id is not specified");
productTagIdRequired.status = 404;

let productColorImagesRequired = new Error("Product color images are not specified");
productColorImagesRequired.status = 404;

let productColorNotExist = new Error("This product color is not exist for this product");
productColorNotExist.status = 404;

let productInstanceSizeRequired = new Error("Product instance size is not specified");
productInstanceSizeRequired.status = 404;

let productInstanceBarcodeRequired = new Error("Product instance barcode is not specified");
productInstanceBarcodeRequired.status = 404;

let productInstanceNotExist = new Error("This product instance is not exist for this product");
productInstanceNotExist.status = 404;

let productInstanceIdRequired = new Error("product instance id is not specified");
productInstanceIdRequired.status = 404;

let productInstanceCountRequired = new Error("product instance count is not specified");
productInstanceCountRequired.status = 404;

let productInstanceWarehouseIdRequired = new Error("product instance warehouse id is not specified");
productInstanceWarehouseIdRequired.status = 404;

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

let codeNotFound = new Error("This code is expired");
codeNotFound.status = 404;

let excelFileRequired = new Error('excel file required');
excelFileRequired.status = 404;

let pageInfoError = new Error('page not have any info');
pageInfoError.status = 404;

let pageNotFound= new Error('page not found');
pageNotFound.status = 404;

let thumbnailIsRequired = new Error('color not found for this id');
thumbnailIsRequired.status = 404;

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

let existingActiveTicket = new Error('order line has already active ticket');
existingActiveTicket.status = 404;

let orderIdsIsRequired = new Error('order id and order line is is required');
orderIdsIsRequired.status = 404;

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
  productImageIdRequired,
  productTagIdRequired,
  productColorImagesRequired,
  productColorNotExist,
  productInstanceNotExist,
  productInstanceSizeRequired,
  productInstanceBarcodeRequired,
  productInstanceIdRequired,
  productInstanceCountRequired,
  productInstanceWarehouseIdRequired,
  badUploadedFile,
  collectionIdIsNotValid,
  collectionNotFound,
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
  noCompleteChanegePassData,
  noCodeUsername,
  codeNotFound,
  customerExist,
  emailExist,
  notVerified,
  noUsernameMobileNo,
  pageNotFound,
  excelFileRequired,
  thumbnailIsRequired,
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
  centralWarehouseNotFound,
  placementDetailsRequired,
  duplicatePlacement,
  placementIdRequired,
  retypePassNotCompatibleWithNewPass,
};
