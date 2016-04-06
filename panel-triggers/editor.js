'use strict';

System.register(['lodash', 'jquery'], function (_export, _context) {
  var _, $, _createClass, TriggerPanelEditorCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  // Get list of metric names for bs-typeahead directive
  function getMetricNames(scope, metricList) {
    return _.uniq(_.map(scope.metric[metricList], 'name'));
  }

  function getTriggerIndexForElement(el) {
    return el.parents('[data-trigger-index]').data('trigger-index');
  }

  function isRegex(str) {
    // Pattern for testing regex
    var regexPattern = /^\/(.*)\/([gmi]*)$/m;
    return regexPattern.test(str);
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_jquery) {
      $ = _jquery.default;
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

      TriggerPanelEditorCtrl = function () {

        /** @ngInject */

        function TriggerPanelEditorCtrl($scope, $q, uiSegmentSrv, datasourceSrv, templateSrv, popoverSrv) {
          _classCallCheck(this, TriggerPanelEditorCtrl);

          $scope.editor = this;
          this.panelCtrl = $scope.ctrl;
          this.panel = this.panelCtrl.panel;

          this.datasourceSrv = datasourceSrv;
          this.templateSrv = templateSrv;
          this.popoverSrv = popoverSrv;

          // Map functions for bs-typeahead
          this.getGroupNames = _.partial(getMetricNames, this, 'groupList');
          this.getHostNames = _.partial(getMetricNames, this, 'filteredHosts');
          this.getApplicationNames = _.partial(getMetricNames, this, 'filteredApplications');
          this.getItemNames = _.partial(getMetricNames, this, 'filteredItems');

          this.ackFilters = ['all triggers', 'unacknowledged', 'acknowledged'];

          this.sortByFields = [{ text: 'last change', value: 'lastchange' }, { text: 'severity', value: 'priority' }];

          this.showEventsFields = [{ text: 'All', value: [0, 1] }, { text: 'OK', value: [0] }, { text: 'Problems', value: 1 }];

          // Load scope defaults
          var scopeDefaults = {
            metric: {},
            inputStyles: {},
            oldTarget: _.cloneDeep(this.panel.triggers)
          };
          _.defaults(this, scopeDefaults);

          var self = this;

          // Get zabbix data sources
          var datasources = _.filter(this.datasourceSrv.getMetricSources(), function (datasource) {
            return datasource.meta.id === 'alexanderzobnin-zabbix-datasource';
          });
          this.datasources = _.map(datasources, 'name');

          // Set default datasource
          if (!this.panel.datasource) {
            this.panel.datasource = this.datasources[0];
          }
          // Load datasource
          this.datasourceSrv.get(this.panel.datasource).then(function (datasource) {
            self.datasource = datasource;
            self.initFilters();
            self.panelCtrl.refresh();
          });
        }

        _createClass(TriggerPanelEditorCtrl, [{
          key: 'initFilters',
          value: function initFilters() {
            this.filterGroups();
            this.filterHosts();
            this.filterApplications();
          }
        }, {
          key: 'filterGroups',
          value: function filterGroups() {
            var self = this;
            this.datasource.queryProcessor.getGroups().then(function (groups) {
              self.metric.groupList = groups;
            });
          }
        }, {
          key: 'filterHosts',
          value: function filterHosts() {
            var self = this;
            var groupFilter = this.templateSrv.replace(this.panel.triggers.group.filter);
            this.datasource.queryProcessor.getHosts(groupFilter).then(function (hosts) {
              self.metric.filteredHosts = hosts;
            });
          }
        }, {
          key: 'filterApplications',
          value: function filterApplications() {
            var self = this;
            var groupFilter = this.templateSrv.replace(this.panel.triggers.group.filter);
            var hostFilter = this.templateSrv.replace(this.panel.triggers.host.filter);
            this.datasource.queryProcessor.getApps(groupFilter, hostFilter).then(function (apps) {
              self.metric.filteredApplications = apps;
            });
          }
        }, {
          key: 'onTargetPartChange',
          value: function onTargetPartChange(targetPart) {
            var regexStyle = { 'color': '#CCA300' };
            targetPart.isRegex = isRegex(targetPart.filter);
            targetPart.style = targetPart.isRegex ? regexStyle : {};
          }
        }, {
          key: 'parseTarget',
          value: function parseTarget() {
            this.initFilters();
            var newTarget = _.cloneDeep(this.panel.triggers);
            if (!_.isEqual(this.oldTarget, this.panel.triggers)) {
              this.oldTarget = newTarget;
              this.panelCtrl.refresh();
            }
          }
        }, {
          key: 'refreshTriggerSeverity',
          value: function refreshTriggerSeverity() {
            _.each(this.triggerList, function (trigger) {
              trigger.color = this.panel.triggerSeverity[trigger.priority].color;
              trigger.severity = this.panel.triggerSeverity[trigger.priority].severity;
            });
            this.panelCtrl.refresh();
          }
        }, {
          key: 'datasourceChanged',
          value: function datasourceChanged() {
            this.panelCtrl.refresh();
          }
        }, {
          key: 'changeTriggerSeverityColor',
          value: function changeTriggerSeverityColor(trigger, color) {
            this.panel.triggerSeverity[trigger.priority].color = color;
            this.refreshTriggerSeverity();
          }
        }, {
          key: 'openTriggerColorSelector',
          value: function openTriggerColorSelector(event) {
            var el = $(event.currentTarget);
            var index = getTriggerIndexForElement(el);
            var popoverScope = this.$new();
            popoverScope.trigger = this.panel.triggerSeverity[index];
            popoverScope.changeTriggerSeverityColor = this.changeTriggerSeverityColor;

            this.popoverSrv.show({
              element: el,
              placement: 'top',
              templateUrl: 'public/plugins/alexanderzobnin-zabbix-app/panel-triggers/trigger.colorpicker.html',
              scope: popoverScope
            });
          }
        }, {
          key: 'openOkEventColorSelector',
          value: function openOkEventColorSelector(event) {
            var el = $(event.currentTarget);
            var popoverScope = this.$new();
            popoverScope.trigger = { color: this.panel.okEventColor };
            popoverScope.changeTriggerSeverityColor = function (trigger, color) {
              this.panel.okEventColor = color;
              this.refreshTriggerSeverity();
            };

            this.popoverSrv.show({
              element: el,
              placement: 'top',
              templateUrl: 'public/plugins/alexanderzobnin-zabbix-app/panel-triggers/trigger.colorpicker.html',
              scope: popoverScope
            });
          }
        }]);

        return TriggerPanelEditorCtrl;
      }();

      function triggerPanelEditor() {
        return {
          restrict: 'E',
          scope: true,
          templateUrl: 'public/plugins/alexanderzobnin-zabbix-app/panel-triggers/editor.html',
          controller: TriggerPanelEditorCtrl
        };
      }

      _export('triggerPanelEditor', triggerPanelEditor);
    }
  };
});
//# sourceMappingURL=editor.js.map
