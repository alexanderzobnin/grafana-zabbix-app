'use strict';

System.register(['app/plugins/sdk', 'lodash', './utils', './metricFunctions', './migrations', './add-metric-function.directive', './metric-function-editor.directive', './css/query-editor.css!'], function (_export, _context) {
  var QueryCtrl, _, utils, metricFunctions, migrations, _createClass, ZabbixQueryController;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  // Get list of metric names for bs-typeahead directive
  function getMetricNames(scope, metricList) {
    return _.uniq(_.map(scope.metric[metricList], 'name'));
  }
  return {
    setters: [function (_appPluginsSdk) {
      QueryCtrl = _appPluginsSdk.QueryCtrl;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_utils) {
      utils = _utils;
    }, function (_metricFunctions) {
      metricFunctions = _metricFunctions;
    }, function (_migrations) {
      migrations = _migrations;
    }, function (_addMetricFunctionDirective) {}, function (_metricFunctionEditorDirective) {}, function (_cssQueryEditorCss) {}],
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

      _export('ZabbixQueryController', ZabbixQueryController = function (_QueryCtrl) {
        _inherits(ZabbixQueryController, _QueryCtrl);

        // ZabbixQueryCtrl constructor

        function ZabbixQueryController($scope, $injector, $rootScope, $sce, $q, templateSrv) {
          _classCallCheck(this, ZabbixQueryController);

          var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ZabbixQueryController).call(this, $scope, $injector));

          _this.zabbix = _this.datasource.zabbixAPI;
          _this.cache = _this.datasource.zabbixCache;
          _this.$q = $q;

          // Use custom format for template variables
          _this.replaceTemplateVars = _this.datasource.replaceTemplateVars;
          _this.templateSrv = templateSrv;

          _this.editorModes = {
            0: 'num',
            1: 'itservice',
            2: 'text'
          };

          // Map functions for bs-typeahead
          _this.getGroupNames = _.partial(getMetricNames, _this, 'groupList');
          _this.getHostNames = _.partial(getMetricNames, _this, 'hostList');
          _this.getApplicationNames = _.partial(getMetricNames, _this, 'appList');
          _this.getItemNames = _.partial(getMetricNames, _this, 'itemList');

          // Update metric suggestion when template variable was changed
          $rootScope.$on('template-variable-value-updated', function () {
            return _this.onVariableChange();
          });

          _this.init = function () {
            var target = this.target;

            // Migrate old targets
            target = migrations.migrate(target);

            var scopeDefaults = {
              metric: {},
              oldTarget: _.cloneDeep(this.target)
            };
            _.defaults(this, scopeDefaults);

            // Load default values
            var targetDefaults = {
              mode: 0,
              group: { filter: "" },
              host: { filter: "" },
              application: { filter: "" },
              item: { filter: "" },
              functions: [],
              refId: "A"
            };
            _.defaults(target, targetDefaults);

            // Create function instances from saved JSON
            target.functions = _.map(target.functions, function (func) {
              return metricFunctions.createFuncInstance(func.def, func.params);
            });

            if (target.mode === 0 || target.mode === 2) {

              this.downsampleFunctionList = [{ name: "avg", value: "avg" }, { name: "min", value: "min" }, { name: "max", value: "max" }];

              this.initFilters();
            } else if (target.mode === 1) {
              this.slaPropertyList = [{ name: "Status", property: "status" }, { name: "SLA", property: "sla" }, { name: "OK time", property: "okTime" }, { name: "Problem time", property: "problemTime" }, { name: "Down time", property: "downtimeTime" }];
              this.itserviceList = [{ name: "test" }];
              this.updateITServiceList();
            }
          };

          _this.init();
          return _this;
        }

        _createClass(ZabbixQueryController, [{
          key: 'initFilters',
          value: function initFilters() {
            var self = this;
            var itemtype = self.editorModes[self.target.mode];
            return this.$q.when(this.suggestGroups()).then(function () {
              return self.suggestHosts();
            }).then(function () {
              return self.suggestApps();
            }).then(function () {
              return self.suggestItems(itemtype);
            });
          }
        }, {
          key: 'suggestGroups',
          value: function suggestGroups() {
            var self = this;
            return this.cache.getGroups().then(function (groups) {
              self.metric.groupList = groups;
              return groups;
            });
          }
        }, {
          key: 'suggestHosts',
          value: function suggestHosts() {
            var self = this;
            var groupFilter = this.replaceTemplateVars(this.target.group.filter);
            return this.datasource.queryProcessor.filterGroups(self.metric.groupList, groupFilter).then(function (groups) {
              var groupids = _.map(groups, 'groupid');
              return self.zabbix.getHosts(groupids).then(function (hosts) {
                self.metric.hostList = hosts;
                return hosts;
              });
            });
          }
        }, {
          key: 'suggestApps',
          value: function suggestApps() {
            var self = this;
            var hostFilter = this.replaceTemplateVars(this.target.host.filter);
            return this.datasource.queryProcessor.filterHosts(self.metric.hostList, hostFilter).then(function (hosts) {
              var hostids = _.map(hosts, 'hostid');
              return self.zabbix.getApps(hostids).then(function (apps) {
                return self.metric.appList = apps;
              });
            });
          }
        }, {
          key: 'suggestItems',
          value: function suggestItems() {
            var itemtype = arguments.length <= 0 || arguments[0] === undefined ? 'num' : arguments[0];

            var self = this;
            var appFilter = this.replaceTemplateVars(this.target.application.filter);
            if (appFilter) {
              // Filter by applications
              return this.datasource.queryProcessor.filterApps(self.metric.appList, appFilter).then(function (apps) {
                var appids = _.map(apps, 'applicationid');
                return self.zabbix.getItems(undefined, appids, itemtype).then(function (items) {
                  if (!self.target.showDisabledItems) {
                    items = _.filter(items, { 'status': '0' });
                  }
                  self.metric.itemList = items;
                  return items;
                });
              });
            } else {
              // Return all items belonged to selected hosts
              var hostids = _.map(self.metric.hostList, 'hostid');
              return self.zabbix.getItems(hostids, undefined, itemtype).then(function (items) {
                if (!self.target.showDisabledItems) {
                  items = _.filter(items, { 'status': '0' });
                }
                self.metric.itemList = items;
                return items;
              });
            }
          }
        }, {
          key: 'onTargetPartChange',
          value: function onTargetPartChange(targetPart) {
            /*var regexStyle = {'color': '#CCA300'};
            targetPart.isRegex = utils.isRegex(targetPart.filter);
            targetPart.style = targetPart.isRegex ? regexStyle : {};*/
          }
        }, {
          key: 'isRegex',
          value: function isRegex(str) {
            return utils.isRegex(str);
          }
        }, {
          key: 'isVariable',
          value: function isVariable(str) {
            var variablePattern = /^\$\w+/;
            if (variablePattern.test(str)) {
              var variables = _.map(this.templateSrv.variables, function (variable) {
                return '$' + variable.name;
              });
              return _.contains(variables, str);
            } else {
              return false;
            }
          }
        }, {
          key: 'onTargetBlur',
          value: function onTargetBlur() {
            var newTarget = _.cloneDeep(this.target);
            if (!_.isEqual(this.oldTarget, this.target)) {
              this.oldTarget = newTarget;
              this.targetChanged();
            }
          }
        }, {
          key: 'onVariableChange',
          value: function onVariableChange() {
            if (this.isContainsVariables()) {
              this.targetChanged();
            }
          }
        }, {
          key: 'isContainsVariables',
          value: function isContainsVariables() {
            var self = this;
            return _.some(self.templateSrv.variables, function (variable) {
              return _.some(['group', 'host', 'application', 'item'], function (field) {
                return self.templateSrv.containsVariable(self.target[field].filter, variable.name);
              });
            });
          }
        }, {
          key: 'parseTarget',
          value: function parseTarget() {}
          // Parse target


          // Validate target and set validation info

        }, {
          key: 'validateTarget',
          value: function validateTarget() {
            // validate
          }
        }, {
          key: 'targetChanged',
          value: function targetChanged() {
            this.initFilters();
            this.parseTarget();
            this.panelCtrl.refresh();
          }
        }, {
          key: 'addFunction',
          value: function addFunction(funcDef) {
            var newFunc = metricFunctions.createFuncInstance(funcDef);
            newFunc.added = true;
            this.target.functions.push(newFunc);

            this.moveAliasFuncLast();

            if (newFunc.params.length && newFunc.added || newFunc.def.params.length === 0) {
              this.targetChanged();
            }
          }
        }, {
          key: 'removeFunction',
          value: function removeFunction(func) {
            this.target.functions = _.without(this.target.functions, func);
            this.targetChanged();
          }
        }, {
          key: 'moveAliasFuncLast',
          value: function moveAliasFuncLast() {
            var aliasFunc = _.find(this.target.functions, function (func) {
              return func.def.name === 'alias' || func.def.name === 'aliasByNode' || func.def.name === 'aliasByMetric';
            });

            if (aliasFunc) {
              this.target.functions = _.without(this.target.functions, aliasFunc);
              this.target.functions.push(aliasFunc);
            }
          }
        }, {
          key: 'switchEditorMode',
          value: function switchEditorMode(mode) {
            this.target.mode = mode;
            this.init();
          }
        }, {
          key: 'updateITServiceList',
          value: function updateITServiceList() {
            var self = this;
            this.datasource.zabbixAPI.getITService().then(function (iteservices) {
              self.itserviceList = [];
              self.itserviceList = self.itserviceList.concat(iteservices);
            });
          }
        }, {
          key: 'selectITService',
          value: function selectITService() {
            if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
              this.oldTarget = angular.copy(this.target);
              this.panelCtrl.refresh();
            }
          }
        }]);

        return ZabbixQueryController;
      }(QueryCtrl));

      _export('ZabbixQueryController', ZabbixQueryController);

      // Set templateUrl as static property
      ZabbixQueryController.templateUrl = 'datasource-zabbix/partials/query.editor.html';
    }
  };
});
//# sourceMappingURL=query.controller.js.map
