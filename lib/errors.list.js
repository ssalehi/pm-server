/**
 * Created by Eabasir on 30/01/2018.
 */

let adminOnly = new Error("Only admin can do this.");
adminOnly.status = 403;

let badPass = new Error("Incorrect password");
badPass.status = 401;

let noUser = new Error('Person not found');
noUser.status = 400;

let noPass = new Error('No password is set up');
noPass.status = 500;

let noAccess = new Error('No access to this functionality');
noAccess.status = 403;

let productNameRequired = new Error("Product name is not specified");
productNameRequired.status = 404;

let productTypeRequired = new Error("Product type is not specified");
productTypeRequired.status = 404;

let productBrandRequired = new Error("Product brand is not specified");
productBrandRequired.status = 404;

let productBasePriceRequired = new Error("Product base price is not specified");
productBasePriceRequired.status = 404;


module.exports = {
  adminOnly,
  badPass,
  noUser,
  noPass,
  noAccess,
  badPass,
  productNameRequired,
  productTypeRequired,
  productBrandRequired,
  productBasePriceRequired
};
