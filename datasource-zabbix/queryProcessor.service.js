'use strict';

System.register(['angular', 'lodash', './utils'], function (_export, _context) {
  var angular, _, utils, _createClass;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  /**
   * Find group, host, app or item by given name.
   * @param  list list of groups, apps or other
   * @param  name visible name
   * @return      array with finded element or undefined
   */
  function findByName(list, name) {
    var finded = _.find(list, { 'name': name });
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
    var finded = _.filter(list, { 'name': name });
    if (finded) {
      return finded;
    } else {
      return undefined;
    }
  }

  function findByRegex(list, regex) {
    var filterPattern = utils.buildRegex(regex);
    return _.filter(list, function (zbx_obj) {
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

  function getFromIndex(index, objids) {
    return _.map(objids, function (id) {
      return index[id];
    });
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
  return {
    setters: [function (_angular) {
      angular = _angular.default;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_utils) {
      utils = _utils;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      /** @ngInject */
      angular.module('grafana.services').factory('QueryProcessor', function ($q) {
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
            value: function build(groupFilter, hostFilter, appFilter, itemFilter) {
              var self = this;
              if (this.cache._initialized) {
                return this.$q.when(self.buildFromCache(groupFilter, hostFilter, appFilter, itemFilter));
              } else {
                return this.cache.refresh().then(function () {
                  return self.buildFromCache(groupFilter, hostFilter, appFilter, itemFilter);
                });
              }
            }
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
          }, {
            key: 'buildFromCache',
            value: function buildFromCache(groupFilter, hostFilter, appFilter, itemFilter, showDisabledItems) {
              return this.getItems(groupFilter, hostFilter, appFilter, showDisabledItems).then(function (items) {
                return getByFilter(items, itemFilter);
              });
            }
          }, {
            key: 'getGroups',
            value: function getGroups() {
              return this.cache.getGroups();
            }
          }, {
            key: 'getHosts',
            value: function getHosts(groupFilter) {
              var self = this;
              return this.cache.getGroups().then(function (groups) {
                return findByFilter(groups, groupFilter);
              }).then(function (groups) {
                var groupids = _.map(groups, 'groupid');
                return self.cache.getHosts(groupids);
              });
            }
          }, {
            key: 'getApps',
            value: function getApps(groupFilter, hostFilter) {
              var self = this;
              return this.getHosts(groupFilter).then(function (hosts) {
                return findByFilter(hosts, hostFilter);
              }).then(function (hosts) {
                var hostids = _.map(hosts, 'hostid');
                return self.cache.getApps(hostids);
              });
            }
          }, {
            key: 'getItems',
            value: function getItems(groupFilter, hostFilter, appFilter, showDisabledItems) {
              var self = this;
              return this.getHosts(groupFilter).then(function (hosts) {
                return findByFilter(hosts, hostFilter);
              }).then(function (hosts) {
                var hostids = _.map(hosts, 'hostid');
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
                  return self.cache.getItems(apps.hostids, undefined).then(function (items) {
                    if (showDisabledItems) {
                      items = _.filter(items, { 'status': '0' });
                    }
                    return items;
                  });
                } else {
                  var appids = _.map(apps, 'applicationid');
                  return self.cache.getItems(undefined, appids).then(function (items) {
                    if (showDisabledItems) {
                      items = _.filter(items, { 'status': '0' });
                    }
                    return items;
                  });
                }
              });
            }
          }, {
            key: 'buildTriggerQueryFromCache',
            value: function buildTriggerQueryFromCache(groupFilter, hostFilter, appFilter) {
              var promises = [this.cache.getGroups().then(function (groups) {
                return _.filter(groups, function (group) {
                  if (utils.isRegex(groupFilter)) {
                    return utils.buildRegex(groupFilter).test(group.name);
                  } else {
                    return group.name === groupFilter;
                  }
                });
              }), this.getHosts(groupFilter).then(function (hosts) {
                return _.filter(hosts, function (host) {
                  if (utils.isRegex(hostFilter)) {
                    return utils.buildRegex(hostFilter).test(host.name);
                  } else {
                    return host.name === hostFilter;
                  }
                });
              }), this.getApps(groupFilter, hostFilter).then(function (apps) {
                return _.filter(apps, function (app) {
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
                  query.applicationids = _.flatten(_.map(filteredApps, 'applicationid'));
                }
                if (hostFilter) {
                  query.hostids = _.map(filteredHosts, 'hostid');
                }
                if (groupFilter) {
                  query.groupids = _.map(filteredGroups, 'groupid');
                }

                return query;
              });
            }
          }, {
            key: 'convertHistory',
            value: function convertHistory(history, addHostName, convertPointCallback) {
              /**
               * Response should be in the format:
               * data: [
               *          {
               *             target: "Metric name",
               *             datapoints: [[<value>, <unixtime>], ...]
               *          }, ...
               *       ]
               */
              var self = this;

              // Group history by itemid
              var grouped_history = _.groupBy(history, 'itemid');

              return _.map(grouped_history, function (hist, itemid) {
                var item = self.cache.getItem(itemid);
                var alias = item.name;
                if (addHostName) {
                  var host = self.cache.getHost(item.hostid);
                  alias = host.name + ": " + alias;
                }
                return {
                  target: alias,
                  datapoints: _.map(hist, convertPointCallback)
                };
              });
            }
          }, {
            key: 'handleHistory',
            value: function handleHistory(history, addHostName) {
              return this.convertHistory(history, addHostName, convertHistoryPoint);
            }
          }, {
            key: 'handleTrends',
            value: function handleTrends(history, addHostName, valueType) {
              var convertPointCallback = _.partial(convertTrendPoint, valueType);
              return this.convertHistory(history, addHostName, convertPointCallback);
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
    }
  };
});
//# sourceMappingURL=queryProcessor.service.js.map
