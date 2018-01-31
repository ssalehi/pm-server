const db = require('./index');
const brandSchema = require('./schema/brand.schema');

// can save data out of schema using strict: false


let BrandModel = db.prodConnection.model('Brand', brandSchema);
let BrandModelTest = db.testConnection ? db.testConnection.model('Brand', brandSchema) : null;

module.exports = {
  BrandModel,
  BrandModelTest
};
