const Base = require('./base.model');
const models = require('../mongo/models.mongo');

class Tag extends Base {

  constructor(test = Tag.test) {

    super('Tag', test);

    this.TagModel = this.model;
  }

  suggest(phrase) {
    return this.TagModel.aggregate([{
        $match: {
          name: {
            $regex: phrase,
            $options: 'i'
          }
        }
      },
      {
        $lookup: {
          from: 'tag_group',
          localField: 'tag_group_id',
          foreignField: '_id',
          as: "tag_group"
        }
      },
      {
        $unwind: {
          path: '$tag_group', // unwind tag group to get object instead of array in group stage
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          name: {
            $first: "$name"
          },
          tg_name: {
            $first: "$tag_group.name"
          },
        },
      }
    ]).limit(5).sort({
      name: 1
    });
  }

  getTags(tagGroupName) {
    return new Promise((resolve, reject) => {
      models['TagGroup' + (Tag.test ? 'Test' : '')].findOne({
        name: tagGroupName
      }).then(tagGroup => {
        return this.TagModel.find({
          'tag_group_id': tagGroup._id
        });
      }).then(res => {
        resolve(res);
      }).catch(err => {
        reject(err);
      });
    });
  }

}

Tag.test = false;

module.exports = Tag;