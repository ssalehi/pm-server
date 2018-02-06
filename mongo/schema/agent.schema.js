const Schema = require('mongoose').Schema;


let schema_obj = {
  username: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  secret: {
    type: String,
    required: true
  },
  access_level: {
    type: Number,
    required: true,
  },
  first_name: {
    type: String,
    trim: true,
  },
  surname: {
    type: String,
    trim: true,
  }
};


let agentSchema = new Schema(schema_obj, {strict: true});

module.exports = agentSchema;
