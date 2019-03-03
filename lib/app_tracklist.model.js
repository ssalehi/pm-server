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


  async addTracks(body, file) {
    try {

      if (!body.artistName)
        return Promise.reject(error.artistNameIsRequired);
      if (!body.trackName)
        return Promise.reject(error.trackNameIsRequired);

      if (file && file.filename) {
        const tempFilePath = file.path.replace(/\\/g, '/');
        const path = tempFilePath.substr(tempFilePath.indexOf('public') + 'public'.length);
        return Promise.resolve({
          downloadURL: path,
        });
      }
      const dataTrack = {
        artistName: body.artistName,
        trackName: body.trackName,
        path: body.path,
        priority: body.priority ? body.priority : 1
      };
      let appTracklistModel = await this.AppTracklistModel.create(dataTrack);
      return Promise.resolve(appTracklistModel)
    }
    catch (err) {
      throw err;
    }

  }

  deleteTrack(body) {

    if (!body._id)
      return Promise.reject(error.trackIdIsRequired);
    return this.AppTracklistModel.deleteOne({_id: mongoose.Types.ObjectId(body._id)});
  }

  getTracklist() {

    return models()['AppTracklist' + (AppTracklist.test ? 'Test' : '')].find().sort({
      priority: 1
    }).lean();
  }

  async updateTrackList(body) {

    var promises1 = [];
    body.tracklists.forEach(element => {
      promises1.push(
        this.AppTracklistModel.findOneAndUpdate({
          _id: element._id,
        }, {
          $set: {
            'priority': -10 * element.priority - 1
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
