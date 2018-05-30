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
const readChunk = require('read-chunk');
const fileType = require('file-type');
const models = require('../mongo/models.mongo');
const moment = require('moment');

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
    is_app: false,
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
    component_name: 'menu',
    variable_name: 'subMenu',
    is_app: true,
    required: [
      'text',
      'href',
      'row',
      'section',
      'is_header',
    ],
    constraints: [
      'text',
      'href',
      'row',
      'section',
      'is_header',
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
    component_name: 'logos',
    required: [
      'text',
      'href',
      'column',
    ],
    constraints: [
      'text',
      'href',
    ],
    ignored: [],
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
  {
    component_name: 'feed',
    required: [
      'text',
      'href',
      'row'
    ],
    constraints: [
      'row',
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
        is_app: body.is_app,
        page_info: {},
      };

      if (body.collection_id) {
        if (!mongoose.Types.ObjectId.isValid(body.collection_id))
          return Promise.reject(error.invalidId);
        obj.page_info.collection_id = body.collection_id;
      }
      if (body.content) {
        obj.page_info.content = body.content;
      }
      if (body.title) {
        obj.page_info.title = body.title;
      }

      let newPage = new this.PageModel(obj);
      return newPage.save();
    } else {

      if (!mongoose.Types.ObjectId.isValid(id))
        return Promise.reject(error.invalidId);

      return this.PageModel.findOneAndUpdate({
        '_id': mongoose.Types.ObjectId(id),
      },
        {
          $set: {
            'address': body.address,
            'is_app': body.is_app,
            'page_info.collection_id': body.collection_id,
            'page_info.content': body.content,
            'page_info.title': body.title
          }
        }, {
          new: true,
        });
    }
  }

  getPageByAddress(body, getNotFinalPlacements = false) {
    if (!body.address) return Promise.reject(error.pageAddressRequired);

    return this.PageModel.findOne({address: body.address}).select('placement page_info').lean()
      .then(res => {
        if (!res) {
          return Promise.resolve({placement: [], page_info: {}})
        } else if (res.placement) {
          let finalList = res.placement.filter(el => el.is_finalized === null || el.is_finalized === undefined || el.is_finalized);
          if (getNotFinalPlacements) {
            // Should get placements archive from archivePlacement collection
            const spDate = body.date ? moment(body.date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');

            let notFinalList = res.placement.filter(el => el.is_finalized === false);
            finalList = finalList.filter(el => !el.is_deleted);

            finalList.forEach(el => {
              if (el.updated_info) {
                Object.assign(el.info, el.updated_info);
              }
            });

            finalList = finalList.concat(notFinalList);

            return models['ArchivePlacement' + (Page.test ? 'Test' : '')].find({page_id: res._id})
              .then(archive_list => {
                archive_list = archive_list.filter(el => moment(moment(el.start_date).format('YYYY-MM-DD')).isBefore(spDate) &&
                  moment(moment(el.end_date).format('YYYY-MM-DD')).isSameOrAfter(spDate));
                res.placement = archive_list.concat(finalList.filter(el => moment(moment(el.start_date).format('YYYY-MM-DD')).isSameOrBefore(spDate)));
                return Promise.resolve(res);
              });
          } else {
            finalList.forEach(el => {
              delete el.is_deleted;
              delete el.updated_info;
            });
            res.placement = finalList;
          }

          return Promise.resolve(res);
        } else {
          return Promise.resolve({placement: [], page_info: res.page_info});
        }
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

  suggest(phrase, options) {
    return this.PageModel.find({$and: [{address: {$regex: phrase, $options: 'i'}},
        {address: {$ne: options.exceptionAddress}}] }, {address: 1})
      .limit(5).sort({address: 1});
  }

  addPlacement(body) {
    if (!body.page_id)
      return Promise.reject(error.pageIdRequired);

    if (!body.placement.component_name)
      return Promise.reject(error.placementDetailsRequired);

    let isIncomplete = false;

    body.is_app = Object.prototype.hasOwnProperty.call(body, 'is_app') ? body.is_app : false;

    const prc = placementsRequirementsConstraints.find(
      el => el.component_name.toLowerCase() === body.placement.component_name.toLowerCase() &&
        (!el.variable_name || (body.placement.variable_name && el.variable_name.toLowerCase() === body.placement.variable_name.toLowerCase())) &&
        (!Object.prototype.hasOwnProperty.call(el, 'is_app') || (body.is_app === el.is_app)));

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
        start_date: new Date(),
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
          $project: {
            'placement.info': {
              $cond: {
                if:
                  {
                    $ifNull: ['$placement.updated_info', false]
                  }
                ,
                then: '$placement.updated_info'
                ,
                else:
                  '$placement.info'
              }
            }
          }
        },
        {
          $match: {
            $and: constraints.concat([{'placement.is_deleted': {$ne: true}}])
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

    body.is_app = Object.prototype.hasOwnProperty.call(body, 'is_app') ? body.is_app : false;

    body.placements.forEach(el => {
      promiseList.push(this.conditionalUpdatingPlacement(el, body.page_id, body.is_app));
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
   * @param isNew
   * @param newId
   * @returns {downloadURL || Promise.<*>}
   *  which is for ng2-upload
   */
  addImage(params, body, file, isNew, newId) {
    if (!body.component_name && !isNew)
      return Promise.reject(error.placementDetailsRequired);

    const tempFilePath = file.path.replace(/\\/g, '/');
    const path = tempFilePath.substr(tempFilePath.indexOf('public') + 'public'.length);
    const type = fileType(readChunk.sync(file.path, 0, 4100));

    body.is_app = Object.prototype.hasOwnProperty.call(body, 'is_app') ? body.is_app : false;

    if (isNew == false)
      return this.conditionalUpdatingPlacement({
        _id: params.placementId,
        component_name: body['component_name'],
        variable_name: body['variable_name'] || '',
        info: {
          imgUrl: path,
          fileType: type,
        }
      }, params.pageId, body.is_app, newId)
        .then(res => {
          return Promise.resolve({
            downloadURL: path,
          });
        });

    return Promise.resolve({
      downloadURL: path,
      placementId: newId,
      fileType: type,
    });
  }

  conditionalUpdatingPlacement(data, pageId, isApp = false, newPlacementId = null) {
    return new Promise((resolve, reject) => {
      this.model.find({_id: pageId}).lean()
        .then(res => {
          const placementObj = res[0].placement.find(el => el._id.toString() === data._id.toString());
          const updateFields = {};

          Object.assign(data.info, {
            start_date: new Date(),
          });

          if (placementObj.is_finalized) {
            updateFields['placement.$.updated_info'] = Object.assign(placementObj.info, data.info);
          }
          else {
            const prc = placementsRequirementsConstraints.find(
              el => el.component_name.toLowerCase() === placementObj.component_name.toLowerCase() &&
                (!el.variable_name || el.variable_name.toLowerCase() === placementObj.variable_name.toLowerCase()) &&
                (!Object.prototype.hasOwnProperty.call(el, 'is_app') || (isApp === el.is_app)));
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
    let result = [];

    return new Promise((resolve, reject) => {
      this.model.findOne({_id: mongoose.Types.ObjectId(body.page_id)}).lean()
        .then(res => {
          let finalList = res.placement.filter(el => el.is_finalized === null || el.is_finalized === undefined || el.is_finalized);
          let notFinalList = res.placement.filter(el => el.is_finalized === false);
          let archiveList = [];

          if (shouldFinalized) {
            finalList.forEach(el => {
              if (el.updated_info) {
                el.info = Object.assign({}, el.updated_info);
                el.start_date = new Date();
                archiveList.push(Object.assign({}, el));
                result.push(el);
                el.updated_info = null;
              } else if (!el.is_deleted) {
                el.info.start_date = new Date();
                result.push(el);
              } else {
                archiveList.push(Object.assign({}, el));
              }
            });

            notFinalList.forEach(el => {
              el.is_finalized = true;
              el.start_date = new Date();
            });
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

          return archiveList.length ? this.archivePlacement(body.page_id, archiveList) : Promise.resolve();
        })
        .then(res => {
          console.log('result: ', result);

          return this.PageModel.update({
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

  archivePlacement(page_id, placement_data) {
    if (placement_data.length)
      placement_data.forEach(el => {
        el.end_date = new Date();
        el.page_id = page_id;
        delete el.is_finalized;
        delete el.is_deleted;
        delete el._id;
        delete el.info._id;
      });
    else {
      placement_data.end_date = new Date();
      placement_data.page_id = page_id;
      delete placement_data.is_finalized;
      delete placement_data.is_deleted;
      delete placement_data._id;
      delete placement_data.info._id;
    }

    return models['ArchivePlacement' + (Page.test ? 'Test' : '')].insertMany(placement_data);
  }

  revertOldPlacements(body) {
    if (!body.page_id)
      return Promise.reject(error.pageIdRequired);

    if (!body.placements || !body.placements.length)
      return Promise.reject(error.placementIdRequired);

    return models['ArchivePlacement' + (Page.test ? 'Test' : '')].find({_id: {$in: body.placements.map(el => mongoose.Types.ObjectId(el))}}).lean()
      .then(res => {
        if (!res.length)
          return Promise.resolve([]);

        res.forEach(el => {
          delete el.end_date;
          delete el.page_id;
          delete el.info._id;
          delete el._id;
          el.start_date = new Date();
        });

        return this.PageModel.update({
          _id: body.page_id,
        }, {
            $addToSet: {
              placement: res,
            }
          });
      });
  }
}

Page.test = false;
module.exports = Page;