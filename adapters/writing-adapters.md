# Writing Adapters

## API

An adapter looks like this:

```Javascript
'use strict';

const Bluebird = require('bluebird');
const natural = require('natural');
const Node = require('knearest/node');
const _ = require('lodash');

module.exports = (machine) => {
  return new Bluebird((success, failure) => {

      machine.getNodes = function () {
        // Get the full list of nodes from the 'nodes' collection or table
        // Return a promise, resolve with the list
      };

      machine.getNode = function (id) {
        // Get a single node from the 'nodes' collection or table
        // Return a promise, resolve with the node
      }

      machine.setNode = function (obj) {
        // Create a Node instance with new Node(this, { features: obj })
        // Add { id: node.id, features: obj } to 'nodes' collection or table
        // Emit 'node' event with this.emit('node', { id: node.id, features: node.features })
        // Return a promise, resolve with the Node instance
      };

      machine.updateNode = function (guess) {
        // Update the node at guess.id with guess.feature = guess.value.
      };

      machine.getNeighbors = function (id, k) {
        // if (this.verbose) this.log(`Getting ${k} nearest neighbors of node ${id}`)
        // Find the first k arcs in 'arcs' collection or table, which contains the given id in its 'pair', sort in ascending order.
        // For each arc, get the neighbor Node using _.pull(arc.pair, id)[0] to get the other id in 'pair'
        // Return a promise, resolve with the neighbor nodes.
      };

      machine.getArc = function (pair) {
        // Get a single arc from the 'arcs' collection or table
        // Return a promise, resolve with the arc
      };

      machine.setArc = function (arc) {
        // Search first for any arcs with a pair containing any of the ids in arc.pair
        // If none, add arc to database, resolve with arc.
        // If it exists already, and the distance is different, update with arc.distance resolve with arc
        // If it exists already, and the distance is the same, skip by resolving to false
        // If it doesn't exist, add the arc to the 'arcs' collection or table and resolve with arc
      };

      machine.calculateRanges = function () {
        // For each node in the dataset, tally up the highest and lowest properties (if they are numbers) at this.features[<property>].max and this.features[<property>].min
        // For each feature on this.features, calculate the range by subtracting min from max, assign to this.features[prop].range
        // Emit 'ranges' event with this.features
        // Return a promise, resolve
      };

      machine.calculateArcs = function () {
        // Create a Promise array.
        //    let promises = []
        // For each node, iterate through every other node.
        //    let arc = {
        //      pair: [node.id, neighbor.id]
        //    }
        // For each neighbor node, iterate through the features.
        //    let features = []
        // For each feature on each neighbor node, calculate the distance.
        // If the feature is a number:
        //    let delta = (_node.features[prop] - node.features[prop]) / this.features[prop].range)
        //    let squares = Math.sqrt(delta * delta)
        //    features.push(squares)
        // If the feature is a String:
        //    let delta;
        //    if (this.stringAlgorithm === 'Jaro-Winkler') delta = natural.JaroWinklerDistance(node.features[prop], _node.features[prop]);
        //    else if (this.stringAlgorithm === 'Levenshtein') delta = natural.LevenshteinDistance(node.features[prop], _node.features[prop]);
        //    else if (this.stringAlgorithm === 'Dice') delta = natural.DiceCoefficient(node.features[prop], _node.features[prop]);
        //    let squares = Math.sqrt(delta * delta)
        //    features.push(squares)
        // After iterating the features, add them together with
        //    arc.distance = features.length > 1 ? features.reduce((x, y) => x + y) : features[0]
        // Add a call to this.setArc(arc), to the Promise array
        //    promises.push(this.setArc(arc))
        // Finally, filter by new or updated arcs and log the total.
        //    Promise.filter(promises, (n) => n)
        //      .then((result) => {
        //        this.log(`Calculated ${result.length} arcs.`);
        //        resolve();
        //      })
      };

      success();
    });
  });
}

```

## Guidelines

* Try your best to use the _most efficient_ db queries possible. Keep the full list of nodes and arcs out of the runtime. Iterate them using DB-level queries (For example, SQL or ReQL) wherever possible.
