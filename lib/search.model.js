const Agent = require('./agent.model');
const Customer = require('./customer.model');
const Product = require('./product.model');
const Page = require('./page.model');
const Color = require('./color.model');
const Collection = require('./collection.model');
const ProductType = require('./product_type.model');
const Tag = require('./tag.model');
const TagGroup = require('./tag_group.model');
const Warehouse = require('./warehouse.model');
const Order = require('./order.model');
const Campaign = require('./campaign.model');
const error = require('./errors.list');
const _const = require('./const.list');

class Search {

  constructor(test = Search.test) {
    this.libs = {
      Agent: {Class: Agent, access_level: [_const.ACCESS_LEVEL.ContentManager]},
      Customer: {Class: Customer, access_level: [_const.ACCESS_LEVEL.ContentManager]},
      Product: {Class: Product, access_level: []},
      Color: {Class: Color, access_level: [_const.ACCESS_LEVEL.ContentManager]},
      Page: {Class: Page, access_level: [_const.ACCESS_LEVEL.ContentManager]},
      // Collection: {Class: Collection, access_level: [_const.ACCESS_LEVEL.ContentManager]},
      Collection: {Class: Collection, access_level: []},
      ProductType: {Class: ProductType, access_level: [_const.ACCESS_LEVEL.ContentManager]},
      Tag: {Class: Tag, access_level: [_const.ACCESS_LEVEL.ContentManager]},
      Campaign: {Class: Campaign, access_level: [_const.ACCESS_LEVEL.ContentManager]},
      TagGroup: {Class: TagGroup, access_level: [_const.ACCESS_LEVEL.ContentManager]},
      Warehouse: {Class: Warehouse, access_level: []},
      Order: {Class: Order, access_level: [_const.ACCESS_LEVEL.SalesManager, _const.ACCESS_LEVEL.ShopClerk]}
    };

    Search.test = test;

  }

  search(className, body, user) {
    if (!body.hasOwnProperty('offset'))
      return Promise.reject(error.searchOffsetRequired);
    if (!body.hasOwnProperty('limit'))
      return Promise.reject(error.searchLimitRequired);
    if (!body.hasOwnProperty('options'))
      return Promise.reject(error.searchOptionsRequired);

    try {

      if (this.libs[className].access_level.length !== 0) {
        if (!user)
          return Promise.reject(error.noAccess);

        if (!this.libs[className].access_level.some(x => x === user.access_level))
          return Promise.reject(error.noAccess)
      }

      let model = new this.libs[className].Class(Search.test);

      if (typeof model.search === 'function') {

        let options = body.options;
        if (!options.phrase)
          options.phrase = '';
        return model.search(options, body.offset, body.limit , user);

      } else {
        let error = new Error(`search function is not defined for ${className}`);
        error.status = 500;
        return Promise.reject(error);
      }
    } catch (err) {
      let error = new Error(`cannot find ${className} on libs`);
      error.status = 500;
      return Promise.reject(err)
    }
  }

  suggest(className, body, user) {
    if (!body.hasOwnProperty('phrase'))
      return Promise.reject(error.suggestPhraseRequired);

    try {

      if (this.libs[className].access_level.length !== 0) {
        if (!user)
          return Promise.reject(error.noAccess);

        if (!this.libs[className].access_level.some(x => x === user.access_level))
          return Promise.reject(error.noAccess)
      }

      let model = new this.libs[className].Class(Search.test);

      if (typeof model.suggest === 'function') {
        let options = body.options;
        if (!options)
          options = {};

        return model.suggest(body.phrase, options, user);
      } else {
        let error = new Error(`suggest function is not defined for ${className}`);
        error.status = 500;
        return Promise.reject(error);
      }

    } catch (err) {
      let error = new Error(`cannot find ${className} on libs`);
      error.status = 500;
      return Promise.reject(err);
    }
  }

}

Search.test = false;

module.exports = Search;