const _const = require('./lib/const.list');
const models = require('./mongo/models.mongo');
const db = require('./mongo/index');
var ColorModel = require('./lib/color.model');
const copydir = require('copy-dir');
const env = require('./env');
var converter = require('css-color-converter');
const Dictionary = require('./lib/dictionary.model')

let main = async () => {
  await db.dbIsReady()


  let res = await models()['Color'].find().lean();
  console.log(res);

  let a = [];
  res.forEach(element => {

    cName = element.name
    a.push(safeColorConverter(cName))
  });

  
  Promise.all(a).then(res => {
    process.exit(0);

  });


}


const colorConverter = function (cName) {
  return converter(cName.toLowerCase()).toHexString();
};

const safeColorConverter = function (cName) {
  if (cName) {
    let words = cName.split(' ');
    for (let i = 0; i < words.length; i++) {
      try {
        let cc = colorConverter(words[i]);
        console.log('here is the conv', cc);
        return Promise.resolve(cc);

      } catch (e) {
    
        body = {
          name: cName,
          value: 'SetPlease',
          type: 'color'
        }
          return new Dictionary().addDictionary(this.body)
      }
    }
  }

  

};

main()