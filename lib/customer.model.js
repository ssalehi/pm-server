/**
 * Created by Eabasir on 30/02/2018.
 */
const Person = require('./person.model');
const error = require('./errors.list');


let CustomerModel;
modelName = 'Customer';

class Customer extends Person {
  constructor(test = Customer.test) {

    super(modelName, test);

    CustomerModel = this.model
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

  save() {

    // following obj cannot be saved because of lack of requirement defined in schemas
    let customer = new CustomerModel({
      username: 'eabasir',
      secret: '123456',
      addresses: [
        {
          city: 'tehran',
          street: 'here'
        }

      ]
    });
    return customer.save().then(res => Promise.resolve('successful'));
  }
}

Customer.test = false;

module.exports = Customer;