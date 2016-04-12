'use strict';

System.register(['angular', 'lodash', './utils'], function (_export, _context) {
  var angular, _, utils, _createClass;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function getAPIRequestHash(args) {
    var requestStamp = _.map(args, function (arg) {
      if (arg === undefined) {
        return 'undefined';
      } else {
        return arg.toString();
      }
    }).join();
    return requestStamp.getHash();
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

      // Use factory() instead service() for multiple datasources support.
      // Each datasource instance must initialize its own cache.

      /** @ngInject */
      angular.module('grafana.services').factory('ZabbixCachingProxy', function ($q, $interval) {
        var ZabbixCachingProxy = function () {
          function ZabbixCachingProxy(zabbixAPI, ttl) {
            _classCallCheck(this, ZabbixCachingProxy);

            this.zabbixAPI = zabbixAPI;
            this.ttl = ttl;

            this.$q = $q;

            // Internal objects for data storing
            this._groups = undefined;
            this._hosts = undefined;
            this._applications = undefined;
            this._items = undefined;
            this.storage = {
              history: {},
              trends: {}
            };

            // Check is a service initialized or not
            this._initialized = undefined;

            this.refreshPromise = false;
            this.historyPromises = {};

            // Wrap _refresh() method to call it once.
            this.refresh = callOnce(this._refresh, this.refreshPromise);

            // Update cache periodically
            $interval(_.bind(this.refresh, this), this.ttl);

            // Don't run duplicated history requests
            this.getHistory = callHistoryOnce(_.bind(this.zabbixAPI.getHistory, this.zabbixAPI), this.historyPromises);

            // Don't run duplicated requests
            this.groupPromises = {};
            this.getGroupsOnce = callAPIRequestOnce(_.bind(this.zabbixAPI.getGroups, this.zabbixAPI), this.groupPromises);

            this.hostPromises = {};
            this.getHostsOnce = callAPIRequestOnce(_.bind(this.zabbixAPI.getHosts, this.zabbixAPI), this.hostPromises);

            this.appPromises = {};
            this.getAppsOnce = callAPIRequestOnce(_.bind(this.zabbixAPI.getApps, this.zabbixAPI), this.appPromises);

            this.itemPromises = {};
            this.getItemsOnce = callAPIRequestOnce(_.bind(this.zabbixAPI.getItems, this.zabbixAPI), this.itemPromises);
          }

          _createClass(ZabbixCachingProxy, [{
            key: '_refresh',
            value: function _refresh() {
              var self = this;
              var promises = [this.zabbixAPI.getGroups()];

              return this.$q.all(promises).then(function (results) {
                if (results.length) {
                  self._groups = results[0];
                }
                self._initialized = true;
              });
            }
          }, {
            key: 'getGroups',
            value: function getGroups() {
              var self = this;
              if (this._groups) {
                return this.$q.when(self._groups);
              } else {
                return this.getGroupsOnce().then(function (groups) {
                  self._groups = groups;
                  return self._groups;
                });
              }
            }
          }, {
            key: 'getHosts',
            value: function getHosts(groupids) {
              var self = this;
              return this.getHostsOnce(groupids).then(function (hosts) {
                self._hosts = _.union(self._hosts, hosts);
                return hosts;
              });
            }
          }, {
            key: 'getApps',
            value: function getApps(hostids) {
              return this.getAppsOnce(hostids).then(function (apps) {
                return apps;
              });
            }
          }, {
            key: 'getItems',
            value: function getItems(hostids, appids, itemtype) {
              var self = this;
              return this.getItemsOnce(hostids, appids, itemtype).then(function (items) {
                self._items = _.union(self._items, items);
                return items;
              });
            }
          }, {
            key: 'getHistoryFromCache',
            value: function getHistoryFromCache(items, time_from, time_till) {
              var deferred = this.$q.defer();
              var historyStorage = this.storage.history;
              var full_history;
              var expired = _.filter(_.indexBy(items, 'itemid'), function (item, itemid) {
                return !historyStorage[itemid];
              });
              if (expired.length) {
                this.zabbixAPI.getHistory(expired, time_from, time_till).then(function (history) {
                  var grouped_history = _.groupBy(history, 'itemid');
                  _.forEach(expired, function (item) {
                    var itemid = item.itemid;
                    historyStorage[itemid] = item;
                    historyStorage[itemid].time_from = time_from;
                    historyStorage[itemid].time_till = time_till;
                    historyStorage[itemid].history = grouped_history[itemid];
                  });
                  full_history = _.map(items, function (item) {
                    return historyStorage[item.itemid].history;
                  });
                  deferred.resolve(_.flatten(full_history, true));
                });
              } else {
                full_history = _.map(items, function (item) {
                  return historyStorage[item.itemid].history;
                });
                deferred.resolve(_.flatten(full_history, true));
              }
              return deferred.promise;
            }
          }, {
            key: 'getHistoryFromAPI',
            value: function getHistoryFromAPI(items, time_from, time_till) {
              return this.zabbixAPI.getHistory(items, time_from, time_till);
            }
          }, {
            key: 'getHost',
            value: function getHost(hostid) {
              return _.find(this._hosts, { 'hostid': hostid });
            }
          }, {
            key: 'getItem',
            value: function getItem(itemid) {
              return _.find(this._items, { 'itemid': itemid });
            }
          }]);

          return ZabbixCachingProxy;
        }();

        function callAPIRequestOnce(func, promiseKeeper) {
          return function () {
            var hash = getAPIRequestHash(arguments);
            var deferred = $q.defer();
            if (!promiseKeeper[hash]) {
              promiseKeeper[hash] = deferred.promise;
              func.apply(this, arguments).then(function (result) {
                deferred.resolve(result);
                promiseKeeper[hash] = null;
              });
            } else {
              return promiseKeeper[hash];
            }
            return deferred.promise;
          };
        }

        function callHistoryOnce(func, promiseKeeper) {
          return function () {
            var itemids = _.map(arguments[0], 'itemid');
            var stamp = itemids.join() + arguments[1] + arguments[2];
            var hash = stamp.getHash();

            var deferred = $q.defer();
            if (!promiseKeeper[hash]) {
              promiseKeeper[hash] = deferred.promise;
              func.apply(this, arguments).then(function (result) {
                deferred.resolve(result);
                promiseKeeper[hash] = null;
              });
            } else {
              return promiseKeeper[hash];
            }
            return deferred.promise;
          };
        }

        function callOnce(func, promiseKeeper) {
          return function () {
            var deferred = $q.defer();
            if (!promiseKeeper) {
              promiseKeeper = deferred.promise;
              func.apply(this, arguments).then(function (result) {
                deferred.resolve(result);
                promiseKeeper = null;
              });
            } else {
              return promiseKeeper;
            }
            return deferred.promise;
          };
        }

        return ZabbixCachingProxy;
      });String.prototype.getHash = function () {
        var hash = 0,
            i,
            chr,
            len;
        if (this.length === 0) {
          return hash;
        }
        for (i = 0, len = this.length; i < len; i++) {
          chr = this.charCodeAt(i);
          hash = (hash << 5) - hash + chr;
          hash |= 0; // Convert to 32bit integer
        }
        return hash;
      };
    }
  };
});
//# sourceMappingURL=zabbixCache.service.js.map
