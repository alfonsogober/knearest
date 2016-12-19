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
        if (_.includes(machine.props, prop)) this.features[prop] = obj.features[prop];
        else throw new Error('Invalid machine properties for selected node');
      });
    }
    else throw new Error('Machine must be an instance of Machine class and object must be an Object type');
  }

}

module.exports = Node;
