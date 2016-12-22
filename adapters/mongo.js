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

      let nodes = machine.db.collection(`${machine.name}Nodes`);
      let arcs = machine.db.collection(`${machine.name}Arcs`);

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
              this.emit('node', { id: node.id, features: node.features });
              resolve(result.ops[0]);
            }
            else reject(err);
          });
        });
      };

      machine.updateNode = function (guess) {
        let update = {"$set": {}}
        guess.input[guess.feature] = guess.value;
        update["$set"].features = guess.input;
        nodes.update({ id: guess.id }, update, (err, res) => {
          if (err) reject(err);
          if (res && res.result.nModified === 1) this.log(`Updated node ${guess.id}`)
        });
      };

      machine.getNeighbors = function (id, k) {
        return new Bluebird((resolve, reject) => {
          if (this.verbose) this.log(`Getting ${k} nearest neighbors of node ${id}`)
          let limit = k ? k : this.k;
          let ids = [];
          arcs.find({ pair: id }).sort({"distance": 1}).each((err, arc) => {
            if (err) reject(err);
            else if (ids.length === limit) resolve(Bluebird.map(ids, (nodeid) => this.getNode(nodeid)));
            else {
              let newId = _.pull(arc.pair, id)[0];
              if (!_.includes(ids, newId)) ids.push(newId);
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
            else resolve(0);
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
                _.forEach(this.features, (prop, name) => {
                  if (this.features[name].type === 'number') {
                    if (node.features[name] < this.features[name].min) this.features[name].min = node.features[name];
                    if (node.features[name] > this.features[name].max) this.features[name].max = node.features[name];
                  }
                });
                count++;
                if (count === nodesCount) {
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
              let arcs = 0;
              if (this.verbose) this.log(`Calculating arcs on ${nodesCount} nodes...`);
              nodes.find().forEach((node) => {
                let count2 = 0;
                nodes.find().forEach((_node) => {
                  if (_node.id !== node.id) {
                    let features = [];
                    let arc = {
                      pair: [node.id, _node.id]
                    };
                    _.forEach(this.features, (prop, name) => {
                      let delta = 0;
                      if (node.features[name] && _node.features[name] && (typeof node.features[name] === 'number') && (typeof _node.features[name] === 'number') && (this.features[name].range !== 0)) {
                        let difference = 0;
                        if (_node.features[name] > node.features[name]) difference = _node.features[name] - node.features[name]
                        else if (node.features[name] > _node.features[name]) difference = node.features[name] - _node.features[name]
                        delta = difference / (prop.max - prop.min);
                        let feature = Math.sqrt(delta * delta);
                        features.push(feature);
                      }
                      else if (node.features[name] && _node.features[name] && (typeof node.features[name] === 'string') && (typeof _node.features[name] === 'string') && (this.features[name].range !== 0)) {
                        if (this.stringAlgorithm === 'Jaro-Winkler') delta = natural.JaroWinklerDistance(node.features[name], _node.features[name]);
                        if (this.stringAlgorithm === 'Levenshtein') delta = natural.LevenshteinDistance(node.features[name], _node.features[name]);
                        if (this.stringAlgorithm === 'Dice') delta = natural.DiceCoefficient(node.features[name], _node.features[name]);
                        let feature = Math.sqrt(delta * delta);
                        features.push(feature);
                      }
                    });
                    arc.distance = features.length > 1 ? features.reduce((x, y) => x + y) : features[0];
                    this.setArc(arc)
                      .then((res) => {
                        if (res !== 0) arcs++;
                        count2++;
                        if (count2 === (nodesCount - 1)) {
                          count2 = 0;
                          count1++;
                          if (count1 === (nodesCount - 1)) {
                            this.log(`Calculated ${arcs} arcs.`);
                            resolve();
                          }
                        }
                      });
                  }
                });
              });
            });
          });
      };

      if (machine.updateOnGuess) machine.on('guess', machine.updateNode);

      success();
    });
  });
}
