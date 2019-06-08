const Base = require('./base.model');
const error = require('./errors.list');
const models = require('../mongo/models.mongo');
const xlsx = require('xlsx');
const WarehouseModel = require('./warehouse.model');
const SoldOutModel = require('./sold_out.model');


Dictionary = {

  Brand: {excelName: 'Brand'},
  Size: {excelName: 'Size'},
  Price: {excelName: 'Price'},
  BarCode: {excelName: 'BarCode'},
  GenericArticleText: {excelName: 'Generic article text'},
  GenericArticleNo: {excelName: 'Generic Article No'},
  ColorDescription: {excelName: 'Color Description'},
  Desc: {excelName: 'Desc'},

  /**
   * whether to override the already counts of products with this new counts
     Notes:
     if set to true and the new count is 0, product will also be added to soldout table
   */
  Override: {excelName: 'Override Count'},

  /**
   * weather to update tags and tag groups for a product or not
   */
  OverrideInfo: {excelName: 'Override Info'},

  /**
   * whether to set the soldout mark in the soldout table or not (if exists)
     Notes:
     if set to true and the final count is 0, if doesn't exist in soldout table will be added here,
     and also the soldout flag in product instance will be set to true
     if set to true and the final count is not 0, doesn't affect anything
     if set to false, doesn't affect anything
   */
  SoldOut: {excelName: 'SoldOut'},

  // map fields
  Division: {excelName: 'Division', dbName: 'Division'},
  SubDivision: {excelName: 'Sub Division', dbName: 'Sub Division'},
  Category: {excelName: 'Category', dbName: 'Category'},
  Gender: {excelName: 'Gender', dbName: 'Gender'},
  Season: {excelName: 'Season', dbName: 'Season'},
  SeasonYear: {excelName: 'Season Year', dbName: 'Season Year'},
  Silhouette: {excelName: 'Silhouette', dbName: 'Silhouette'},
  SubSilhouette: {excelName: 'Sub silhouette 2', dbName: 'Sub Silhouette'}

};

tagGroupNames = [
  Dictionary.SubDivision.dbName,
  Dictionary.Category.dbName,
  Dictionary.Gender.dbName,
  Dictionary.Season.dbName,
  Dictionary.SeasonYear.dbName,
  Dictionary.Silhouette.dbName,
  Dictionary.SubSilhouette.dbName
];

unknownColor = 'unknown';
unknownBrand = 'unknown';
unknownType = 'unknown';
unknownTag = 'unknown';
unknownTagGroup = 'unknown';
unknownSize = 'unknown';
unknownBarcode = 'unknown';
unknownDesc = '';
unknownColorCode = '0000';
unknownArticleNo = 'unknown';
unknownName = 'unknown';

trues = ['TRUE', 'T', '1', 'YES', 'Y'];
falses = ['FALSE', 'F', '0', 'NO', 'N'];

class Upload extends Base {


  constructor(test = Upload.test) {
    Upload.test = test;
    super(test);
  }


  getProgress() {
    return (Upload.total && Upload.curIndex) ? Upload.curIndex / Upload.total : 0;
  }

  start(file) {
    if (Upload.isWorking) {
      throw error.workingOnFile
    }

    this.excel(file);

    return Promise.resolve('ok');
  }

