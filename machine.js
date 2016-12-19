'use strict';
/*jslint node: true */
/*jslint esversion: 6 */


const Bluebird = require('bluebird');
const uuid = require('uuid/v4');
const EventEmitter = require('events');
const _ = require('lodash');

const adapters = {
  memory: require('./adapters/memory'),
  mongo: require('./adapters/mongo')
};

class Machine extends EventEmitter {

  constructor(options) {
    super();
    if (options && options.nodes && options.props) {
      this.setProps(options.props);
      this.name = options.name ? options.name : '';
      this.k = options && options.k ? options.k : 1;
      this.verbose = options.verbose ? options.verbose : false;
      this.stringAlgorithm = options.stringAlgorithm ? options.stringAlgorithm : 'Jaro-Winkler';
      if (options.name) this.name = options.name;
      if (!options.data || (options.data.store === 'memory')) {
        adapters['memory'](this)
          .then(() => {
            return Bluebird.map(options.nodes, (node) => this.setNode(node))
          })
          .then(() => this.emit('ready'));
          return this;
      }
      else if (options.data && options.data.store === 'mongo' && options.data.url) {
        this.data = options.data;
        adapters['mongo'](this)
          .then(() => {
            return Bluebird.map(options.nodes, (node) => this.setNode(node));
          })
          .then(() => {
            this.emit('ready')
          });
        return this;
      }
      else throw new Error(`Data source '${options.data.store}' not supported.`);
    }
    else throw new Error(`Improper arguments: ${JSON.stringify(options)}`);
  }

  setProps(props) {
    if (this.verbose) console.log(`Setting Machine Properties: ${JSON.stringify(props)}`)
    if (typeof props[0] !== 'undefined') {
      this.props = props;
      this.features = {};
      this.props.forEach((prop) => {
        this.features[prop] = { min: Infinity, max: 0 };
      });
    }
    else throw new Error('Props must be an array with minimum length of 1');
  }

  log(msg) {
    if (this.verbose) console.log(msg)
    this.emit('data', msg);
  }

  guess(prop, obj) {
    return new Bluebird((resolve, reject) => {
      let start = Date.now();
      let count = {};
      this.on('ready', () => {
        this.emit('guessing', { feature: prop, k: this.k });
        return this.setNode(obj)
          .then((node) => {
            return this.calculateRanges()
              .then(() => this.calculateArcs())
              .then(() => this.getNeighbors(node.id, this.k));
          })
          .then((neighbors) => {
            this.log(neighbors);
            return Bluebird.map(neighbors, (neighbor) => {
              _.forEach(Object.keys(neighbor.features), (feature) => {
                if (!count[feature]) count[feature] = {};
                if (!count[feature][neighbor.features[feature]]) count[feature][neighbor.features[feature]] = 0;
                count[feature][neighbor.features[feature]] += 1;
              });
            });
          })
          .then(() => {
            let highest = 0;
            let res = null;
            Object.keys(count[prop]).forEach((val) => {
              if (parseFloat(count[prop][val]) >= highest) {
                highest = parseFloat(count[prop][val]);
                res = val;
              }
            });
            return res;
          })
          .then((guess) => {
            let end = Date.now();
            let duration = end - start;
            let result = { elapsed: duration, feature: prop, value: guess };
            this.emit('guess', result);
            resolve(result);
          });
      });
    });
  }
}

module.exports = Machine;
