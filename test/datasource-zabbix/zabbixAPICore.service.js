'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * General Zabbix API methods
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ZabbixAPICoreService = function () {

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
      }, function (error) {
        deferred.reject(error.err);
      });

      return deferred.promise;
    }

    /**
     * Get authentication token.
     * @return {string}  auth token
     */

  }, {
    key: 'login',
    value: function login(api_url, username, password, options) {
      var params = {
        user: username,
        password: password
      };
      return this.request(api_url, 'user.login', params, options, null);
    }

    /**
     * Get Zabbix API version
     * Matches the version of Zabbix starting from Zabbix 2.0.4
     */

  }, {
    key: 'getVersion',
    value: function getVersion(api_url, options) {
      return this.request(api_url, 'apiinfo.version', [], options);
    }
  }]);

  return ZabbixAPICoreService;
}();

// Define zabbix API exception type


function ZabbixException(error) {
  this.code = error.code;
  this.errorType = error.message;
  this.message = error.data;
}

ZabbixException.prototype.toString = function () {
  return this.errorType + ": " + this.message;
};

_angular2.default.module('grafana.services').service('zabbixAPICoreService', ZabbixAPICoreService);
