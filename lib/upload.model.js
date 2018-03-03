const Base = require('./base.model');
const error = require('./errors.list');
const models = require('../mongo/models.mongo');
const XLSX = require('xlsx');

tagGroupNames = [
  'Sub Division',
  'Category',
  'Gender',
  'Season',
  'Season Year',
  'Silhouette',
  'Sub silhouette 2'
];

unknownColor = 'unknown';

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
    let workbook = XLSX.readFile(filename);
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let data = XLSX.utils.sheet_to_json(sheet);


    let results = {
      brands: null,
      types: null,
      tagGroups: null,
      tags: null,
      colors: null
    };


    return this.insertBrands()
      .then(res => {

        results.brands = res.toObject();

        let types = Array.from(new Set(data.map(r => r['Division']))).map(x => {
          return {
            name: x
          }
        });

        return this.safeInsert(types, 'ProductType');

      }).then(res => {

        results.types = res;

        let tagGroups = tagGroupNames.map(x => {
          return {
            name: x,
            is_required: false
          }
        });
        return this.safeInsert(tagGroups, 'TagGroup');

      }).then(res => {

        results.tagGroups = res;

        let addTag = (name) => {
          let tgId = results.tagGroups.filter(x => x.name === name)[0]._id;
          let t = Array.from(new Set(data.map(r => r[name])));
          return t.map(x => {
            return {
              name: x,
              tag_group_id: tgId
            }
          });

        };
        let tags = [];
        tagGroupNames.forEach(x => tags.push(addTag(x)));
        return this.safeInsert([].concat.apply([], tags), 'Tag');

      }).then(res => {

        results.tags = res;

        let color_names = data.map(r => r['Color Description'] || unknownColor); // some products have no color description in excel file
        let colors_ids = data.map(r => r['Generic Article No'].split('-')[1] || '-'); // some products have no color id in article number in excel file

        let arrColors = [];

        color_names.forEach((name, i) => {
          arrColors.push({
            name: name,
            color_id: colors_ids[i]
          })
        });

        let colors = Array.from(new Set(arrColors));

        return this.safeInsert(colors, 'Color');

      }).then(res => {

        results.colors = res;

        let makeProduct = row => {

          let brandId = results.brands._id;
          let typeId = results.types.filter(x => x.name === row['Division'])[0]._id;
          let colorName = row['Color Description'] || unknownColor;
          let colorId = results.colors.filter(x => x.name === colorName)[0]._id;
          let tagIds = [];
          let productId;

          let query = {name: row['Generic article text']},
            update = {
              $set:
                {
                  "name": row['Generic article text'],
                  "product_type": typeId,
                  "brand": brandId,
                  "base_price": 0,
                }
            },
            options = {upsert: true, new: true};
          return models['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate(query, update, options)
            .then(res => {
              res = res.toObject();
              productId = res._id;

              let findTagId = tagGroupName => {
                let tgId = results.tagGroups.filter(x => x.name === tagGroupName)[0]._id;
                return results.tags.filter(x => x.name === row[tagGroupName] && x.tag_group_id.equals(tgId))[0]._id;

              };
              tagGroupNames.forEach(name => tagIds.push(findTagId(name)));
              let query = {_id: res._id},
                update = {
                  $addToSet:
                    {
                      "tags": {$each: tagIds},
                    },

                };
              return models['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate(query, update, {new: true})
            })
            .then(res => {
              let query = {
                  _id: productId,
                  "colors": {
                    "$not": {
                      "$elemMatch": {
                        "color_id": colorId
                      }
                    }
                  }
                },
                update = {
                  $addToSet:
                    {
                      "colors": {
                        "color_id": colorId,
                        "images": [],
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

              console.log('-> ', productId);
              res = res.toObject();
              let productColorId = res.colors.filter(x => x.color_id.equals(colorId))[0]._id;
              let query = {_id: productId},
                update = {
                  $addToSet:
                    {
                      "instances": {
                        "product_color_id": productColorId,
                        "size": row['Size'] || 'Unknown',
                        "price": 0,
                        "barcode": row['BarCode']
                      },
                    }
                };
              return models['Product' + (Upload.test ? 'Test' : '')].findOneAndUpdate(query, update)
            })
        };

        return data.map(row => () => makeProduct(row)).reduce((x, y) => x.then(y), Promise.resolve());
      })


  }

  insertBrands() {

    let query = {name: 'Nike'},
      update = {
        name: 'Nike',
      },
      options = {upsert: true, new: true};
    return models['Brand' + (Upload.test ? 'Test' : '')].findOneAndUpdate(query, update, options);
  }


  safeInsert(data, modelName, reverseKey = 'name') {
    return models[modelName + (Upload.test ? 'Test' : '')].insertMany(data,  {ordered: false}) // use ordered false to add remaining records if current insertion failed due to duplication
      .then(res => {
        return Promise.resolve(res.map(x => x.toObject()))
      })
      .catch(err => {
        if (err.name === 'BulkWriteError') {

          const query ={};
          query[reverseKey] = {"$in": data.map(x => x[reverseKey])};
          return models[modelName + (Upload.test ? 'Test' : '')].find(query).lean();
        } else
          return Promise.reject(err)

      })


  }


}

Upload.test = false;

module.exports = Upload;