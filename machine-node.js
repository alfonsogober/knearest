const Bluebird = require('bluebird');
const uuid = require('uuid/v4');
const EventEmitter = require('events');
const _ = require('lodash');
const Machine = require('./machine');

class MachineNode extends EventEmitter {

  constructor(machine, obj) {
    if (machine && (typeof obj === 'object')) {
      super();
      if (!obj.id) this.id = (uuid()).replace(/-/g, '');
      this.features = {};
      this.neighbors = [];
      this.deltas = {};
      Object.keys(obj.features).forEach((prop) => {
        if (_.includes(machine.props, prop)) this.features[prop] = obj.features[prop];
        else throw new Error('Invalid machine properties for selected node');
      });
    }
    else throw new Error('Machine must be an instance of Machine class and object must be an Object type');
  }

  get(prop) {
    return this.features[prop];
  }

  set(prop, value) {
    this.features[prop] = value;
  }

  sortByDistance() {
    this.neighbors.sort((a, b) => a.distance - b.distance);
  }

  setNeighbors(neighbors) {
    this.neighbors = neighbors;
  }

  guess(prop, k) {
    console.log('guessing "'+prop+'"... ');
    return new Bluebird((resolve, reject) => {
      let count = {};
      let neighbors = this.neighbors.slice(0, k);
      let res = 0;
      _.forEach(neighbors, (neighbor) => {
        _.forEach(Object.keys(neighbor.features), (feature) => {
          if (!count[feature]) count[feature] = {};
          if (!count[feature][neighbor.get(feature)]) count[feature][neighbor.get(feature)] = 0;
          count[feature][neighbor.get(feature)] += 1;
        });
      });
      _.forEach(Object.keys(count[prop]), (val) => {
        if (val >= res) res = parseInt(val);
      });
      resolve(res);
    });
  }

}

module.exports = MachineNode;
