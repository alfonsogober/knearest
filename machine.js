'use strict';
/*jslint node: true */
/*jslint esversion: 6 */

const Bluebird = require('bluebird');
const uuid = require('uuid/v4');
const EventEmitter = require('events');
const _ = require('lodash');
const oboe = require('oboe');

const adapters = {
  memory: require('./adapters/memory'),
  mongo: require('./adapters/mongo')
};

class Machine extends EventEmitter {

  constructor(options) {
    if (options && options.nodes && options.props) {
      super();
      this.setProps(options.props);

      this.adapters = adapters;
      this.name = options.name ? options.name : 'knearest';
      this.k = options && options.k ? options.k : 1;
      this.verbose = options.verbose ? options.verbose : false;
      this.stringAlgorithm = options.stringAlgorithm ? options.stringAlgorithm : 'Jaro-Winkler';
      this.updateOnGuess = options.updateOnGuess ? options.updateOnGuess : true;
      this.data = (options.data && options.data.store) ? options.data : { store: 'memory' };
      this.transform = (typeof options.transform === 'function') ? options.transform : Bluebird.resolve;

      if (this.adapters[this.data.store]) {
        this.adapters[this.data.store](this)
          .then(() => { return this.setNodes(options.nodes) })
          .then(() => { this.emit('ready') })
          .catch((err) => {
            throw new Error(err);
          });
          return this;
      }
      else throw new Error(`Data source '${options.data.store}' not supported.`);
    }
    else throw new Error(`Improper arguments: ${JSON.stringify(options)}`);
  };

  setProps(props) {
    if (this.verbose) console.log(`Setting Machine Properties: ${JSON.stringify(props)}`)
    if (props.length) {
      this.features = {};
      props.forEach((prop) => {
        if (prop.name && prop.type) this.features[prop.name] = { min: Infinity, max: 0, type: typeof prop.type() };
        else throw new Error('Invalid properties');
      });
    }
    else throw new Error('Props must be an array with minimum length of 1');
  };

  setNodes(arg, str) {
    this.log("Setting nodes...");
    let pattern = str ? str : "!.*";
    return new Bluebird((resolve, reject) => {
      if (typeof arg === 'string') {
        oboe(arg)
          .node(pattern, (item) => {
            this.transform(item)
              .then(this.setNode)
              .catch(reject);
            return oboe.drop;
          })
          .done(resolve);
      }
      else if (arg && arg[0]) {
        resolve(Bluebird.mapSeries(arg, (node) => this.setNode(node)));
      }
      else resolve(this.setNode(arg));
    });
  };

  log(msg) {
    if (this.verbose) console.log(msg)
    this.emit('data', msg);
  };

  guess(prop, obj) {
    return new Bluebird((resolve, reject) => {
      let start = Date.now();
      let count = {};
      let features;
      let id;
      this.on('ready', () => {
        this.emit('guessing', { feature: prop, k: this.k });
        this.setNodes(obj)
          .then((node) => {
            features = node.features;
            id = node.id;
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
            let result = { id: id, input: features, elapsed: duration, feature: prop, value: guess };
            this.emit('guess', result);
            resolve(result);
          })
          .catch(reject);
      });
    });
  }
}

module.exports = Machine;
