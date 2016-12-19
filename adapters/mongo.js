'use strict';

const Bluebird = require('bluebird');
const MongoClient = require('mongodb').MongoClient;
const natural = require('natural');
const Node = require('../node');
const _ = require('lodash');

module.exports = (machine) => {
  return new Bluebird((success, failure) => {
    MongoClient.connect(machine.data.url, function (err, db) {
      if (err) throw new Error(err);

      machine.db = db;

      let nodes = machine.db.collection(`${this.name}Nodes`);
      let arcs = machine.db.collection(`${this.name}Arcs`);

      machine.getNodes = function () {
        return new Bluebird((resolve, reject) => {
          nodes.find({}, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      };

      machine.getNode = function (id) {
        return new Bluebird((resolve, reject) => {
          nodes.findOne({ id: id }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      }

      machine.setNode = function (obj) {
        return new Bluebird((resolve, reject) => {
          let node = new Node(this, { features: obj })
          nodes.insert({ id: node.id, features: obj }, (err, result) => {
            if (result.result.ok === 1) {
              resolve(result.ops[0]);
              this.emit('node', { id: node.id, features: node.features });
            }
          });
        });
      };

      machine.getNeighbors = function (id, k) {
        return new Bluebird((resolve, reject) => {
          if (this.verbose) this.log(`Getting ${k} nearest neighbors of node ${id}`)
          let limit = k ? k : this.k;
          let promises = [];
          arcs.find({ pair: id }).limit(limit).sort({"distance": 1}).each((err, arc) => {
            if (err) reject(err);
            else if (arc === null) resolve(Bluebird.all(promises))
            else {
              let newId = _.pull(arc.pair, id)[0];
              promises.push(this.getNode(newId));
            }
          });
        });
      };

      machine.getArc = function (pair) {
        return new Bluebird((resolve, reject) => {
          arcs.findOne({ pair: pair }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      };

      machine.setArc = function (arc) {
        return new Bluebird((resolve, reject) => {
          arcs.findOne({ pair: [new RegExp(`${arc.pair[0]}|${arc.pair[1]}`), new RegExp(`${arc.pair[0]}|${arc.pair[1]}`)] }, (err, result) => {
            if (err) reject(err);
            else if (result === null) {
              arcs.insert(arc, (err, res) => {
                if (res.result.ok === 1) resolve(res.ops[0]);
              });
            }
            else if (_.includes(result.pair, arc.pair[0]) && _.includes(result.pair, arc.pair[0]) && (result.distance !== arc.distance)) {
              arcs.update(result._id, arc, (err, res) => {
                if (err) reject(err);
                else resolve(res);
              });
            }
            else {
              resolve(false);
            }
          });
        });
      };

      machine.calculateRanges = function () {
        return new Bluebird((resolve, reject) => {
          let count = 0;
          nodes.count()
            .then((nodesCount) => {
              this.log(`Calculating ranges on ${nodesCount} nodes...`);
              nodes.find().forEach((node) => {
                _.forEach(this.props, (prop) => {
                  if (typeof node.features[prop] === 'number') {
                    if (node.features[prop] < this.features[prop].min) this.features[prop].min = node.features[prop];
                    if (node.features[prop] > this.features[prop].max) this.features[prop].max = node.features[prop];
                  }
                });
                count++;
                if (count === nodesCount) {
                  _.forEach(this.props, (prop) => {
                    if (typeof node.features[prop] === 'number') this.features[prop].range = this.features[prop].max - this.features[prop].min;
                  });
                  this.emit('ranges', this.features);
                  resolve();
                }
              });
            });
        });
      };

      machine.calculateArcs = function () {
        return nodes.count()
          .then((nodesCount) => {
            return new Bluebird((resolve, reject) => {
              let count1 = 0;
              let promises = [];
              if (this.verbose) this.log(`Calculating arcs on ${nodesCount} nodes...`);
              nodes.find().forEach((node) => {
                let count2 = 0;
                nodes.find().forEach((_node) => {
                  if (_node.id !== node.id) {
                    let features = [];
                    let arc = {
                      pair: [node.id, _node.id]
                    };
                    _.forEach(this.props, (prop) => {
                      let delta;
                      if ((typeof node.features[prop] === 'number') && (typeof _node.features[prop] === 'number') && (this.features[prop].range !== 0)) {
                        delta = (_node.features[prop] - node.features[prop]) / this.features[prop].range;
                        let feature = Math.sqrt(delta * delta);
                        features.push(feature);
                      }
                      else if ((typeof node.features[prop] === 'string') && (typeof _node.features[prop] === 'string') && (this.features[prop].range !== 0)) {
                        if (this.stringAlgorithm === 'Jaro-Winkler') delta = natural.JaroWinklerDistance(node.features[prop], _node.features[prop]);
                        else if (this.stringAlgorithm === 'Levenshtein') delta = natural.LevenshteinDistance(node.features[prop], _node.features[prop]);
                        else if (this.stringAlgorithm === 'Dice') delta = natural.DiceCoefficient(node.features[prop], _node.features[prop]);
                        let feature = Math.sqrt(delta * delta);
                        features.push(feature);
                      }
                    });
                    arc.distance = features.length > 1 ? features.reduce((x, y) => x + y) : features[0];
                    promises.push(this.setArc(arc));
                  }
                  count2++;
                  if (count2 === nodesCount) {
                    count2 = 0;
                    count1++;
                    if (count1 === nodesCount) {
                      Bluebird.filter(promises, (n) => n)
                        .then((result) => {
                          this.log(`Calculated ${result.length} arcs.`);
                          resolve();
                        })
                    }
                  }
                });
              });
            });
          });
      };

      success();
    });
  });
}
