const Schema = require('mongoose').Schema;


let schema_obj = {
  path: {
    type: String,
    require: true
  },
  priority: {
    type: Number,
    required: true,
    unique: true,
    min: 0
  },
  trackName: {
    type: String,
    required: true,
  },
  artistName: {
    type: String,
    required: true,
  }
};


let appTracklistSchema = new Schema(schema_obj, {collection: 'app_tracklist', strict: true});

module.exports = appTracklistSchema;