  async excel(file) {

    Upload.isWorking = true;

    if (!file) {
      throw error.excelFileRequired;
    }

    let filename = file.path;
    let workbook = xlsx.readFile(filename);
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let data = xlsx.utils.sheet_to_json(sheet);


    this.results = {
      brands: null,
      types: null,
      tagGroups: null,
      tags: null,
      colors: null
    };

    let brands = Array.from(new Set(data.map(r => r[Dictionary.Brand.excelName]))).map(x => {
      return {
        name: x ? x.trim() : unknownBrand
      };
    });


    this.results.brands = await this.safeInsert(brands, 'Brand')

    let types = Array.from(new Set(data.map(r => r[Dictionary.Division.excelName]))).map(x => {
      return {
        name: x ? x.trim() : unknownType
      }
    });

    this.results.types = await this.safeInsert(types, 'ProductType');

    let tagGroups = tagGroupNames.map(x => {
      return {
        name: x ? x.trim() : unknownTagGroup,
        is_required: false
      }
    });
    this.results.tagGroups = await this.safeInsert(tagGroups, 'TagGroup');

    let addTag = (name) => {
      let tgId = this.results.tagGroups.filter(x => x.name === name)[0]._id;

      // get appropriate excel name from dictionary respected to db tag group name
      let t = Array.from(new Set(data.map(r => r[this.mapName(name, true)])));
      return t.map(x => {
        return {
          name: x ? x.trim() : unknownTag,
          tag_group_id: tgId
        }
      });

    };
    let tags = [];
    tagGroupNames.forEach(x => tags.push(addTag(x)));
    this.results.tags = await this.safeInsert([].concat.apply([], tags), 'Tag');

    let color_names = Array.from(new Set(data.map(x => {
      return {name: x[Dictionary.ColorDescription.excelName] ? x[Dictionary.ColorDescription.excelName].trim() : unknownColor} // some products have no color description in excel file
    })));

    let colors = Array.from(new Set(color_names));


    this.results.colors = await this.safeInsert(colors, 'Color');

    this.warehouses = await new WarehouseModel(Upload.test).getWarehouses();
    let total = data.length;

    for (let i = 0; i < data.length; i++) {
      try {
        await this.makeProduct(data[i], i, total);
      } catch (err) {
        console.log('-> error on adding product', err);
      }
    }

    Upload.isWorking = false;
    Upload.total = 0;
    Upload.curIndex = 0;

  }

  async makeProduct(row, counter, total) {

    let name = row[`${Dictionary.GenericArticleText.excelName}_fa`] || row[Dictionary.GenericArticleText.excelName];
    let brand = (row[Dictionary.Brand.excelName] && row[Dictionary.Brand.excelName] !== '') ? row[Dictionary.Brand.excelName] : unknownType;
    let type = (row[Dictionary.Division.excelName] && row[Dictionary.Division.excelName] !== '') ? row[Dictionary.Division.excelName] : unknownType;
    let desc = (row[Dictionary.Desc.excelName] && row[Dictionary.Desc.excelName] !== '') ? row[Dictionary.Desc.excelName] : unknownDesc;
    let brandId = this.results.brands.find(x => x.name === brand)._id;
    let typeId = this.results.types.find(x => x.name === type)._id;
    let colorName = row[Dictionary.ColorDescription.excelName] || unknownColor;
    let barcode = row[Dictionary.BarCode.excelName] || unknownBarcode;
    let size = row[Dictionary.Size.excelName] || unknownSize;
    let article_no = row[Dictionary.GenericArticleNo.excelName];

    name = name ? name.trim() : unknownName;
    colorName = name ? colorName.trim() : unknownName;

    let colorId = this.results.colors.find(x => x.name === colorName)._id;

    let price = Number.parseInt(row[Dictionary.Price.excelName].replace(/[^0-9.-]+/g, "")); // remove currency chars
    price = price > 0 ? price : 0;

    let code;
    if (article_no && article_no.length > 4) {
      article_no = row[Dictionary.GenericArticleNo.excelName].replace('-', '');
      code = article_no.substring(article_no.length - 3);
      article_no = article_no.substring(0, article_no.length - 3);
    } else {
      article_no = unknownArticleNo;
    }


    let overrideInfo = row[Dictionary.OverrideInfo.excelName] && row[Dictionary.OverrideInfo.excelName].toUpperCase() || falses[0];
    overrideInfo = trues.some(el => el === overrideInfo)

    let soldOutFlag = row[Dictionary.SoldOut.excelName] && row[Dictionary.SoldOut.excelName].toUpperCase() || falses[0];
    soldOutFlag = trues.some(el => el === soldOutFlag)

    let override = row[Dictionary.Override.excelName] && row[Dictionary.Override.excelName].toUpperCase() || falses[0];
    override = trues.some(el => el === override)


    console.log('-> ', `${article_no} | ${counter} of ${total}`);
    Upload.curIndex = counter;
    Upload.total = total;

    let product = await this.updateBasicProduct(article_no, name, type, typeId, brand, brandId, price, desc);

    product = await this.updateTagsForProduct(product, row, overrideInfo);

    product = await this.updateColorsForProduct(product, colorId, colorName, code);

    let productColorId = product.colors.find(x => x.color_id.toString() === colorId.toString())._id;

    product = await this.updateInstancesForProduct(product, barcode, productColorId, size, price);

    let foundInstance = product.instances.find(x => x.barcode === row[Dictionary.BarCode.excelName]);
    this.updateInventoryForInstance(foundInstance, override, row);

    await this.updateSoldOuts(product, foundInstance, soldOutFlag);

    await this.updateInstance(product, foundInstance);

  };

