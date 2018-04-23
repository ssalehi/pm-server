const Schema = require('mongoose').Schema;

let schema_obj = {
  // menu
  section: String,
  column: Number,
  row: Number, // for both panel and menu
  text: String, // for both panel and menu
  href: String, // href is also used for determining which collection is to be shown
  is_header: Boolean,
  panel_type: String,
  topTitle: {
    title: String,
    text: String,
    titleColor: String,
    textColor: String,
  },
  imgUrl: String,
  subTitle: {
    title: String,
    text: String,
    titleColor: String,
    textColor: String,
  },
  areas: [
    {
      pos: String,
      title: String,
      text: String,
      titleColor: String,
      textColor: String,
      buttonText: String,
      buttonBackgroundColor: String,
      buttonColor: String,
    },
  ],
  style: Schema.Types.Mixed,
};

let PlacementInfoSchema = new Schema(schema_obj, {strict: true});
module.exports = PlacementInfoSchema;
