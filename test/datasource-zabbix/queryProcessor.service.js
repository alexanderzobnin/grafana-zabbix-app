'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** @ngInject */
_angular2.default.module('grafana.services').factory('QueryProcessor', function ($q) {
  var QueryProcessor = function () {
    function QueryProcessor(zabbixCacheInstance) {
      _classCallCheck(this, QueryProcessor);

      this.cache = zabbixCacheInstance;
      this.$q = $q;
    }

    /**
     * Build query in asynchronous manner
     */


    _createClass(QueryProcessor, [{
      key: 'build',
      value: function build(groupFilter, hostFilter, appFilter, itemFilter, itemtype) {
        var self = this;
        if (this.cache._initialized) {
          return this.$q.when(self.buildFromCache(groupFilter, hostFilter, appFilter, itemFilter, itemtype));
        } else {
          return this.cache.refresh().then(function () {
            return self.buildFromCache(groupFilter, hostFilter, appFilter, itemFilter, itemtype);
          });
        }
      }

      /**
       * Build trigger query in asynchronous manner
       */

    }, {
      key: 'buildTriggerQuery',
      value: function buildTriggerQuery(groupFilter, hostFilter, appFilter) {
        var self = this;
        if (this.cache._initialized) {
          return this.$q.when(self.buildTriggerQueryFromCache(groupFilter, hostFilter, appFilter));
        } else {
          return this.cache.refresh().then(function () {
            return self.buildTriggerQueryFromCache(groupFilter, hostFilter, appFilter);
          });
        }
      }
    }, {
      key: 'filterGroups',
      value: function filterGroups(groups, groupFilter) {
        return this.$q.when(findByFilter(groups, groupFilter));
      }

      /**
       * Get list of host belonging to given groups.
       * @return list of hosts
       */

    }, {
      key: 'filterHosts',
      value: function filterHosts(hosts, hostFilter) {
        return this.$q.when(findByFilter(hosts, hostFilter));
      }
    }, {
      key: 'filterApps',
      value: function filterApps(apps, appFilter) {
        return this.$q.when(findByFilter(apps, appFilter));
      }

      /**
       * Build query - convert target filters to array of Zabbix items
       */

    }, {
      key: 'buildFromCache',
      value: function buildFromCache(groupFilter, hostFilter, appFilter, itemFilter, itemtype, showDisabledItems) {
        return this.getItems(groupFilter, hostFilter, appFilter, itemtype, showDisabledItems).then(function (items) {
          return getByFilter(items, itemFilter);
        });
      }
    }, {
      key: 'getGroups',
      value: function getGroups() {
        return this.cache.getGroups();
      }

      /**
       * Get list of host belonging to given groups.
       * @return list of hosts
       */

    }, {
      key: 'getHosts',
      value: function getHosts(groupFilter) {
        var self = this;
        return this.cache.getGroups().then(function (groups) {
          return findByFilter(groups, groupFilter);
        }).then(function (groups) {
          var groupids = _lodash2.default.map(groups, 'groupid');
          return self.cache.getHosts(groupids);
        });
      }

      /**
       * Get list of applications belonging to given groups and hosts.
       * @return  list of applications belonging to given hosts
       */

    }, {
      key: 'getApps',
      value: function getApps(groupFilter, hostFilter) {
        var self = this;
        return this.getHosts(groupFilter).then(function (hosts) {
          return findByFilter(hosts, hostFilter);
        }).then(function (hosts) {
          var hostids = _lodash2.default.map(hosts, 'hostid');
          return self.cache.getApps(hostids);
        });
      }
    }, {
      key: 'getItems',
      value: function getItems(groupFilter, hostFilter, appFilter, itemtype, showDisabledItems) {
        var self = this;
        return this.getHosts(groupFilter).then(function (hosts) {
          return findByFilter(hosts, hostFilter);
        }).then(function (hosts) {
          var hostids = _lodash2.default.map(hosts, 'hostid');
          if (appFilter) {
            return self.cache.getApps(hostids).then(function (apps) {
              // Use getByFilter for proper item filtering
              return getByFilter(apps, appFilter);
            });
          } else {
            return {
              appFilterEmpty: true,
              hostids: hostids
            };
          }
        }).then(function (apps) {
          if (apps.appFilterEmpty) {
            return self.cache.getItems(apps.hostids, undefined, itemtype).then(function (items) {
              if (showDisabledItems) {
                items = _lodash2.default.filter(items, { 'status': '0' });
              }
              return items;
            });
          } else {
            var appids = _lodash2.default.map(apps, 'applicationid');
            return self.cache.getItems(undefined, appids, itemtype).then(function (items) {
              if (showDisabledItems) {
                items = _lodash2.default.filter(items, { 'status': '0' });
              }
              return items;
            });
          }
        });
      }

      /**
       * Build query - convert target filters to array of Zabbix items
       */

    }, {
      key: 'buildTriggerQueryFromCache',
      value: function buildTriggerQueryFromCache(groupFilter, hostFilter, appFilter) {
        var promises = [this.cache.getGroups().then(function (groups) {
          return _lodash2.default.filter(groups, function (group) {
            if (utils.isRegex(groupFilter)) {
              return utils.buildRegex(groupFilter).test(group.name);
            } else {
              return group.name === groupFilter;
            }
          });
        }), this.getHosts(groupFilter).then(function (hosts) {
          return _lodash2.default.filter(hosts, function (host) {
            if (utils.isRegex(hostFilter)) {
              return utils.buildRegex(hostFilter).test(host.name);
            } else {
              return host.name === hostFilter;
            }
          });
        }), this.getApps(groupFilter, hostFilter).then(function (apps) {
          return _lodash2.default.filter(apps, function (app) {
            if (utils.isRegex(appFilter)) {
              return utils.buildRegex(appFilter).test(app.name);
            } else {
              return app.name === appFilter;
            }
          });
        })];

        return this.$q.all(promises).then(function (results) {
          var filteredGroups = results[0];
          var filteredHosts = results[1];
          var filteredApps = results[2];
          var query = {};

          if (appFilter) {
            query.applicationids = _lodash2.default.flatten(_lodash2.default.map(filteredApps, 'applicationid'));
          }
          if (hostFilter) {
            query.hostids = _lodash2.default.map(filteredHosts, 'hostid');
          }
          if (groupFilter) {
            query.groupids = _lodash2.default.map(filteredGroups, 'groupid');
          }

          return query;
        });
      }

      /**
       * Convert Zabbix API history.get response to Grafana format
       *
       * @return {Array}            Array of timeseries in Grafana format
       *                            {
       *                               target: "Metric name",
       *                               datapoints: [[<value>, <unixtime>], ...]
       *                            }
       */

    }, {
      key: 'convertHistory',
      value: function convertHistory(history, items, addHostName, convertPointCallback) {
        /**
         * Response should be in the format:
         * data: [
         *          {
         *             target: "Metric name",
         *             datapoints: [[<value>, <unixtime>], ...]
         *          }, ...
         *       ]
         */

        // Group history by itemid
        var grouped_history = _lodash2.default.groupBy(history, 'itemid');
        var hosts = _lodash2.default.uniq(_lodash2.default.flatten(_lodash2.default.map(items, 'hosts')), 'hostid'); //uniq is needed to deduplicate

        return _lodash2.default.map(grouped_history, function (hist, itemid) {
          var item = _lodash2.default.find(items, { 'itemid': itemid });
          var alias = item.name;
          if (_lodash2.default.keys(hosts).length > 1 && addHostName) {
            //only when actual multi hosts selected
            var host = _lodash2.default.find(hosts, { 'hostid': item.hostid });
            alias = host.name + ": " + alias;
          }
          return {
            target: alias,
            datapoints: _lodash2.default.map(hist, convertPointCallback)
          };
        });
      }
    }, {
      key: 'handleHistory',
      value: function handleHistory(history, items, addHostName) {
        return this.convertHistory(history, items, addHostName, convertHistoryPoint);
      }
    }, {
      key: 'handleTrends',
      value: function handleTrends(history, items, addHostName, valueType) {
        var convertPointCallback = _lodash2.default.partial(convertTrendPoint, valueType);
        return this.convertHistory(history, items, addHostName, convertPointCallback);
      }
    }, {
      key: 'handleSLAResponse',
      value: function handleSLAResponse(itservice, slaProperty, slaObject) {
        var targetSLA = slaObject[itservice.serviceid].sla[0];
        if (slaProperty.property === 'status') {
          var targetStatus = parseInt(slaObject[itservice.serviceid].status);
          return {
            target: itservice.name + ' ' + slaProperty.name,
            datapoints: [[targetStatus, targetSLA.to * 1000]]
          };
        } else {
          return {
            target: itservice.name + ' ' + slaProperty.name,
            datapoints: [[targetSLA[slaProperty.property], targetSLA.from * 1000], [targetSLA[slaProperty.property], targetSLA.to * 1000]]
          };
        }
      }
    }]);

    return QueryProcessor;
  }();

  return QueryProcessor;
});

