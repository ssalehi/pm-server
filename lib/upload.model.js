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
    let filename = '/media/fardabara/iQ/BOS/961114_Start/server/public/Original File.XLSX';
    let workbook = XLSX.readFile(filename);


    // let range = XLSX.utils.decode_range(workbook.Sheets[workbook.SheetNames[0]]['!ref']);
    // let sheet = workbook.Sheets[workbook.SheetNames[0]];
    // let column = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `Q1:AA${range.e.r}`;
    // let column2 = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `Q2:Q${range.e.r}`;
    // let column3 = workbook.Sheets[workbook.SheetNames[0]]['!ref'] = `R2:R${range.e.r}`;
    // let header = {header:'A'};
    // let newObj = XLSX.utils.sheet_to_json(sheet, column2, column3);
    // console.log(newObj.map(q => Object.values(q)[0]).filter((elem, pos, arr) => arr.indexOf(elem) === pos));


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




  }


}

Upload.test = false;

module.exports = Upload;