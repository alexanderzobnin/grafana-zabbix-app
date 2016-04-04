'use strict';

System.register(['angular'], function (_export, _context) {
  var angular, _createClass, ZabbixAPICoreService;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  // Define zabbix API exception type
  function ZabbixException(error) {
    this.code = error.code;
    this.errorType = error.message;
    this.message = error.data;
  }

  return {
    setters: [function (_angular) {
      angular = _angular.default;
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

      ZabbixAPICoreService = function () {

        /** @ngInject */

        function ZabbixAPICoreService($q, backendSrv) {
          _classCallCheck(this, ZabbixAPICoreService);

          this.$q = $q;
          this.backendSrv = backendSrv;
        }

        /**
         * Request data from Zabbix API
         * @return {object}  response.result
         */


        _createClass(ZabbixAPICoreService, [{
          key: 'request',
          value: function request(api_url, method, params, options, auth) {
            var deferred = this.$q.defer();
            var requestData = {
              jsonrpc: '2.0',
              method: method,
              params: params,
              id: 1
            };

            if (auth === "") {
              // Reject immediately if not authenticated
              deferred.reject({ data: "Not authorised." });
              return deferred.promise;
            } else if (auth) {
              // Set auth parameter only if it needed
              requestData.auth = auth;
            }

            var requestOptions = {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              url: api_url,
              data: requestData
            };

            // Set request options for basic auth
            if (options.basicAuth || options.withCredentials) {
              requestOptions.withCredentials = true;
            }
            if (options.basicAuth) {
              requestOptions.headers.Authorization = options.basicAuth;
            }

            this.backendSrv.datasourceRequest(requestOptions).then(function (response) {
              // General connection issues
              if (!response.data) {
                deferred.reject(response);
              }

              // Handle Zabbix API errors
              else if (response.data.error) {
                  deferred.reject(response.data.error);
                }

              deferred.resolve(response.data.result);
            });
            return deferred.promise;
          }
        }, {
          key: 'login',
          value: function login(api_url, username, password, options) {
            var params = {
              user: username,
              password: password
            };
            return this.request(api_url, 'user.login', params, options, null);
          }
        }, {
          key: 'getVersion',
          value: function getVersion(api_url, options) {
            return this.request(api_url, 'apiinfo.version', [], options);
          }
        }]);

        return ZabbixAPICoreService;
      }();

      ZabbixException.prototype.toString = function () {
        return this.errorType + ": " + this.message;
      };

      angular.module('grafana.services').service('zabbixAPICoreService', ZabbixAPICoreService);
    }
  };
});
//# sourceMappingURL=zabbixAPICore.service.js.map
