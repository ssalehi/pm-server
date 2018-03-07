const Agent = require('./agent.model');
const Customer = require('./customer.model');
const Product = require('./product.model');
const Page = require('./page.model');
const Color = require('./color.model');
const Collection = require('./collection.model');
const ProductType = require('./product_type.model');
const Tag = require('./tag.model');
const TagGroup = require('./tag_group.model');
const error = require('./errors.list');

class Search {

  constructor(test = Search.test) {
    this.libs = {
      Agent,
      Customer,
      Product,
      Color,
      Page,
      Collection,
      ProductType,
      Tag,
      TagGroup,
    };

    Search.test = test;

  }

  search(className, body) {
    if (!body.hasOwnProperty('offset'))
      return Promise.reject(error.searchOffsetRequired);
    if (!body.hasOwnProperty('limit'))
      return Promise.reject(error.searchLimitRequired);
    if (!body.hasOwnProperty('options'))
      return Promise.reject(error.searchOptionsRequired);

    try {
      let model = new this.libs[className](Search.test);

      if (typeof model.search === 'function') {

        let options = body.options;
        if (!options.phrase)
          options.phrase = '';
        return model.search(options, body.offset, body.limit);

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

  suggest(className, body) {
    if (!body.hasOwnProperty('phrase'))
      return Promise.reject(error.suggestPhraseRequired);

    try {
      let model = new this.libs[className](Search.test);

      if (typeof model.suggest === 'function') {
        let options = body.options;
        if (!options)
          options = {};

        return model.suggest(body.phrase, options);
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