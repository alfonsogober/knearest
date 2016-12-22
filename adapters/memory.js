'use strict';

const Bluebird = require('bluebird');
const _ = require('lodash');
const natural = require('natural');
const Node = require('../node');

module.exports = (machine) => {
  machine.nodes = [];
  machine.arcs = [];

  machine.getNodes = function () {
    return Bluebird.resolve(this.nodes);
  };

  machine.getNode = function (id) {
    return Bluebird.resolve(_.find(this.nodes, { id: id }))
  };

  machine.setNode = function (obj) {
    let node = new Node(this, { features: obj });
    this.emit('node', { id: node.id, features: node.features });
    this.nodes.push(node);
    return Bluebird.resolve(node);
  };

  machine.updateNode = function (guess) {
    let node = _.find(this.nodes, { id: guess.id });
    node.features[guess.feature] = guess.value;
  };

  machine.getNeighbors = function (id, k) {
    if (this.verbose) this.log(`Getting ${k} nearest neighbors of node ${id}`)
    let result = []
    this.arcs
        .filter((arc) => _.includes(arc.pair, id))
        .sort((a, b) => a.distance - b.distance)
        .splice(0, k ? k : this.k)
        .map((arc) => {
          let newId = _.pull(arc.pair, id)[0];
          result.push(_.find(this.nodes, {id: newId }));
        })
    return Bluebird.resolve(result);
  };

  machine.getArc = function (pair) {
    let result = null;
    _.forEach(this.arcs, (arc) => {
      if (_.includes(arc.pair, pair[0]) && _.includes(arc.pair, pair[1])) result = arc;
    });
    return Bluebird.resolve(result);
  };

  machine.setArc = function (arc) {
    let result = null;
    _.forEach(this.arcs, (a) => {
      if (_.includes(a.pair, arc.pair[0]) && _.includes(a.pair, arc.pair[1])) {
        result = a;
        if (arc.distance !== a.distance) {
          a.distance = arc.distance;
        }
        else result = false;
      }
    });
    if (result === null) {
      this.arcs.push(arc);
      return Bluebird.resolve(arc);
    }
    else return Bluebird.resolve(result);
  }

  machine.calculateRanges = function () {
    return this.getNodes()
      .then((nodes) => {
        if (this.verbose) this.log(`Calculating ranges on ${this.nodes.length} nodes...`);
        return Bluebird.map(nodes, (node) => {
          _.forEach(this.features, (prop, name) => {
            if (this.features[name] && this.features[name].type === 'number') {
              if (node.features[name] < this.features[name].min) this.features[name].min = node.features[name];
              if (node.features[name] > this.features[name].max) this.features[name].max = node.features[name];
            }
          });
          return Bluebird.resolve();
        });
      })
      .then(() => {
        this.emit('ranges', this.features);
      })
      .catch((err) => {
        this.emit('error', err);
        this.log(err);
      });
  }

  machine.calculateArcs = function () {
    return this.getNodes()
      .then((nodes) => {
        if (this.verbose) this.log(`Calculating arcs on ${nodes.length} nodes...`)
        return new Bluebird((resolve) => {
          let arcs = 0;
          let count1 = 0;
          Bluebird.mapSeries(nodes, (node) => {
            let count2 = 0;
            return Bluebird.mapSeries(nodes, (_node) => {
              if (_node.id !== node.id) {
                let features = [];
                let arc = {
                  pair: [node.id, _node.id]
                };
                _.forEach(this.features, (prop, name) => {
                  let delta = 0;
                  if (node.features[name] && _node.features[name] && (typeof node.features[name] === 'number') && (typeof _node.features[name] === 'number') && (this.features[name].range !== 0)) {
                    let difference = 0;
                    if (_node.features[name] > node.features[name]) difference = _node.features[name] - node.features[name];
                    if (node.features[name] > _node.features[name]) difference = node.features[name] - _node.features[name];
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
                arc.distance = features.length > 1 ? features.reduce((x, y) => x + y) : 0;
                return this.setArc(arc)
                  .then((res) => {
                    if (res !== 0) arcs++;
                    count2++;
                    if (count2 === (nodes.length - 1)) {
                      count2 = 0;
                      count1++;
                      if (count1 === (nodes.length - 1)) {
                        this.log(`Calculated ${arcs} arcs.`);
                        resolve();
                      }
                    }
                  });
              }
            });
          });
        });
      })
      .catch((err) => {
        this.emit('error', err);
        this.log(err);
      });
  };

  if (machine.updateOnGuess) machine.on('guess', machine.updateNode);

  return Bluebird.resolve();
}
