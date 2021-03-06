describe('Ip item deliveries', function () {
    var scope, routeParams, mockDeliveryNodeService, mockItemService, deferredSearchResults, mockConsigneeItemService,
        mockLoaderService, mockUserService, mockSystemSettingsService;
    var userHasPermissionToPromise, deferredPermissionsResultsPromise;
    var node = {
        'id': 34,
        'distribution_plan': 33,
        'location': 'Kampala',
        'consignee': 39,
        'tree_position': 'END_USER',
        'parents': '',
        'quantity_in': 5,
        'contact_person_id': '14',
        'item': 30,
        'delivery_date': '2014-09-25',
        'remark': 'In good condition',
        'track': 'False',
        'quantity_out': 0,
        'balance': 5,
        'has_children': 'False'
    };
    var paginatedNodesResponse = {results: [node]};
    var fetchedItem = {id: 1, description: 'Some name', unit: 1};
    var searchResults = [node];
    var allNodes = paginatedNodesResponse.results;
    var fetchedConsigneeItems = {results: [{id: 2, availableBalance: 450}]};
    var adminPermissions = [
        "auth.can_view_self_contacts",
        "auth.can_view_contacts",
        "auth.can_create_contacts",
        "auth.can_edit_contacts",
        "auth.can_delete_contacts"
    ];
    var stubSettings = {
        'notification_message': 'notification',
        'district_label': 'district'
    };

    beforeEach(function () {
        module('DeliveriesByIp');

        mockDeliveryNodeService = jasmine.createSpyObj('DeliveryNodeService', ['filter', 'search']);
        mockItemService = jasmine.createSpyObj('ItemService', ['get']);
        mockConsigneeItemService = jasmine.createSpyObj('ConsigneeItemService', ['filter']);
        mockLoaderService = jasmine.createSpyObj('LoaderService', ['showLoader', 'hideLoader']);
        mockUserService = jasmine.createSpyObj('mockUserService', ['hasPermission', 'retrieveUserPermissions']);
        mockSystemSettingsService = jasmine.createSpyObj('mockSystemSettingsService', ['getSettings', 'getSettingsWithDefault']);

        inject(function ($controller, $rootScope, $q) {
            scope = $rootScope.$new();
            routeParams = {itemId: 2};
            deferredSearchResults = $q.defer();
            deferredPermissionsResultsPromise = $q.defer();
            userHasPermissionToPromise = $q.defer();
            mockItemService.get.and.returnValue($q.when(fetchedItem));
            mockConsigneeItemService.filter.and.returnValue($q.when(fetchedConsigneeItems));
            mockDeliveryNodeService.filter.and.returnValue($q.when(paginatedNodesResponse));
            mockDeliveryNodeService.search.and.returnValue(deferredSearchResults.promise);
            mockUserService.hasPermission.and.returnValue(userHasPermissionToPromise.promise);
            mockUserService.retrieveUserPermissions.and.returnValue(deferredPermissionsResultsPromise.promise);
            mockSystemSettingsService.getSettings.and.returnValue($q.when(stubSettings));
            mockSystemSettingsService.getSettingsWithDefault.and.returnValue($q.when(stubSettings));

            $controller('DeliveriesByIpController', {
                $scope: scope,
                $routeParams: routeParams,
                ItemService: mockItemService,
                ConsigneeItemService: mockConsigneeItemService,
                DeliveryNodeService: mockDeliveryNodeService,
                LoaderService: mockLoaderService,
                UserService: mockUserService,
                SystemSettingsService: mockSystemSettingsService
            });
        });

        deferredPermissionsResultsPromise.resolve(adminPermissions);
    });

    it('should load deliveries on the scope', function () {
        scope.$apply();
        expect(scope.deliveryNodes.length).toBe(1);
        expect(scope.deliveryNodes).toContain(node);
    });

    it('should fetch item details and put them on scope', function () {
        scope.$apply();
        expect(scope.item).toEqual(fetchedItem);
    });

    it('should put itemId on scope for use by template in routing', function() {
        scope.$apply();
        expect(scope.itemId).toEqual(routeParams.itemId);
    });

    it('should fetch new page when goToPage is called and put the nodes on that page on scope', function () {
        scope.goToPage(10);
        scope.$apply();
        expect(mockDeliveryNodeService.filter).toHaveBeenCalledWith({
                page: 10,
                consignee_deliveries_for_item: jasmine.any(Number),
                paginate: true
            },
            ['contact_person_id']
        );
        expect(scope.deliveryNodes).toEqual(allNodes);
    });

    it('should search for nodes with scope search term', function () {
        scope.$apply();
        expect(scope.deliveryNodes).toEqual(allNodes);
        deferredSearchResults.resolve({results: searchResults});

        var searchTerm = 'some consignee name';
        scope.searchTerm = searchTerm;
        scope.$apply();
        expect(mockDeliveryNodeService.search).toHaveBeenCalledWith(
            searchTerm,
            ['contact_person_id'],
            {consignee_deliveries_for_item: 2, paginate: true}
        );
        expect(scope.deliveryNodes).toEqual(searchResults);

        scope.searchTerm = '';
        scope.$apply();
        expect(mockDeliveryNodeService.filter).toHaveBeenCalled();
        expect(scope.deliveryNodes).toEqual(allNodes);
    });

    it('should maintain search term when moving through pages', function () {
        var term = 'search term';
        scope.searchTerm = term;
        scope.$apply();
        scope.goToPage(10);
        scope.$apply();
        expect(mockDeliveryNodeService.filter).toHaveBeenCalledWith(
            {
                page: 10, search: term,
                consignee_deliveries_for_item: jasmine.any(Number),
                paginate: true
            },
            ['contact_person_id']
        );
    });

    it('should toggle search mode during search', function () {
        scope.$apply();
        expect(scope.searching).toBe(false);
        scope.searchTerm = 'something';
        scope.$apply();
        expect(mockDeliveryNodeService.search).toHaveBeenCalled();
        expect(scope.searching).toBe(true);
        deferredSearchResults.resolve({results: searchResults});
        scope.$apply();
        expect(scope.searching).toBe(false);
    });

    it('should fetch consignee item details on load', function () {
        scope.$apply();
        expect(mockConsigneeItemService.filter).toHaveBeenCalledWith({item: 2});
        expect(scope.quantityAvailable).toBe(450);
    });

    it('should show loader while loading the paging at the start', function () {
        scope.$apply();
        expect(mockLoaderService.showLoader).toHaveBeenCalled();
        expect(mockLoaderService.hideLoader).toHaveBeenCalled();
    });
});