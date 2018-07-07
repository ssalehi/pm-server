const models = require('./mongo/models.mongo');
const db = require('./mongo/index');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
const Jimp = require("jimp");
const jsonexport = require('jsonexport');
const dateTime = require('node-datetime');
const BASE_TEMP = './public/images/temp'
const BASE_DEST = './public/images/product-image'

let products;

let dbInfo = [];
let dirInfo = [];

main = async () => {

  await db.dbIsReady();

  try {

    const dirArticles = getDirInfo(BASE_TEMP).dirs;

    if (dirArticles && dirArticles.length) {
      dirArticles.forEach(article => {

        const newArticleInfo = {
          article,
          codes: []
        };

        dirInfo.push(newArticleInfo);

        const dirArticleCodes = getDirInfo(path.join(BASE_TEMP, article)).dirs;

        if (dirArticleCodes && dirArticleCodes.length) {
          dirArticleCodes.forEach(code => {

            const newCodeInfo = {
              no: code,
              images: [],
            }
            newArticleInfo.codes.push(newCodeInfo);
            const images = getDirInfo(path.join(BASE_TEMP, article, code)).files
            if (images && images.length) {
              images.forEach(image => {
                const parts = image.split('.');
                if (parts && parts.length > 1 && ['png', 'jpg', 'jpeg', 'tiff', 'gif', 'webp'].some(x => parts[1].toLowerCase() === x)) {
                  newCodeInfo.images.push(image);
                }
              })

            }

          });
        }
      })

      if (dirInfo && dirInfo.length) {

        products = await getProducts();

        if (products && products.length) {
          for (let i = 0; i < products.length; i++) {
            const product = products[i];

            let newDBArticleInfo = {
              no: product.article_no,
              codes: []
            };
            dbInfo.push(newDBArticleInfo);
            foundDir = dirInfo.find(info => product.article_no.includes(info.article));

            if (foundDir) {

              try {
                if (!fs.existsSync(path.join(BASE_DEST, product._id.toString()))) {
                  fs.mkdirSync(path.join(BASE_DEST, product._id.toString()));
                }


                for (let j = 0; j < product.colors.length; j++) {
                  const color = product.colors[j];

                  newDBArticleInfo.codes.push(color.code);
                  foundDirCode = foundDir.codes.find(code => code.no === color.code);
                  if (foundDirCode) {
                    try {

                      if (!fs.existsSync(path.join(BASE_DEST, product._id.toString(), color._id.toString()))) {
                        fs.mkdirSync(path.join(BASE_DEST, product._id.toString(), color._id.toString()));
                      }

                      for (let k = 0; k < foundDirCode.images.length; k++) {
                        const image = foundDirCode.images[k];
                        const imageOrig = path.join(BASE_TEMP, foundDir.article, foundDirCode.no, image);
                        const imageDest = path.join(BASE_DEST, product._id.toString(), color._id.toString(), image);

                        try {
                          if (k === 0) {
                            await imageResizing(imageOrig, imageDest)
                            fs.createReadStream(imageOrig).pipe(fs.createWriteStream(imageDest));
                            await updateProductImages(product._id, color._id, image, true);

                          } else {
                            fs.createReadStream(imageOrig).pipe(fs.createWriteStream(imageDest));
                            await updateProductImages(product._id, color._id, image, false);

                          }
                          console.log('-> ', `${image} is succesfuly added to path: ${path.join(product._id.toString(), color._id.toString())} ${k === 0 ? 'as thumbnail' : ''} `);
                        } catch (err) {
                          console.log('-> ', `error on copying file ${image} from temp folder to destination ${k === 0 ? 'as thumbnail' : ''}`);
                        }

                      }
                    }
                    catch (err) {
                      console.log('-> error on making new folder with color id as name', err);
                    }
                  }
                }

              } catch (err) {
                console.log('-> error in making new folder with product id as name', err);
              }
            }
          }
          makeReport();
        } else {
          console.log('-> ', 'there is no new product to import images for');

        }

      } else {
        console.log('-> ', 'there is no parsed info in temp folder');
      }

    } else {
      console.log('-> ', 'there is no info in temp folder');
    }

    process.exit();

  } catch (e) {
    console.log('-> ', e);
    process.exit();
  }
}


