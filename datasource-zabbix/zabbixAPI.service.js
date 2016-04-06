'use strict';

System.register(['angular', 'lodash', './utils', './zabbixAPICore.service'], function (_export, _context) {
  var angular, _, utils, _createClass;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  /** @ngInject */
  function ZabbixAPIService($q, alertSrv, zabbixAPICoreService) {
    var ZabbixAPI = function () {
      function ZabbixAPI(api_url, username, password, basicAuth, withCredentials) {
        _classCallCheck(this, ZabbixAPI);

        this.url = api_url;
        this.username = username;
        this.password = password;
        this.auth = "";

        this.requestOptions = {
          basicAuth: basicAuth,
          withCredentials: withCredentials
        };

        this.loginPromise = null;

        this.$q = $q;
        this.alertSrv = alertSrv;
        this.zabbixAPICore = zabbixAPICoreService;

        this.getTrend = this.getTrend_ZBXNEXT1193;
        //getTrend = getTrend_30;
      }

      //////////////////////////
      // Core method wrappers //
      //////////////////////////

      _createClass(ZabbixAPI, [{
        key: 'request',
        value: function request(method, params) {
          var self = this;

          return this.zabbixAPICore.request(this.url, method, params, this.requestOptions, this.auth).then(function (result) {
            return result;
          },
          // Handle API errors
          function (error) {
            if (isNotAuthorized(error.data)) {
              return self.loginOnce().then(function () {
                return self.request(method, params);
              },
              // Handle user.login method errors
              function (error) {
                self.alertAPIError(error.data);
              });
            }
          });
        }
      }, {
        key: 'alertAPIError',
        value: function alertAPIError(message) {
          this.alertSrv.set("Zabbix API Error", message, 'error');
        }
      }, {
        key: 'loginOnce',
        value: function loginOnce() {
          var self = this;
          var deferred = this.$q.defer();
          if (!self.loginPromise) {
            self.loginPromise = deferred.promise;
            self.login().then(function (auth) {
              self.loginPromise = null;
              self.auth = auth;
              deferred.resolve(auth);
            }, function (error) {
              self.loginPromise = null;
              deferred.reject(error);
            });
          } else {
            return self.loginPromise;
          }
          return deferred.promise;
        }
      }, {
        key: 'login',
        value: function login() {
          return this.zabbixAPICore.login(this.url, this.username, this.password, this.requestOptions);
        }
      }, {
        key: 'getVersion',
        value: function getVersion() {
          return this.zabbixAPICore.getVersion(this.url, this.requestOptions);
        }
      }, {
        key: 'getGroups',
        value: function getGroups() {
          var params = {
            output: ['name'],
            sortfield: 'name',
            real_hosts: true
          };

          return this.request('hostgroup.get', params);
        }
      }, {
        key: 'getHosts',
        value: function getHosts(groupids) {
          var params = {
            output: ['name', 'host'],
            sortfield: 'name'
          };
          if (groupids) {
            params.groupids = groupids;
          }

          return this.request('host.get', params);
        }
      }, {
        key: 'getApps',
        value: function getApps(hostids) {
          var params = {
            output: ['applicationid', 'name'],
            hostids: hostids
          };

          return this.request('application.get', params);
        }
      }, {
        key: 'getItems',
        value: function getItems(hostids, appids) {
          var params = {
            output: ['name', 'key_', 'value_type', 'hostid', 'status', 'state'],
            sortfield: 'name',
            webitems: true
          };
          if (hostids) {
            params.hostids = hostids;
          }
          if (appids) {
            params.applicationids = appids;
          }

          return this.request('item.get', params).then(function (items) {
            return _.forEach(items, function (item) {
              item.item = item.name;
              item.name = utils.expandItemName(item.item, item.key_);
              return item;
            });
          });
        }
      }, {
        key: 'getLastValue',
        value: function getLastValue(itemid) {
          var params = {
            output: ['lastvalue'],
            itemids: itemid
          };
          return this.request('item.get', params).then(function (items) {
            if (items.length) {
              return items[0].lastvalue;
            } else {
              return null;
            }
          });
        }
      }, {
        key: 'getHistory',
        value: function getHistory(items, time_from, time_till) {
          var self = this;

          // Group items by value type
          var grouped_items = _.groupBy(items, 'value_type');

          // Perform request for each value type
          return this.$q.all(_.map(grouped_items, function (items, value_type) {
            var itemids = _.map(items, 'itemid');
            var params = {
              output: 'extend',
              history: value_type,
              itemids: itemids,
              sortfield: 'clock',
              sortorder: 'ASC',
              time_from: time_from
            };

            // Relative queries (e.g. last hour) don't include an end time
            if (time_till) {
              params.time_till = time_till;
            }

            return self.request('history.get', params);
          })).then(_.flatten);
        }
      }, {
        key: 'getTrend_ZBXNEXT1193',
        value: function getTrend_ZBXNEXT1193(items, time_from, time_till) {
          var self = this;

          // Group items by value type
          var grouped_items = _.groupBy(items, 'value_type');

          // Perform request for each value type
          return this.$q.all(_.map(grouped_items, function (items, value_type) {
            var itemids = _.map(items, 'itemid');
            var params = {
              output: 'extend',
              trend: value_type,
              itemids: itemids,
              sortfield: 'clock',
              sortorder: 'ASC',
              time_from: time_from
            };

            // Relative queries (e.g. last hour) don't include an end time
            if (time_till) {
              params.time_till = time_till;
            }

            return self.request('trend.get', params);
          })).then(_.flatten);
        }
      }, {
        key: 'getTrend_30',
        value: function getTrend_30(items, time_from, time_till, value_type) {
          var self = this;
          var itemids = _.map(items, 'itemid');

          var params = {
            output: ["itemid", "clock", value_type],
            itemids: itemids,
            time_from: time_from
          };

          // Relative queries (e.g. last hour) don't include an end time
          if (time_till) {
            params.time_till = time_till;
          }

          return self.request('trend.get', params);
        }
      }, {
        key: 'getITService',
        value: function getITService( /* optional */serviceids) {
          var params = {
            output: 'extend',
            serviceids: serviceids
          };
          return this.request('service.get', params);
        }
      }, {
        key: 'getSLA',
        value: function getSLA(serviceids, from, to) {
          var params = {
            serviceids: serviceids,
            intervals: [{
              from: from,
              to: to
            }]
          };
          return this.request('service.getsla', params);
        }
      }, {
        key: 'getTriggers',
        value: function getTriggers(groupids, hostids, applicationids, showTriggers, timeFrom, timeTo) {
          var params = {
            output: 'extend',
            groupids: groupids,
            hostids: hostids,
            applicationids: applicationids,
            expandDescription: true,
            expandData: true,
            monitored: true,
            skipDependent: true,
            //only_true: true,
            filter: {
              value: 1
            },
            selectGroups: ['name'],
            selectHosts: ['name', 'host'],
            selectItems: ['name', 'key_', 'lastvalue'],
            selectLastEvent: 'extend'
          };

          if (showTriggers) {
            params.filter.value = showTriggers;
          }

          if (timeFrom || timeTo) {
            params.lastChangeSince = timeFrom;
            params.lastChangeTill = timeTo;
          }

          return this.request('trigger.get', params);
        }
      }, {
        key: 'getEvents',
        value: function getEvents(objectids, from, to, showEvents) {
          var params = {
            output: 'extend',
            time_from: from,
            time_till: to,
            objectids: objectids,
            select_acknowledges: 'extend',
            selectHosts: 'extend',
            value: showEvents
          };

          return this.request('event.get', params);
        }
      }, {
        key: 'getAcknowledges',
        value: function getAcknowledges(eventids) {
          var params = {
            output: 'extend',
            eventids: eventids,
            preservekeys: true,
            select_acknowledges: 'extend',
            sortfield: 'clock',
            sortorder: 'DESC'
          };

          return this.request('event.get', params).then(function (events) {
            return _.filter(events, function (event) {
              return event.acknowledges.length;
            });
          });
        }
      }]);

      return ZabbixAPI;
    }();

    return ZabbixAPI;
  }

  function isNotAuthorized(message) {
    return message === "Session terminated, re-login, please." || message === "Not authorised." || message === "Not authorized.";
  }

  return {
    setters: [function (_angular) {
      angular = _angular.default;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_utils) {
      utils = _utils;
    }, function (_zabbixAPICoreService) {}],
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

      angular.module('grafana.services').factory('zabbixAPIService', ZabbixAPIService);
    }
  };
});
//# sourceMappingURL=zabbixAPI.service.js.map