  safeInsert(data, modelName, reverseKey = 'name') {
    return models()[modelName + (Upload.test ? 'Test' : '')].insertMany(data, {ordered: false}) // use ordered false to add remaining records if current insertion failed due to duplication
      .then(res => {
        return Promise.resolve(res.map(x => x.toObject()))
      })
      .catch(err => {
        if (err.name === 'BulkWriteError') {
          const query = {};
          query[reverseKey] = {"$in": data.map(x => x[reverseKey])};
          return models()[modelName + (Upload.test ? 'Test' : '')].find(query).lean();
        } else
          return Promise.reject(err)
      });
  }

  async updateBasicProduct(article_no, name, typeName, typeId, brandName, brandId, price, desc) {
    let query = {
      article_no,
    },
      update = {
        $set:
        {
          "name": name,
          "product_type": {name: typeName, product_type_id: typeId},
          "brand": {name: brandName, brand_id: brandId},
          "date": new Date(),
          "base_price": price,
          "article_no": article_no,
          "desc": desc
        }
      },
      options = {upsert: true, new: true};

    return await models()['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate(query, update, options).lean();

  }

  async updateTagsForProduct(product, row, overrideInfo = false) {

    const tags = [];
    let findTagId = tagGroupName => {
      let tgId = this.results.tagGroups.find(x => x.name === tagGroupName)._id;

      let tag = this.results.tags.find(x => x.name === row[this.mapName(tagGroupName, true)] && x.tag_group_id.toString() === tgId.toString());
      return tag ? tag._id : null;

    };

    tagGroupNames.forEach(tg_name => {
      const tag_id = findTagId(tg_name)
      if (tag_id) {
        tags.push({
          tg_name,
          name: row[this.mapName(tg_name, true)],
          tag_id
        })
      }
    });

    if (overrideInfo) {
      return models()['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate({
        _id: product._id,
      }, {
          $set:
          {
            "tags": tags,
          },

        }, {new: true}).lean()
    }

    let newTags = [];
    if (product.tags && product.tags.length) {
      tags.forEach(tag => {
        const foundProductTag = product.tags.find(x => x.tag_id.toString() === tag.tag_id.toString())
        if (!foundProductTag)
          newTags.push(tag);
      })
    }
    else
      newTags = tags;

    if (newTags.length) {
      return models()['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate({
        _id: product._id,
      }, {
          $addToSet:
          {
            "tags": newTags,
          },

        }, {new: true}).lean()
    }

