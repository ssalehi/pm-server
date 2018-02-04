/**
 * Created by Eabasir on 30/02/2018.
 */
const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

class Collection extends Base {

    constructor(test = Collection.test) {

        super('Collection', test);

        this.CollectionModel = this.model;
    }

    save(body) {
        let collection = new this.CollectionModel(body);
        return collection.save();
    }

    getCollection() {

    }


}

Collection.test = true;

module.exports = Collection;