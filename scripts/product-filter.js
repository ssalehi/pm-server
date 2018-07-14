/**
 * Created by SSalehi on 11/07/2018.
 */
const Base = require('../lib/base.model');
const error = require('../lib/errors.list');
const rmPromise = require('rimraf-promise');
const env = require('../env');
const path = require('path');
const db = require('../mongo');
const models = require('../mongo/models.mongo');
const mongoose = require('mongoose');


let imageProd = [];
let multiColorProd = [];
let colorWithoutImage = [];
let allColorHasImage = [];
let tempArray = [];
let shouldRemoveProd = [];
let finalArray = [];

let product_ids = [];
let color_ids = [];
let instance_ids = [];


function filterProductCollection() {
  return models()['Product'].find({'colors.image.thumbnail': {$exists: true}}).lean()
    .then(res => {
      imageProd = res;
      multiColorProd = res.filter(el => el.colors.length > 1);
      multiColorProd.forEach(el => {
        if (el.colors.filter(item => !item.image.thumbnail).length)
          colorWithoutImage.push(el);
      });

      allColorHasImage = imageProd.filter(el => colorWithoutImage.indexOf(el) === -1);

      colorWithoutImage.forEach(item => {
        item.colors.forEach(el => {
          if (!el.image.thumbnail) {
            tempArray.push({
              product_id: item._id,
              color_id: el._id,
            })
          }
        })
      });

      colorWithoutImage.forEach(item => {
        let temp_color_id_arr = tempArray.filter(el => el.product_id.toString() === item._id.toString());

        let remove_color_id_array = temp_color_id_arr.map(el => el.color_id.toString());
        let color_id_array = item.colors.filter(el => remove_color_id_array.indexOf(el._id.toString()) === -1);

        let instance_array = item.instances.filter(el => remove_color_id_array.indexOf(el.product_color_id.toString()) === -1);
        let remove_instance_array = item.instances.filter(el => remove_color_id_array.indexOf(el.product_color_id.toString()) !== -1);

        shouldRemoveProd.push({
          product_id: item._id,
          color_id: remove_color_id_array,
          instance_array: remove_instance_array,
        });

        item.colors = color_id_array;
        item.instances = instance_array;
      });
      finalArray = allColorHasImage.concat(colorWithoutImage);

      product_ids = finalArray.map(el => el._id.toString());
      if (shouldRemoveProd && shouldRemoveProd.length)
        shouldRemoveProd.forEach(el => {
          el.instance_array.forEach(item => instance_ids.push(item._id.toString()));
          el.color_id.forEach(item => color_ids.push(item.toString()));
        });
      return models()['Product'].remove({_id: {$nin: product_ids}})
    })
    .then(() => {
      return models()['Product'].update(
        {},
        {$pull: {instances: {_id: {$in: instance_ids}}, colors: {_id: {$in: color_ids}}}},
        {multi: true}
      );
    })
    .then(res => {
      console.log('Filtering Products is done');
      process.exit();
      // return Promise.resolve({
      //   'finalArray': finalArray,
      //   'shouldRemoveArray': shouldRemoveProd
      // });
    })
}

db.dbIsReady()
  .then(res => {
    filterProductCollection();
  });