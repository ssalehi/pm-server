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
  },
  active: { // weather user can system or not
    type: Boolean,
    default: true,
    required: true
  }
};


let agentSchema = new Schema(schema_obj, {collection: 'agent', strict: true});

module.exports = agentSchema;
