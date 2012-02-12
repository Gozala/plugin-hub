/*jshint asi:true node: true*/
!(typeof(define) !== "function" ? function($){ $(typeof(require) !== 'function' ? (function() { throw Error('require unsupported'); }) : require, typeof(exports) === 'undefined' ? this : exports); } : define)(function(require, exports) {
  'use strict';

  exports.name = 'hub'
  exports.version = '0.0.1'
  exports.author = 'Irakli Gozalishvili <rfobic@gmail.com>'
  exports.description = 'plugin manager'
  exports.stability = 'unstable'

  var installed = Object.create(null)
  exports.istalled = installed

  var plugged = Object.create(null)
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
    return plugin.dependencies || []
  }
  exports.dependencies = dependencies

  function dependents(plugin) {
    /**
    returns array of dependent plugins for a given one.
    **/
    return Object.keys(installed).
    map(dependency).
    map(dependencies).
    filter(function(dependencies) {
      return ~dependencies.indexOf(plugin.id)
    })
  }
  exports.dependents = dependents

  function dependency(id) {
    return installed[id]
  }
  exports.dependency = dependency

  function isInstalled(id) {
    return id in installed
  }
  isInstalled.meta = { description: 'returns true if plugin is istalled' }
  exports.isInstalled = isInstalled

  function isPlugged(id) {
    return id in plugged
  }
  isPlugged.meta = { description: 'return true if plugin is plugged' }
  exports.isPlugged = isPlugged

  function isPluggable(plugin) {
    /**
    checks weather all the dependencies of the plugin are installed.
    **/
    return dependencies(plugin).every(isInstalled)
  }
  exports.isPluggable = isPluggable

  function signal(address, message) {
    return Object.keys(plugged).
    map(function(id) { return plugged[id] }).
    map(function(plugin) {
      return typeof(plugin[address]) === 'function' && plugin[address](message)
    })
  }
  signal.meta = { description: 'signal all dependencies' }
  exports.signal = signal

  function install(plugin) {
    // If plugin is not installed yet install it.
    return !isInstalled(id(plugin)) && (installed[id(plugin)] = plugin)
  }
  install.meta = { description: 'installs a given plugin' }
  exports.install = install

  function uninstall(id) {
    unplug(id)
    // If plugin is installed then uninstall.
    return isInstalled(id) && delete installed[id]
  }
  uninstall.meta = { description: 'uninstalls a given plugin' }
  exports.uninstall = uninstall

  function plug(plugin) {
    var plugged, result = false
    // If plugin is not installed, then install it first.
    if (!isInstalled(id(plugin))) install(plugin)

    // Goes through all dependencies and try to plug them in.
    plugged = dependencies(plugin).forEach(function(id) {
      return isInstalled(id) && plug(dependency(id))
    })

    // If all dependencies are plugged in, then plug given one as well &
    // signal all plugins.
    if (plugged) {
      plugged[id(plugin)] = plugin
      signal('plug', plugin)
      result = true
    }

    return result
  }
  plug.meta = { description: 'enables a given plugin' }
  exports.plug = plug

  function unplug(id) {
    var result = false
    if (!isPlugged(id)) {
      // unplug all the dependent plugins.
      dependents(plugged[id]).map(unplug)
      // signal that plugin was unplugged.
      signal('unplug', plugged[id])
      // remove plugin from registry.
      delete plugged[id]
      result = true
    }

    return result
  }
  plug.meta = { description: 'disables a given plugin' }
  exports.unplug = unplug

});