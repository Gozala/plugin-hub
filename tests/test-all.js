/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true newcap: true undef: true es5: true node: true devel: true
         forin: true */
/*global define: true */

(typeof define === "undefined" ? function ($) { $(require, exports, module) } : define)(function (require, exports, module, undefined) {

"use strict";

var hub = require('../core')

exports['test id generation'] = function(assert) {
  assert.equal(hub.id({}), '@0.0.0', 'generates default id')
  assert.equal(hub.id({ name: 'a' }), 'a@0.0.0',
               'generates id with default version')
  assert.equal(hub.id({ version: '0.0.1' }), '@0.0.1',
               'generate name undefined')
  assert.equal(hub.id({ name: 'a', version: '0.0.2' }), 'a@0.0.2',
               'generate id from name and version')
}

exports['test install'] = function(assert) {
  assert.ok(hub.install({ name: 'a2', no: 1 }), 'install returns true')
  assert.ok(hub.install({ name: 'b2', version: '0.1.0' }), 'install succeeds')
  assert.ok(!hub.install({ name: 'a2' }), 'plugin was not installed')

  assert.ok(hub.isInstalled('a2@0.0.0'), 'plugin is installed')
  assert.ok(hub.isInstalled('b2@0.1.0'), 'plugin is installed')

  hub.uninstall('a2@0.0.0')
  hub.uninstall('b2@0.1.0')
}

exports['test plug'] = function(assert) {
  var a = { name: 'a3', version: '0.0.1' }
  var b = { name: 'b3', version: '0.2.1', dependencies: [ 'a3@0.0.1' ] }
  var c = { name: 'c3', dependencies: [ 'a3@0.0.1', 'b3@0.2.1' ] }

  hub.install(a)
  hub.install(b)
  hub.plug(c)

  assert.ok(hub.isPlugged(hub.id(a)), 'dependent plugin was plugged')
  assert.ok(hub.isPlugged(hub.id(b)), 'dependent plugin was plugged')
  assert.ok(hub.isPlugged(hub.id(c)), 'all dependecies are plugged')

  hub.uninstall('a3@0.0.1')
  hub.uninstall('b3@0.2.1')
  hub.uninstall('c3@0.0.0')
}

exports['test plug unmet dependency'] = function(assert) {
  var d = { name: 'd4', version: '0.1.0', dependencies: [ 'e4@0.0.1' ] }
  var e = { name: 'e4', version: '0.0.1' }

  assert.throws(function() {
    hub.plug(d)
  }, /e4@0.0.1/, 'throws on unmet dependecy')

  hub.install(e)
  hub.plug(d)

  assert.ok(hub.isPlugged('e4@0.0.1'), 'dependency was plugged')
  assert.ok(hub.isPlugged('d4@0.1.0'), 'plugin was installed')

  hub.uninstall('e4@0.0.1')
  hub.uninstall('d4@0.1.0')
}

exports['test unplug unplugs dependents'] = function(assert) {
  var a = { name: 'a5', dependencies: [ 'b5@0.0.0' ] }
  var b = { name: 'b5' }

  hub.install(b)
  hub.plug(a)

  assert.ok(hub.isPlugged('b5@0.0.0'), 'dependency is plugged')
  assert.ok(hub.isPlugged('a5@0.0.0'), 'all plugins are plugged')

  hub.unplug('b5@0.0.0')

  assert.ok(!hub.isPlugged('b5@0.0.0'), 'dependency is unplugged')
  assert.ok(!hub.isPlugged('a5@0.0.0'), 'all plugins are unplugged')

  hub.uninstall('b5@0.0.0')
  hub.uninstall('a5@0.0.0')
}

exports['test for hooks'] = function(assert) {
  var a = {
    name: 'a6',
    onplug: function(event) {
      a.plugs.push(event)
    },
    onunplug: function(event) {
      a.unplugs.push(event)
    },
    plugs: [],
    unplugs: []
  }

  var b = {
    name: 'b6',
    onplug: function (event) {
      b.plugs.push(event)
    },
    onunplug: function(event) {
      b.unplugs.push(event)
    },
    plugs: [],
    unplugs: []
  }

  var c = { name: 'c6' }

  hub.install(a)
  hub.install(b)
  hub.install(c)

  hub.plug(a)

  assert.deepEqual(a.plugs, [{
    type: 'plug',
    plugin: a,
    plugins: [ a ]
  }], 'event was signaled on a')

  hub.plug(b)

  assert.deepEqual(b.plugs, [{
    type: 'plug',
    plugin: b,
    plugins: [ a, b ]
  }], 'second event was signaled on b')


  assert.deepEqual(a.plugs, [{
    type: 'plug',
    plugin: a,
    plugins: [ a ]
  }, {
    type: 'plug',
    plugin: b,
    plugins: [ a, b ]
  }], 'second event was signaled on a')

  hub.plug(c)

  assert.deepEqual(a.plugs, [{
    type: 'plug',
    plugin: a,
    plugins: [ a ]
  },
  {
    type: 'plug',
    plugin: b,
    plugins: [ a, b ]
  },
  {
    type: 'plug',
    plugin: c,
    plugins: [ a, b, c ]
  }], 'third event was signaled on a')

  assert.deepEqual(b.plugs, [{
    type: 'plug',
    plugin: b,
    plugins: [ a, b ]
  },
  {
    type: 'plug',
    plugin: c,
    plugins: [ a, b, c ]
  }], 'third event was signaled on b')

  hub.uninstall('a6@0.0.0')

  assert.deepEqual(a.unplugs, [{
    type: 'unplug',
    plugin: a
  }], 'first unplug event was signaled on a')

  assert.deepEqual(b.unplugs, [{
    type: 'unplug',
    plugin: a
  }], 'first unplug event was signaled on b')

  hub.unplug('b6@0.0.0')

  assert.deepEqual(a.unplugs, [{
    type: 'unplug',
    plugin: a
  }], 'unplugged plugin does not gets signal')

  assert.deepEqual(b.unplugs, [{
    type: 'unplug',
    plugin: a
  },
  {
    type: 'unplug',
    plugin: b
  }], 'second unplug event was signaled')

  hub.uninstall('b6@0.0.0')
  hub.uninstall('c6@0.0.0')

  assert.deepEqual(a.unplugs, [{
    type: 'unplug',
    plugin: a
  }], 'unplugged plugin is not signaled')

  assert.deepEqual(b.unplugs, [{
    type: 'unplug',
    plugin: a
  },
  {
    type: 'unplug',
    plugin: b
  }], 'second unplugged plugin is not signaled')
}

if (module == require.main)
  require("test").run(exports);

})
