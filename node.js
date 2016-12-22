'use strict';
/*jslint node: true */
/*jslint esversion: 6 */

const Bluebird = require('bluebird');
const uuid = require('uuid/v4');
const EventEmitter = require('events');
const _ = require('lodash');
const Machine = require('./machine');

class Node extends EventEmitter {

  constructor(machine, obj) {
    if (machine && (typeof obj === 'object')) {
      super();
      this.id = !obj.id ? (uuid()).replace(/-/g, '') : obj.id;
      this.features = {};
      Object.keys(obj.features).forEach((prop) => {
        if (typeof obj.features[prop] === machine.features[prop].type) this.features[prop] = obj.features[prop];
        else throw new Error(`Incorrect feature type on node ${this.id}: Expected feature '${prop}' to be a ${machine.features[prop].type}, got ${typeof obj.features[prop]}`);
      });
    }
    else throw new Error('Machine must be an instance of Machine class and object must be an Object type');
  }

}

module.exports = Node;
