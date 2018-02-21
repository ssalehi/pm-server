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
    let filename = '/media/fardabara/iQ/BOS/961114_Start/server/public/test.XLSX';
    let workbook = XLSX.readFile(filename);

    // TODO Implementation
    /***********************************/
    let createOrUpdateProduct = (product, brandId, productTypes, cb) => {
      // console.log(product);
      // console.log("brandId", brandId);
      // console.log("productTypes", productTypes);
      let productTypeId = productTypes.find(p => {
        if (p.name === product.division) {
          return p.id;
        }
      });
      // console.log(product);

      // models['Product'].create({
      //   name: product.name,
      //   brand: mongoose.Types.ObjectId(brandId),
      //   product_type: productTypeId,
      //   base_price: 145,
      // }).then(res => {
      //
      // }).catch(err => {
      //   console.log("an error happen:", err);
      // });

      cb();
    };
    /***********************************/
    let createColors = (array, cb) => {
      let colors = [];
      array.forEach((item, index) => {
        console.log(item);
        item.color_code = item.color_code && item.color_code || 999;
        item.color_description = item.color_description && item.color_description || 'test/color/test';
        models['Color'].findOneAndUpdate({
          name: item.color_description,
          color_id: item.color_code,
        }, {$set: {name: item.color_description, color_id: item.color_code}}, {upsert: true, 'new': true}).then(res => {
          console.log(res);
          colors.push({id: res._id, color_description: res.name});
          console.log(colors);
          if (index + 2 <= array.length) {
            cb(colors);
          }
        });
      });
    };
    /***********************************/

    let createBrand = (name, cb) => {
      models['Brand'].findOneAndUpdate({name: name}, {$set: {name: name}}, {upsert: true, 'new': true}).then(res => {
        cb(res._id);
      });
    };
    /***********************************/
    let createProductTypes = (array, cb) => {
      let newArr = array.map(p => Object.values(p)[7]).filter((elem, pos, arr) => {
        if (elem !== undefined) return arr.indexOf(elem) === pos;
      });
      let productTypes = [];
      newArr.forEach((item, index) => {
        models['ProductType'].findOneAndUpdate({name: item},
          {$set: {name: item}}, {upsert: true, 'new': true})
          .then(res => {
            productTypes.push({id: res._id, name: res.name});
            if (index + 2 >= array.length) {
              cb(productTypes);
            }
          });
      });

    };
    /***********************************/
    let renameObject = (array, cb) => {
      let objArr = [];
      for (let item in array) {
        let objJson = {};
        objJson['color_code'] = Object.values(array[item])[0].split('-')[1] && Object.values(array[item])[0].split('-')[1] || '000';
        objJson['product_name'] = Object.values(array[item])[1];
        objJson['size'] = Object.values(array[item])[2];
        objJson['qty'] = Object.values(array[item])[3];
        objJson['price'] = Object.values(array[item])[4];
        objJson['uom'] = Object.values(array[item])[5];
        objJson['color_description'] = Object.values(array[item])[6];
        objJson['division'] = Object.values(array[item])[7];
        objArr.push(objJson);
      }
      cb(objArr);
    };
    // TODO Start With new Approaches
    workbook.SheetNames.forEach(sheetName => {
      let sheet = workbook.Sheets[sheetName];
      let range = XLSX.utils.decode_range(sheet['!ref']);
      let column = sheet['!ref'] = `I2:P${range.e.r}`;
      let sheetToJson = XLSX.utils.sheet_to_json(sheet, column);
      // column (I-->P) as Json
      renameObject(sheetToJson, (renameObjectResult) => {
        console.log("renameObjectResult", renameObjectResult);
        createBrand('Nike', (brandResult) => {
          createColors(renameObjectResult, (colorResult) => {
            console.log("colorResult@@", colorResult);
            // createProductTypes(renameObjectResult, (productTypeResult) => {
            //   renameObjectResult.forEach((object) => {
            //     createOrUpdateProduct(object, brandResult, productTypeResult, () => {
            //
            //     });
            //   });
            // });
          });
        });
      });
    });

    // TODO Learn about decode_range or get sheet from excel or change sheet to json
    // let range = XLSX.utils.decode_range(workbook.Sheets[workbook.SheetNames[0]]['!ref']);
    // let sheet = workbook.Sheets[workbook.SheetNames[0]];
    // let column = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `Q1:AA${range.e.r}`;
    // let column2 = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `Q2:Q${range.e.r}`;
    // let column3 = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `R2:R${range.e.r}`;
    // let header = {header:'A'};
    // let newObj = XLSX.utils.sheet_to_json(sheet, column2, column3);
    // console.log(newObj.map(q => Object.values(q)[0]).filter((elem, pos, arr) => arr.indexOf(elem) === pos));


    // TODO get tagGroup and tags and Insert In Database Model
    /* function sheetToColumns(params, callBack) {
     params.columns.forEach(column => {
     workbook.SheetNames.forEach(sheetName => {
     let sheet = workbook.Sheets[sheetName];
     let range = XLSX.utils.decode_range(sheet['!ref']);
     let columnRes = sheet['!ref'] = `${column + params.start}:${column + range.e.r}`;
     let result = XLSX.utils.sheet_to_json(sheet, columnRes)
     .map(p => Object.values(p)[0])
     .filter((element, position, array) => array.indexOf(element) === position);
     callBack(result);
     });
     });
     }

     let params = {
     columns: ['Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'AA'],
     start: 1,
     };


     let tagGroups = [];
     sheetToColumns(params, (result) => {
     let tagObj = {};
     tagObj[result[0]] = result.slice(1, result.length);
     tagGroups.push(tagObj);
     });


     for (let tagGroup in tagGroups) {
     models['TagGroupTest'].create({
     name: Object.keys(tagGroups[tagGroup])[0],
     required: !!Math.floor(Math.random() * 2)
     }).then(res => {
     let tags = [];
     Object.values(tagGroups[tagGroup])[0].forEach((item, index) => {
     let tag = {
     name: item,
     tag_group_id: res._id
     };
     tags.push(tag);
     });
     models['TagTest'].insertMany(tags);
     });
     } */

    // TODO define sheet and range of decode
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let range = XLSX.utils.decode_range(workbook.Sheets[workbook.SheetNames[0]]['!ref']);

    // TODO get division column and then insert product_type
    let columnDivision = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `P0:P${range.e.r}`;
    let sheetToJsonDivision = XLSX.utils.sheet_to_json(sheet, columnDivision);
    let DivisionResult = sheetToJsonDivision.map(d => Object.values(d)[0]).filter((element, position, array) => array.indexOf(element) === position);
    // console.log(DivisionResult);


    // TODO function implementation
    // let productUpdate = function (product, callBack) {
    //   callBack();
    // };
    // let productCreate = function (product, callBack) {
    //   callBack();
    // };

    // INSERT Brand
    /* models['Brand'].findOneAndUpdate({
     name: 'Nike'
     }, {$set: {name: 'Nike'}}, {upsert: true, 'new': true}).then(brandRes => {

     DivisionResult.slice(1, DivisionResult.length).forEach(division => {
     models['ProductType'].update({
     name: division
     }, {name: division}, {upsert: true}).then(productTypeRes => {

     // TODO get column need for insert product
     let column = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `J0:P${range.e.r}`;
     let sheetToJson = XLSX.utils.sheet_to_json(sheet, column);
     let products = [];
     sheetToJson.map(p => {
     let product = {};
     product['Article_text'] = Object.values(p)[0];
     product['Size'] = Object.values(p)[1];
     product['Qty'] = Object.values(p)[2];
     product['ORP'] = Object.values(p)[3];
     product['Price'] = Object.values(p)[4];
     product['Colors'] = typeof Object.values(p)[5] === 'undefined' ? '' : Object.values(p)[5];
     product['Product_Type'] = Object.values(p)[6] && Object.values(p)[6] || null;
     products.push(product);
     return p;
     }).filter((element, position, array) => array.indexOf(element) === position);

     // loop in products for insert, start from 2 <--> because sheet start from row 1
     products.slice(2, products.length).forEach((product, index) => {
     models['ProductType'].findOne({name: product.Product_Type}, {_id: 1}).then(ProductTypeRes => {

     // first find product
     models['Product'].findOne({name: product.Article_text}).then(ProductFindRes => {
     if (!ProductFindRes) {
     // // // insert product
     models['Product'].create({
     name: product.Article_text,
     brand: brandRes._id,
     product_type: ProductTypeRes && ProductTypeRes._id || mongoose.Types.ObjectId(),
     base_price: 1000
     }).then(productRes => {
     console.log("@@-->ProductRes", productRes);
     }).catch(error => {
     console.log('an error', error);
     });

     } else {


     }
     }).catch(error => {
     console.log('an error', error);
     });


     }).catch(error => {
     console.log('an error', error);
     });
     });

     }).catch(error => {
     console.log('an error', error);
     });
     });
     }).catch(error => {
     console.log('an error', error);
     });*/


  }


}

Upload.test = false;

module.exports = Upload;