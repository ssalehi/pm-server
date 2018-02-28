/**
 * Created by Eabasir on 01/30/2018.
 */
const Agent = require('./agent.model');
const Customer = require('./customer.model');
const Person = require('./person.model');
const Collection = require('./collection.model');
const Search = require('./search.model');
const Product = require('./product.model');
const ProductType = require('./product_type.model');
const Color = require('./color.model');
const Page = require('./page.model');
const dbHelpers = require('./db-helpers');
const helpers = require('./helpers');
const errors = require('./errors.list');

module.exports = {
  Agent,
  Customer,
  Product,
  ProductType,
  Color,
  Page,
  Collection,
  Person,
  Search,
  dbHelpers,
  helpers,
  errors,
};
