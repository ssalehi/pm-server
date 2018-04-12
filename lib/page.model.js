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
      'column',
      'section',
    ],
    constraints: [
      'text',
      'href',
    ],
    ignored: [
      'section'
    ]
  },
  {
    component_name: 'slider',
    required: [
      'text',
      'href',
      'column',
    ],
    constraints: [
      'text',
      'href',
    ],
    ignored: []
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

  getPageByAddress(address, getNotFinalPlacements = false) {
    if (!address) return Promise.reject(error.pageAddressRequired);

    return new Promise((resolve, reject) => {
      this.PageModel.findOne({address}).select('placement page_info').lean()
        .then(res => {
          let finalList = res.placement.filter(el => el.is_finalized === null || el.is_finalized === undefined || el.is_finalized);

          if (getNotFinalPlacements) {
            let notFinalList = res.placement.filter(el => el.is_finalized === false);
            finalList = finalList.filter(el => !el.is_deleted);

            finalList.forEach(el => {
              if (el.ref_newest_id) {
                const tempNotFinalIndex = notFinalList.findIndex(i => i._id.toString() === el.ref_newest_id.toString());
                if (tempNotFinalIndex !== -1) {
                  Object.keys(el).forEach(pr => {
                    if (notFinalList[tempNotFinalIndex].hasOwnProperty(pr))
                      el[pr] = notFinalList[tempNotFinalIndex][pr];
                  });

                  notFinalList.splice(tempNotFinalIndex, 1);
                }
              }
            });

            res.placement = finalList.concat(notFinalList);

          } else {
            finalList.forEach(el => delete el.is_deleted);
            res.placement = finalList;
          }

          resolve(res);
        })
        .catch(err => reject(err));
    });
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
                is_finalized: false,
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
      promiseList.push(this.conditionalUpdatingPlacement(el, body.page_id));
    });

    return Promise.all(promiseList);
  }

  /**
   * @param params
   *  pageId and placementId
   * @param body
   *  component_name is needed, variable_name is optional
   * @param file
   *  this is the uploaded file
   * @returns {downloadURL || Promise.<*>}
   *  which is for ng2-upload
   */
  addImage(params, body, file) {
    console.log("@@@", body);
    if (!body.component_name)
      return Promise.reject(error.placementDetailsRequired);

    const tempFilePath = file.path.replace(/\\/g, '/');
    const path = tempFilePath.substr(tempFilePath.indexOf('public') + 'public'.length);
    return this.conditionalUpdatingPlacement({
      _id: params.placementId,
      component_name: body['component_name'],
      variable_name: body['variable_name'] || '',
      info: {
        imgUrl: path
      }
    }, params.pageId)
      .then(res => {
        console.log('res', res);
        return Promise.resolve({
          downloadURL: path,
        });
      });
  }

  conditionalUpdatingPlacement(data, pageId) {
    return new Promise((resolve, reject) => {
      this.model.find({_id: pageId}).lean()
        .then(res => {
          const placementObj = res[0].placement.find(el => el._id.toString() === data._id.toString());

          if (placementObj.is_finalized && !placementObj.ref_newest_id) {
            // Should add new placement
            const newId = mongoose.Types.ObjectId();

            return this.model.findOneAndUpdate({
              _id: mongoose.Types.ObjectId(pageId),
            }, {
              $addToSet: {
                placement: {
                  _id: newId,
                  component_name: placementObj.component_name,
                  variable_name: placementObj.variable_name,
                  info: Object.assign(placementObj.info, data.info),
                  is_finalized: false,
                }
              }
            }, {
              new: true,
            })
              .then(res => {
                return this.model.findOneAndUpdate({
                  _id: mongoose.Types.ObjectId(pageId),
                  'placement._id': mongoose.Types.ObjectId(placementObj._id),
                }, {
                  $set: {
                    'placement.$.ref_newest_id': newId,
                  }
                }, {
                  new: true,
                });
              })
          } else {
            // Should update this placement
            const updateFields = {};
            const prc = placementsRequirementsConstraints.find(el => el.component_name.toLowerCase() === el.component_name.toLowerCase());
            Object.keys(data.info).forEach(i => {
              if (prc.ignored.length <= 0 || !prc.ignored.includes(i))
                updateFields[('placement.$.info.' + i).toString()] = data.info[i];
            });

            return this.model.update({
                _id: mongoose.Types.ObjectId(pageId),
                'placement._id': placementObj.ref_newest_id ? mongoose.Types.ObjectId(placementObj.ref_newest_id) : mongoose.Types.ObjectId(data._id),
              }, {
                $set: updateFields
              }, {
                upsert: false,
                multi: false,
              }
            );
          }
        })
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
  }

  deletePlacement(body) {
    if (!body.page_id)
      return Promise.reject(error.pageIdRequired);

    if (!body.placement_id)
      return Promise.reject(error.placementIdRequired);

    return new Promise((resolve, reject) => {
      this.model.findOne({_id: body.page_id}).lean()
        .then(res => {
          const placementObj = res.placement.find(el => el._id.toString() === body.placement_id.toString());

          if (placementObj.is_finalized) {
            // Should set is_deleted flag to true
            console.log(body.page_id);
            console.log(body.placement_id);

            return this.model.findOneAndUpdate({
              _id: mongoose.Types.ObjectId(body.page_id),
              'placement._id': mongoose.Types.ObjectId(body.placement_id),
            }, {
              $set: {
                'placement.$.is_deleted': true,
              }
            });
          } else {
            // Should delete the placement object
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
        })
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
  }

  finalizePlacement(body) {
    if (!body.page_id)
      return Promise.reject(error.pageIdRequired);

    const shouldFinalized = (body.is_finalized === false || body.is_finalized === true) ? body.is_finalized : true;

    return new Promise((resolve, reject) => {
      this.model.findOne({_id: mongoose.Types.ObjectId(body.page_id)}).lean()
        .then(res => {
          let finalList = res.placement.filter(el => el.is_finalized === null || el.is_finalized === undefined || el.is_finalized);
          let notFinalList = res.placement.filter(el => el.is_finalized === false);
          let result = [];

          if (shouldFinalized) {
            finalList.forEach(el => {
              if (el.ref_newest_id) {
                const placementIndex = notFinalList.findIndex(i => i._id.toString() === el._id.toString());
                if (placementIndex !== -1) {
                  notFinalList[placementIndex].is_finalized = true;
                  result.push(notFinalList[placementIndex]);
                  notFinalList.splice(placementIndex, 1);
                }
              } else if (!el.is_deleted)
                result.push(el);
            });

            notFinalList.forEach(el => el.is_finalized = true);
            result = result.concat(notFinalList);
          } else {
            finalList.forEach(el => {
              delete el.is_deleted;
              delete el.ref_newest_id;

              console.log(el);

              result.push(el);
            });
          }

          return this.model.update({
            _id: mongoose.Types.ObjectId(body.page_id),
          }, {
            $set: {
              placement: result,
            }
          }, {
            new: true
          });
        })
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
  }
}

Page.test = false;
module.exports = Page;