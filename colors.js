
const _const = require('./lib/const.list');
const models = require('./mongo/models.mongo');
const db = require('./mongo/index');
var ColorModel = require('./lib/color.model');
const copydir = require('copy-dir');
const env = require('./env');
var converter = require('css-color-converter');


db.dbIsReady()
  
  .then(() => {

    copydir.sync('assets', 'public/assets');
    return models()['ColorModel'].find().lean();
  }).then(res=> {
     res.forEach(element => {
     cName=element.name
     safeColorConverter(cName)
     })
   }) //then end
 
        
   
   
   const colorConverter = function(cName) {
      return converter(cName.toLowerCase()).toHexString();
    };
    const safeColorConverter = function(cName) {
      if (cName) {
      let words = cName.split(' ');
      for (let i =0; i < words.length; i ++ ) {
        try {
            let cc = colorConverter(words[i]);
            console.log(cc);
            return cc;

          }  catch (e) {}
        }
      }
      return null;
    };
   
   
   
   
   
   
   
   
   
   


   
   




