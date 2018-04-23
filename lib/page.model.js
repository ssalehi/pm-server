/**
 * Created by Eabasir on 30/02/2018.
 */
const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const env = require('../env');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

const placementsRequirementsConstraints = [
  {
    component_name: 'menu',
    variable_name: 'topMenu',
    required: [
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
    component_name: 'menu',
    variable_name: 'subMenu',
    required: [
      'text',
      'href',
      'column',
      'row',
      'section',
    ],
    constraints: [
      'text',
      'href',
      'column',
      'row',
      'section',
    ],
    ignored: []
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
  },
  {
    component_name: 'main',
    required: [
      'row',
      'column',
      'imgUrl',
      'href',
      'panel_type',
    ],
    constraints: [
      'row',
      'column',
    ],
    ignored: []
  },
  {
    component_name: 'footer',
    variable_name: 'site_link',
    required: [
      'row',
      'column',
      'text',
      'href',
    ],
    constraints: [
      'row',
      'column'
    ],
    ignored: []
  },
  {
    component_name: 'footer',
    variable_name: 'social_link',
    required: [
      'column',
      'text',
      'href',
    ],
    constraints: [],
    ignored: []
  },
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
              if (el.updated_info) {
                Object.assign(el.info, el.updated_info);
              }
            });

            res.placement = finalList.concat(notFinalList);

          } else {
            finalList.forEach(el => {
              delete el.is_deleted;
              delete el.updated_info;
            });
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

    if (!body.placement.component_name)
      return Promise.reject(error.placementDetailsRequired);

    let isIncomplete = false;

    const prc = placementsRequirementsConstraints.find(
      el => el.component_name.toLowerCase() === body.placement.component_name.toLowerCase() &&
        (!el.variable_name || (body.placement.variable_name && el.variable_name.toLowerCase() === body.placement.variable_name.toLowerCase())));

    prc.required.forEach(el => {
      if (!body.placement.info.hasOwnProperty(el)) {
        isIncomplete = true;
        return;
      }
    });

    if (isIncomplete)
      return Promise.reject(error.placementDetailsRequired);

    let constraints = {};

    if (prc.constraints.length > 0) {
      constraints = [
        {'placement.component_name': body.placement.component_name},
      ];

      if (body.placement.variable_name)
        constraints.push({'placement.variable_name': body.placement.variable_name});

      prc.constraints.forEach(el => {
        const obj = {};
        obj[('placement.info.' + el).toString()] = body.placement.info[el];
        constraints.push(obj);
      });
    }

    return new Promise((resolve, reject) => {
      const newId = body.placement._id ? body.placement._id : mongoose.Types.ObjectId();

      const newPlacementObj = {
        _id: newId,
        component_name: body.placement.component_name,
        variable_name: body.placement.variable_name,
        info: body.placement.info,
      };

      (constraints.length > 0 ? this.model.aggregate([
        {
          $match: {_id: mongoose.Types.ObjectId(body.page_id)}
        },
        {
          $unwind: {
            path: '$placement',
            preserveNullAndEmptyArrays: true,
          }
        },
        {
          $match: {
            $and: constraints
          }
        }
      ]) : Promise.resolve([]))
        .then(res => {
          if (res.length > 0)
            return Promise.reject(error.duplicatePlacement);

          return this.model.findOneAndUpdate({
            _id: mongoose.Types.ObjectId(body.page_id),
          }, {
              $addToSet: {
                placement: Object.assign(newPlacementObj, {
                  is_finalized: false,
                })
              }
            }, {
              new: true,
            });
        })
        .then(res => {
          resolve(Object.assign(res._doc, {
            new_placement: newPlacementObj,
            placement_id: newPlacementObj._id,
          }));
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
  addImage(params, body, file, isNew, newId) {
    if (!body.component_name && !isNew)
      return Promise.reject(error.placementDetailsRequired);

    const tempFilePath = file.path.replace(/\\/g, '/');
    const path = tempFilePath.substr(tempFilePath.indexOf('public') + 'public'.length);
    if (isNew == false)
      return this.conditionalUpdatingPlacement({
        _id: params.placementId,
        component_name: body['component_name'],
        variable_name: body['variable_name'] || '',
        info: {
          imgUrl: path
        }
      }, params.pageId, newId)
        .then(res => {
          return Promise.resolve({
            downloadURL: path,
          });
        });

    return Promise.resolve({
      downloadURL: path,
      placementId: newId,
    });
  }

  conditionalUpdatingPlacement(data, pageId, newPlacementId = null) {
    return new Promise((resolve, reject) => {
      this.model.find({_id: pageId}).lean()
        .then(res => {
          const placementObj = res[0].placement.find(el => el._id.toString() === data._id.toString());
          const updateFields = {};

          if (placementObj.is_finalized)
            updateFields['placement.$.updated_info'] = Object.assign(placementObj.info, data.info);
          else {
            const prc = placementsRequirementsConstraints.find(
              el => el.component_name.toLowerCase() === placementObj.component_name.toLowerCase() &&
                (!el.variable_name || el.variable_name.toLowerCase() === placementObj.variable_name.toLowerCase()));
            Object.keys(data.info).forEach(i => {
              if (prc.ignored.length <= 0 || !prc.ignored.includes(i))
                updateFields[('placement.$.info.' + i).toString()] = data.info[i];
            });
          }

          return this.model.update({
            _id: mongoose.Types.ObjectId(pageId),
            'placement._id': mongoose.Types.ObjectId(data._id),
          }, {
              $set: updateFields
            }, {
              upsert: false,
              multi: false,
            }
          );
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
            return this.model.findOneAndUpdate({
              _id: mongoose.Types.ObjectId(body.page_id),
              'placement._id': mongoose.Types.ObjectId(body.placement_id),
            }, {
                $set: {
                  'placement.$.is_deleted': true,
                  'placement.$.updated_info': null
                }
              });
          } else {
            // Should delete the placement object and its image folder if has imgUrl
            return (placementObj.info.imgUrl ? this.removeImage(placementObj.info.imgUrl) : Promise.resolve())
              .then(res => {
                return this.model.update({
                  _id: mongoose.Types.ObjectId(body.page_id),
                }, {
                    $pull: {
                      'placement': {
                        _id: mongoose.Types.ObjectId(body.placement_id)
                      },
                    }
                  });
              })
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
              if (el.updated_info) {
                el.info = Object.assign({}, el.updated_info);
                result.push(el);
              } else if (!el.is_deleted)
                result.push(el);
              else if (el.is_deleted && el.info.imgUrl)
                this.removeImage(el.info.imgUrl)
                  .then(() => console.log(`Image in ${el.info.imgUrl} is removed`))
                  .catch(err => console.error(`Cannot remove image in ${el.info.imgUrl}. Error: ${err}`));
            });

            notFinalList.forEach(el => el.is_finalized = true);
            result = result.concat(notFinalList);
          } else {
            finalList.forEach(el => {
              delete el.is_deleted;
              delete el.updated_info;

              result.push(el);
            });

            notFinalList.forEach(el => {
              if (el.info.imgUrl)
                this.removeImage(el.info.imgUrl)
                  .then(() => console.log(`Image in ${el.info.imgUrl} is removed`))
                  .catch(err => console.error(`Cannot remove image in ${el.info.imgUrl}. Error: ${err}`));
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

  removeImage(imagePath) {
    return new Promise((resolve, reject) => {
      rimraf(imagePath, {
        disableGlob: true,
      }, (err) => {
        if (err) {
          console.error(`Cannot remove the related image directory - url: ${imagePath} - Error: ${err}`);
          reject();
        } else
          resolve();
      })
    });
  }
}

Page.test = false;
module.exports = Page;