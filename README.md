# K-Nearest

A Javascript implementation of the [k-Nearest-Neighbor](https://www.youtube.com/watch?v=UqYde-LULfs) machine-learning algorithm.

## Install

```
npm install knearest
```

## Usage

In this example, consider the following:

* You have real estate data stored in mongodb,
* Your data consists of stats for rooms, area (in square meters), and type.
* You have a new data point, but you don't know whether it's a house, apartment, or flat.
* You'd like to use a Node.js script to guess the type based on your existing dataset.

```Javascript

'use strict';

const Machine = require('../knearest');
const chalk = require('chalk');

// Some data to get us going. It's important that your data is well-clustered,
// because statistical noise will render this algorithm less useful.
let machine= new Machine({
  k: 5,                                               // Optional. Defaults to 1.
  props: ['rooms', 'area', 'type'],                   // Required. This is the schema of your dataset. All nodes will be checked against this.
  nodes: [                                            // Required. There must be some data to seed the AI's knowledge
    { rooms: 1, area: 350, type: 'apartment' },
    { rooms: 2, area: 300, type: 'apartment' },
    { rooms: 3, area: 300, type: 'apartment' },
    { rooms: 4, area: 250, type: 'apartment' },
    { rooms: 4, area: 500, type: 'apartment' },
    { rooms: 4, area: 400, type: 'apartment' },
    { rooms: 5, area: 450, type: 'apartment' },
    { rooms: 7, area: 850, type: 'house' },
    { rooms: 7, area: 900, type: 'house' },
    { rooms: 7, area: 1200, type: 'house' },
    { rooms: 8, area: 1500, type: 'house' },
    { rooms: 9, area: 1300, type: 'house' },
    { rooms: 8, area: 1240, type: 'house' },
    { rooms: 10, area: 1700, type: 'house' },
    { rooms: 9, area: 1000, type: 'house' },
    { rooms: 1, area: 800, type: 'flat' },
    { rooms: 3, area: 900, type: 'flat' },
    { rooms: 2, area: 700, type: 'flat' },
    { rooms: 1, area: 900, type: 'flat' },
    { rooms: 2, area: 1150, type: 'flat' },
    { rooms: 1, area: 1000, type: 'flat' },
    { rooms: 2, area: 1200, type: 'flat' },
    { rooms: 1, area: 1300, type: 'flat' }
  ],
  data: {
    store: 'mongo',                                   // Optional. Defaults to 'memory'
    url: 'mongodb://localhost:27017/knearest'         // Required if store = 'mongo'
  },
  verbose: true,                                      // Optional. Toggle console output. Defaults to false
  stringAlgorithm: 'Levenshtein'                      // Optional. Defaults to 'Jaro-Winkler'
});

// Let's add a new data point, this time without a "type".
// We want to guess the value of "type".
var unknown = {rooms: 12, area: 1375 };

// knearest is also an EventEmitter.
// The below line will print to terminal each time a node is added.
machine.on('node', console.log);

// .guess(property, node) returns a bluebird Promise.
machine.guess('type', unknown)
  .then((result) = {
    console.log('Value of "' + result.feature + '" is probably ' + chalk.green(result.value) + ' ('+result.elapsed+'ms)');
    process.exit(0);
  });

```

## Docs

### Methods

#### `new Machine(Object options)`
Create an instance using `options` object.

`options` expects the following structure:

```Javascript
{
  k: Number // Optional. The value of k, i.e. how many nearest neighbors to guess with.
  props: Array // Required. The features to be used in the algorithm. These must correspond to your dataset.
  nodes: Array // Required. The dataset to train with. These must have a consistent structure.
  data: Object // Optional. A data configuration object for use with data adapters. Defaults to 'memory', which is not for production use.
  verbose: Boolean, // Optional. Toggle console output. Defaults to false
  stringAlgorithm: String // Optional. The [String Distance Algorithm](http://www.joyofdata.de/blog/comparison-of-string-distance-algorithms/) to use for calculating string similarity. defaults to 'Jaro-Winkler'
}
```

#### `Machine.guess(String prop, Object data)`
Guess the value of `prop` on `data`, based on the nodes supplied to the constructor. Depending on the size of the dataset, this may take some time.

### Events

`'node'`: Fired when a node is added to the dataset. Data structure: `{ id: String, features: Object }`.  

`'guessing'`: Fired immediately when .guess() is called. Data structure: `{ feature: String, k: Number }`.  

`'guess'`: Fired when a guess is complete. Data structure: `{ elapsed: Number, feature: String, value: Number }`.

`'ranges'`: Fired when new ranges are calculated. Data structure: `{ String: { min: Number, max: Number, range: Number }, ...}`.  

### Adapters

`knearest` uses an adapter system to interface with databases. This is necessary because the 'memory' adapter (which is default) will only be able to handle what will fit in RAM, which is usually not very much. ML applications generally require a _lot_ of data, so a database is the only serious option for production use.

See the [Writing Adapters](/adapters/writing-adapters.md) section for more info on how to build an adapter.

#### [Memory](/adapters/memory.js)

This is the default adapter, which will simply store all data points on the machine object in runtime, with nodes at `this.nodes` and arcs at `this.arcs`. Useful for demos and as a ML beginners' sandbox, to learn how the k-nearest-neighbors algorithm works. Not suitable for production use or large datasets.

#### [MongoDB](/adapters/mongo.js)

This is the MongoDB adapter. It allows you to work with datasets as large as your MongoDB instance will hold.

## TODO

* Tests are needed, will come soon.

We are accepting pull requests for the following adapters:

* PostgreSQL
* RethinkDB
* MySQL

Any suggestions or erros should be raised as an Issue on this repository.

## Author

[Alfonso Gober](mailto:alfonso@merciba.com) - [LinkedIn](https://www.linkedin.com/in/alfonsogober) / [Github](https://github.com/alfonsogoberjr)
