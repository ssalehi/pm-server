/**
 * Created by Eabasir on 30/01/2018.
 */

let adminOnly = new Error("Only admin can do this.");
adminOnly.status = 403;

let badPass = new Error("Incorrect password");
badPass.status = 401;

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
  productNameRequired,
  productTypeRequired,
  productBrandRequired,
  productBasePriceRequired
};
