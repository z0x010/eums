'use strict';

angular.module('IpFeedbackReportByDelivery', ['eums.config', 'ReportService', 'Loader', 'EumsErrorMessage', 'Sort', 'SortArrow', 'SysUtils', 'ngToast'])
    .config(['ngToastProvider', function (ngToast) {
        ngToast.configure({maxNumber: 1, horizontalPosition: 'center'});
    }])
    .controller('IpFeedbackReportByDeliveryController', function ($scope, $q, $timeout, $routeParams, ReportService, LoaderService,
<<<<<<< b27bacad2675556eb696c1f39f64c86d7f2a8dbf
                                                                  ErrorMessageService, SortService, SortArrowService, SysUtilsService) {
        var SUPPORTED_FIELD = ['shipmentDate', 'dateOfReceipt', 'value'];
        var timer;

        $scope.searchTerm = {};
        $scope.directiveValues = {};
        $scope.pagination = {page: 1};
        $scope.sortTerm = {field: 'shipmentDate', order: 'desc'};
        $scope.district = $routeParams.district ? $routeParams.district : "All Districts";

        var initializing = true;

        $scope.$watchCollection('searchTerm', function () {
            $scope.pagination.page = 1;
            if (initializing) {
                loadIpFeedbackReportByDelivery();
                initializing = false;
            } else {
                $scope.searching = true;
                if (timer) {
                    $timeout.cancel(timer);
                }
                if ($scope.searchTerm.poWaybill) {
                    startTimer();
=======
                                                                  ErrorMessageService, SortService, SortArrowService, SysUtilsService, ngToast) {
            var timer,
                SUPPORTED_FIELD = ['shipmentDate', 'dateOfReceipt', 'value'];


            $scope.searchTerm = {};
            $scope.directiveValues = {};
            $scope.pagination = {page: 1};
            $scope.sortOptions = {field: 'shipmentDate', order: 'desc'};

            var initializing = true;

            $scope.district = $routeParams.district ? $routeParams.district : "All Districts";

            function refreshReport() {
                if (initializing) {
                    loadIpFeedbackReportByDelivery();
                    initializing = false;
                } else {
                    if (timer) {
                        $timeout.cancel(timer);
                    }
                    if ($scope.searchTerm.poWaybill) {
                        startTimer();
                    } else {
                        loadIpFeedbackReportByDelivery($scope.searchTerm);
                    }
                }
            }

            $scope.$watchCollection('searchTerm', function () {
                refreshReport($scope.sortOptions);
            });

            $scope.sortBy = function (sortField) {
                if (SUPPORTED_FIELD.indexOf(sortField) !== -1) {
                    $scope.sortOptions = SortService.sortBy(sortField, $scope.sortOptions);
                    refreshReport($scope.sortOptions)
                }
            };

            $scope.sortArrowClass = function (criteria) {
                return SortArrowService.setSortArrow(criteria, $scope.sortOptions)
            };

            $scope.exportToCSV = function () {
                console.log($scope.searchTerm);
                var allFilter = appendLocationFilter($scope.searchTerm);
                ReportService.exportDeliveriesFeedbackReport(allFilter).then(function (response) {
                    ngToast.create({content: response.message, class: 'info'});
                }, function () {
                    var errorMessage = "Error while generating CSV. Please contact the system's admin.";
                    ngToast.create({content: errorMessage, class: 'danger'})
                });
            }

            function startTimer() {
                timer = $timeout(function () {
                    startSearch();
                }, 2000);
            }

            function startSearch() {
                $scope.pagination.page = 1;
                if (hasFields($scope.searchTerm)) {
                    $scope.searching = true;
                    loadIpFeedbackReportByDelivery($scope.searchTerm);
>>>>>>> [#96262008] Yuan complete the backend service to generate report by filter
                } else {
                    loadIpFeedbackReportByDelivery();
                }
            }
        });

        $scope.sortBy = function (sortField) {
            if (SUPPORTED_FIELD.indexOf(sortField) !== -1) {
                $scope.sortTerm = SortService.sortBy(sortField, $scope.sortTerm);
                loadIpFeedbackReportByDelivery()
            }
        };

        $scope.sortArrowClass = function (criteria) {
            return SortArrowService.setSortArrow(criteria, $scope.sortTerm)
        };

        $scope.goToPage = function (page) {
            $scope.pagination.page = page;
            loadIpFeedbackReportByDelivery()
        };

        $scope.showRemarks = function (index) {
            var remarksModalId = 'remarks-modal-' + index;
            LoaderService.showModal(remarksModalId)
        };

        $scope.formatDate = function (date) {
            return SysUtilsService.formatDate(date)
        };

        function startTimer() {
            timer = $timeout(function () {
                loadIpFeedbackReportByDelivery();
            }, 2000);
        }

        function loadIpFeedbackReportByDelivery() {
            LoaderService.showLoader();
            var allFilters = angular.extend({}, getLocationTerm(), getSearchTerm(), getSortTerm());
            ReportService.ipFeedbackReportByDelivery(allFilters, $scope.pagination.page).then(function (response) {
                $scope.report = response.results;
                $scope.count = response.count;
                $scope.pageSize = response.pageSize;

                updateProgrammes(response.programmeIds);
                updateConsignees(response.ipIds);
            }, function () {
                ErrorMessageService.showError();
            }).finally(function () {
                LoaderService.hideLoader();
                $scope.searching = false;
            });
        }

        function updateConsignees(ipIds) {
            if (ipIds && $scope.displayIps) {
                $scope.displayIps = ipIds ? $scope.directiveValues.allIps.filter(function (ip) {
                    return _.contains(ipIds, ip.id);
                }) : [];
            } else {
                $scope.displayIps = $scope.directiveValues.allIps;
            }
            $scope.populateIpsSelect2 && $scope.populateIpsSelect2($scope.displayIps);
        }

        function updateProgrammes(programmeIds) {
            $scope.displayProgrammes = programmeIds ? $scope.directiveValues.allProgrammes.filter(function (programme) {
                return _.contains(programmeIds, programme.id);
            }) : [];

            $scope.populateProgrammesSelect2 && $scope.populateProgrammesSelect2($scope.displayProgrammes);
        }

        function getLocationTerm() {
            var location = $routeParams.district;
            return location ? {'location': location} : {};
        }

        function getSearchTerm() {
            return $scope.searchTerm;
        }

        function getSortTerm() {
            return $scope.sortTerm;
        }
    });
