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
  var env = {}
  hub.plug(env, hub)

  assert.ok(hub.install(env, { name: 'a2', no: 1 }),
                        'install returns true')
  assert.ok(hub.install(env, { name: 'b2', version: '0.1.0' }),
                        'install succeeds')
  assert.ok(!hub.install(env, { name: 'a2' }),
                         'plugin was not installed')

  assert.ok(hub.isInstalled(env, 'a2@0.0.0'), 'plugin is installed')
  assert.ok(hub.isInstalled(env, 'b2@0.1.0'), 'plugin is installed')

  hub.uninstall(env, 'a2@0.0.0')
  hub.uninstall(env, 'b2@0.1.0')
}

exports['test plug'] = function(assert) {
  var env = {}
  hub.plug({}, hub)

  var a = { name: 'a3', version: '0.0.1' }
  var b = { name: 'b3', version: '0.2.1', dependencies: [ 'a3@0.0.1' ] }
  var c = { name: 'c3', dependencies: [ 'a3@0.0.1', 'b3@0.2.1' ] }

  hub.install(env, a)
  hub.install(env, b)
  hub.plug(env, c)

  assert.ok(hub.isPlugged(env, hub.id(a)), 'dependent plugin was plugged')
  assert.ok(hub.isPlugged(env, hub.id(b)), 'dependent plugin was plugged')
  assert.ok(hub.isPlugged(env, hub.id(c)), 'all dependecies are plugged')

  hub.uninstall(env, 'a3@0.0.1')
  hub.uninstall(env, 'b3@0.2.1')
  hub.uninstall(env, 'c3@0.0.0')
}

exports['test plug unmet dependency'] = function(assert) {
  var env = {}
  hub.plug({}, hub)

  var d = { name: 'd4', version: '0.1.0', dependencies: [ 'e4@0.0.1' ] }
  var e = { name: 'e4', version: '0.0.1' }

  assert.throws(function() {
    hub.plug(env, d)
  }, /e4@0.0.1/, 'throws on unmet dependecy')

  hub.install(env, e)
  hub.plug(env, d)

  assert.ok(hub.isPlugged(env, 'e4@0.0.1'), 'dependency was plugged')
  assert.ok(hub.isPlugged(env, 'd4@0.1.0'), 'plugin was installed')

  hub.uninstall(env, 'e4@0.0.1')
  hub.uninstall(env, 'd4@0.1.0')
}

exports['test unplug unplugs dependents'] = function(assert) {
  var env = {}
  hub.plug(env, hub)

  var a = { name: 'a5', dependencies: [ 'b5@0.0.0' ] }
  var b = { name: 'b5' }

  hub.install(env, b)
  hub.plug(env, a)

  assert.ok(hub.isPlugged(env, 'b5@0.0.0'), 'dependency is plugged')
  assert.ok(hub.isPlugged(env, 'a5@0.0.0'), 'all plugins are plugged')

  hub.unplug(env, 'b5@0.0.0')

  assert.ok(!hub.isPlugged(env, 'b5@0.0.0'), 'dependency is unplugged')
  assert.ok(!hub.isPlugged(env, 'a5@0.0.0'), 'all plugins are unplugged')

  hub.uninstall(env, 'b5@0.0.0')
  hub.uninstall(env, 'a5@0.0.0')
}

exports['test for hooks'] = function(assert) {
  var env = {}
  hub.plug({}, hub)

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

  hub.install(env, a)
  hub.install(env, b)
  hub.install(env, c)

  hub.plug(env, a)

  assert.deepEqual(a.plugs, [{
    type: 'plug',
    env: env,
    plugin: a,
    plugins: [ a ]
  }], 'event was signaled on a')

  hub.plug(env, b)

  assert.deepEqual(b.plugs, [{
    type: 'plug',
    env: env,
    plugin: b,
    plugins: [ a, b ]
  }], 'second event was signaled on b')


  assert.deepEqual(a.plugs, [{
    type: 'plug',
    env: env,
    plugin: a,
    plugins: [ a ]
  }, {
    type: 'plug',
    env: env,
    plugin: b,
    plugins: [ a, b ]
  }], 'second event was signaled on a')

  hub.plug(env, c)

  assert.deepEqual(a.plugs, [{
    type: 'plug',
    env: env,
    plugin: a,
    plugins: [ a ]
  },
  {
    type: 'plug',
    env: env,
    plugin: b,
    plugins: [ a, b ]
  },
  {
    type: 'plug',
    env: env,
    plugin: c,
    plugins: [ a, b, c ]
  }], 'third event was signaled on a')

  assert.deepEqual(b.plugs, [{
    type: 'plug',
    env: env,
    plugin: b,
    plugins: [ a, b ]
  },
  {
    type: 'plug',
    env: env,
    plugin: c,
    plugins: [ a, b, c ]
  }], 'third event was signaled on b')

  hub.uninstall(env, 'a6@0.0.0')

  assert.deepEqual(a.unplugs, [{
    type: 'unplug',
    env: env,
    plugin: a
  }], 'first unplug event was signaled on a')

  assert.deepEqual(b.unplugs, [{
    type: 'unplug',
    env: env,
    plugin: a
  }], 'first unplug event was signaled on b')

  hub.unplug(env, 'b6@0.0.0')

  assert.deepEqual(a.unplugs, [{
    type: 'unplug',
    env: env,
    plugin: a
  }], 'unplugged plugin does not gets signal')

  assert.deepEqual(b.unplugs, [{
    type: 'unplug',
    env: env,
    plugin: a
  },
  {
    type: 'unplug',
    env: env,
    plugin: b
  }], 'second unplug event was signaled')

  hub.uninstall(env, 'b6@0.0.0')
  hub.uninstall(env, 'c6@0.0.0')

  assert.deepEqual(a.unplugs, [{
    type: 'unplug',
    env: env,
    plugin: a
  }], 'unplugged plugin is not signaled')

  assert.deepEqual(b.unplugs, [{
    type: 'unplug',
    env: env,
    plugin: a
  },
  {
    type: 'unplug',
    env: env,
    plugin: b
  }], 'second unplugged plugin is not signaled')
}

if (module == require.main)
  require("test").run(exports);

})
