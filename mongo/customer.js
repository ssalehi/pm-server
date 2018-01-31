const db = require('./index');
const customerSchema = require('./schema/customer.schema');
const env = require('../env');
SALT_WORK_FACTOR = 10;

// can save data out of schema using strict: false



preSaveFunction = function (next) {
  let agent = this;
  // only hash the secret if it has been modified (or is new)
  if (!agent.isModified('secret')) return next();

  // generate a salt
  env.bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
    if (err) return next(err);

    // hash the password using our new salt
    env.bcrypt.hash(agent.secret, salt, null, function (err, hash) {
      if (err) return next(err);

      // override the clear text secret with the hashed one
      agent.secret = hash;
      next();
    });
  });
};

customerSchema.pre('save', preSaveFunction);

compareFunction = function (candidatePassword, cb) {
  env.bcrypt.compare(candidatePassword, this.secret, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};


customerSchema.methods.comparePassword = compareFunction;

let CustomerModel = db.prodConnection.model('Customer', customerSchema);
let CustomerModelTest = db.testConnection.model('Customer', customerSchema);

module.exports = {
  CustomerModel,
  CustomerModelTest
};
