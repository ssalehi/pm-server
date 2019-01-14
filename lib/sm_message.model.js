const Base = require('./base.model');
const _const = require('./const.list');

class SMMessage extends Base {

  constructor(test = Brand.test) {

    super('SMMessage', test);

    this.SMMessageModel = this.model;
  }

  async pubishMessage(order_id, order_line_id, type, extra, descArgs = null) {
    try {
      let description
      if (descArgs && descArgs.length)
        description = this.makeDesc(type, descArgs);

      return this.SMMessageModel.create({
        type,
        order_id,
        order_line_id,
        description,
        extra
      });

    } catch (err) {
      console.log('-> error on publish sales manager message', err);
      throw err;
    }
  }


  makeDesc(type, args) {
    if (!args || !descArgs.length)
      return;
    try {
      switch (type) {
        case _const.SM_MESSAGE.ReturnRequest:
          break;
      }

      return null;

    } catch (err) {
      console.log('-> error on making description for sales manager message', err);
      throw err;
    }
  }



}

SMMessage.test = false;

module.exports = SMMessage;