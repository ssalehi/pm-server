
const Base = require('./base.model');

class Color extends Base {

  constructor(test = Color.test) {

    super('Color', test);

    this.ColorModel = this.model;
  }

  getColors() {
    return this.ColorModel.find();
  }

  suggest(phrase) {

    phrase = Color.regexRefiner(phrase);
    return this.ColorModel.find({"name":  { $regex: `.*${phrase}.*` , $options: 'i' }}).limit(5).sort({name: 1});

    // return this.ColorModel.aggregate([
    //   {
    //     $match: {
    //       name: {$regex: phrase, $options: 'i'}
    //     }
    //   }
    // ]).limit(5).sort({name: 1});
  }

  static regexRefiner(string){
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

}

Color.test = false;

module.exports = Color;