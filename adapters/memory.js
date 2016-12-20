'use strict';

const Bluebird = require('bluebird');
const _ = require('lodash');
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
        if (this.verbose) this.log(`Calculating ranges on ${nodes.length} nodes...`);
        return Bluebird.map(nodes, (node) => {
          _.forEach(this.props, (prop) => {
            if (typeof node.features[prop] === 'number') {
              if (node.features[prop] < this.features[prop].min) this.features[prop].min = node.features[prop];
              if (node.features[prop] > this.features[prop].max) this.features[prop].max = node.features[prop];
            }
          });
          return Bluebird.resolve();
        });
      })
      .then(() => {
        _.forEach(this.props, (prop) => {
          if (typeof this.nodes[0].features[prop] === 'number') this.features[prop].range = this.features[prop].max - this.features[prop].min
        });
        this.emit('ranges', this.features);
      });
  }

  machine.calculateArcs = function () {
    return this.getNodes()
      .then((nodes) => {
        if (this.verbose) this.log(`Calculating arcs on ${nodes.length} nodes...`)
        return new Bluebird((resolve) => {
          let count = 0;
          Bluebird.map(nodes, (node) => {
            return Bluebird.map(nodes, (_node) => {
              if (_node.id !== node.id) {
                let features = [];
                let arc = {
                  pair: [node.id, _node.id]
                };
                _.forEach(this.props, (prop) => {
                  if ((typeof node.features[prop] === 'number') && (typeof _node.features[prop] === 'number') && (this.features[prop].range !== 0)) {
                    let delta = (_node.features[prop] - node.features[prop]) / this.features[prop].range;
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
                return this.setArc(arc)
                  .then((res) => {
                    if (res) count++;
                    return res;
                  });
              }
            });
          })
            .then((res) => {
              this.log(`Calculated ${count} arcs.`)
              resolve();
            });
        });
      });
  }

  return Bluebird.resolve();
}