    return product;
  }

  async updateColorsForProduct(product, colorId, colorName, code) {

    const foundColor = product.colors && product.colors.length && product.colors.find(x => x.color_id.toString() === colorId.toString());
    if (!foundColor) {
      let query = {
        _id: product._id,
      },
        update = {
          $addToSet:
          {
            "colors": {
              "color_id": colorId,
              "name": colorName,
              "code": code,
            }
          },
        };
      product = await models()['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate(query, update, {new: true}).lean();
    }
    return product;

  }

  async updateInstancesForProduct(product, barcode, productColorId, size, price) {

    const foundInstance = product.instances && product.instances.length && product.instances.find(x => x.barcode === barcode);

    if (foundInstance) {

      product = await models()['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate({
        _id: product._id,
        "instances": {
          $elemMatch: {
            "barcode": barcode
          }
        },
      }, {
          $set: {
            'instances.$.product_color_id': productColorId,
            'instances.$.size': size,
            'instances.$.price': price,
          }
        }, {new: true}).lean()
    } else {

      product = await models()['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate({
        _id: product._id,
      }, {
          $addToSet:
          {
            "instances": {
              "product_color_id": productColorId,
              "size": size,
              "price": price > 0 ? price : 0,
              "barcode": barcode
            },
          }
        }, {new: true}).lean();


    }

    const orphanColorIds = [];
    product.colors.forEach(x => {
      const relativeInstance = product.instances.find(y => y.product_color_id.toString() === x._id.toString())
      if (!relativeInstance)
        orphanColorIds.push(x._id);
    });

    if (orphanColorIds.length)
      product = await models()['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate({
        _id: product._id,
      }, {
          $pull:
          {
            colors: {
              _id: {
                $in: orphanColorIds
              }
            },
          }
        }, {new: true}).lean();

    return product;
  }


  async updateInventoryForInstance(instance, isOverride, row) {
    let inventory = instance.inventory;
    this.warehouses.forEach(w => {
      let foundInventory = inventory.find(i => i.warehouse_id && w._id && i.warehouse_id.toString() === w._id.toString());
      let _count = Number.parseInt(row[w.name]);
      if (foundInventory) {
        if (isOverride)
          foundInventory.count = _count > 0 ? _count : 0;
        else
          foundInventory.count += (_count > 0 ? _count : 0);
        if (foundInventory.reserved >= 0 && foundInventory.count < foundInventory.reserved)
          throw error.invalidInventoryCount;
      } else {
        // if the inventory didn't already exist, override flag doesn't affect the count
        inventory.push({
          warehouse_id: w._id,
          count: _count > 0 ? _count : 0,
        });
      }
    });

  }

  async updateSoldOuts(product, instance, isSoldOut) {
    let totalProductCount = instance.inventory.map(i => i.count).reduce((a, b) => a + b, 0) || 0;

    const soldOut = new SoldOutModel(Upload.test);

    if (!this.soldOuts || !this.soldOuts.length) {
      this.soldOuts = await soldOut.getSoldOuts()
    }

    if (totalProductCount <= 0) {
      // count is 0, so must be added to soldout list (if not already)

      const foundSoldOut = this.soldOuts.find(x => x.product_id.toString() === product._id.toString() && x.product_instance_id.toString() === instance._id.toString());
      if (!foundSoldOut)
        await soldOut.insertProductInstance(product._id.toString(), instance._id.toString())

      if (isSoldOut) {
        instance.sold_out = true;
        return soldOut.setSoldOutFlagOnPI({
          productId: product._id,
          productInstanceId: instance._id,
          soldOutStatus: true
        });
      }
    } else {

      // remove from soldout list (if already exists)
      instance.sold_out = false;
      return soldOut.removeProductInstance(product._id.toString(), instance._id.toString())
    }
  };

  async updateInstance(product, instance) {
    let query = {
      _id: product._id,
      "instances.barcode": instance.barcode,
    },
      update = {
        $set:
        {
          "instances.$": instance,
        }
      };
    return models()['Product' + (Upload.test ? 'Test' : '')].update(query, update);

  }


  mapName(name, mapToExcelName) {
    let from, to;
    if (mapToExcelName) {
      from = 'dbName';
      to = 'excelName';
    }
    else {
      from = 'excelName';
      to = 'dbName';
    }
    return Object.values(Dictionary).find(x => x[from] === name)[to];
  }


}

Upload.test = false;
Upload.total = 0;
Upload.curIndex = 0;
Upload.isWorking = false;

module.exports = Upload;