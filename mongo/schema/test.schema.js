const Schema = require('mongoose').Schema;


let schema_obj = {
  data: [
    {
      name: {
        type: String,
        required: true,
        trim: true,
        unique: true
      }
    }
  ],

};


let testSchema = new Schema(schema_obj, {collection: 'test', strict: true});

module.exports = testSchema;
