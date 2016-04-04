'use strict';

System.register(['lodash', 'moment', 'app/plugins/sdk', './editor', './css/panel_triggers.css!'], function (_export, _context) {
  var _, moment, MetricsPanelCtrl, triggerPanelEditor, _createClass, defaultSeverity, panelDefaults, triggerStatusMap, defaultTimeFormat, TriggerPanelCtrl;

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

  function filterTriggers(triggers, triggerFilter) {
    if (isRegex(triggerFilter)) {
      return _.filter(triggers, function (trigger) {
        return buildRegex(triggerFilter).test(trigger.description);
      });
    } else {
      return _.filter(triggers, function (trigger) {
        return trigger.description === triggerFilter;
      });
    }
  }

  function isRegex(str) {
    // Pattern for testing regex
    var regexPattern = /^\/(.*)\/([gmi]*)$/m;
    return regexPattern.test(str);
  }

  function buildRegex(str) {
    var regexPattern = /^\/(.*)\/([gmi]*)$/m;
    var matches = str.match(regexPattern);
    var pattern = matches[1];
    var flags = matches[2] !== "" ? matches[2] : undefined;
    return new RegExp(pattern, flags);
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_moment) {
      moment = _moment.default;
    }, function (_appPluginsSdk) {
      MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
    }, function (_editor) {
      triggerPanelEditor = _editor.triggerPanelEditor;
    }, function (_cssPanel_triggersCss) {}],
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

      defaultSeverity = [{ priority: 0, severity: 'Not classified', color: '#B7DBAB', show: true }, { priority: 1, severity: 'Information', color: '#82B5D8', show: true }, { priority: 2, severity: 'Warning', color: '#E5AC0E', show: true }, { priority: 3, severity: 'Average', color: '#C15C17', show: true }, { priority: 4, severity: 'High', color: '#BF1B00', show: true }, { priority: 5, severity: 'Disaster', color: '#890F02', show: true }];
      panelDefaults = {
        datasource: null,
        triggers: {
          group: { filter: "" },
          host: { filter: "" },
          application: { filter: "" },
          trigger: { filter: "" }
        },
        hostField: true,
        statusField: false,
        severityField: false,
        lastChangeField: true,
        ageField: true,
        infoField: true,
        limit: 10,
        showTriggers: 'all triggers',
        sortTriggersBy: { text: 'last change', value: 'lastchange' },
        showEvents: { text: 'Problems', value: '1' },
        triggerSeverity: defaultSeverity,
        okEventColor: 'rgba(0, 245, 153, 0.45)'
      };
      triggerStatusMap = {
        '0': 'OK',
        '1': 'Problem'
      };
      defaultTimeFormat = "DD MMM YYYY HH:mm:ss";

      _export('PanelCtrl', _export('TriggerPanelCtrl', TriggerPanelCtrl = function (_MetricsPanelCtrl) {
        _inherits(TriggerPanelCtrl, _MetricsPanelCtrl);

        /** @ngInject */

        function TriggerPanelCtrl($scope, $injector, $q, $element, datasourceSrv, templateSrv) {
          _classCallCheck(this, TriggerPanelCtrl);

          var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(TriggerPanelCtrl).call(this, $scope, $injector));

          _this.datasourceSrv = datasourceSrv;
          _this.templateSrv = templateSrv;
          _this.triggerStatusMap = triggerStatusMap;
          _this.defaultTimeFormat = defaultTimeFormat;

          // Load panel defaults
          _.defaults(_this.panel, panelDefaults);

          _this.triggerList = [];
          _this.refreshData();
          return _this;
        }

        /**
         * Override onInitMetricsPanelEditMode() method from MetricsPanelCtrl.
         * We don't need metric editor from Metrics Panel.
         */


        _createClass(TriggerPanelCtrl, [{
          key: 'onInitMetricsPanelEditMode',
          value: function onInitMetricsPanelEditMode() {
            this.addEditorTab('Options', triggerPanelEditor, 2);
          }
        }, {
          key: 'refresh',
          value: function refresh() {
            this.onMetricsPanelRefresh();
          }
        }, {
          key: 'onMetricsPanelRefresh',
          value: function onMetricsPanelRefresh() {
            // ignore fetching data if another panel is in fullscreen
            if (this.otherPanelInFullscreenMode()) {
              return;
            }

            // clear loading/error state
            delete this.error;
            this.loading = true;
            this.setTimeQueryStart();

            this.refreshData();
          }
        }, {
          key: 'refreshData',
          value: function refreshData() {
            var _this2 = this;

            var self = this;

            // Load datasource
            return this.datasourceSrv.get(this.panel.datasource).then(function (datasource) {
              var zabbix = datasource.zabbixAPI;
              var queryProcessor = datasource.queryProcessor;
              var showEvents = self.panel.showEvents.value;
              var triggerFilter = self.panel.triggers;

              // Replace template variables
              var groupFilter = self.templateSrv.replace(triggerFilter.group.filter);
              var hostFilter = self.templateSrv.replace(triggerFilter.host.filter);
              var appFilter = self.templateSrv.replace(triggerFilter.application.filter);

              var buildQuery = queryProcessor.buildTriggerQuery(groupFilter, hostFilter, appFilter);
              return buildQuery.then(function (query) {
                return zabbix.getTriggers(query.groupids, query.hostids, query.applicationids, showEvents).then(function (triggers) {
                  return _.map(triggers, function (trigger) {
                    var triggerObj = trigger;

                    // Format last change and age
                    trigger.lastchangeUnix = Number(trigger.lastchange);
                    var timestamp = moment.unix(trigger.lastchangeUnix);
                    if (self.panel.customLastChangeFormat) {
                      // User defined format
                      triggerObj.lastchange = timestamp.format(self.panel.lastChangeFormat);
                    } else {
                      triggerObj.lastchange = timestamp.format(self.defaultTimeFormat);
                    }
                    triggerObj.age = timestamp.fromNow(true);

                    // Set host that the trigger belongs
                    if (trigger.hosts.length) {
                      triggerObj.host = trigger.hosts[0].name;
                    }

                    // Set color
                    if (trigger.value === '1') {
                      // Problem state
                      triggerObj.color = self.panel.triggerSeverity[trigger.priority].color;
                    } else {
                      // OK state
                      triggerObj.color = self.panel.okEventColor;
                    }

                    triggerObj.severity = self.panel.triggerSeverity[trigger.priority].severity;
                    return triggerObj;
                  });
                }).then(function (triggerList) {

                  // Request acknowledges for trigger
                  var eventids = _.map(triggerList, function (trigger) {
                    return trigger.lastEvent.eventid;
                  });

                  return zabbix.getAcknowledges(eventids).then(function (events) {

                    // Map events to triggers
                    _.each(triggerList, function (trigger) {
                      var event = _.find(events, function (event) {
                        return event.eventid === trigger.lastEvent.eventid;
                      });

                      if (event) {
                        trigger.acknowledges = _.map(event.acknowledges, function (ack) {
                          var time = new Date(+ack.clock * 1000);
                          ack.time = time.toLocaleString();
                          ack.user = ack.alias + ' (' + ack.name + ' ' + ack.surname + ')';
                          return ack;
                        });
                      }
                    });

                    // Filter triggers by description
                    var triggerFilter = self.panel.triggers.trigger.filter;
                    if (triggerFilter) {
                      triggerList = filterTriggers(triggerList, triggerFilter);
                    }

                    // Filter acknowledged triggers
                    if (self.panel.showTriggers === 'unacknowledged') {
                      triggerList = _.filter(triggerList, function (trigger) {
                        return !trigger.acknowledges;
                      });
                    } else if (self.panel.showTriggers === 'acknowledged') {
                      triggerList = _.filter(triggerList, 'acknowledges');
                    } else {
                      triggerList = triggerList;
                    }

                    // Filter triggers by severity
                    triggerList = _.filter(triggerList, function (trigger) {
                      return self.panel.triggerSeverity[trigger.priority].show;
                    });

                    // Sort triggers
                    if (self.panel.sortTriggersBy.value === 'priority') {
                      triggerList = _.sortBy(triggerList, 'priority').reverse();
                    } else {
                      triggerList = _.sortBy(triggerList, 'lastchangeUnix').reverse();
                    }

                    // Limit triggers number
                    self.triggerList = _.first(triggerList, self.panel.limit);

                    _this2.setTimeQueryEnd();
                    _this2.loading = false;
                  });
                });
              });
            });
          }
        }, {
          key: 'switchComment',
          value: function switchComment(trigger) {
            trigger.showComment = !trigger.showComment;
          }
        }, {
          key: 'switchAcknowledges',
          value: function switchAcknowledges(trigger) {
            trigger.showAcknowledges = !trigger.showAcknowledges;
          }
        }]);

        return TriggerPanelCtrl;
      }(MetricsPanelCtrl)));

      TriggerPanelCtrl.templateUrl = 'panel-triggers/module.html';
      _export('TriggerPanelCtrl', TriggerPanelCtrl);

      _export('PanelCtrl', TriggerPanelCtrl);
    }
  };
});
//# sourceMappingURL=module.js.map
