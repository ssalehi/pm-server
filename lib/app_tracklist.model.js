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
  addTracks(body, file) {
    console.log('body', body);
    console.log('file', file);
    if (!body.artistName)
      return Promise.reject(error.artistNameIsRequired);
    if (!body.trackName)
      return Promise.reject(error.trackNameIsRequired);
    // if (!body || body.path === 0)
    //   return Promise.reject(error.badUploadedFile);


    let dataTrack = {
      "artistName": body.artistName,
      "trackName": body.trackName,
      "priority": body.priority
      // "path": body.path;
    };

    return new Promise((resolve, reject) => {
      this.AppTracklistModel.create(dataTrack).then(() => {


        const tempFilePath = file.path.replace(/\\/g, '/');
        const filePath = tempFilePath.substr(tempFilePath.indexOf('public') + 'public'.length);
        //
        // this.AppTracklistModel.findOneAndUpdate(
        //   {
        //     _id: mongoose.Types.ObjectId(body._id),
        //   },
        //   {
        //     $set: {
        //       path: filePath,
        //     }
        //   }, {
        //     new: true,
        //   });
        resolve();
      }).catch(err => {
        reject(error);
      })
    })
  }

  // }).then(res => {
  //   if (res.n === 1) {
  //     return Promise.resolve({downloadURL: body.file});
  //   }
  //   else
  //     return Promise.reject(error.badUploadedFile);
  // });

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
