/*jshint asi:true node: true*/
!(typeof(define) !== "function" ? function($){ $(typeof(require) !== 'function' ? (function() { throw Error('require unsupported'); }) : require, typeof(exports) === 'undefined' ? this : exports); } : define)(function(require, exports) {
  'use strict';

  exports.name = 'hub'
  exports.version = '0.0.1'
  exports.author = 'Irakli Gozalishvili <rfobic@gmail.com>'
  exports.description = 'plugin manager'
  exports.stability = 'unstable'

  function values(object) {
    return Object.keys(object).map(function(key) { return object[key] })
  }
  function meta(metadata, value) {
    value.meta = typeof(metadata) === 'string' ? { description: metadata }
                                               : metadata
    return value
  }

  function installed(env) {
    var plugins = env.plugins || (env.plugins = {})
    return plugins.installed || (plugins.installed = Object.create(null))
  }
  exports.installed = installed

  function plugged(env) {
    var plugins = env.plugins || (env.plugins = {})
    return plugins.plugged || (plugins.plugged = Object.create(null))
  }
  exports.plugged = plugged

  function id(plugin) {
    /**
    returns id for the given plugin.
    **/
    return [ plugin.name, plugin.version || '0.0.0' ].join('@')
  }
  exports.id = id

  function dependencies(plugin) {
    /**
    returns array of dependencies for this plugin.
    **/
    return Array.isArray(plugin.dependencies) ? plugin.dependencies : []
  }
  exports.dependencies = dependencies

  function dependents(env, plugin) {
    /**
    returns array of dependent plugins for a given one.
    **/
    return values(installed(env)).
    filter(function(dependency) {
      return ~dependencies(dependency).indexOf(id(plugin))
    }).
    map(id)
  }
  exports.dependents = dependents

  function dependency(env, id) {
    return installed(env)[id]
  }
  exports.dependency = dependency

  var isInstalled = meta({
    description: 'returns true if plugin is istalled into given env'
  }, function isInstalled(env, id) {
    return id in installed(env)
  })
  exports.isInstalled = isInstalled

  var isPlugged = meta({
    description: 'return true if plugin is plugged into given env'
  }, function isPlugged(env, id) {
    return id in plugged(env)
  })
  exports.isPlugged = isPlugged

  var signal = meta({
    description: 'signal all dependencies'
  }, function signal(env, address, message) {
    var hook = 'on' + address
    message.type = address
    message.env = env
    return values(plugged(env)).
    map(function(plugin) {
      return typeof(plugin[hook]) === 'function' && plugin[hook](message)
    })
  })
  exports.signal = signal

  var install = meta({
    description: 'installs a given plugin'
  }, function install(env, plugin) {
    // If plugin is not installed yet install it.
    return !isInstalled(env, id(plugin)) &&
            (installed(env)[id(plugin)] = plugin)
  })
  exports.install = install

  var uninstall = meta({
    description: 'uninstalls plugin with given id from given env'
  }, function uninstall(env, id) {
    unplug(env, id)
    // If plugin is installed then uninstall.
    return isInstalled(env, id) && delete installed(env)[id]
  })
  exports.uninstall = uninstall

  var plug = meta({
    description: 'enables given plugin in the given env'
  }, function plug(env, plugin) {
    // If plugin is not installed, then install it first.
    if (!isInstalled(env, id(plugin))) install(env, plugin)

    // Goes through all dependencies and try to plug them in.
    dependencies(plugin).forEach(function(id) {
      if (isInstalled(env, id)) plug(env, dependency(env, id))
      else throw Error('Unmet dependency: ' + id)
    })

    // If all dependencies are plugged in, then plug given one as well &
    // signal all plugins.
    plugged(env)[id(plugin)] = plugin
    signal(env, 'plug', {
      plugin: plugin,
      plugins: values(plugged(env))
    })
  })
  exports.plug = plug

  var unplug = meta({
    description: 'disables plugin with a given id in the given env'
  }, function unplug(env, id) {
    var plugin, result = false
    if (isPlugged(env, id)) {
      plugin = plugged(env)[id]
      // unplug all the dependent plugins.
      dependents(env, plugin).map(function(plugin) { unplug(env, plugin) })
      // signal that plugin was unplugged.
      signal(env, 'unplug', { plugin: plugin })
      // remove plugin from registry.
      delete plugged(env)[id]
      result = true
    }

    return result
  })
  exports.unplug = unplug
});
