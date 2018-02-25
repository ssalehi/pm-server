/**
 * Created by Eabasir on 30/01/2018.
 */

let adminOnly = new Error("Only admin can do this.");
adminOnly.status = 403;

let noUsernameOrPassword = new Error("Username or password is not set");
noUsernameOrPassword.status = 404;

let noCompleteRegisterData = new Error("Registration data is not completed");
noCompleteRegisterData.status = 404;

let customerExist = new Error("Username or mobile number is exist");
customerExist.status = 500;

let badPass = new Error("Incorrect password");
badPass.status = 401;

let noUser = new Error('Person not found');
noUser.status = 400;

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


let productTagIdRequired = new Error("Product tag id is not specified");
productTagIdRequired.status = 404;

let productColorImagesRequired = new Error("Product color images are not specified");
productColorImagesRequired.status = 404;

let productColorNotExist = new Error("This product color is not exist for this product");
productColorNotExist.status = 404;

let productInstanceSizeRequired = new Error("Product instance size is not specified");
productInstanceSizeRequired.status = 404;

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

let pageTypeRequired = new Error("page type is not specified");
pageTypeRequired.status = 404;

let pageIdRequired = new Error("page id not specified");
pageIdRequired.status = 404;

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

module.exports = {
  adminOnly,
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
  productInstanceIdRequired,
  productInstanceCountRequired,
  productInstanceWarehouseIdRequired,
  badUploadedFile,
  collectionIdIsNotValid,
  CollectionNameRequired,
  TagIdIsNotValid,
  productIdIsNotValid,
  pageAddressRequired,
  pageTypeRequired,
  pageIdRequired,
  searchOffsetRequired,
  searchLimitRequired,
  searchOptionsRequired,
  suggestPhraseRequired,
  noUsernameOrPassword,
  noCompleteRegisterData,
  noCodeUsername,
  codeNotFound,
  customerExist,
};
