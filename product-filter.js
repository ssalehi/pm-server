/**
 * Created by SSalehi on 11/07/2018.
 */
/**
 * What this script do?
 * removes the products that have to images,
 * the color of products that has no images,
 * the instance of a product that has no image,
 * from the database
 */
const Base = require('./lib/base.model');
const error = require('./lib/errors.list');
const rmPromise = require('rimraf-promise');
const env = require('./env');
const path = require('path');
const db = require('./mongo');
const models = require('./mongo/models.mongo');
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
        if (el.colors.filter(item => !(item.image && item.image.thumbnail)).length)
          colorWithoutImage.push(el);
      });

      allColorHasImage = imageProd.filter(el => colorWithoutImage.indexOf(el) === -1);

      colorWithoutImage.forEach(item => {
        item.colors.forEach(el => {
          if (!(el.image && el.image.thumbnail)) {
            tempArray.push({
              product_id: item._id,
              color_id: el._id,
            });
          }
        });
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
    .then((res) => {
      console.log("remove products result: ", res);
      return models()['Product'].update(
        {},
        {
          $pull: {
            instances: {_id: {$in: instance_ids}},
            colors: {_id: {$in: color_ids}}
          }
        },
        {multi: true}
      );
    })
    .then(res => {
      console.log("update product colors and instances result: ", res);
      console.log('Filtering Products is done');
      process.exit();
    })
}

db.dbIsReady()
  .then(() => {
    return modelIsReady();
  })
  .then(res => {
    return filterProductCollection();
  });


modelIsReady = () => {
  return new Promise((resolve, reject) => {

    getModels = () => {

      setTimeout(() => {
        if (!models() || models().length)
          getModels();
        else
          resolve();
      }, 500);

    }
    getModels();
  })

}

