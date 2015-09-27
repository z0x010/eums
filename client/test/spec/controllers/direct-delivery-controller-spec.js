describe('DirectDeliveryController', function () {

    var scope, sorter, filter;
    var location, distPlanEndpointUrl;
    var mockContactService, mockProgrammeService, mockPurchaseOrderService, mockLoaderService;
    var deferred, deferredPlan, deferredPurchaseOrder;

    var programmeOne = {
        id: 1, name: 'Test Programme'
    };

    var purchaseOrderOne = {id: 1, 'order_number': '00001', 'date': '2014-10-02', programme: programmeOne.id, description: 'sale', hasPlan: 'true'};
    var purchaseOrderDetails = [purchaseOrderOne];

    beforeEach(function () {
        module('DirectDelivery');
        mockContactService = jasmine.createSpyObj('mockContactService', ['create']);
        mockProgrammeService = jasmine.createSpyObj('mockProgrammeService', ['get', 'all']);
        mockPurchaseOrderService = jasmine.createSpyObj('mockPurchaseOrderService', ['all', 'forDirectDelivery']);
        mockLoaderService = jasmine.createSpyObj('mockLoaderService', ['showLoader', 'hideLoader']);

        inject(function ($controller, $rootScope, ContactService, $location, $q, $sorter, $filter, $httpBackend, EumsConfig) {
            deferred = $q.defer();
            deferredPlan = $q.defer();
            deferredPurchaseOrder = $q.defer();
            mockContactService.create.and.returnValue(deferred.promise);
            mockProgrammeService.get.and.returnValue(deferred.promise);
            mockProgrammeService.all.and.returnValue(deferred.promise);
            mockPurchaseOrderService.all.and.returnValue(deferredPurchaseOrder.promise);
            mockPurchaseOrderService.forDirectDelivery.and.returnValue(deferredPurchaseOrder.promise);

            location = $location;
            scope = $rootScope.$new();
            sorter = $sorter;
            filter = $filter;
            distPlanEndpointUrl = EumsConfig.BACKEND_URLS.DISTRIBUTION_PLAN;

            $controller('DirectDeliveryController',
                {
                    $scope: scope, ContactService: mockContactService,
                    ProgrammeService: mockProgrammeService,
                    PurchaseOrderService: mockPurchaseOrderService,
                    $sorter: sorter,
                    $filter: filter,
                    $location: location,
                    LoaderService: mockLoaderService
                });
        });
    });

    describe('when sorted', function () {
        it('should set the sort criteria', function () {
            scope.sortBy('field');
            expect(scope.sort.criteria).toBe('field');
        });
        it('should set the sort order as descending by default', function () {
            scope.sortBy('field');
            expect(scope.sort.descending).toBe(true);
        });
        it('should toggle the sort order', function () {
            scope.sortBy('field');
            scope.sortBy('field');
            expect(scope.sort.descending).toBe(false);
        });
    });

    describe('when initialized', function () {
        xit('should set all sales orders on initialize to the scope', function () {
            deferredPurchaseOrder.resolve(purchaseOrderDetails);
            scope.initialize();
            scope.$apply();
            expect(scope.salesOrders).toEqual(purchaseOrderDetails);
        });

        it('should set the sorter', function () {
            scope.initialize();
            scope.$apply();
            expect(scope.sortBy).toBe(sorter);
        });

        it('should sort by order number', function () {
            scope.initialize();
            scope.$apply();
            expect(scope.sort.criteria).toBe('orderNumber');
        });

        it('should sort in descending order', function () {
            scope.initialize();
            scope.$apply();
            expect(scope.sort.descending).toBe(false);
        });

        it('should have the sort arrow icon on the order number column by default', function () {
            scope.initialize();
            scope.$apply();
            expect(scope.sortArrowClass('')).toEqual('');
        });

        it('should set the clicked column as active', function () {
            scope.initialize();
            scope.$apply();
            expect(scope.sortArrowClass('orderNumber')).toEqual('active glyphicon glyphicon-arrow-down');
        });

        it('should set the clicked column as active and have the up arrow when ascending', function () {
            scope.initialize();
            scope.sort.descending = true;
            scope.$apply();
            expect(scope.sortArrowClass('orderNumber')).toEqual('active glyphicon glyphicon-arrow-up');
        });

        it('should show loader', function () {
            scope.initialize();
            scope.$apply();
            expect(mockLoaderService.showLoader).toHaveBeenCalled();
            expect(mockLoaderService.hideLoader).not.toHaveBeenCalled();
        });

        it('should hide loader after retrieving purchase orders', function () {
            deferredPurchaseOrder.resolve(['po one', 'po two']);
            scope.initialize();
            scope.$apply();
            expect(mockLoaderService.hideLoader).toHaveBeenCalled();
        });
    });

    describe('when purchase order is selected', function () {
        it('should change location to create direct delivery path', function () {
            deferredPurchaseOrder.resolve(purchaseOrderOne);
            scope.selectPurchaseOrder(purchaseOrderOne);
            scope.$apply();
            expect(location.path()).toEqual('/direct-delivery/new/1');
        });
    });

    describe('on filter by date range', function () {
        it('should not filter when fromDate and toDate is empty', function () {
            scope.$apply();

            expect(mockPurchaseOrderService.forDirectDelivery.calls.count()).toEqual(0);
        });

        it('should not filter when toDate is empty', function () {
            scope.fromDate = '2014-07-07';
            scope.$apply();

            expect(mockPurchaseOrderService.forDirectDelivery.calls.count()).toEqual(0);
        });

        it('should not filter when fromDate is empty', function () {
            scope.toDate = '2014-07-07';
            scope.$apply();

            expect(mockPurchaseOrderService.forDirectDelivery.calls.count()).toEqual(0);
        });

        it('should filter deliveries when date range is given', function () {
            scope.fromDate = '2014-05-07';
            scope.toDate = '2014-07-07';
            scope.$apply();

            expect(mockPurchaseOrderService.forDirectDelivery.calls.count()).toEqual(1);
            expect(mockPurchaseOrderService.forDirectDelivery).toHaveBeenCalledWith(undefined, {from: '2014-05-07', to: '2014-07-07'});
        });

        it('should format dates before filtering deliveries ', function () {
            scope.fromDate = 'Sun Aug 30 2015 00:00:00 GMT+0200 (SAST)';
            scope.toDate = 'Thu Sep 10 2015 00:00:00 GMT+0200 (SAST)';
            scope.$apply();

            expect(mockPurchaseOrderService.forDirectDelivery.calls.count()).toEqual(1);
            expect(mockPurchaseOrderService.forDirectDelivery).toHaveBeenCalledWith(undefined, {from: '2015-08-30', to: '2015-09-10'});
        });

        it('should filter deliveries when date range is given with additional query', function () {
            scope.query = 'wakiso programme';
            scope.fromDate = '2014-05-07';
            scope.toDate = '2014-07-07';
            scope.$apply();

            expect(mockPurchaseOrderService.forDirectDelivery.calls.count()).toEqual(1);
            expect(mockPurchaseOrderService.forDirectDelivery).toHaveBeenCalledWith(undefined, {from: '2014-05-07', to: '2014-07-07', query: 'wakiso programme'})
        });

        it('should filter deliveries without date when fromDate is not given with additional query', function () {
            scope.query = 'wakiso programme';
            scope.toDate = '2014-07-07';
            scope.$apply();

            expect(mockPurchaseOrderService.forDirectDelivery.calls.count()).toEqual(1);
            expect(mockPurchaseOrderService.forDirectDelivery).toHaveBeenCalledWith(undefined, {query: 'wakiso programme'})
        });

        it('should not filter deliveries when toDate is not given with additional query', function () {
            scope.query = 'wakiso programme';
            scope.fromDate = '2014-07-07';
            scope.$apply();

            expect(mockPurchaseOrderService.forDirectDelivery.calls.count()).toEqual(1);
            expect(mockPurchaseOrderService.forDirectDelivery).toHaveBeenCalledWith(undefined, {query: 'wakiso programme'})
        });
    })
});