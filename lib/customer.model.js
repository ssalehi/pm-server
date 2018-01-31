/**
 * Created by Eabasir on 30/02/2018.
 */
const error = require('./errors.list');
const _Customer = require('../mongo/customer');


let CustomerModel;

class Customer {


  constructor(test = Agent.test) {

    CustomerModel = test ? _Customer.CustomerModelTest: _Customer.CustomerModel
  }

  save() {

    // following obj cannot be saved because of lack of requirement defined in schemas
    let customer = new CustomerModel({
      username: 'eabasir',
      secret: '123456',
      addresses:[
        {
          street: 'here'
        }

      ]
    });

    return customer.save().then(res => Promise.resolve('successful'));
  }


}

Customer.test = false;

module.exports = Customer;