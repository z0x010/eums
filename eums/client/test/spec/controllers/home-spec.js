'use strict';

describe('Module: Home', function () {
    var scope, q, location;
    beforeEach(module('Home'));

    describe('Controller:Home', function () {
        var mockUserService, deferred, mockMapService, mockLoaderService, mockSystemSettingsService;
        var stubSettings = {
            'notification_message': 'notification',
            'district_label': 'district'
        };

        beforeEach(inject(function ($controller, $rootScope, $location, $q) {
            scope = $rootScope.$new();
            location = $location;
            deferred = $q.defer();
            mockUserService = jasmine.createSpyObj('mockUserService', ['getCurrentUser']);
            mockMapService = jasmine.createSpyObj('mockMapService', ['addHeatMap', 'clickLayer']);
            mockLoaderService = jasmine.createSpyObj('mockLoaderService', ['showLoader', 'hideLoader']);
            mockSystemSettingsService = jasmine.createSpyObj('mockSystemSettingsService', ['getSettings', 'getSettingsWithDefault']);

            mockUserService.getCurrentUser.and.returnValue(deferred.promise);
            mockSystemSettingsService.getSettings.and.returnValue($q.when(stubSettings));
            mockSystemSettingsService.getSettingsWithDefault.and.returnValue($q.when(stubSettings));

            $controller('HomeController', {
                $scope: scope,
                UserService: mockUserService,
                MapService: mockMapService,
                LoaderService: mockLoaderService,
                SystemSettingsService: mockSystemSettingsService
            });
        }));

        it('should redirect to item responses page', function () {
            scope.data = {district: 'Gulu'};
            scope.showDetailedResponses();
            scope.$apply();
            expect(location.path()).toEqual('/item-feedback-report/' + scope.data.district);
        });

        it('should redirect to ip responses page', function () {
            scope.data = {ipView: true, district: 'Gulu'};
            scope.showDetailedResponses();
            scope.$apply();
            expect(location.path()).toEqual('/ip-feedback-report-by-delivery/' + scope.data.district);
        });

        it('should set end-user view by default', function () {
            expect(scope.data.ipView).toBe(false);
        });

        it('should not collapse delivery status panel by default', function () {
            expect(scope.deliveryStatusCollapsed).toBe(false);
        });

        it('should check all delivery statuses by default', function () {
            var all_true_statuses = {
                mapReceivedWithIssues: true, mapNonResponse: true, mapReceived: true,
                mapNotReceived: true
            };
            expect(scope.deliveryStatus).toEqual(all_true_statuses);
        });

        it('should toggle ip and end-user feedback view', function () {
            scope.toggleIpView(true);
            scope.$apply();
            expect(scope.data.ipView).toBe(true);

            scope.toggleIpView(false);
            scope.$apply();
            expect(scope.data.ipView).toBe(false);
        });

        it('should watch data.ipView and reload the map', function () {
            scope.toggleIpView(false);
            scope.$apply();
            scope.toggleIpView(true);
            scope.$apply();
            expect(mockMapService.addHeatMap).toHaveBeenCalledWith(scope);
        });

        it('should watch filter-programme and reload ip-feedback', function () {
            scope.filter = {};
            scope.$apply();
            scope.filter = {programme: 2};
            scope.$apply();
            expect(mockMapService.addHeatMap).toHaveBeenCalledWith(scope);
        });

        it('should watch filter-ip and reload ip-feedback', function () {
            scope.filter = {};
            scope.$apply();
            scope.filter = {ip: 2};
            scope.$apply();
            expect(mockMapService.addHeatMap).toHaveBeenCalledWith(scope);
        });

        it('should watch deliveryStatus and reload map on ip-view', function () {
            scope.deliveryStatus = {};
            scope.$apply();
            scope.deliveryStatus = {mapNotReceived: true};
            scope.$apply();
            expect(mockMapService.addHeatMap).toHaveBeenCalledWith(scope);
        });

        it('should re-click district layer if district is clicked on change of IP view', function () {
            scope.data.district = 'Gulu';
            scope.toggleIpView(false);
            scope.$apply();

            expect(mockMapService.addHeatMap).toHaveBeenCalledWith(scope);
            expect(mockMapService.clickLayer).toHaveBeenCalledWith('Gulu');
        });

        it('should not re-click district layer if no district is clicked on change of IP view', function () {
            scope.data.district = "";
            scope.toggleIpView(false);
            scope.$apply();

            expect(mockMapService.addHeatMap).toHaveBeenCalledWith(scope);
            expect(mockMapService.clickLayer).not.toHaveBeenCalled();
        });

        it('should set deliveryStatus received with and without issues to true if all received is true', function () {
            scope.deliveryStatus = {mapReceived: false, mapReceivedWithIssues: false};
            scope.tmp.mapReceivedAll = false;
            scope.$apply();
            scope.tmp.mapReceivedAll = true;
            scope.updateReceivedDeliveryStatus();
            scope.$apply();
            expect(scope.deliveryStatus.mapReceived).toBe(true);
            expect(scope.deliveryStatus.mapReceivedWithIssues).toBe(true);
        });

        it('should set deliveryStatus received with and without issues to false if all received is false', function () {
            scope.deliveryStatus = {mapReceived: true, mapReceivedWithIssues: true};
            scope.tmp.mapReceivedAll = true;
            scope.$apply();
            scope.tmp.mapReceivedAll = false;
            scope.updateReceivedDeliveryStatus();
            scope.$apply();
            expect(scope.deliveryStatus.mapReceived).toBe(false);
            expect(scope.deliveryStatus.mapReceivedWithIssues).toBe(false);
        });

        it('should set deliveryStatus all received to true if both received with and without issues are true', function () {
            scope.tmp.mapReceivedAll = false;
            scope.$apply();
            scope.deliveryStatus = {mapReceived: true, mapReceivedWithIssues: true};
            scope.updateAllReceived();
            scope.$apply();
            expect(scope.tmp.mapReceivedAll).toBe(true);
        });

        it('should set deliveryStatus all received to false if either received with and/or without issues are false', function () {
            scope.tmp.mapReceivedAll = true;
            scope.$apply();
            scope.deliveryStatus = {mapReceived: false, mapReceivedWithIssues: true};
            scope.updateAllReceived();
            scope.$apply();
            expect(scope.tmp.mapReceivedAll).toBe(false);

            scope.tmp.mapReceivedAll = true;
            scope.deliveryStatus = {mapReceived: true, mapReceivedWithIssues: false};
            scope.updateAllReceived();
            scope.$apply();
            expect(scope.tmp.mapReceivedAll).toBe(false);

            scope.tmp.mapReceivedAll = true;
            scope.deliveryStatus = {mapReceived: false, mapReceivedWithIssues: false};
            scope.updateAllReceived();
            scope.$apply();
            expect(scope.tmp.mapReceivedAll).toBe(false);
        });
    });

    describe('Controller:Response', function () {
        var params, mockDeliveryService, mockDeliveryNodeService, mockPurchaseOrderItemService,
            mockPurchaseOrderService;
        var deferredDistributionPlanPromise, deferredDeliveryNodePromise, deferredPurchaseOrderItemPromise,
            deferredPurchaseOrder;

        var stubResponse = [{
            node: 3,
            amountSent: 100,
            amountReceived: '50',
            consignee: {
                id: 10,
                name: 'PADER DHO'
            }, productReceived: 'No',
            item: 'Safety box f.used syrgs/ndls 5lt/BOX-25',
            qualityOfProduct: 'Good',
            informedOfDelay: 'No',
            dateOfReceipt: '6/10/2014',
            programme: {
                id: 3,
                name: 'YI107 - PCR 3 KEEP MY CHILDREN SAFE'
            },
            location: 'Gulu',
            purchase_order: {
                id: 1,
                order_number: 25565
            },
            contact_person: {
                firstName: 'John',
                secondName: 'Doe',
                phone: '+234778945674'
            }
        }];

        var stubNodeDetails = {
            id: 1,
            parent: null,
            distribution_plan: 1,
            location: 'Kampala',
            children: [2],
            consignee: {},
            contact_person_id: 1,
            contact_person: {firstName: 'Bob'}

        };

        var stubPurchaseOrder = {
            id: 2,
            order_number: 25567
        };

        var stubPurchaseOrderItem = {
            purchase_order: stubPurchaseOrder.id
        };

        module(function ($provide) {
            $provide.value('DeliveryService', mockDeliveryService);
        });

        beforeEach(inject(function ($controller, $rootScope, $q) {
            q = $q;
            mockDeliveryService = jasmine.createSpyObj('mockDeliveryService', ['orderAllResponsesByDate']);
            mockDeliveryNodeService = jasmine.createSpyObj('mockDeliveryNodeService', ['get']);
            mockPurchaseOrderItemService = jasmine.createSpyObj('mockPurchaseOrderItemService', ['get']);
            mockPurchaseOrderService = jasmine.createSpyObj('mockPurchaseOrderService', ['get']);
            params = {district: 'Gulu'};
            deferredDistributionPlanPromise = $q.defer();
            deferredDeliveryNodePromise = $q.defer();
            deferredPurchaseOrderItemPromise = $q.defer();
            deferredPurchaseOrder = $q.defer();
            scope = $rootScope.$new();
            mockDeliveryService.orderAllResponsesByDate.and.returnValue(deferredDistributionPlanPromise.promise);
            mockDeliveryNodeService.get.and.returnValue(deferredDeliveryNodePromise.promise);
            mockPurchaseOrderItemService.get.and.returnValue(deferredPurchaseOrderItemPromise.promise);
            mockPurchaseOrderService.get.and.returnValue(deferredPurchaseOrder.promise);
            $controller('ResponseController', {
                $scope: scope,
                $routeParams: params,
                DeliveryService: mockDeliveryService,
                DeliveryNodeService: mockDeliveryNodeService,
                PurchaseOrderItemService: mockPurchaseOrderItemService,
                PurchaseOrderService: mockPurchaseOrderService
            });
        }));

        it('should have params object with district', function () {
            deferredDistributionPlanPromise.resolve(stubResponse);
            deferredDeliveryNodePromise.resolve(stubNodeDetails);
            deferredPurchaseOrderItemPromise.resolve(stubPurchaseOrderItem);
            deferredPurchaseOrder.resolve(stubPurchaseOrder);

            scope.$apply();
            expect(scope.allResponses).toEqual(stubResponse);
        });
    });
});