getDirInfo = (_path) => {
  try {
    const items = fs.readdirSync(_path);
    const result = {
      dirs: [],
      files: []
    };
    if (items && items.length) {
      items.forEach(item => {
        const itemPath = path.join(_path, item);
        try {
          fs.lstatSync(itemPath).isDirectory() ? result.dirs.push(item) : result.files.push(item);
        } catch (err) {
          console.log('-> ', err);
        }
      })
    }
    return result;
  }
  catch (error) {
    console.log('-> ', error);
    return null;
  }



}


makeReport = () => {

  const result = [];
  const dirArticles = new Set(dirInfo.map(x => x.article));
  const dbArticles = new Set(dbInfo.map(x => x.no));

  let intersecArticles = new Set(
    [...dirArticles].filter(x => dbArticles.has(x)));


  intersecArticles.forEach(articleNo => {

    let newJointArticle = {article: articleNo, status: 'joint', codes: []};
    result.push(newJointArticle);

    const dirArticleCodes = new Set(dirInfo.find(x => x.article === articleNo).codes.map(x => x.no));
    const dbArticleCodes = new Set(dbInfo.find(x => x.no === articleNo).codes);

    let intersectCodes = new Set(
      [...dirArticleCodes].filter(x => dbArticleCodes.has(x)));

    intersectCodes.forEach(code => {
      newJointArticle.codes.push({code, status: 'joint'})
    })

    let dirCodesDiff = new Set( // dir codes - db codes
      [...dirArticleCodes].filter(x => !dbArticleCodes.has(x)));

    let dbCodesDiff = new Set( // db codes - dir codes
      [...dbArticleCodes].filter(x => !dirArticleCodes.has(x)));

    dirArticleCodes.forEach(code => {
      newJointArticle.codes.push({code, status: 'only in DIR'})
    })

    dbArticleCodes.forEach(code => {
      newJointArticle.codes.push({code, status: 'only in DB'})
    })
  });

  let dirArticlesDiff = new Set( // dir articles - db articles
    [...dirArticles].filter(x => !dbArticles.has(x)));

  let dbArticlesDiff = new Set( // db articles - dir articles
    [...dbArticles].filter(x => !dirArticles.has(x)));

  dirArticlesDiff.forEach(article => {
    result.push({article, status: 'only in DIR'})
  })

  dbArticlesDiff.forEach(article => {
    result.push({article, status: 'only in DB'})
  })


  jsonexport(result, function (err, csv) {
    if (err) return console.log(err);

    if (!fs.existsSync('public/report')) {
      fs.mkdirSync('public/report');
    }

    const dt = dateTime.create();
    const formatted = dt.format('Y-m-d');
    fs.writeFileSync(path.join('public/report', `image-import-report-${formatted}.csv`), csv, 'utf8');

    console.log('-> ', 'report is generated !!!');

  });

  rimraf(BASE_TEMP, function () {
    console.log('-> ', 'temp folder removed succesfully !!!');
  });

}

updateProductImages = async (productId, colorId, image, isThumbnail) => {
  try {

    const query = {
      _id: mongoose.Types.ObjectId(productId),
      'colors._id': mongoose.Types.ObjectId(colorId),
    };

    if (isThumbnail) {
      return models['Product'].update(query, {
        $set: {
          'colors.$.image.thumbnail': image,
          'colors.$.images_imported': true
        }
      }, {multi: true});
    } else {
      return models['Product'].update(query, {
        $addToSet: {
          'colors.$.image.angles': image
        }

      });
    }

  }
  catch (err) {
    console.log('-> could not update product', err);
  }
}

getProducts = async () => {
  try {

    return models['Product'].aggregate([
      {
        $unwind: {
          path: '$colors',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          'colors.images_imported': false
        }
      },
      {
        $group: {
          _id: '$_id',
          article_no: {$first: '$article_no'},
          colors: {$push: '$colors'}
        }
      }

    ]);
  } catch (err) {
    console.log('-> could not get products', err);
  }
}


imageResizing = async (orig, dest) => {

  return new Promise((resolve, reject) => {

    Jimp.read(orig).then(function (lenna) {
      lenna.resize(144, 144)            // resize
        .write(dest); // save
      resolve();
    }).catch(function (err) {
      reject(err);
    });
  })


}



main();



