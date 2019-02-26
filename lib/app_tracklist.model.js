const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');
const rmPromise = require('rimraf-promise');
const env = require('../env');
const path = require('path');

class AppTracklist extends Base {

  constructor(test = AppTracklist.test) {

    super('AppTracklist', test);

    this.AppTracklistModel = this.model;
  }

  /*
   *  fileData data of uploaded file.
   * @returns {Promise.<*>}
   */
  addTrack(artistName, trackName, fileData) {
    if (!artistName)
      return Promise.reject(error.artistNameIsRequired);
    if (!trackName)
      return Promise.reject(error.trackNameIsRequired);
    if (!fileData || fileData.path === 0)
      return Promise.reject(error.badUploadedFile);


    let product, foundColor, colors, preThumb;

    return this.ProductModel.findById(mongoose.Types.ObjectId(id)).lean()
      .then(res => {

        if (!res)
          return Promise.reject(error.productNotFound);

        let update;
        let foundProductColor = res.colors.find(x => x._id.toString() === productColorId);


        if (!foundProductColor)
          return Promise.reject(error.productColorNotExist);

        if (is_thumbnail) {
          preThumb = foundProductColor.image.thumbnail;
          foundProductColor.image.thumbnail = fileData.filename;
        }

          if (!foundProductColor.image.angles.find(x => x === fileData.filename)) {
            foundProductColor.image.angles.push(fileData.filename);
          }


        colors = res.colors
        if ( preThumb) {
          return rmPromise([env.uploadMusicPath, artistName, trackName, preThumb].join(path.sep));
        }
        else {
          return Promise.resolve();
        }
      }).then(res => {

        return this.AppTracklistModel.update({
          _id: mongoose.Types.ObjectId(id)
        }, {
          colors
        })

      }).then(res => {
        if (res.n === 1) {
          return Promise.resolve({downloadURL: fileData.filename});
        }
        else
          return Promise.reject(error.productColorEditFailed);
      });
  }

  /**
   * @param:
   *  id : id of product
   *  productColorId: id of color inside the colors array
   * @returns {Promise.<*>}
   */
  removeTrack(id, productColorId, angle) {
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      return Promise.reject(error.productIdRequired);
    if (!productColorId || !mongoose.Types.ObjectId.isValid(productColorId))
      return Promise.reject(error.productColorIdRequired);
    if (!angle)
      return Promise.reject(error.productImageNameRequired);

    let colors;
    return this.ProductModel.findById(mongoose.Types.ObjectId(id)).lean()
      .then(res => {

        if (!res)
          return Promise.reject(error.productNotFound)

        let foundProductColor = res.colors.find(x => x._id.toString() === productColorId);
        if (!foundProductColor)
          return Promise.reject(error.productColorNotExist);

        let index = foundProductColor.image.angles.findIndex(x => x === angle);
        if (index >= 0)
          foundProductColor.image.angles.splice(index, 1);


        colors = res.colors;

        return rmPromise([env.uploadProductImagePath, id, productColorId, angle].join(path.sep))

      }).then(res => {

        return this.ProductModel.update({
          _id: mongoose.Types.ObjectId(id)
        }, {
          $set: {
            'colors': colors
          }
        })
      })

  }

}


AppTracklist.test = false;

module.exports = AppTracklist;
