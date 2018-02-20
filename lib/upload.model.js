const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');
if (typeof require !== 'undefined') XLSX = require('xlsx');
const path = require('path');
class Upload extends Base {

  constructor() {
    super();
  }

  excel(body) {
    let filename = '/media/fardabara/iQ/BOS/961114_Start/server/public/test.XLSX';
    let workbook = XLSX.readFile(filename);


    // let range = XLSX.utils.decode_range(workbook.Sheets[workbook.SheetNames[0]]['!ref']);
    // let sheet = workbook.Sheets[workbook.SheetNames[0]];
    // let column = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `Q1:AA${range.e.r}`;
    // let column2 = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `Q2:Q${range.e.r}`;
    // let column3 = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `R2:R${range.e.r}`;
    // let header = {header:'A'};
    // let newObj = XLSX.utils.sheet_to_json(sheet, column2, column3);
    // console.log(newObj.map(q => Object.values(q)[0]).filter((elem, pos, arr) => arr.indexOf(elem) === pos));

    /*
     function sheetToColumns(params, callBack) {
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
     // console.log("@@",JSON.stringify(tagGroups,null,2));
     // console.log("##",tagGroups[tagGroup]);
     // console.log(Object.values(tagGroups[tagGroup]));
     // console.log("@@", Object.values(tagGroups[tagGroup])[0]);

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
     tags.push(tag)
     });
     models['TagTest'].insertMany(tags);
     });
     }
     */


    // Part of two, for insert product
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let range = XLSX.utils.decode_range(workbook.Sheets[workbook.SheetNames[0]]['!ref']);
    let column = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `J0:O${range.e.r}`;
    let sheetToJson = XLSX.utils.sheet_to_json(sheet, column);
    let products = [];
    sheetToJson.map(p => {
      let product = {};
      product['Article_text'] = Object.values(p)[0];
      product['Size'] = Object.values(p)[1];
      product['Qty'] = Object.values(p)[2];
      product['ORP'] = Object.values(p)[3];
      product['UOM'] = Object.values(p)[4];
      product['Colors'] = typeof Object.values(p)[5] === 'undefined' ? [] : Object.values(p)[5].split('/');
      products.push(product);
    });

    products = products.slice(2, products.length).forEach((product, index) => {
      models['ProductTest'].update(
        {
          name: product.Article_text,
          'instances.price': product.price,
        },
        {
          brand: mongoose.Types.ObjectId(),
          product_type: mongoose.Types.ObjectId(),
          $set: {
            'instances': {
              product_color_id: mongoose.Types.ObjectId(),
              price: product.price,
              size: product.size
            },
          },
        }, {upsert: true}).then(res => {
        console.log(res);
      });
    });

    // products.slice(2, products.length).forEach((item, index) => {
    //   models['ProductTest'].update({name: item.Article_text}, {
    //     $set: {
    //       product_type: mongoose.Types.ObjectId(),
    //       brand: resBrand._id,
    //       base_price: Number(item.ORP),
    //     }
    //   }, {upsert: true}).then(res => {
    //     console.log(res);
    //   });
    // });


  }


}

Upload.test = false;

module.exports = Upload;