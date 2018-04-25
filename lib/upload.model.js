const Base = require('./base.model');
const error = require('./errors.list');
const models = require('../mongo/models.mongo');
const xlsx = require('xlsx');
const WarehouseModel = require('./warehouse.model');


Dictionary = {

  Brand: {excelName: 'Brand'},
  Size: {excelName: 'Size'},
  Price: {excelName: 'Price'},
  BarCode: {excelName: 'BarCode'},
  GenericArticleText: {excelName: 'Generic article text'},
  GenericArticleNo: {excelName: 'Generic Article No'},
  ColorDescription: {excelName: 'Color Description'},
  Desc: {excelName: 'Desc'},

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

class Upload extends Base {


  constructor(test = Upload.test) {
    Upload.test = test;
    super(test);
  }


  excel(file) {

    if (!file) {
      return Promise.reject(error.excelFileRequired);
    }

    let filename = file.path;
    let workbook = xlsx.readFile(filename);
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let data = xlsx.utils.sheet_to_json(sheet);


    let results = {
      brands: null,
      types: null,
      tagGroups: null,
      tags: null,
      colors: null
    };

    let brands = Array.from(new Set(data.map(r => r[Dictionary.Brand.excelName]))).map(x => {
      return {
        name: x || unknownBrand
      }
    });

    return this.safeInsert(brands, 'Brand')

      .then(res => {

        results.brands = res;

        let types = Array.from(new Set(data.map(r => r[Dictionary.Division.excelName]))).map(x => {
          return {
            name: x ? x : unknownType
          }
        });

        return this.safeInsert(types, 'ProductType');

      }).then(res => {

        results.types = res;

        let tagGroups = tagGroupNames.map(x => {
          return {
            name: x ? x : unknownTagGroup,
            is_required: false
          }
        });
        return this.safeInsert(tagGroups, 'TagGroup');

      }).then(res => {

        results.tagGroups = res;

        let addTag = (name) => {
          let tgId = results.tagGroups.filter(x => x.name === name)[0]._id;

          // get appropriate excel name from dictionary respected to db tag group name
          let t = Array.from(new Set(data.map(r => r[this.mapName(name, true)])));
          return t.map(x => {
            return {
              name: x ? x : unknownTag,
              tag_group_id: tgId
            }
          });

        };
        let tags = [];
        tagGroupNames.forEach(x => tags.push(addTag(x)));
        return this.safeInsert([].concat.apply([], tags), 'Tag');

      }).then(res => {

        results.tags = res;

        let color_names = Array.from(new Set(data.map(x => {
          return {name: x[Dictionary.ColorDescription.excelName] || unknownColor} // some products have no color description in excel file
        })));

        let colors = Array.from(new Set(color_names));

        return this.safeInsert(colors, 'Color');

      })
      .then(res => {

        results.colors = res;

        return new WarehouseModel(Upload.test).getAllWarehouses();
      })
      .then(res => {

          let warehouses = res;
          let makeProduct = row => {

            let brand = (row[Dictionary.Brand.excelName] && row[Dictionary.Brand.excelName] !== '') ? row[Dictionary.Brand.excelName] : unknownType;
            let type = (row[Dictionary.Division.excelName] && row[Dictionary.Division.excelName] !== '') ? row[Dictionary.Division.excelName] : unknownType;
            let desc = (row[Dictionary.Desc.excelName] && row[Dictionary.Desc.excelName] !== '') ? row[Dictionary.Desc.excelName] : unknownDesc;
            let brandId = results.brands.find(x => x.name === brand)._id;
            let typeId = results.types.find(x => x.name === type)._id;
            let colorName = row[Dictionary.ColorDescription.excelName] || unknownColor;

            let c = row[Dictionary.GenericArticleNo.excelName].split('-');
            let code = c.length > 1 ? c[1] : unknownColorCode;
            let colorId = results.colors.find(x => x.name === colorName)._id;
            let tags = [];
            let productId;

            let name = row[`${Dictionary.GenericArticleText.excelName}_fa`] || row[Dictionary.GenericArticleText.excelName];
            let price = Number.parseInt(row[Dictionary.Price.excelName]) > 0 ? Number.parseInt(row[Dictionary.Price.excelName]) : 0;

            let query = {
                name,
                'brand.brand_id': brandId,
                'product_type.product_type_id': typeId
              },
              update = {
                $set:
                  {
                    "name": name,
                    "product_type": {name: type, product_type_id: typeId},
                    "brand": {name: brand, brand_id: brandId},
                    "date": new Date(),
                    "base_price": price,
                    "desc": desc
                  }
              },
              options = {upsert: true, new: true};
            return models['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate(query, update, options).lean()
              .then(res => {

                productId = res._id;

                let findTagId = tagGroupName => {
                  let tgId = results.tagGroups.find(x => x.name === tagGroupName)._id;

                  let tag = results.tags.find(x => x.name === row[this.mapName(tagGroupName, true)] && x.tag_group_id.equals(tgId));
                  return tag._id;

                };
                tagGroupNames.forEach(tg_name => tags.push({
                  tg_name,
                  name: row[this.mapName(tg_name, true)],
                  tag_id: findTagId(tg_name)
                }));

                let promises = [];
                let addTag = (tag) => {
                  let query = {
                      _id: productId,
                      "tags": {
                        "$not": {
                          "$elemMatch": {
                            "tag_id": tag.tag_id
                          }
                        }
                      }
                    },
                    update = {
                      $addToSet:
                        {
                          "tags": tag,
                        },

                    };
                  return models['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate(query, update, {new: true})

                };

                tags.forEach(x => {
                  promises.push(addTag(x));
                });

                return Promise.all(promises);

              })
              .then(res => {
                let query = {
                    _id: productId,
                    "colors.color_id": {$ne: colorId}
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
                return models['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate(query, update, {new: true})
              })
              .then(res => {

                if (!res) // if this color object currently exists in colors array the result of prev query would be null
                  return models['Product' + (Upload.test ? 'Test' : '')].findOne({_id: productId});
                else
                  return Promise.resolve(res);
              })
              .then(res => {

                console.log('-> ', productId.toString());

                res = res.toObject();
                let productColorId = res.colors.find(x => x.color_id.toString() === colorId.toString())._id;

                let query = {
                    _id: productId,
                    "instances": {
                      $not: {
                        $elemMatch: {
                          "barcode": row[Dictionary.BarCode.excelName] || unknownBarcode,
                          "size": row[Dictionary.Size.excelName] || unknownSize
                        }
                      }
                    },
                  },
                  update = {
                    $addToSet:
                      {
                        "instances": {
                          "product_color_id": productColorId,
                          "size": row[Dictionary.Size.excelName] || unknownSize,
                          "price": price > 0 ? price : 0,
                          "barcode": row[Dictionary.BarCode.excelName],
                        },
                      }
                  };
                return models['Product' + (Upload.test ? 'Test' : '')].update(query, update).lean()
              })
              .then(res => {
                // query for product again to get all updated instances
                return models['Product' + (Upload.test ? 'Test' : '')].findById(productId).lean()
              })
              .then(res => {

                let setInstanceInventory = (instance) => {

                  let inventory = instance.inventory;

                  warehouses.forEach(w => {
                    let foundInventory = inventory.find(i => i.warehouse_id.toString() === w._id.toString());
                    let _count = Number.parseInt(row[w.name]);
                    if (foundInventory) {
                      foundInventory.count = _count > 0 ? _count : 0;
                    } else {
                      inventory.push({
                        warehouse_id: w._id,
                        count: _count > 0 ? _count : 0,
                      })
                    }
                  });

                };

                let foundInstance = res.instances.find(x => x.barcode === row[Dictionary.BarCode.excelName]);
                setInstanceInventory(foundInstance);


                let query = {
                    _id: productId,
                    "instances.barcode": row[Dictionary.BarCode.excelName],
                  },
                  update = {
                    $set:
                      {
                        "instances.$": foundInstance,
                      }
                  };
                return models['Product' + (Upload.test ? 'Test' : '')].update(query, update)


              })
          };

          return data.map(row => () => makeProduct(row)).reduce((x, y) => x.then(y), Promise.resolve());
        }
      )


  }


  safeInsert(data, modelName, reverseKey = 'name') {
    return models[modelName + (Upload.test ? 'Test' : '')].insertMany(data, {ordered: false}) // use ordered false to add remaining records if current insertion failed due to duplication
      .then(res => {
        return Promise.resolve(res.map(x => x.toObject()))
      })
      .catch(err => {
        if (err.name === 'BulkWriteError') {

          const query = {};
          query[reverseKey] = {"$in": data.map(x => x[reverseKey])};
          return models[modelName + (Upload.test ? 'Test' : '')].find(query).lean();
        } else
          return Promise.reject(err)

      })
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

module.exports = Upload;