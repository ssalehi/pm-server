/**
 * Created by Eabasir on 30/02/2018.
 */
const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

class Page extends Base {

  constructor(test = Page.test) {

    super('Page', test);

    this.PageModel = this.model
  }


  getPage(id) {

    id = id.trim();
    if (!mongoose.Types.ObjectId.isValid(id))
      return Promise.reject(error.invalidId);

    return this.PageModel.aggregate(
      [
        {
          $match: {_id: mongoose.Types.ObjectId(id)}
        },
        {
          $lookup: {
            from: "collection",
            localField: "page_info.collection_id",
            foreignField: "_id",
            as: "collection"
          }
        },
        {
          $unwind: {
            path: '$collection',
            preserveNullAndEmptyArrays: true
          }
        },
      ]
    );
  }


  setPage(body, id) {
    if (!body.address)
      return Promise.reject(error.pageAddressRequired);
    if (!body.hasOwnProperty('is_app'))
      return Promise.reject(error.pageTypeRequired);


    if (!id) {

      let obj = {
        address: body.address,
        is_app: body.is_app
      };
      if (body.collection_id) {
        obj.page_info = {};

        if (!mongoose.Types.ObjectId.isValid(body.collection_id))
          return Promise.reject(error.invalidId);

        obj.page_info.collection_id = body.collection_id;
        if (body.content)
          obj.page_info.content = body.content;

      }
      let newPage = new this.PageModel(obj);
      return newPage.save();

    } else {

      if (!mongoose.Types.ObjectId.isValid(id))
        return Promise.reject(error.invalidId);

      return this.PageModel.update({
          "_id": mongoose.Types.ObjectId(id),
        },
        {
          $set: {
            'address': body.address,
            'is_app': body.is_app,
          }
        });
    }
  }

  getPlacements(address) {
    if (!address) return Promise.reject(error.pageAddressRequired);
    return this.PageModel.findOne({address}).select('placement');
  }

  /**
   * @param:
   *  id : id of page
   * @returns {Promise.<*>}
   */
  deletePage(id) {
    if (!id)
      return Promise.reject(error.pageIdRequired);
    return this.PageModel.remove({_id: mongoose.Types.ObjectId(id)});
  }

  search(options, offset, limit) {
    let phrase = options.phrase ? options.phrase : '';
    let result;


    const match = (options.is_app !== null && options.is_app !== undefined) ? {
      address: {$regex: phrase, $options: 'i'},
      is_app: options.is_app ? true : false
    } : {address: {$regex: phrase, $options: 'i'}};


    return this.PageModel.aggregate(
      [
        {
          $match: match
        },
        {
          $lookup: {
            from: "collection",
            localField: "page_info.collection_id",
            foreignField: "_id",
            as: "collection"
          }
        },
        {
          $unwind: {
            path: '$collection',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            "address": 1,
            "is_app": 1,
            "collection.name": 1,
            "page_info.content": 1
          }
        },
        {
          $sort: {
            'address': 1,
          }
        },
        {
          $skip: Number.parseInt(offset)
        },
        {
          $limit: Number.parseInt(limit)
        }
      ]
    ).then(res => {
      result = res;
      return this.PageModel.aggregate(
        [
          {
            $match: match
          },
          {
            $lookup: {
              from: "collection",
              localField: "page_info.collection_id",
              foreignField: "_id",
              as: "collection"
            }
          },
          {
            $unwind: {
              path: '$collection',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $count: "count"
          }
        ])
    }).then(res => {
      let totalCount = res[0] ? res[0].count : 0;
      return Promise.resolve({
        data: result,
        total: totalCount,
      });
    });
  }


}

Page.test = false;
module.exports = Page;