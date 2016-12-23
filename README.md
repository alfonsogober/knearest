# K-Nearest
[![npm version](https://badge.fury.io/js/knearest.svg)](https://badge.fury.io/js/knearest)  

A Javascript implementation of the [k-Nearest-Neighbor](https://www.youtube.com/watch?v=UqYde-LULfs) machine-learning algorithm.

## Install

```
npm install knearest
```

## Usage

In this example, consider the following:

* You have real estate data you'd like stored in mongodb.
* Your data consists of stats for rooms, area (in square meters), and type.
* You have a new data point, but you don't know whether it's a house, apartment, or flat.
* You'd like to use a Node.js script to guess the type based on your existing dataset.

```Javascript

const Machine = require('../knearest');
const chalk = require('chalk');

// Some data to get us going. It's important that your data is well-clustered,
// because statistical noise will render this algorithm less useful.
let machine= new Machine({
  k: 5,                                               // Optional. Defaults to 1.
  props: [
    {
      name: 'rooms',
      type: Number
    },
    {
      name: 'area',
      type: Number
    },
    {
      name: 'type',
      type: String
    }
  ],                   // Required. This is the schema of your dataset. All nodes will be checked against this.
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

// knearest is also an EventEmitter.
// The below line will print to terminal each time a node is added.
machine.on('node', console.log);

// Let's add a new data point, this time without a "type".
// We want to guess the value of "type".
// .guess(property, node) returns a bluebird Promise.
machine.guess('type', {rooms: 12, area: 1375 })
  .then((result) => {
    console.log('Value of "' + result.feature + '" is probably ' + chalk.green(result.value) + ' ('+result.elapsed+'ms)');
  });


```

## Docs

### Options

#### `props`
**Type:** `Array`  
**Required:** Yes  
**Description:** The features to be used in the algorithm. These must correspond to your dataset. Similar to a schema.

#### `nodes`
**Type:** `Array`  
**Required:** Yes  
**Description:** The dataset to train with. These must have a consistent structure matching the schema in `props`.

#### `name`
**Type:** `String`  
**Required:** No  
**Default:** `''`  
**Description:** The namespace for your data. Will be added as a prefix to your DB table names.

#### `k`
**Type:** `Number`  
**Required:** No  
**Default:** `1`  
**Description:** The value of k, i.e. how many nearest neighbors to guess with.

#### `data`
**Type:** `Object`  
**Required:** No  
**Default:** `{ store: 'memory' }`  
**Description:** A data configuration object for use with data adapters. Defaults to 'memory'.  
If you want to use a data adapter, specify it here.

The [MongoDB](/adapters/mongo.js) adapter accepts an object like this:
```Javascript
{
  store: 'mongo',                                   
  url: 'mongodb://localhost:27017/knearest'         // Required if store = 'mongo'
}
```

#### `verbose`
**Type:** `Boolean`  
**Required:** No  
**Default:** `false`  
**Description:** Toggle console output. Defaults to false

#### `stringAlgorithm`
**Type:** `Boolean`  
**Required:** No  
**Default:** `'Jaro-Winkler'`  
**Description:** The [String Distance Algorithm](http://www.joyofdata.de/blog/comparison-of-string-distance-algorithms/) to use for calculating string similarity. Accepts either `'Jaro-Winkler'`, `'Levenshtein'`, or `'Dice'`.

### Methods

#### `new Machine([Object options])`
Create an instance using `options` object.

#### `Machine.guess([String prop], [Object data])`
Guess the value of `prop` on `data`, based on the nodes supplied to the constructor. Depending on the size of the dataset, this may take some time.

#### `Machine.setNode([Object obj])`
Add a single training node. Use this to add training data outside of the `nodes` option in the constructor.

#### `Machine.setNodes([String url]|[Array nodes])``
Add multiple training nodes. Use this to add training data outside of the `nodes` option in the constructor.  
Accepts either:
  * A String url for directly downloading from API endpoints. Note that all data will be validated against the schema in `options.props`.
  * an Array of nodes to add to the db. Again, all data will be validated against `options.props` to enforce data integrity.

### Events

`knearest` is an Event Emitter, so you can use the standard `.on(event, callback)` method to listen for emitted data.

```Javascript
Machine.on('ready', () => )
```
Fired when the library has ingested all data and is ready to guess new stuff.

```Javascript
Machine.on('node', ({ id: String, features: Object }) => )
```
Fired when a node is added to the dataset.  

```Javascript
Machine.on('guessing', ({ feature: String, k: Number }) => )
```
Fired immediately when .guess() is called.  

```Javascript
Machine.on('guess', ({ elapsed: Number, feature: String, value: Number }) => )
```
Fired when a guess is complete.

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

Any suggestions or errors should be raised as an Issue on this repository.

## Author

[Alfonso Gober](mailto:alfonso@merciba.com) - [LinkedIn](https://www.linkedin.com/in/alfonsogober) / [Github](https://github.com/alfonsogoberjr)
