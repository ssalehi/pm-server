const Schema = require('mongoose').Schema;

let schema_obj = {
  section: String,
  column: Number,
  text: String,
  href: String,
  is_header: Boolean,
  is_panel: Boolean,
  panel_type: String,
  topTitle: {
    title: String,
    text: String,
    color: String,
  },
  subTitle: {
    title: String,
    text: String,
    color: String,
  },
  imgs: [
    {
      imgUrl: String,
      href: String,
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
      ],
    },
  ]
};

let PageInfoSchema = new Schema(schema_obj, {strict: true});
module.exports = PageInfoSchema;
