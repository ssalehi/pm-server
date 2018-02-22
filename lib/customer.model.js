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

  registration(body) {
    let isPrefectData = true;
    ['username', 'password', 'first_name', 'surname', 'mobile_no', 'dob', 'gender'].forEach(el => {
      if(!body[el])
        isPrefectData = false;
    });

    if(!isPrefectData)
      return Promise.reject(error.noCompleteRegisterData);

    console.log(body);

    body.username = body.username.toLowerCase();

    return this.save(body);
  }
}

Customer.test = false;

module.exports = Customer;