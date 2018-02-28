const Base = require('./base.model');

class TagGroup extends Base {

  constructor(test = TagGroup.test) {

    super('TagGroup', test);

    this.TagGroupModel = this.model;
  }

  search(options, offset, limit) {
    let result;
    return this.TagGroupModel.find({name: {$regex: options.phrase, $options: 'i'}})
      .skip(offset)
      .limit(limit)
      .select({"name": 1}).then(res => {
        result = res;
        return this.TagGroupModel.find({name: {$regex: options.phrase, $options: 'i'}}).count();
      }).then(res => {
        return Promise.resolve({
          data: result,
          total: res,
        });
      });
  }
}

TagGroup.test = false;

module.exports = TagGroup;