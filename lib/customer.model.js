/**
 * Created by Eabasir on 30/02/2018.
 */
const Person = require('./person.model');
const error = require('./errors.list');


class Customer extends Person {
  constructor(test = Customer.test) {
    super('Customer', test);
    this.CustomerModel = this.model
  }

  load(username, password) {
    return new Promise((resolve, reject) => {
      this.username = username.toLowerCase();
      this.password = password;

      this.model.findOne({username: username})
        .then(res => {
          resolve(res);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  save(data) {
    let customer = new this.CustomerModel(data);
    return customer.save().then(res => Promise.resolve('successful'));
  }
}

Customer.test = false;

module.exports = Customer;