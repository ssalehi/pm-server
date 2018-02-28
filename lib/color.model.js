const Base = require('./base.model');

class Color extends Base {

  constructor(test = Color.test) {

    super('Color', test);

    this.ColorModel = this.model;
  }

  getColors() {
    return this.ColorModel.find().select({"name": 1})
  }
}

Color.test = false;

module.exports = Color;