'use strict';

angular.module('eums', ['ngRoute', 'Home', 'DistributionPlan', 'DirectDeliveryManagement', 'DirectDelivery', 'WarehouseDelivery',
    'NavigationTabs', 'eums.service-factory', 'gs.to-snake-case', 'gs.to-camel-case', 'ngTable', 'siTable', 'ui.bootstrap', 'eums.map', 'eums.ip',
    'ManualReporting', 'ManualReportingDetails', 'DatePicker', 'StockReport', 'ngToast', 'cgBusy', 'Responses', 'User', 'Contact',
    'ImportData', 'EndUserResponses', 'Directives', 'WarehouseDeliveryManagement', 'EumsFilters', 'IPDirectDelivery', 'IPDirectDeliveryManagement',
    'IPWarehouseDelivery', 'IPWarehouseDeliveryManagement', 'SingleIpDirectDelivery'])
    .config(function ($routeProvider, $httpProvider) {
        $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
        $httpProvider.defaults.xsrfCookieName = 'csrftoken';
        $routeProvider
            .when('/', {
                templateUrl: '/static/app/views/home.html',
                controller: 'HomeController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_dashboard');
                    }
                }
            })
            .when('/direct-delivery', {
                templateUrl: '/static/app/views/delivery/direct-delivery.html',
                controller: 'DirectDeliveryController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_dashboard');
                    }
                }
            })
            .when('/single-ip-direct-delivery', {
                templateUrl: '/static/app/views/direct-delivery/single-ip.html',
                controller: 'SingleIpDirectDeliveryController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_dashboard');
                    }
                }
            })
            .when('/direct-delivery/new/:purchaseOrderId', {
                templateUrl: '/static/app/views/delivery/direct-delivery-management.html',
                controller: 'DirectDeliveryManagementController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_dashboard');
                    }
                }
            })
            .when('/direct-delivery/new/:purchaseOrderId/:purchaseOrderType', {
                templateUrl: '/static/app/views/delivery/direct-delivery-management.html',
                controller: 'DirectDeliveryManagementController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_dashboard');
                    }
                }
            })
            .when('/direct-delivery/new/:purchaseOrderId/:purchaseOrderType/:purchaseOrderItemId', {
                templateUrl: '/static/app/views/delivery/direct-delivery-management.html',
                controller: 'DirectDeliveryManagementController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_dashboard');
                    }
                }
            })
            .when('/direct-delivery/new/:purchaseOrderId/:purchaseOrderType/:purchaseOrderItemId/:deliveryNodeId', {
                templateUrl: '/static/app/views/delivery/direct-delivery-management.html',
                controller: 'DirectDeliveryManagementController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_dashboard');
                    }
                }
            })
            .when('/warehouse-delivery', {
                templateUrl: '/static/app/views/delivery/warehouse-delivery.html',
                controller: 'WarehouseDeliveryController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_dashboard');
                    }
                }
            })
            .when('/ip-direct-delivery', {
                templateUrl: '/static/app/views/reported-by-ip/direct-delivery.html',
                controller: 'IPDirectDeliveryController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_delivery_reports');
                    }
                }
            })
            .when('/ip-warehouse-delivery', {
                templateUrl: '/static/app/views/reported-by-ip/warehouse-delivery.html',
                controller: 'IPWarehouseDeliveryController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_delivery_reports');
                    }
                }
            })
            .when('/ip-warehouse-delivery/new/:releaseOrderId', {
                templateUrl: '/static/app/views/reported-by-ip/new-ip-warehouse-delivery-report.html',
                controller: 'IPWarehouseDeliveryManagementController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_delivery_reports');
                    }
                }
            })
            .when('/ip-warehouse-delivery/new/:releaseOrderId/:releaseOrderItemId', {
                templateUrl: '/static/app/views/reported-by-ip/new-ip-warehouse-delivery-report.html',
                controller: 'IPWarehouseDeliveryManagementController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_delivery_reports');
                    }
                }
            })
            .when('/ip-warehouse-delivery/new/:releaseOrderId/:releaseOrderItemId/:deliveryNodeId', {
                templateUrl: '/static/app/views/reported-by-ip/new-ip-warehouse-delivery-report.html',
                controller: 'IPWarehouseDeliveryManagementController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_delivery_reports');
                    }
                }
            })
            .when('/ip-direct-delivery/new/:purchaseOrderId', {
                templateUrl: '/static/app/views/reported-by-ip/new-ip-delivery-report.html',
                controller: 'IPDirectDeliveryManagementController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_delivery_reports');
                    }
                }
            })
            .when('/ip-direct-delivery/new/:purchaseOrderId/:purchaseOrderItemId', {
                templateUrl: '/static/app/views/reported-by-ip/new-ip-delivery-report.html',
                controller: 'IPDirectDeliveryManagementController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_delivery_reports');
                    }
                }
            })
            .when('/ip-direct-delivery/new/:purchaseOrderId/:purchaseOrderItemId/:deliveryNodeId', {
                templateUrl: '/static/app/views/reported-by-ip/new-ip-delivery-report.html',
                controller: 'IPDirectDeliveryManagementController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_delivery_reports');
                    }
                }
            })
            .when('/warehouse-delivery/new/:releaseOrderId', {
                templateUrl: '/static/app/views/delivery/warehouse-delivery-management.html',
                controller: 'WarehouseDeliveryManagementController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_distribution_plans');
                    }
                }
            })
            .when('/end-user-responses', {
                templateUrl: '/static/app/views/reports/end-user-responses.html',
                controller: 'EndUserResponsesController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_reports');
                    }
                }
            })
            .when('/field-verification-reports', {
                templateUrl: '/static/app/views/distribution-reporting/distribution-reporting.html',
                controller: 'ManualReportingController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_reports');
                    }
                }
            })
            .when('/field-verification-details/purchase-order/:purchaseOrderId', {
                templateUrl: '/static/app/views/distribution-reporting/details.html',
                controller: 'ManualReportingDetailsController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_reports');
                    }
                }
            })
            .when('/field-verification-details/waybill/:releaseOrderId', {
                templateUrl: '/static/app/views/distribution-reporting/details.html',
                controller: 'ManualReportingDetailsController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_reports');
                    }
                }
            })
            .when('/reports', {
                templateUrl: '/static/app/views/reports/ip-stock-report.html',
                controller: 'StockReportController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_reports');
                    }
                }
            })
            .when('/import-data', {
                templateUrl: '/static/app/views/import-data/import-data.html',
                controller: 'ImportDataController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_reports');
                    }
                }
            })
            .when('/distribution-plan-responses', {
                templateUrl: '/static/app/views/reports/responses.html',
                controller: 'ResponsesController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_distribution_plans');
                    }
                }
            })
            .when('/contacts', {
                templateUrl: '/static/app/views/contacts/contacts.html',
                controller: 'ContactController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_contacts');
                    }
                }
            })
            .when('/consignees', {
                templateUrl: '/static/app/views/consignees/consignees.html',
                controller: 'ConsigneesController'
            })
            .when('/response-details/:district', {
                templateUrl: '/static/app/views/responses/index.html',
                controller: 'ResponseController',
                resolve: {
                    permission: function (UserService) {
                        return UserService.checkUserPermission('auth.can_view_reports');
                    }
                }
            })
            .otherwise({
                redirectTo: '/'
            });
    }).run(function ($rootScope, $templateCache) {
        $rootScope.$on('$routeChangeStart', function (event, next, current) {
            if (typeof(current) !== 'undefined') {
                $templateCache.remove(current.templateUrl);
            }
        });
    });
