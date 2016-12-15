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
    console.log('K-Nearest Machine is online');
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
      });
  }

  calculateDistances() {
    return Bluebird.map(this.nodes, (node) => {
      return Bluebird.map(this.nodes, (_node) => {
        if (_node.id !== node.id) {
          let neighbor = new MachineNode(this, _node);
          let features = [];
          _.forEach(this.props, (prop) => {
            if (node.get(prop)) {
              neighbor.deltas[prop] = (neighbor.get(prop) - node.get(prop)) / this.features[prop].range;
              features.push(Math.sqrt(neighbor.deltas[prop] * neighbor.deltas[prop]));
            }
          });
          neighbor.distance = features.reduce((x, y) => x + y);
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
    let start = Date.now();
    let node = new MachineNode(this, { features: obj });
    this.addNode(node);
    return this.calculateRanges()
      .then(this.calculateDistances.bind(this))
      .then(() => {
        return node.guess(prop, this.k)
      })
      .then((guess) => {
        let end = Date.now();
        let duration = end - start;
        console.log('Done in '+duration+'ms');
        return guess;
      });
  }

}

module.exports = Machine;