/**
 * Find group, host, app or item by given name.
 * @param  list list of groups, apps or other
 * @param  name visible name
 * @return      array with finded element or undefined
 */
function findByName(list, name) {
  var finded = _lodash2.default.find(list, { 'name': name });
  if (finded) {
    return [finded];
  } else {
    return undefined;
  }
}

/**
 * Different hosts can contains applications and items with same name.
 * For this reason use _.filter, which return all elements instead _.find,
 * which return only first finded.
 * @param  {[type]} list list of elements
 * @param  {[type]} name app name
 * @return {[type]}      array with finded element or undefined
 */
function filterByName(list, name) {
  var finded = _lodash2.default.filter(list, { 'name': name });
  if (finded) {
    return finded;
  } else {
    return undefined;
  }
}

function findByRegex(list, regex) {
  var filterPattern = utils.buildRegex(regex);
  return _lodash2.default.filter(list, function (zbx_obj) {
    return filterPattern.test(zbx_obj.name);
  });
}

function findByFilter(list, filter) {
  if (utils.isRegex(filter)) {
    return findByRegex(list, filter);
  } else {
    return findByName(list, filter);
  }
}

function getByFilter(list, filter) {
  if (utils.isRegex(filter)) {
    return findByRegex(list, filter);
  } else {
    return filterByName(list, filter);
  }
}

function convertHistoryPoint(point) {
  // Value must be a number for properly work
  return [Number(point.value), point.clock * 1000];
}

function convertTrendPoint(valueType, point) {
  var value;
  switch (valueType) {
    case "min":
      value = point.value_min;
      break;
    case "max":
      value = point.value_max;
      break;
    case "avg":
      value = point.value_avg;
      break;
    default:
      value = point.value_avg;
  }

  return [Number(value), point.clock * 1000];
}
