const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const env = require('../env');
SALT_WORK_FACTOR = 10;

// can save data out of schema using strict: false

let schema_obj = {
  name: {
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
  }

};


let agentSchema = new Schema(schema_obj, {strict: false});

agentSchema.pre('save', function(next) {
  let agent = this;
  // only hash the secret if it has been modified (or is new)
  if (!agent.isModified('secret')) return next();

  // generate a salt
  env.bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if (err) return next(err);

    // hash the password using our new salt
    env.bcrypt.hash(agent.secret, salt, null, function(err, hash) {
      if (err) return next(err);

      // override the clear text secret with the hashed one
      agent.secret = hash;
      next();
    });
  });
});

agentSchema.methods.comparePassword = function(candidatePassword, cb) {
  env.bcrypt.compare(candidatePassword, this.secret, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

let AgentModel = mongoose.model('Agent', agentSchema);

module.exports = AgentModel;
