/*jslint node: true */
/*jslint esversion: 6 */

const Bluebird = require('bluebird');
const uuid = require('uuid/v4');
const EventEmitter = require('events');
const _ = require('lodash');
const MachineNode = require('./machine-node');

class Machine extends EventEmitter {

  constructor(options) {
    super();
    this.nodes = [];
    if (options && options.props) this.setProps(options.props);
    if (options && options.nodes) _.forEach(options.nodes, (node) => this.nodes.push(new MachineNode(this, { features: node })));
    this.k = options && options.k ? options.k : 1;
  }

  setProps(props) {
    if (typeof props[0] !== 'undefined') {
      this.props = props;
      this.features = {};
      this.props.forEach((prop) => {
        this.features[prop] = { min: Infinity, max: 0 };
      });
    }
    else throw new Error('Props must be an array with minimum length of 1');
  }

  addNode(node) {
    this.nodes.push(node);
    this.emit('node', { id: node.id, features: node.features });
  }

  calculateRanges() {
    return Bluebird.map(this.nodes, (node) => {
      _.forEach(this.props, (prop) => {
        if (node.get(prop) < this.features[prop].min) this.features[prop].min = node.get(prop);
        if (node.get(prop) > this.features[prop].max) this.features[prop].max = node.get(prop);
      });
      return Bluebird.resolve();
    })
      .then(() => {
        _.forEach(this.props, (prop) => this.features[prop].range = this.features[prop].max - this.features[prop].min);
        this.emit('ranges', this.features);
      });
  }

  calculateDistances() {
    return Bluebird.map(this.nodes, (node) => {
      return Bluebird.map(this.nodes, (_node) => {
        if (_node.id !== node.id) {
          let neighbor = new MachineNode(this, _node);
          let features = [];
          _.forEach(this.props, (prop) => {
            if ((typeof node.get(prop) === 'number') && (typeof _node.get(prop) === 'number') && (this.features[prop].range !== 0)) {
              neighbor.deltas[prop] = (neighbor.get(prop) - node.get(prop)) / this.features[prop].range;
              let feature = Math.sqrt(neighbor.deltas[prop] * neighbor.deltas[prop]);
              features.push(feature);
            }
          });
          neighbor.distance = features.length > 1 ? features.reduce((x, y) => x + y) : features[0];
          this.emit('distance', { parent: node.id, child: _node.id, distance: neighbor.distance });
          return Bluebird.resolve(neighbor);
        }
      })
        .then((neighbors) => {
          node.setNeighbors(neighbors);
          node.sortByDistance();
          return node;
        });
    });
  }

  guess(prop, obj) {
    this.emit('guessing', { feature: prop, k: this.k });
    let start = Date.now();
    let node = new MachineNode(this, { features: obj });
    this.addNode(node);
    return this.calculateRanges()
      .then(this.calculateDistances.bind(this))
      .then(() => {
        return node.guess(prop, this.k);
      })
      .then((guess) => {
        let end = Date.now();
        let duration = end - start;
        let result = { elapsed: duration, feature: prop, value: guess };
        this.emit('guess', result);
        node.set(prop, guess);
        return result;
      });
  }

}

module.exports = Machine;
