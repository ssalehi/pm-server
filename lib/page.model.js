/**
 * Created by Eabasir on 30/02/2018.
 */
const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

const placementsRequirementsConstraints = [
  {
    component_name: 'menu',
    required: [
      'variable_name',
      'text',
      'href',
      'order',
    ],
    constraints: [
      'text',
      'href',
    ]
  }
];

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
            from: 'collection',
            localField: 'page_info.collection_id',
            foreignField: '_id',
            as: 'collection'
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
        obj.page_info.content = body.content;

      }
      let newPage = new this.PageModel(obj);
      return newPage.save();

    } else {

      if (!mongoose.Types.ObjectId.isValid(id))
        return Promise.reject(error.invalidId);

      return this.PageModel.update({
          '_id': mongoose.Types.ObjectId(id),
        },
        {
          $set: {
            'address': body.address,
            'is_app': body.is_app,
            'page_info.collection_id': body.collection_id,
            'page_info.content': body.content
          }
        });
    }
  }

  getPageByAddress(address) {
    if (!address) return Promise.reject(error.pageAddressRequired);
    return this.PageModel.findOne({address}).select('placement page_info');
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
            from: 'collection',
            localField: 'page_info.collection_id',
            foreignField: '_id',
            as: 'collection'
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
            'address': 1,
            'is_app': 1,
            'collection.name': 1,
            'page_info.content': 1
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
              from: 'collection',
              localField: 'page_info.collection_id',
              foreignField: '_id',
              as: 'collection'
            }
          },
          {
            $unwind: {
              path: '$collection',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $count: 'count'
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

  addPlacement(body) {
    if (!body.page_id)
      return Promise.reject(error.pageIdRequired);

    if (!body.placement.component_name || !body.placement.variable_name)
      return Promise.reject(error.placementDetailsRequired);

    let isIncomplete = false;

    const prc = placementsRequirementsConstraints.find(el => el.component_name.toLowerCase() === body.placement.component_name.toLowerCase());

    prc.required.forEach(el => {
      if (el === 'variable_name' && !body.placement[el]) {
        isIncomplete = true;
        return;
      } else if (!body.placement.info[el] && el !== 'variable_name') {
        isIncomplete = true;
        return;
      }
    });

    if (isIncomplete)
      return Promise.reject(error.placementDetailsRequired);

    let constraints = {};

    if (prc.constraints.length > 0) {
      constraints = {
        _id: mongoose.Types.ObjectId(body.page_id),
        'placement.component_name': body.placement.component_name,
      };

      if (body.placement.variable_name)
        constraints['placement.variable_name'] = body.placement.variable_name;

      prc.constraints.forEach(el => {
        constraints[('placement.info.' + el).toString()] = body.placement.info[el];
      });
    }

    return new Promise((resolve, reject) => {
      (Object.keys(constraints).length > 0 ? this.model.find(constraints) : Promise.resolve([]))
        .then(res => {
          if (res.length > 0)
            return Promise.reject(error.duplicatePlacement);

          return this.model.findOneAndUpdate({
            _id: mongoose.Types.ObjectId(body.page_id),
          }, {
            $addToSet: {
              placement: {
                component_name: body.placement.component_name,
                variable_name: body.placement.variable_name,
                info: body.placement.info,
              }
            }
          }, {
            new: true,
          });
        })
        .then(res => {
          resolve(res);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  updatePlacements(body) {
    if (!body.page_id)
      return Promise.reject(error.pageIdRequired);

    if (!body.placements)
      return Promise.reject(error.placementDetailsRequired);

    if (body.placements.filter(el => !el._id).length > 0)
      return Promise.reject(error.placementIdRequired);

    const promiseList = [];

    body.placements.forEach(el => {
      const updateFields = {};
      Object.keys(el.info).forEach(i => {
        updateFields[('placement.$.info.' + i).toString()] = el.info[i];
      });

      promiseList.push(this.model.update({
          _id: mongoose.Types.ObjectId(body.page_id),
          'placement._id': el._id,
        }, {
         $set: updateFields
        }, {
          upsert: false,
          multi: false,
        }
      ));
    });

    return Promise.all(promiseList);
  }

  deletePlacement(body) {
    if(!body.page_id)
      return Promise.reject(error.pageIdRequired);

    if(!body.placement_id)
      return Promise.reject(error.placementIdRequired);

    return this.model.update({
      _id: mongoose.Types.ObjectId(body.page_id),
    }, {
      $pull: {
        'placement': {
          _id: mongoose.Types.ObjectId(body.placement_id)
        },
      }
    });
  }
}

Page.test = false;
module.exports = Page;