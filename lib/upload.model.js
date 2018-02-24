const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');
if (typeof require !== 'undefined') XLSX = require('xlsx');
const path = require('path');
const _ = require('lodash');
class Upload extends Base {

  constructor() {
    super();
  }


  excel(body) {

    /******************/
    function createTags(array) {
      return new Promise((resolve, reject) => {
        let promiseList = [];
        let dataList = {};
        array.forEach(item => {
          Object.keys(item).forEach(key => {
            if (!dataList.hasOwnProperty(key))
              dataList[key] = [];
            if (!dataList[key].includes(item[key]))
              dataList[key].push(item[key]);
          });
        });
        Object.keys(dataList).forEach((key) => {
          promiseList.push(models['TagGroup'].findOneAndUpdate({
            name: key,
          }, {$set: {name: key}}, {upsert: true, 'new': true}).then(group => {
            let innerPromiseList = [];
            dataList[key].forEach(value => {
              innerPromiseList.push(models['Tag'].findOneAndUpdate({
                tag_group_id: group._id,
                name: value
              }, {$set: {name: value, tag_group_id: group._id}}, {upsert: true, 'new': true}));
            });
            return Promise.all(innerPromiseList);
          }));
        });

        Promise.all(promiseList)
          .then(res => {
            resolve(res);
          })
          .catch(err => {
            console.error('ERROR: ', err);
            reject(err);
          });
      });
    }

    /***************************/
    function createColors(array) {
      return new Promise((resolve, reject) => {
        let promiseList = [];
        array.forEach((item) => {
          promiseList.push(
            models['Color'].findOneAndUpdate({name: item.color_description, color_id: item.color_code}, {
              $set: {
                name: item.color_description,
                color_id: item.color_code
              }
            }, {upsert: true, 'new': true}));
        });

        Promise.all(promiseList)
          .then(res => {
            let colors = [];
            res.forEach(el => {
              const index = colors.findIndex(item => item.color_code === el.color_id);
              if (index === -1)
                colors.push({id: el._id, color_description: el.name, color_code: el.color_id});
            });
            resolve(colors);
          })
          .catch(err => {
            reject(err);
          });
      });
    }

    /******************************/
    function renameObject(array) {
      let promiseList = [];
      return new Promise((resolve, reject) => {
        for (let item in array) {
          let objJson = {};
          let itemsRename = ['color_code', 'product_name', 'size', 'qty', 'price', 'uom', 'color_description', 'product_type', 'tags'];
          itemsRename.forEach((el, i) => {
            if (i === 0) {
              objJson[el] = Object.values(array[item])[i].split('-')[1];
            } else if (i === 8) {
              let innerArr = Object.values(array[item]);
              let arr = [];
              innerArr.slice(6, innerArr.length).forEach(inner_el => {
                arr.push(inner_el);
              });
              objJson[el] = arr;
            } else {
              objJson[el] = Object.values(array[item])[i];
            }
          });
          promiseList.push(objJson);
        }
        Promise.all(promiseList).then(res => {
          resolve(res);
        }).catch(err => {
          reject(err);
        });
      });
    }

    /*******************************/
    function createProductTypes(array) {
      return new Promise((resolve, reject) => {
        let newArr = array.map(p => Object.values(p)[7]).filter((elem, pos, arr) => {
          if (elem !== undefined) return arr.indexOf(elem) === pos;
        });
        let promiseList = [];
        newArr.forEach((item, index) => {
          promiseList.push(models['ProductType'].findOneAndUpdate({name: item},
            {$set: {name: item}}, {upsert: true, 'new': true}));
        });
        Promise.all(promiseList).then(res => {
          resolve(res);
        }).catch(err => {
          reject(err);
        });
      });

    }

    /*******************************/
    // { color_code: '043',
    //   product_name: 'Y CR7 NK FB BKPK',
    //   size: 'MISC',
    //   qty: '18',
    //   price: '199.00',
    //   uom: 'ST',
    //   color_description: 'PURE PLATINUM/BLACK/BLACK',
    //   product_type: 'ACCESSORIES',
    //   tags:
    //   [ 'PURE PLATINUM/BLACK/BLACK',
    //     'ACCESSORIES',
    //     'BACKPACK',
    //     'FOOTBALL/SOCCER',
    //     'FOOTBALL/SOCCER',
    //     'MENS',
    //     'HOLI',
    //     '2017',
    //     'ACC+FTB+FTB+M',
    //     'BAGS',
    //     'BACKPACK' ] }
    function createProduct(array) {
      // Warehouse
      // models['Warehouse'].findOneAndUpdate({name: 'Nike'}, {name: 'Nike'}, {upsert: true, 'new': true}).then(brandId => {
      // brand
      models['Brand'].findOneAndUpdate({name: 'Nike'}, {name: 'Nike'}, {upsert: true, 'new': true}).then(brandId => {

        array.forEach((product, index) => {
          //color

          let _color, _pColor, _pType;
          return models['Color'].findOneAndUpdate({
            name: product.color_description,
            color_id: product.color_code
          }, {
            name: product.color_description,
            color_id: product.color_code
          }, {upsert: true, 'new': true})
            .then(color => {
              _color = color;
              //product color
              return models['ProductColor'].findOneAndUpdate({
                  color_id: color._id
                },
                {color_id: color._id},
                {upsert: true, 'new': true});
            })
            .then(pColor => {
              _pColor = pColor;
              //product types
              return models['ProductType'].findOneAndUpdate({
                  name: product.product_type
                },
                {name: product.product_type},
                {upsert: true, 'new': true});
            })
            .then(pType => {
              _pType = pType;

              let promises = [];
              //tags
              product.tags.forEach(tag => {
                promises.push(models['Tag'].findOneAndUpdate({name: tag}, {name: tag}, {
                  upsert: true,
                  'new': true
                }));

              });
              return Promise.all(promises);
            })
            .then(tags => {

              let promises = [];
              tags.forEach(tag => {
                models['Product'].find({
                  name: product.product_name,
                  product_type: _pType._id,
                  'instances.product_color_id': _color._id
                }).then(res => {
                    if (!res || res.length === 0) {

                      console.log('add new product ');
                      models['Product'].findOneAndUpdate({
                          name: product.product_name,
                          product_type: _pType._id,
                        }
                        ,
                        {
                          $set: {
                            name: product.product_name,
                            product_type: _pType._id,
                            base_price: product.price && Number(product.price) || 0,
                            brand: brandId._id,
                          },
                          $addToSet: {

                            'instances': {
                              product_color_id: _color._id,
                              price: product.price,
                              size: Number.parseInt(product.uom) || 20,
                              inventory: {
                                warehouse_id: mongoose.Types.ObjectId(),
                                count: product.qty && Number(product.qty) || 1
                              }
                            }
                          },
                          $push: {'tags': tag._id}
                        },
                        {
                          upsert: true,
                          new: true
                        }
                      ).then(res => {
                        console.log(res);
                      });

                    }
                  }
                );

              });

            });

        });

      });
    }


    /*******************************/

    let filename = '/home/fardabara/Desktop/limited.XLSX';
    let workbook = XLSX.readFile(filename);
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let range = XLSX.utils.decode_range(sheet['!ref']);
    let columnP = sheet['!ref'] = `I2:Y${range.e.r}`;
    let sheetJsonP = XLSX.utils.sheet_to_json(sheet, columnP);
    let columnT = sheet['!ref'] = `Q2:AA${range.e.r}`;
    let sheetJsonT = XLSX.utils.sheet_to_json(sheet, columnT);

    /* Tags and TagGroup */
    renameObject(sheetJsonP).then(jsonConvertResult => {
      createTags(sheetJsonT).then(() => {
        createColors(jsonConvertResult).then(() => {
          createProduct(jsonConvertResult);
        });
      });
    });


  }


}

Upload.test = false;

module.exports = Upload;