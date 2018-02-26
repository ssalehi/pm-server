const Schema = require('mongoose').Schema;

let schema_obj = {
  // menu
  section: String,
  column: Number,
  row: Number, // for both panel and menu
  text: String, // for both panel and menu
  href: String, // href is also used for determining which collection is to be shown
  is_header: Boolean,


  // is_panel: Boolean,
  panel_type: String,
  topTitle: {
    title: String,
    text: String,
    color: String,
  },
  imgUrl: String,
  subTitle: {
    title: String,
    text: String,
    color: String,
    textColor: String,
  },
  areas: [
    {
      pos: String,
      title: String,
      text: String,
      color: String,
    },
  ]
};

let PlacementInfoSchema = new Schema(schema_obj, {strict: true});
module.exports = PlacementInfoSchema;
