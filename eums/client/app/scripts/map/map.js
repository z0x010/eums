(function (module) {
    function getNumberOf(receivedCriteria, data) {
        return data.filter(function (answer) {
            return answer.productReceived && answer.productReceived.toLowerCase() === receivedCriteria.toLowerCase();
        });
    }

    function getMarkerContent(allDistricts, layerName) {
        var content = '';
        allDistricts.forEach(function (district) {
            if (district.district === layerName) {
                content = district.messages;
            }
        });
        return content;
    }

    function getHeatMapStyle(allDistricts, location) {
        var style = {
            fillColor: '#F1EEE8',
            fillOpacity: 0.6,
            weight: 1
        };
        allDistricts.forEach(function (district) {
            if (district.district === location) {
                style.fillColor = district.color;
            }
        });
        return style;
    }

    function getHeatMapColor(consigneeResponses) {
        var noProductReceived = getNumberOf("yes", consigneeResponses).length;
        var RED = '#DE2F2F', GREEN = '#66BD63', ORANGE = '#FDAE61';
        if (noProductReceived === consigneeResponses.length) return GREEN;
        if (noProductReceived > 0 && noProductReceived < consigneeResponses.length) return ORANGE;
        return RED;
    }

    function getHeatMapResponsePercentage(consigneeResponses) {
        var noProductReceived = getNumberOf("yes", consigneeResponses).length;
        var percentageReceived = (noProductReceived / consigneeResponses.length) * 100;
        return Math.round(percentageReceived);
    }

    function getHeatMapLayerColourForLocation(responsesWithLocation) {
        return responsesWithLocation.map(function (responseWithLocation) {
            return{
                district: responseWithLocation.location,
                color: getHeatMapColor(responseWithLocation.consigneeResponses),
                messages: getHeatMapResponsePercentage(responseWithLocation.consigneeResponses)
            }
        });
    }

    function circleMarkerIcon(content) {
        return L.divIcon({
            iconSize: new L.Point(25, 25),
            className: 'messages-aggregate-marker-icon',
            html: '<div>' + content + '%</div>'
        });
    }

    function messagesAggregateMarker(layer, aggregateValue) {
        var marker = new L.Marker(layer.getCenter(), {
            icon: circleMarkerIcon(aggregateValue)
        });

        if (typeof(aggregateValue) === 'number') {
            return marker;
        }
    }

    module.factory('GeoJsonService', function ($http, EumsConfig) {
        return {
            districts: function () {
                return $http.get(EumsConfig.DISTRICTGEOJSONURL, {cache: true});
            }
        }
    });

    module.factory('MapService', function (GeoJsonService, EumsConfig, LayerMap, Layer, IPService, $q, MapFilterService, DistributionPlanService) {
        var map, mapElementId, mapLayerName, mapScope;


        function initMap(elementId) {
            var map = L.map(elementId, {
                zoomControl: false,
                scrollWheelZoom: false,
                touchZoom: false,
                doubleClickZoom: false
            }).setView([1.406, 32.000], 7);

            L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>',
                maxZoom: 13,
                minZoom: 7
            }).addTo(map);


            map.on('zoomend', function () {

            });

            return map;
        }

        var markersGroup = [];

        function addHeatMapLayer(map, scope) {
            var allMarkers = [];
            DistributionPlanService.groupAllResponsesByLocation().then(function (responsesWithLocation) {
                scope.reponsesFromDb = responsesWithLocation;
                markersGroup.clearLayers && markersGroup.clearLayers();

                if (scope.isFiltered) {
                    scope.allResponsesMap = scope.data.allResponsesLocationMap
                } else {
                    scope.allResponsesMap = scope.data.allResponsesLocationMap.length ? scope.data.allResponsesLocationMap : scope.reponsesFromDb;
                }

                var allLocations = getHeatMapLayerColourForLocation(scope.allResponsesMap);
                angular.forEach(LayerMap.getLayers(), function (layer, layerName) {
                    layer.setStyle(getHeatMapStyle(allLocations, layerName));
                    var marker = messagesAggregateMarker(layer, getMarkerContent(allLocations, layerName))

                    marker && allMarkers.push(marker);
                });
                markersGroup = L.layerGroup(allMarkers);
                markersGroup.addTo(map);
            });
        }

        function addDistrictsLayer(map, scope) {
            return GeoJsonService.districts().then(function (response) {
                L.geoJson(response.data, {
                    style: EumsConfig.districtLayerStyle,
                    onEachFeature: function (feature, layer) {
                        var districtName = feature.properties.DNAME_2010 || 'unknown';
                        var districtLayer = Layer.build(map, layer, EumsConfig, scope, districtName);
                        LayerMap.addLayer(districtLayer, districtName.toLowerCase())
                    }
                }).addTo(map);
            });
        }

        return {
            render: function (elementId, layerName, scope) {
                mapElementId = elementId, mapLayerName = layerName, mapScope = scope;
                map = initMap(elementId);

                return addDistrictsLayer(map, scope).then(function () {
                    layerName && this.clickLayer(layerName);
                    return this;
                }.bind(this)).then(function () {
                    this.addHeatMap(scope);
                }.bind(this)).then(function () {
                    return this;
                }.bind(this));
            },
            getZoom: function () {
                return map.getZoom();
            },
            addHeatMap: function (scope) {
                addHeatMapLayer(map, scope);
            },
            getCenter: function () {
                return map.getCenter();
            },
            addAllMarkers: function () {
                var markers = [];
                MapFilterService.getAllMarkerMaps().forEach(function (markerMap) {
                    markers.push(markerMap.marker);
                });
                return L.layerGroup(markers).addTo(map);
            },
            addMarker: function (marker) {
                return addIPMarker(marker);
            },
            setView: function () {
                map.setView([1.406, 32.000], 7);
            },
            removeMarker: function (marker) {
                map.removeLayer(marker);
            },
            clearAllMarkers: function (markers) {
                var self = this;
                var clearMarkers = function (markerMap) {
                    self.removeMarker(markerMap.marker);
                };

                if (markers) {
                    markers.forEach(clearMarkers)
                } else {
                    MapFilterService.getAllMarkerMaps().forEach(clearMarkers);
                }
            },

            addMarkers: function (markersMap) {
                var markers = [];
                markersMap.forEach(function (markerMap) {
                    markers.push(markerMap.marker);
                });

                L.layerGroup(markers).addTo(map);
            },

            highlightLayer: function (layerName) {
                LayerMap.selectLayer(layerName.toLowerCase());
            },
            getLayerName: function () {
                return LayerMap.getLayerName();
            },
            getStyle: function (layerName) {
                return LayerMap.getStyle(layerName);
            },
            getHighlightedLayer: function () {
                return LayerMap.getSelectedLayer();
            },
            getLayerCenter: function (layerName) {
                return LayerMap.getLayerCenter(layerName.toLowerCase());
            },
            getLayerBounds: function (layerName) {
                return LayerMap.getLayerBoundsBy(layerName);
            },
            clickLayer: function (layerName, scope) {
                if (layerName) {
                    LayerMap.clickLayer(layerName.toLowerCase(), scope);
                    this.highlightLayer(layerName);
                }
            }
        };
    });


    module.directive('map', function (MapService, $window, IPService, DistributionPlanService) {
        return {
            scope: false,
            link: function (scope, element, attrs) {
                MapService.render(attrs.id, null, scope).then(function (map) {
                    $window.map = map;
                    scope.filter = {};
                    scope.clickedMarker = '';
                    scope.allMarkers = [];
                    scope.shownMarkers = [];
                    scope.programme = '';
                    scope.notDeliveredChecked = false;
                    scope.deliveredChecked = null;
                    scope.allMarkers = [];

                    DistributionPlanService.aggregateResponses().then(function (aggregates) {
                        scope.data.totalStats = aggregates;
                    });
                    scope.hideMapMarkerDetails = function () {
                        scope.data.responses = null;
                    };
                });

            }
        }
    }).directive('panel', function () {
        return {
            scope: true,
            link: function (scope, element, attrs) {
                scope.expanded = true;

                var expandAnimation = JSON.parse(attrs.panelExpand);
                var collapseAnimation = JSON.parse(attrs.panelCollapse);
                var panel = $(element);

                var togglePanel = function () {
                    var $closePanel = $('.close-panel span'),
                        zoomControl = $('.leaflet-control-zoom');
                    if (scope.expanded) {
                        panel.animate(collapseAnimation);
                        scope.expanded = false;
                        $closePanel.removeClass("glyphicon-chevron-down");
                        $closePanel.addClass("glyphicon-chevron-up");
                        zoomControl.addClass('leaflet-control-zoom-left');
                        zoomControl.removeClass('leaflet-control-zoom');

                    } else {
                        panel.animate(expandAnimation);
                        scope.expanded = true;
                        $('.leaflet-control-zoom-left').addClass('leaflet-control-zoom');
                        $closePanel.removeClass("glyphicon-chevron-up");
                        $closePanel.addClass("glyphicon-chevron-down");
                    }
                    return false;
                };
                $(".close-panel").click(function () {
                    togglePanel();
                });
            }
        }
    }).directive('mapFilter', function () {
        return{
            restrict: 'E',
            scope: false,
            templateUrl: '/static/app/views/partials/filters.html'
        }
    }).directive('mapSummary', function () {
        return{
            restrict: 'A',
            scope: false,
            templateUrl: '/static/app/views/partials/marker-summary.html'
        }
    }).directive('filters', function (DistributionPlanService) {
        function removeEmptyArray(filteredResponses) {
            return filteredResponses.filter(function (response) {
                return response.length > 0;
            });
        }

        return {
            restrict: 'A',
            scope: false,
            link: function (scope) {
                scope.$watchCollection('filter', function (newValue) {
                    scope.dateFilter = {from: '', to: ''};
                    var responsesToPlot = [];
                    if (!newValue.programme && !newValue.ip && (scope.programmeFilter || scope.ipFilter)) {
                        scope.data.allResponsesLocationMap = scope.reponsesFromDb
                    }

                    if (newValue.programme) {
                        scope.isFiltered = true;
                        scope.programmeFilter = true;
                        var filteredResponses = scope.reponsesFromDb.map(function (responseLocationMap) {
                            return responseLocationMap.consigneeResponses.filter(function (response) {
                                return parseInt(response.programme.id) === parseInt(newValue.programme);
                            });
                        });
                        scope.data.allResponsesLocationMap = DistributionPlanService.groupResponsesByLocation(_.flatten(removeEmptyArray(filteredResponses)));
                    }

                    if (newValue.ip) {
                        scope.isFiltered = true;
                        scope.ipFilter = true;
                        if (scope.programmeFilter) {
                            responsesToPlot = scope.data.allResponsesLocationMap
                        }
                        if (!scope.programmeFilter || !newValue.programme) {
                            responsesToPlot = scope.reponsesFromDb
                        }

                        var filteredResponses = responsesToPlot.map(function (responseLocationMap) {
                            return responseLocationMap.consigneeResponses.filter(function (response) {
                                return parseInt(response.ip.id) === parseInt(newValue.ip);
                            });
                        });
                        scope.data.allResponsesLocationMap = DistributionPlanService.groupResponsesByLocation(_.flatten(removeEmptyArray(filteredResponses)));
                    }

                    scope.data.topLevelResponses = scope.data.allResponsesLocationMap;
                });


                scope.$watch('data.allResponsesLocationMap', function () {
                    if (window.map.render) {
                        window.map.addHeatMap(scope);
                    }

                    if (scope.isFiltered) {
                        scope.allResponsesMap = scope.data.allResponsesLocationMap
                    } else {
                        scope.allResponsesMap = scope.data.allResponsesLocationMap.length ? scope.data.allResponsesLocationMap : scope.reponsesFromDb;
                    }

                    if (scope.allResponsesMap)  scope.data.totalStats = DistributionPlanService.aggregateStats(scope.allResponsesMap, scope.data.district);

                    if (scope.data.district) {
                        var layerName = scope.data.district;
                        //TODO: refactor this, to use same function with district on click
                        (function showResponsesForDistrict() {
                            var allResponses = DistributionPlanService.orderResponsesByDate(scope.allResponsesMap, scope.data.district);
                            scope.data.responses = allResponses.slice(0, 5);
                            scope.data.district = layerName;
                        })();
                    }
                });
            }
        }

    }).directive('selectProgram', function (ProgrammeService) {
            return {
                restrict: 'A',
                scope: false,
                link: function (scope, elem) {
                    ProgrammeService.fetchProgrammes().then(function (response) {
                        return response.data.map(function (programe) {
                            return {id: programe.id, text: programe.name}
                        });

                    }).then(function (data) {
                        var defaultProgramme = [
                            {id: '', text: 'All Outcomes'}
                        ];
                        $(elem).select2({
                            data: defaultProgramme.concat(data)
                        });
                    });

                }
            }
        }
    ).directive('selectIP', function (ProgrammeService, FilterService, DistributionPlanService, ConsigneeService, $q) {
            return {
                restrict: 'A',
                link: function (scope, elem) {
                    DistributionPlanService.getAllPlansNodes().then(function (responses) {
                        var ips = responses.filter(function (response) {
                            return !response.data.parent;
                        });
                        var dataPromises = ips.map(function (ip) {
                            return ConsigneeService.getConsigneeById(ip.data.consignee).then(function (consignee) {
                                return {
                                    id: ip.data.id,
                                    text: consignee.name
                                }
                            });
                        });

                        return $q.all(dataPromises);
                    }).then(function (data) {
                        var displayedData = _.uniq(data, function (ip) {
                            return ip.text.toLowerCase();
                        });
                        var defaultIP = [
                            {id: '', text: 'All Implementing Partners'}
                        ];
                        $(elem).select2({
                            data: defaultIP.concat(displayedData)
                        });
                    });
                }
            }
        }).directive('deliveryStatus', function (DistributionPlanService) {
            function removeEmptyArray(filteredResponses) {
                return filteredResponses.filter(function (response) {
                    return response.length > 0;
                });
            }

            return {
                restrict: 'A',
                scope: false,
                link: function (scope) {
                    scope.$watchCollection('deliveryStatus', function (newValue) {
                        var responsesToPlot = scope.data.topLevelResponses.length ? scope.data.topLevelResponses : scope.allResponsesMap;

                        var receivedResponses = [];
                        var notReceivedResponses = [];
                        var receivedResponsesWithIssues = [];
                        scope.dateFilter = {from: '', to: ''};

                        DistributionPlanService.groupAllResponsesByLocation().then(function (responsesWithLocation) {
                            scope.reponsesFromDb = responsesWithLocation;

                            if (newValue.received && newValue.notDelivered && newValue.receivedWithIssues) {
                                if (scope.isFiltered) {
                                    scope.data.allResponsesLocationMap = scope.data.topLevelResponses && scope.data.topLevelResponses.length ? scope.data.topLevelResponses : scope.reponsesFromDb;
                                } else {
                                    scope.data.allResponsesLocationMap = scope.reponsesFromDb;
                                }
                                return;
                            }

                            if (!newValue.received && !newValue.notDelivered && !newValue.receivedWithIssues) {
                                if (scope.isFiltered) {
                                    scope.data.allResponsesLocationMap = scope.data.topLevelResponses && scope.data.topLevelResponses.length ? scope.data.topLevelResponses : scope.reponsesFromDb;
                                } else {
                                    scope.data.allResponsesLocationMap = scope.reponsesFromDb;
                                }
                                return;
                            }

                            if (newValue.received) {
                                receivedResponses = responsesToPlot.map(function (responseLocationMap) {
                                    return responseLocationMap.consigneeResponses.filter(function (response) {
                                        return response.productReceived.toLowerCase() === 'yes' && response.satisfiedWithProduct.toLowerCase() === 'yes';
                                    });
                                });
                            }

                            if (newValue.notDelivered) {
                                notReceivedResponses = responsesToPlot.map(function (responseLocationMap) {
                                    return responseLocationMap.consigneeResponses.filter(function (response) {
                                        return response.productReceived.toLowerCase() === 'no';
                                    });
                                });
                            }

                            if (newValue.receivedWithIssues) {
                                receivedResponsesWithIssues = responsesToPlot.map(function (responseLocationMap) {
                                    return responseLocationMap.consigneeResponses.filter(function (response) {
                                        return response.productReceived.toLowerCase() === 'yes' && (response.satisfiedWithProduct && response.satisfiedWithProduct.toLowerCase() !== 'yes');
                                    });
                                });
                            }
                            var deliveryStatusResponses = receivedResponses.concat(notReceivedResponses, receivedResponsesWithIssues);

                            scope.data.allResponsesLocationMap = DistributionPlanService.groupResponsesByLocation(_.flatten(removeEmptyArray(deliveryStatusResponses)));

                        });
                    });
                }
            }
        }).directive('dateRangeFilter', function (DistributionPlanService) {
            function removeEmptyArray(filteredResponses) {
                return filteredResponses.filter(function (response) {
                    return response.length > 0;
                });
            }

            return {
                restrict: 'A',
                scope: false,
                link: function (scope) {
                    scope.$watchCollection('[dateFilter.from, dateFilter.to]', function (newDates) {
                        console.log(newDates);
                        var receivedResponses = [];
                        var fromDate = moment(newDates[0]),
                            toDate = moment(newDates[1]);
                        var responsesToPlot = scope.allResponsesMap;

                        function isWithinDateRange(dateOfReceipt) {
                            var dateRange = moment().range(fromDate, toDate);
                            return dateOfReceipt && dateRange.contains(moment(dateOfReceipt, 'DD/MM/YYYY'));
                        }

                        if (newDates[0] && newDates[1]) {
                            receivedResponses = responsesToPlot.map(function (responseLocationMap) {
                                return responseLocationMap.consigneeResponses.filter(function (response) {
                                    return isWithinDateRange(response.dateOfReceipt);
                                });
                            });
                        }
                        scope.data.allResponsesLocationMap = DistributionPlanService.groupResponsesByLocation(_.flatten(removeEmptyArray(receivedResponses)));

                    });
                }
            }

        }).factory('FilterService', function (DistributionPlanService, $http, EumsConfig) {

            var filterPlanById = function (distributionPlans, programmeId) {
                return distributionPlans.data.filter(function (plan) {
                    return plan.programme == programmeId;
                });
            };

            return {
                getDistributionPlansBy: function (programmeId) {
                    return DistributionPlanService.fetchPlans().then(function (allDistributionPlans) {
                        return filterPlanById(allDistributionPlans, programmeId);
                    });
                },
                getDateAnswers: function () {
                    return $http.get(EumsConfig.BACKEND_URLS.DATE_ANSWERS);
                }
            }
        });

})
(angular.module('eums.map', ['eums.config', 'eums.ip', 'Programme', 'DistributionPlan', 'DatePicker', 'eums.mapFilter', 'map.layers']));