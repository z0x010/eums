describe('MultipleIpDirectDeliveryController', function () {

    beforeEach(module('MultipleIpDirectDelivery'));
    var mockNodeService, mockIPService, mockDeliveryService, mockPurchaseOrderItemService,
        mockConsigneeService, mockPurchaseOrderService, mockUserService, mockItemService;
    var deferred, deferredPlan, deferredDistrictPromise, deferredTopLevelNodes,
        deferredPlanNode, deferredPurchaseOrder, deferredPurchaseOrderItem, deferredNode, deferredUserPromise, deferredItemPromise;
    var scope, q, mockToastProvider, location;

    var orderNumber = '00001';
    var plainDistricts = ['Abim', 'Gulu'];

    var purchaseOrders = [
        {
            id: 1,
            'programme': {
                id: 3,
                name: 'Alive'
            },
            'orderNumber': orderNumber,
            'date': '2014-10-05',
            'purchaseorderitemSet': [{
                id: 1,
                item: {
                    id: 1,
                    description: 'Test Item',
                    materialCode: '12345AS',
                    value: '100.00',
                    unit: {
                        name: 'EA'
                    }
                },
                value: 1500,
                quantity: 100,
                quantityLeft: 100
            }]
        },
        {
            id: 2,
            'programme': {
                id: 4,
                name: 'Alive'
            },
            'orderNumber': '22221',
            'date': '2014-10-05',
            'purchaseorderitemSet': [{id: 3}, {id: 4}]
        }
    ];

    var stubUser = {
        username: 'admin',
        first_name: 'admin',
        last_name: 'admin',
        email: 'a@a.com',
        consignee_id: null
    };

    var stubIPUser = {
        username: 'ip',
        first_name: 'ip',
        last_name: 'ip',
        email: 'ip@ip.com',
        consignee_id: 1
    };

    var stubPurchaseOrderItem = {
        id: 1,
        purchaseOrder: '1',
        item: {
            id: 1,
            description: 'Test Item',
            materialCode: '12345AS',
            value: '100.00',
            unit: {
                name: 'EA'
            }
        },
        quantity: 100,
        date: '2014-10-02',
        distributionplannodeSet: [1, 2]
    };

    var stubPurchaseOrderItemNoDeliveryNodes = {
        id: 1,
        purchase_order: '1',
        information: {
            item: {
                id: 1,
                description: 'Test Item',
                material_code: '12345AS',
                value: '100.00',
                unit: {
                    name: 'EA'
                }
            }
        },
        quantity: '100',
        date: '2014-10-02',
        distributionplannode_set: []
    };

    var setUp = function (routeParams) {
        mockDeliveryService = jasmine.createSpyObj('mockDeliveryService', ['fetchPlans', 'all', 'create', 'update']);
        mockNodeService = jasmine.createSpyObj('mockNodeService', ['get', 'create', 'update', 'filter']);
        mockConsigneeService = jasmine.createSpyObj('mockConsigneeService', ['get', 'all']);
        mockIPService = jasmine.createSpyObj('mockIPService', ['loadAllDistricts']);
        mockPurchaseOrderService = jasmine.createSpyObj('mockPurchaseOrderService', ['get', 'update']);
        mockPurchaseOrderItemService = jasmine.createSpyObj('mockPurchaseOrderItemService', ['get']);
        mockUserService = jasmine.createSpyObj('mockUserService', ['getCurrentUser']);
        mockItemService = jasmine.createSpyObj('mockItemService', ['get']);
        mockToastProvider = jasmine.createSpyObj('mockToastProvider', ['create']);

        inject(function ($controller, $rootScope, $q, $location) {
            q = $q;
            deferred = $q.defer();
            deferredPlan = $q.defer();
            deferredDistrictPromise = $q.defer();
            deferredPlanNode = $q.defer();
            deferredNode = $q.defer();
            deferredTopLevelNodes = $q.defer();
            deferredPurchaseOrder = $q.defer();
            deferredPurchaseOrderItem = $q.defer();
            deferredUserPromise = $q.defer();
            deferredItemPromise = $q.defer();
            mockDeliveryService.update.and.returnValue(deferredPlan.promise);
            mockDeliveryService.create.and.returnValue(deferredPlan.promise);
            mockNodeService.get.and.returnValue(deferredPlanNode.promise);
            mockNodeService.filter.and.returnValue(deferredTopLevelNodes.promise);
            mockNodeService.create.and.returnValue(deferredPlanNode.promise);
            mockNodeService.update.and.returnValue(deferredPlanNode.promise);
            mockConsigneeService.get.and.returnValue(deferred.promise);
            mockConsigneeService.all.and.returnValue(deferred.promise);
            mockPurchaseOrderService.get.and.returnValue(deferredPurchaseOrder.promise);
            mockPurchaseOrderItemService.get.and.returnValue(deferredPurchaseOrderItem.promise);
            mockIPService.loadAllDistricts.and.returnValue(deferredDistrictPromise.promise);
            mockUserService.getCurrentUser.and.returnValue(deferredUserPromise.promise);
            mockItemService.get.and.returnValue(deferredItemPromise.promise);


            //TOFIX: dirty fix for element has been spied on already for setup being called again - showcase was impending
            if (!routeParams.deliveryNodeId && !routeParams.purchaseOrderItemId && !routeParams.purchaseOrderType) {
                spyOn(angular, 'element').and.callFake(function () {
                    return {
                        modal: jasmine.createSpy('modal').and.callFake(function (status) {
                            return status;
                        }),
                        hasClass: jasmine.createSpy('hasClass').and.callFake(function (status) {
                            return status;
                        }),
                        removeClass: jasmine.createSpy('removeClass').and.callFake(function (status) {
                            return status;
                        })
                    };
                });
            }

            location = $location;
            scope = $rootScope.$new();

            $controller('MultipleIpDirectDeliveryController',
                {
                    $scope: scope,
                    $location: location,
                    $q: q,
                    $routeParams: routeParams,
                    PurchaseOrderItemService: mockPurchaseOrderItemService,
                    DeliveryService: mockDeliveryService,
                    DeliveryNodeService: mockNodeService,
                    ConsigneeService: mockConsigneeService,
                    PurchaseOrderService: mockPurchaseOrderService,
                    IPService: mockIPService,
                    UserService: mockUserService,
                    ItemService: mockItemService,
                    ngToast: mockToastProvider
                });
        });
    };

    beforeEach(function () {
        setUp({purchaseOrderId: 1});
    });

    describe('adding a contact', function () {
        describe('with invalid fields', function () {
            it('should be invalid when no number is supplied', function () {
                scope.contact = {
                    firstName: 'Dude',
                    lastName: 'Awesome',
                    phone: ''
                };
                scope.$apply();

                expect(scope.invalidContact(scope.contact)).toBeTruthy();
            });

            it('should be invalid when no first name is supplied', function () {
                scope.contact = {
                    firstName: '',
                    lastName: 'Awesome',
                    phone: '+256782555444'
                };
                scope.$apply();

                expect(scope.invalidContact(scope.contact)).toBeTruthy();
            });

            it('should be invalid when no last name is supplied', function () {
                scope.contact = {
                    firstName: 'Dudette',
                    lastName: '',
                    phone: '+256782555444'
                };
                scope.$apply();

                expect(scope.invalidContact(scope.contact)).toBeTruthy();
            });
        });

        describe('with valid fields', function () {
            it('should be valid when full name and phone number are supplied', function () {
                scope.contact = {
                    firstName: 'Dudette',
                    lastName: 'Awesome',
                    phone: '+256782555444'
                };
                scope.$apply();

                expect(scope.invalidContact(scope.contact)).toBeFalsy();
            });
        });
    });

    describe('when distributionPlanNodes list on scope changes, ', function () {

        it('the selected purchase order item quantityLeft attribute should be updated', function () {
            scope.invalidNodes = false;
            scope.selectedPurchaseOrderItem = {quantity: 100, information: stubPurchaseOrderItem};
            scope.$apply();

            scope.distributionPlanNodes.push({quantityIn: 50});
            scope.$apply();
            expect(scope.computeQuantityLeft(scope.distributionPlanNodes)).toBe(50);

            scope.distributionPlanNodes[0].quantityIn = 25;
            scope.distributionPlanNodes.push({quantityIn: 55});
            scope.$apply();
            expect(scope.computeQuantityLeft(scope.distributionPlanNodes)).toBe(20);

        });

        describe('disabling save with invalidNodes field', function () {
            var invalidNode;
            var validNode = {
                item: 1,
                deliveryDate: '2014-11-31',
                quantityIn: 42,
                consignee: 4,
                location: 'Adjumani',
                contactPerson: '5444d433ec8e8257ae48dc73',
                remark: '',
                track: true,
                isEndUser: false
            };

            beforeEach(function () {
                scope.selectedPurchaseOrderItem = {
                    quantity: 100,
                    information: {id: 1}
                };
                scope.distributionPlanNodes = [];
                scope.$apply();
            });

            it('sets the invalidNodes field to false when there are no invalid nodes', function () {
                scope.invalidNodes = false;
                scope.distributionPlanNodes.push(validNode);
                scope.$apply();

                expect(scope.invalidNodes).toBeFalsy();
            });

            it('sets the invalidNodes field to true when there are nodes with invalid target Quantities', function () {
                invalidNode = angular.copy(validNode);
                invalidNode.quantityIn = -1;
                scope.distributionPlanNodes.push(invalidNode);
                scope.$apply();

                expect(scope.invalidNodes).toBeTruthy();
            });

            it('sets the invalidNodes field to true when there are nodes with no consignee', function () {
                invalidNode = angular.copy(validNode);
                delete invalidNode.consignee;
                scope.distributionPlanNodes.push(invalidNode);
                scope.$apply();

                expect(scope.invalidNodes).toBeTruthy();
            });

            it('sets the invalidNodes field to true when there are nodes with no destinationLocation', function () {
                invalidNode = angular.copy(validNode);
                invalidNode.destinationLocation = '';
                scope.distributionPlanNodes.push(invalidNode);
                scope.$apply();

                expect(scope.invalidNodes).toBeTruthy();
            });

            it('sets the invalidNodes field to true when there are nodes with no contactPerson', function () {
                invalidNode = angular.copy(validNode);
                invalidNode.contactPerson = '';
                scope.distributionPlanNodes.push(invalidNode);
                scope.$apply();

                expect(scope.invalidNodes).toBeTruthy();
            });

            it('sets the invalidNodes field to true when there are nodes with no deliveryDate', function () {
                invalidNode = angular.copy(validNode);
                invalidNode.deliveryDate = '';
                scope.distributionPlanNodes.push(invalidNode);
                scope.$apply();

                expect(scope.invalidNodes).toBeTruthy();
            });

            it('sets the invalidNodes field to true when the quantity left of salesitems is less than 0', function () {
                invalidNode = angular.copy(validNode);
                invalidNode.quantityIn = 101;
                scope.distributionPlanNodes.push(invalidNode);
                scope.$apply();

                expect(scope.invalidNodes).toBeTruthy();
            });
        });
    });

    describe('when the controller is initialized', function () {
        beforeEach(function () {
            deferredDistrictPromise.resolve({data: plainDistricts});
        });

        it('should have the distributionPlanNodes defaulted to an empty list', function () {
            expect(scope.distributionPlanNodes).toEqual([]);
        });

        it('should set districts in the scope variable', function () {
            var expectedDistricts = [
                {id: 'Abim', name: 'Abim'},
                {id: 'Gulu', name: 'Gulu'}
            ];
            scope.$apply();

            expect(scope.districts).toEqual(expectedDistricts);
        });

        it('should have the selected purchase order in the scope', function () {
            deferredPurchaseOrder.resolve(purchaseOrders[0]);
            scope.$apply();

            expect(scope.selectedPurchaseOrder).toEqual(purchaseOrders[0]);
        });

        it('should set totalValue on the selected purchase order in the scope', function () {
            setUp({purchaseOrderId: purchaseOrders[0].id, purchaseOrderType: 'multiple'});
            deferredPurchaseOrder.resolve(purchaseOrders[0]);
            scope.$apply();

            expect(scope.selectedPurchaseOrder.totalValue).toEqual(1500);
        });

        it('should have the default selected purchase orders item undefined in the scope', function () {
            scope.$apply();

            expect(scope.selectedPurchaseOrderItem).toBeUndefined();
        });

        it('should set purchase order items on the scope when a purchase order is set', function () {
            setUp({purchaseOrderId: 1, purchaseOrderType: 'multiple'});
            deferredPurchaseOrder.resolve(purchaseOrders[0]);
            scope.$apply();
            expect(scope.purchaseOrderItems).toEqual(purchaseOrders[0].purchaseorderitemSet);
        });

    });

    describe('when the controller is initialized with PO and POItem', function () {

        var topLevelNodes = [{
            consignee: {
                name: 'Save the Children'
            },
            location: 'Kampala',
            contact_person: {_id: 1}
        }];

        it('should put the poItem on the scope', function () {
            setUp({purchaseOrderId: 1, purchaseOrderItemId: 1});
            deferredDistrictPromise.resolve({data: plainDistricts});

            deferredPurchaseOrder.resolve(purchaseOrders[0]);
            deferredPurchaseOrderItem.resolve(stubPurchaseOrderItem);
            deferredTopLevelNodes.resolve(topLevelNodes);
            scope.$apply();
            expect(scope.selectedPurchaseOrder).toEqual(purchaseOrders[0]);
            expect(scope.selectedPurchaseOrderItem).toEqual(stubPurchaseOrderItem);
            expect(scope.distributionPlanNodes).toEqual(topLevelNodes);
        });

        it('should reset track, invalid nodes and distribution plan if newly selected item has no items', function () {
            setUp({purchaseOrderId: 1, purchaseOrderItemId: 1});

            scope.track = true;
            scope.invalidNodes = false;
            scope.distributionPlan = 1;
            deferredDistrictPromise.resolve({data: plainDistricts});

            deferredPurchaseOrder.resolve(purchaseOrders[0]);
            deferredPurchaseOrderItem.resolve(stubPurchaseOrderItem);
            deferredTopLevelNodes.resolve([]);

            scope.$apply();

            expect(scope.track).toEqual(false);
            expect(scope.invalidNodes).toEqual(NaN);
            expect(scope.distributionPlan).toEqual(NaN);
        });
    });

    describe('when purchase order item selected changes, ', function () {

        it('should set the selected purchase order to the scope when purchase order item is selected', function () {
            scope.selectedPurchaseOrderItem = stubPurchaseOrderItem;
            scope.$apply();
            expect(scope.selectedPurchaseOrderItem).toEqual(stubPurchaseOrderItem);
        });

        xit('should put a distribution plan on the scope if purchase order item has associated distribution plan nodes', function () {
            deferred.resolve({distribution_plan_node: 1});
            scope.selectedPurchaseOrderItem = {information: {distributionplannode_set: ['1']}};
            scope.$apply();

            expect(scope.distributionPlan).toEqual({id: 1, programme: 1});
        });

        it('should get distribution plan nodes for nodes if nodes exist', function () {
            setUp({purchaseOrderId: 1, deliveryNodeId: 1});

            deferred.resolve({distribution_plan_node: 1});
            scope.selectedPurchaseOrderItem = {information: {distributionplannode_set: ['1']}};
            scope.$apply();
            expect(mockNodeService.get).toHaveBeenCalledWith(1, [ 'consignee', 'contact_person_id' ]);
        });

        it('should put a distribution plan on the scope if distribution plan node exists', function () {
            setUp({purchaseOrderId: 1, deliveryNodeId: 1});

            deferredUserPromise.resolve(stubUser);
            deferredNode.resolve({});
            deferredPlanNode.resolve({distributionPlan: 2, children: [{id: 1}]});
            scope.$apply();

            expect(scope.distributionPlan).toEqual(2);
        });

        it('should put a distribution plan on the scope if distribution plan node exists', function () {
            setUp({purchaseOrderId: 1, deliveryNodeId: 1});

            deferredUserPromise.resolve(stubUser);
            deferredNode.resolve({});
            deferredPlanNode.resolve({distributionPlan: 2, children: [{id: 1}]});
            scope.$apply();

            expect(scope.distributionPlan).toEqual(2);
        });

        it('should navigate to same page with POid and POItemId specified', function () {
            scope.selectedPurchaseOrder = {id: 5};
            scope.selectPurchaseOrderItem({id: 1});
            scope.$apply();

            expect(location.path()).toBe('/direct-delivery/new/5/multiple/1');
        });

        it('should not get distribution plan nodes if there are no ui nodes', function () {

            scope.selectedPurchaseOrderItem = {
                display: stubPurchaseOrderItemNoDeliveryNodes.information.item.description,
                material_code: stubPurchaseOrderItemNoDeliveryNodes.information.item.material_code,
                quantity: stubPurchaseOrderItemNoDeliveryNodes.quantity,
                unit: stubPurchaseOrderItemNoDeliveryNodes.information.item.unit.name,
                information: stubPurchaseOrderItemNoDeliveryNodes
            };
            scope.$apply();

            expect(scope.distributionPlanNodes).toEqual([]);
        });

        it('should not get distribution plan nodes service linked to the particular purchase order item with undefined line item set', function () {
            scope.selectedPurchaseOrderItem = stubPurchaseOrderItem;
            scope.$apply();

            expect(scope.distributionPlanNodes).toEqual([]);
        });
    });

    describe('when track item checkbox changes, ', function () {
        beforeEach(function () {
            scope.track = true;
            scope.distributionPlan = 1;
        });

        it('should set the invalidNodes value', function () {
            scope.$apply();
            scope.trackPurchaseOrderItem();
            expect(scope.invalidNodes).toEqual(false);
        });

        it('should NOT call update if track is set to true and plan Node is set', function () {
            scope.parentNode = 1;

            scope.trackPurchaseOrderItem();
            scope.$apply();

            expect(mockDeliveryService.update).not.toHaveBeenCalled();
        });

        it('should call update if track is set to true and on first Level', function () {
            scope.consigneeLevel = true;

            scope.trackPurchaseOrderItem();
            scope.$apply();

            expect(mockDeliveryService.update).toHaveBeenCalledWith({ id : 1, track : true }, 'PATCH');
        });

        it('should not call update if track is set to true and not on first Level', function () {
            scope.consigneeLevel = false;

            scope.trackPurchaseOrderItem();
            scope.$apply();

            expect(mockDeliveryService.update).not.toHaveBeenCalledWith();
        });

        it('should call update if track is set to true and no plan Node', function () {
            scope.parentNode = NaN;

            scope.trackPurchaseOrderItem();
            scope.$apply();

            expect(mockDeliveryService.update).toHaveBeenCalledWith({ id : 1, track : true }, 'PATCH');
        });
    });

    describe('when Add Consignee button is clicked', function () {
        it('should add a default distribution plan line item to the selectedPurchaseOrderItem', function () {
            scope.selectedPurchaseOrderItem = stubPurchaseOrderItem;
            scope.$apply();

            var expectedPlanNode = {
                item: stubPurchaseOrderItem.item.id,
                deliveryDate: '',
                quantityIn: 0,
                destinationLocation: '',
                contactPerson: '',
                remark: '',
                track: false,
                isEndUser: false
            };

            scope.addDeliveryNode();
            scope.$apply();

            expect(scope.distributionPlanNodes).toEqual([expectedPlanNode]);
        });
    });

    describe('should route correctly on page', function () {
        it('when Single IP button is clicked', function () {
            scope.selectedPurchaseOrder = {id: 5};
            scope.showSingleIpMode();
            scope.$apply();
            expect(location.path()).toBe('/single-ip-direct-delivery/5');
        });
        it('when Multiple IP button is clicked', function () {
            scope.selectedPurchaseOrder = {id: 5};
            scope.showMultipleIpMode();
            scope.$apply();

            expect(location.path()).toBe('/direct-delivery/new/5/multiple');
        });
        it('when Sub Consignee button is clicked', function () {
            scope.selectedPurchaseOrder = {id: 5, isSingleIp: false};
            scope.selectedPurchaseOrderItem = {id: 76};
            scope.addSubConsignee({id: 9});
            scope.$apply();

            expect(location.path()).toBe('/direct-delivery/new/5/multiple/76/9');
        });
        it('when back to consignee button is clicked with top-level node', function () {
            scope.selectedPurchaseOrder = {id: 5};
            scope.selectedPurchaseOrderItem = {id: 76};
            scope.previousConsignee({id: 9});
            scope.$apply();

            expect(location.path()).toBe('/direct-delivery/new/5/multiple/76');
        });

        it('when back to consignee button is clicked with top-level node', function () {
            scope.selectedPurchaseOrder = {id: 5};
            scope.selectedPurchaseOrderItem = {id: 76};
            scope.previousConsignee({id: 9, parent: 90});
            scope.$apply();

            expect(location.path()).toBe('/direct-delivery/new/5/multiple/76/90');
        });
    });

    describe('when save is clicked, ', function () {
        var programmeId, distributionPlan;

        beforeEach(function () {
            var createPromise = q.defer();
            distributionPlan = {id: 1};
            createPromise.resolve(distributionPlan);
            mockDeliveryService.create.and.returnValue(createPromise.promise);

            programmeId = 42;
            scope.selectedPurchaseOrder = {programme: programmeId};
            scope.selectedPurchaseOrderItem = {quantity: 100, information: stubPurchaseOrderItem};
            scope.$apply();
        });

        describe('and the plan is successfully saved, ', function () {
            it('a toast confirming the save action should be created', function () {
                scope.inMultipleIpMode = true;
                scope.saveDeliveryNodes();
                scope.$apply();

                var expectedToastArguments = {
                    content: 'Delivery Saved!',
                    class: 'success',
                    maxNumber: 1,
                    dismissOnTimeout: true
                };
                expect(mockToastProvider.create).toHaveBeenCalledWith(expectedToastArguments);
            });

            it('two distribution plans should be created', function () {
                scope.inMultipleIpMode = true;
                scope.distributionPlanNodes = [{
                    consignee: {id: 1 },
                    item: scope.selectedPurchaseOrderItem.id,
                    deliveryDate: '10/10/2015',
                    quantityIn: 5,
                    location: 'Kampala',
                    contactPerson: {id: '559281d40c42914aad3d6006'},
                    remark: '',
                    track: false,
                    isEndUser: false
                },
                    {
                        consignee: {id: 1 },
                        item: scope.selectedPurchaseOrderItem.id,
                        deliveryDate: '10/10/2015',
                        quantityIn: 4,
                        destinationLocation: 'Wakiso',
                        contactPerson: {id: '559281d40c42914aad3d6006'},
                        remark: '',
                        track: false,
                        isEndUser: false
                    }];
                scope.saveDeliveryNodes();
                scope.$apply();

                expect(mockDeliveryService.create.calls.count()).toBe(2);
            });
        });

        describe('when saving a node and plan item, ', function () {
            var uiPlanNode;
            var distributionDateFormattedForSave = '2014-2-3';

            beforeEach(function () {
                uiPlanNode = {
                    consignee: {id: 1},
                    location: 'Kampala',
                    destinationLocation: 'Kampala',
                    contactPerson: {id: '0489284'},
                    distributionPlan: 1,
                    tree_position: 'MIDDLE_MAN',
                    item: 1,
                    quantityIn: 10,
                    deliveryDate: '02/03/2014',
                    remark: 'Remark',
                    track: false
                };

                scope.distributionPlanNodes = [uiPlanNode];
                scope.track = true;
                scope.$apply();
            });


            describe(' and a distribution plan node has not been saved before, ', function () {
                var nodeId;
                beforeEach(function () {
                    nodeId = 1;
                    deferredPlanNode.resolve({id: nodeId});
                    deferredUserPromise.resolve(stubUser);
                });

                it('should save node with end user tree position', function () {
                    uiPlanNode.isEndUser = true;
                    scope.inMultipleIpMode = true;
                    scope.saveDeliveryNodes();
                    scope.$apply();

                    expect(mockNodeService.create).toHaveBeenCalledWith({
                        consignee: 1,
                        location: 'Kampala',
                        contact_person_id: '0489284',
                        tree_position: 'END_USER',
                        parent: null,
                        item: uiPlanNode.item,
                        quantity: uiPlanNode.quantityIn,
                        delivery_date: distributionDateFormattedForSave,
                        remark: uiPlanNode.remark,
                        track: false,
                        distribution_plan: 1
                    });
                });

                it('a node should be saved with no parent id as implementing partner', function () {
                    scope.inMultipleIpMode = true;
                    scope.saveDeliveryNodes();
                    scope.$apply();

                    expect(mockNodeService.create).toHaveBeenCalledWith({
                        consignee: 1,
                        location: 'Kampala',
                        contact_person_id: '0489284',
                        tree_position: 'IMPLEMENTING_PARTNER',
                        parent: null,
                        item: uiPlanNode.item,
                        quantity: uiPlanNode.quantityIn,
                        delivery_date: distributionDateFormattedForSave,
                        remark: uiPlanNode.remark,
                        track: false,
                        distribution_plan: 1
                    });
                });

                it('should save node with middle man user tree position', function () {
                    uiPlanNode.isEndUser = false;
                    scope.parentNode = {id: 1};
                    scope.inMultipleIpMode = true;
                    scope.saveDeliveryNodes();
                    scope.$apply();

                    expect(mockNodeService.create).toHaveBeenCalledWith({
                        consignee: 1,
                        location: 'Kampala',
                        contact_person_id: '0489284',
                        tree_position: 'MIDDLE_MAN',
                        parent: 1,
                        item: uiPlanNode.item,
                        quantity: uiPlanNode.quantityIn,
                        delivery_date: distributionDateFormattedForSave,
                        remark: uiPlanNode.remark,
                        track: false,
                        distribution_plan: 1
                    });
                });

                it('a distribution plan node should be saved, with it\'s track property picked from the scope', function () {
                    scope.inMultipleIpMode = true;
                    scope.saveDeliveryNodes();
                    scope.$apply();

                    expect(mockNodeService.create).toHaveBeenCalledWith({
                        consignee: 1,
                        location: 'Kampala',
                        contact_person_id: '0489284',
                        tree_position: 'IMPLEMENTING_PARTNER',
                        parent: null,
                        item: uiPlanNode.item,
                        quantity: uiPlanNode.quantityIn,
                        delivery_date: distributionDateFormattedForSave,
                        remark: uiPlanNode.remark,
                        track: false,
                        distribution_plan: 1
                    });
                });

            });

            it('should set track to true if node is tracked', function () {
                deferredPlanNode.resolve({id: 1});
                deferredPlan.resolve({id: 1});

                scope.distributionPlanNodes[0].track = true;

                scope.saveDeliveryNodes();
                scope.$apply();

                expect(mockDeliveryService.create).toHaveBeenCalledWith(jasmine.objectContaining({track: true}));
                expect(mockNodeService.create).toHaveBeenCalledWith(jasmine.objectContaining({distribution_plan: 1}));
            });

            it('should set track to false if node is not tracked', function () {
                deferredPlanNode.resolve({id: 1});
                deferredPlan.resolve({id: 1});

                scope.distributionPlanNodes[0].track = false;

                scope.saveDeliveryNodes();
                scope.$apply();

                expect(mockDeliveryService.create).toHaveBeenCalledWith(jasmine.objectContaining({track: false}));
                expect(mockNodeService.create).toHaveBeenCalledWith(jasmine.objectContaining({distribution_plan: 1}));
            });

            it('should set trackSubmitted to true when node is created with track', function() {
                deferredPlan.resolve({id: 1});
                deferredPlanNode.resolve({id: 1});

                var node = scope.distributionPlanNodes[0];
                node.track = true;

                scope.saveDeliveryNodes();
                scope.$apply();

                expect(scope.distributionPlanNodes[0].trackSubmitted).toBeTruthy();
            });

            it('should set trackSubmitted to false when node is created with not tracked', function() {
                deferredPlan.resolve({id: 1});
                deferredPlanNode.resolve({id: 1});

                var node = scope.distributionPlanNodes[0];
                node.track = false;

                scope.saveDeliveryNodes();
                scope.$apply();

                expect(scope.distributionPlanNodes[0].trackSubmitted).toBeFalsy();
            });

            it('should set trackSubmitted to true when node is updated with track', function() {
                deferredPlan.resolve({id: 1});
                deferredPlanNode.resolve({});

                var node = scope.distributionPlanNodes[0];
                node.id = '1';
                node.track = true;

                scope.saveDeliveryNodes();
                scope.$apply();

                expect(scope.distributionPlanNodes[0].trackSubmitted).toBeTruthy();
            });

            it('should set trackSubmitted to false when node is updated without track', function() {
                deferredPlan.resolve({id: 2});
                deferredPlanNode.resolve({id: 2});

                scope.saveDeliveryNodes();
                scope.$apply();

                expect(scope.distributionPlanNodes[0].id).toBe(2);
            });

            it('should set ui node id after creating a node', function() {
                deferredPlan.resolve({id: 1});
                deferredPlanNode.resolve({});

                scope.saveDeliveryNodes();
                scope.$apply();

                expect(scope.distributionPlanNodes[0].trackSubmitted).toBeFalsy();
            });

            describe(' and a distribution plan node has already been created, ', function () {
                var nodeId, deferred;

                beforeEach(inject(function ($q) {
                    nodeId = 1;
                    deferredPlanNode.resolve({id: nodeId});
                    deferredUserPromise.resolve(stubUser);

                    deferred = $q.defer();
                    deferred.resolve({});
                    mockNodeService.update.and.returnValue(deferred.promise);
                }));

                it('the delivery node should be updated along with its delivery', function () {
                    uiPlanNode.id = nodeId;
                    uiPlanNode.distributionPlan = 1;
                    scope.inMultipleIpMode = true;
                    deferredPlan.resolve({});
                    scope.selectedPurchaseOrder.programme = 11;

                    scope.saveDeliveryNodes();
                    scope.$apply();

                    expect(mockDeliveryService.update).toHaveBeenCalledWith({
                        id: 1,
                        programme: 11,
                        consignee: 1,
                        location: 'Kampala',
                        contact_person_id: '0489284',
                        delivery_date: distributionDateFormattedForSave,
                        remark: uiPlanNode.remark,
                        track: false
                    });

                    expect(mockNodeService.update).toHaveBeenCalledWith({
                        consignee: 1,
                        location: 'Kampala',
                        contact_person_id: '0489284',
                        tree_position: 'IMPLEMENTING_PARTNER',
                        parent: null,
                        item: uiPlanNode.item,
                        quantity: uiPlanNode.quantityIn,
                        delivery_date: distributionDateFormattedForSave,
                        remark: uiPlanNode.remark,
                        track: false,
                        distribution_plan: 1,
                        id: nodeId,
                        children: []
                    });
                    expect(mockNodeService.create).not.toHaveBeenCalled();
                });

            });
        });

        describe('for sub-consignees', function () {
            var uiPlanNodes;
            beforeEach(function () {
                uiPlanNodes = {
                    consignee: {id: 1},
                    destinationLocation: 'Kampala',
                    location: 'Kampala',
                    contactPerson: {id: '0489284'},
                    tree_position: 'MIDDLE_MAN',
                    item: 1,
                    quantityIn: 10,
                    deliveryDate: '2014-02-03',
                    remark: 'Remark',
                    parent: 42,
                    track: false,
                    distribution_plan: 1
                };

                scope.distributionPlanNodes = [uiPlanNodes];
                scope.parentNode = {id: 42};
                deferredUserPromise.resolve(stubUser);
                scope.track = true;
                scope.$apply();
            });

            it('a node be saved with parent node', function () {
                scope.inMultipleIpMode = true;
                scope.saveDeliveryNodes();
                scope.$apply();

                expect(mockNodeService.create).toHaveBeenCalledWith({
                    consignee: 1,
                    location: 'Kampala',
                    contact_person_id: '0489284',
                    tree_position: 'MIDDLE_MAN',
                    parent: scope.parentNode.id,
                    item: 1,
                    quantity: 10,
                    delivery_date: '2014-2-3',
                    remark: 'Remark',
                    track: false,
                    distribution_plan: 1
                });

            });
        });
    });
});