const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');
const rmPromise = require('rimraf-promise');
const env = require('../env');
const path = require('path');

let tracklistData = [];

class AppTracklist extends Base {

  constructor(test = AppTracklist.test) {

    super('AppTracklist', test);

    this.AppTracklistModel = this.model;
  }

  /*
   *  fileData data of uploaded file.
   * @returns {Promise.<*>}
   */
  async addTracks(body, file) {
    try {
      if (file && file.filename) {
        const tempFilePath = file.path.replace(/\\/g, '/');
        const path = tempFilePath.substr(tempFilePath.indexOf('public') + 'public'.length);
        return Promise.resolve({
          downloadURL: path,
        });
      }
      if (!body.artistName)
        return Promise.reject(error.artistNameIsRequired);
      if (!body.trackName)
        return Promise.reject(error.trackNameIsRequired);
      // if (!body || body.path === 0)
      //   return Promise.reject(error.badUploadedFile);


      const dataTrack = {
        artistName: body.artistName,
        trackName: body.trackName,
        path: body.path,
        priority: body.priority ? body.priority : 1
      };

      let appTracklistModel = await this.AppTracklistModel.create(dataTrack);
      //
      // const tempFilePath = file.path.replace(/\\/g, '/');
      // const filePath = tempFilePath.substr(tempFilePath.indexOf('public') + 'public'.length);

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



      return Promise.resolve(appTracklistModel)
    }
    catch (err) {
      throw err;
    }

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

  getTracklist() {
    return models()['AppTracklist' + (AppTracklist.test ? 'Test' : '')].find().sort({
      priority: 1
    }).lean();
  }

  async updateTrackList(body) {

      console.log(body)
      var promises1 = [];
      body.tracklists.forEach(element => {
        promises1.push(
          this.AppTracklistModel.findOneAndUpdate({
            _id: element._id,
          }, {
            $set: {
              'priority':  -10 * element.priority - 1
            }
          }));
      });

      return Promise.all(promises1).then(() => {
        var promises = [];
        body.tracklists.forEach(element => {
          promises.push(
            this.AppTracklistModel.findOneAndUpdate({
              _id: element._id,
            }, {
              $set: {
                'priority': element.priority,
              }
            }, {
              new: true
            }));
        });
        return Promise.all(promises);
      }).then(async () => {
        tracklistData = await this.AppTracklistModel.find().sort({
          priority: 1
        }).lean();

        return Promise.resolve();
      })
    }
}


AppTracklist.test = false;

module.exports = AppTracklist;
