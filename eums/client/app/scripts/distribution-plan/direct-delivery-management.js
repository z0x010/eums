'use strict';


angular.module('DirectDeliveryManagement', ['eums.config', 'eums.ip', 'PurchaseOrderItem', 'DistributionPlanNode', 'User', 'Consignee', 'ngTable', 'ngToast', 'siTable', 'Programme', 'PurchaseOrder', 'User', 'Directives', 'Contact', 'Item'])
    .controller('DirectDeliveryManagementController', function ($scope, $location, $q, IPService, UserService, PurchaseOrderItemService, ConsigneeService, DistributionPlanService, DistributionPlanNodeService, ProgrammeService, PurchaseOrderService, $routeParams, ngToast, ItemService, ContactService) {

        function showLoadingModal(show) {
            if (show && !angular.element('#loading').hasClass('in')) {
                angular.element('#loading').modal();
            }
            else if (!show) {
                angular.element('#loading').modal('hide');
                angular.element('#loading.modal').removeClass('in');
            }
        }

        showLoadingModal(true);

        $scope.datepicker = {};
        $scope.districts = [];
        $scope.consigneeButtonText = 'Add Consignee';
        $scope.contact = {};
        $scope.selectedDate = '';
        $scope.selectedLocation = {};
        $scope.consignee = {};
        $scope.lineItem = {};
        $scope.itemIndex = '';
        $scope.track = false;
        $scope.consigneeLevel = false;
        $scope.isReport = false;
        $scope.districtsLoaded = false;
        $scope.totalValue = 0;
        $scope.IPsLoaded = false;

        $scope.distributionPlanReport = $location.path().substr(1, 15) !== 'delivery-report';
        $scope.quantityHeaderText = 'Delivered Qty';
        $scope.deliveryDateHeaderText = $scope.distributionPlanReport ? 'Delivery Date' : 'Date Delivered';

        function createToast(message, klass) {
            ngToast.create({
                content: message,
                class: klass,
                maxNumber: 1,
                dismissOnTimeout: true
            });
        }


        $scope.addContact = function (node, nodeIndex) {
            $scope.$broadcast('add-contact', node, nodeIndex);
        };

        $scope.$on('contact-saved', function (event, contact, node, nodeIndex) {
            node.contactPerson = {id: contact._id};
            $scope.$broadcast('set-contact-for-node', contact, nodeIndex);
            event.stopPropagation();
        });

        $scope.addRemark = function (itemIndex, lineItem) {
            $scope.$parent.itemIndex = itemIndex;
            $scope.$parent.lineItem = lineItem;
            $('#add-remark-modal').modal();
        };

        IPService.loadAllDistricts().then(function (response) {
            $scope.districts = response.data.map(function (district) {
                return {id: district, name: district};
            });
            $scope.districtsLoaded = true;
        });

        ConsigneeService.all().then(function (consignees) {
            $scope.consignees = consignees;
        });

        $scope.invalidContact = function (contact) {
            return !(contact.firstName && contact.lastName && contact.phone);
        };


        $scope.distributionPlanNodes = [];
        $scope.purchaseOrderItems = [];
        $scope.implementingPartners = [];
        function computeQuantityLeft() {
            var reduced = $scope.distributionPlanNodes.reduce(function (previous, current) {
                return {targetedQuantity: isNaN(current.targetedQuantity) ? previous.targetedQuantity : (previous.targetedQuantity + current.targetedQuantity)};
            }, {targetedQuantity: 0});

            return $scope.totalQuantity - reduced.targetedQuantity;
        }

        function updateIpMode(purchaseOrder) {
            if (purchaseOrder.isSingleIp === null) {
                $scope.inSingleIpMode = false;
                $scope.inMultipleIpMode = false;
            } else {
                if (purchaseOrder.isSingleIp) {
                    $scope.inSingleIpMode = true;
                    $scope.inMultipleIpMode = false;
                    $scope.showSingleIpMode();
                } else {
                    $scope.inSingleIpMode = false;
                    $scope.inMultipleIpMode = true;
                    $scope.showMultipleIpMode();
                }
            }
        }

        function computeTotalPurchaseOrderValue() {
            var reduced = $scope.selectedPurchaseOrder.purchaseorderitemSet.reduce(function (previous, current) {
                return {value: (current.value === '') ? parseFloat(previous.value) : (parseFloat(previous.value) + parseFloat(current.value))};
            }, {value: 0});

            $scope.totalValue = reduced.value;
        }

        PurchaseOrderService.get($routeParams.purchaseOrderId, ['purchaseorderitem_set']).then(function (purchaseOrder) {
            $scope.selectedPurchaseOrder = purchaseOrder;

            updateIpMode(purchaseOrder);

            $scope.selectedPurchaseOrder.purchaseorderitemSet.forEach(function (purchaseOrderItem) {
                ItemService.get(purchaseOrderItem.item, ['unit']).then(function (item) {
                    var formattedPurchaseOrderItem = {
                        display: item.description,
                        materialCode: item.materialCode,
                        quantity: purchaseOrderItem.quantity,
                        unit: item.unit.name,
                        information: purchaseOrderItem,
                        value: purchaseOrderItem.value
                    };
                    $scope.quantityLeft = computeQuantityLeft();

                    if (formattedPurchaseOrderItem.information.id === Number($routeParams.purchaseOrderItemId) && !$routeParams.distributionPlanNodeId) {
                        $scope.selectedPurchaseOrderItem = formattedPurchaseOrderItem;
                        $scope.selectPurchaseOrderItem();
                    }

                    $scope.purchaseOrderItems.push(formattedPurchaseOrderItem);
                    computeTotalPurchaseOrderValue();
                });
            });
            $scope.distributionPlanId = purchaseOrder.delivery;
            getDelivery();

        });



        if ($routeParams.distributionPlanNodeId) {
            $scope.consigneeButtonText = 'Add Sub-Consignee';

            DistributionPlanNodeService.getPlanNodeDetails($routeParams.distributionPlanNodeId).then(function (planNode) {
                $scope.planNode = planNode;
                $scope.totalQuantity = planNode.targetedQuantity;

                UserService.getCurrentUser().then(function (user) {
                    $scope.user = user;
                    if ($scope.user.consignee_id) {
                        $scope.consigneeLevel = $scope.planNode.parent ? false : true;
                    }

                    $scope.distributionPlan = planNode.distributionPlan;
                    $scope.track = planNode.track;

                    PurchaseOrderItemService.get($routeParams.purchaseOrderItemId).then(function (result) {
                        ItemService.get(result.item, ['unit']).then(function (item) {
                            $scope.selectedPurchaseOrderItem = {
                                display: item.description,
                                materialCode: item.materialCode,
                                quantity: result.quantity,
                                unit: item.unit.name,
                                information: result
                            };
                            $scope.quantityLeft = computeQuantityLeft();
                            var childNodePromises = [];
                            $scope.planNode.children.forEach(function (child) {
                                childNodePromises.push(DistributionPlanNodeService.getPlanNodeDetails(child.id));
                            });
                            $q.all(childNodePromises).then(function (children) {
                                setDistributionPlanNode(planNode.targetedQuantity, children);
                            });
                        });
                    });
                });
            });
        }
        $scope.showSingleIpMode = function () {
            $scope.inSingleIpMode = true;
            $scope.inMultipleIpMode = false;
            ConsigneeService.fetchIPs().then(function (allIps) {
                $scope.implementingPartners = allIps;
                $scope.IPsLoaded = true;
            });
        };

        $scope.showMultipleIpMode = function () {
            $scope.inMultipleIpMode = true;
            $scope.inSingleIpMode = false;
        };

        var saveDeliveryNodes = function () {
            $scope.purchaseOrderItems.forEach(function (purchaseOrderItem) {
                saveDeliveryNode(purchaseOrderItem);
            });
        };

        var saveSingleIPDeliveryNodes = function () {
            showLoadingModal(true);
            saveDeliveryNodes();

            if ($scope.selectedPurchaseOrder.isSingleIp === null) {
                savePurchaseOrderIPMode();
            }
        };

        var isValidDelivery = function() {
            return validate($scope.consignee.id, 'Fill in IP field!') &&
                validate($scope.selectedDate, 'Fill in Date field!') &&
                validate($scope.contact.id, 'Fill in Contact field!') &&
                validate($scope.selectedLocation.id, 'Fill in Location field!');
        };

        var validate = function (field, message) {
            if (!field) {
                createToast(message, 'danger');
                return false;
            } else {
                return true;
            }
        };

        var getNodeForItem = function (purchaseOrderItem) {
            return $scope.distributionPlanNodes.find(function (node) {
                return node.item === purchaseOrderItem.information.id;
            });
        };

        var saveDeliveryNode = function (purchaseOrderItem) {
            var deliveryDate = new Date($scope.selectedDate);

            if (deliveryDate.toString() === 'Invalid Date') {
                var planDate = $scope.selectedDate.split('/');
                deliveryDate = new Date(planDate[2], planDate[1] - 1, planDate[0]);
            }
            var node = getNodeForItem(purchaseOrderItem);
            if (node) {
                node.location = $scope.selectedLocation.id;
                node.contact_person_id = $scope.contact.id;
                node.planned_distribution_date = formatDateForSave(deliveryDate);
                DistributionPlanNodeService.update(node)
                    .then(function () {
                        getDelivery();
                        showLoadingModal(false);
                    },
                    function (response) {
                        handleErrors(response);
                    });
            } else {
                node = {
                    consignee: $scope.consignee.id,
                    location: $scope.selectedLocation.id,
                    contact_person_id: $scope.contact.id,
                    distribution_plan: $scope.distributionPlanId,
                    tree_position: 'IMPLEMENTING_PARTNER',
                    item: purchaseOrderItem.information.id,
                    targeted_quantity: parseInt(purchaseOrderItem.quantity),
                    planned_distribution_date: formatDateForSave(deliveryDate),
                    track: false
                };
                DistributionPlanNodeService.create(node)
                    .then(function () {
                        getDelivery();
                        showLoadingModal(false);
                    }, function (response) {
                        handleErrors(response, purchaseOrderItem.materialCode);
                    });

            }

        };

        var handleErrors = function (response, materialCode) {
            var message = '';
            var errors = response.data;
            for (var property in errors) {
                message += 'Material: ' + materialCode + ', ' + property + ': ' + errors[property] + '\n';
            }
            $scope.nodeSavingErrors = true;
            createToast(message, 'danger');
        };

        var setPOFields = function(){
            ContactService.get($scope.contact.id)
                .then(function(contact){
                    $('#contact-select').siblings('div').find('a span.select2-chosen').text(contact.firstName + ' ' + contact.lastName);
                });

            $('#location-select').siblings('div').find('a span.select2-chosen').text($scope.selectedLocation.id);

            ConsigneeService.get($scope.consignee.id).then(function(consignee) {
                $('#ip-select').siblings('div').find('a span.select2-chosen').text(consignee.name);
            });

        };

        var getDelivery = function () {
            if ($scope.distributionPlanId) {
                DistributionPlanService.get($scope.distributionPlanId).then(function (response) {
                    $scope.distributionPlan = response.data;
                    });

                DistributionPlanNodeService.getNodesByDelivery($scope.distributionPlanId)
                    .then(function (response) {
                        $scope.consignee.id = response.data[0].consignee;
                        $scope.selectedLocation.id = response.data[0].location;
                        $scope.selectedDate = response.data[0].planned_distribution_date;
                        $scope.contact.id = response.data[0].contact_person_id;
                        setPOFields();
                    });
            }
        };

        $scope.selectPurchaseOrderItem = function () {
            $scope.track = false;
            $scope.invalidNodes = NaN;
            $scope.distributionPlan = NaN;

            showLoadingModal(true);

            UserService.getCurrentUser().then(function (user) {
                $scope.user = user;
                if ($scope.user.consignee_id) {
                    PurchaseOrderService.getConsigneePurchaseOrderNode($scope.user.consignee_id, $scope.selectedPurchaseOrderItem.information.id).then(function (response) {
                        var node = response;
                        var locPath = $location.path().split('/')[1];
                        var documentId = $scope.distributionPlanReport ? $scope.selectedPurchaseOrder.id : $scope.selectedPurchaseOrder.id;
                        $location.path(
                            '/' + locPath + '/new/' +
                            documentId + '-' +
                            $scope.selectedPurchaseOrderItem.information.id + '-' +
                            node
                        );
                    });
                }
                else {
                    $scope.distributionPlanNodes = [];

                    var selectedPurchaseOrderItem = $scope.selectedPurchaseOrderItem;

                    $scope.totalQuantity = $scope.selectedPurchaseOrderItem.quantity;
                    $scope.quantityLeft = computeQuantityLeft($scope.totalQuantity);

                    PurchaseOrderItemService.get(selectedPurchaseOrderItem.information.id, ['distributionplannode_set'])
                        .then(function (purchaseOrderItem) {
                            PurchaseOrderItemService.getTopLevelDistributionPlanNodes(purchaseOrderItem)
                                .then(function (topLevelNodes) {
                                    setDistributionPlanNode($scope.selectedPurchaseOrderItem.quantity, topLevelNodes);
                                });
                        });
                }
            });
        };

        function savePlanTracking() {
            if ($scope.track && $scope.distributionPlan && (!$scope.planNode || $scope.consigneeLevel)) {
                DistributionPlanService.updatePlanTracking($scope.distributionPlan, $scope.track);
            }
        }

        $scope.trackPurchaseOrderItem = function () {
            $scope.invalidNodes = anyInvalidFields($scope.distributionPlanNodes);
            savePlanTracking();
        };

        function invalidFields(item) {
            return item.targetedQuantity <= 0 || isNaN(item.targetedQuantity) || !item.consignee || !item.location || !item.contactPerson || !item.plannedDistributionDate;
        }

        function anyInvalidFields(lineItems) {
            var itemsWithInvalidFields = lineItems.filter(function (item) {
                return $scope.quantityLeft < 0 || invalidFields(item);
            });
            return itemsWithInvalidFields.length > 0;
        }

        var formatDateForSave = function (date) {
            return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
        };

        var setDistributionPlanNode = function (totalQuantity, nodes) {
            if (nodes.length) {
                var quantityLeft = parseInt(totalQuantity);
                quantityLeft = quantityLeft - _.reduce(_.pluck(nodes, 'targetedQuantity'), function (total, val) {
                        return total + val;
                    });
                $scope.quantityLeft = quantityLeft.toString();

                $scope.distributionPlanNodes = nodes;
            }
            else {
                $scope.distributionPlanNodes = [];
            }
            setDatePickers();
            showLoadingModal(false);
        };

        $scope.addDistributionPlanNode = function () {
            var distributionPlanNode = {
                item: $scope.selectedPurchaseOrderItem.information.id,
                plannedDistributionDate: '',
                targetedQuantity: 0,
                destinationLocation: '',
                contactPerson: '',
                remark: '',
                track: false,
                isEndUser: false,
                flowTriggered: false
            };

            $scope.distributionPlanNodes.push(distributionPlanNode);
            setDatePickers();
        };

        $scope.$watch('distributionPlanNodes', function (newPlanNodes) {
            if (isNaN($scope.invalidNodes) && $scope.distributionPlanNodes.length) {
                $scope.invalidNodes = true;
                return;
            }

            if (newPlanNodes.length) {
                $scope.quantityLeft = computeQuantityLeft();
                $scope.invalidNodes = anyInvalidFields(newPlanNodes);
            }
        }, true);

        function setDatePickers() {
            $scope.datepicker = {};
            $scope.distributionPlanNodes.forEach(function (item, index) {
                $scope.datepicker[index] = false;
            });
        }

        function parentNodeId() {
            if (!!$scope.planNode) {
                return $scope.planNode.id;
            }
            return null;
        }

        function saveNode(uiPlanNode) {
            var deferred = $q.defer();

            var nodeId = uiPlanNode.id;
            var plannedDate = new Date(uiPlanNode.plannedDistributionDate);

            if (plannedDate.toString() === 'Invalid Date') {
                var planDate = uiPlanNode.plannedDistributionDate.split('/');
                plannedDate = new Date(planDate[2], planDate[1] - 1, planDate[0]);
            }

            UserService.getCurrentUser().then(function (user) {
                var node = {
                    consignee: uiPlanNode.consignee.id,
                    location: uiPlanNode.location,
                    contact_person_id: uiPlanNode.contactPerson.id,
                    distribution_plan: $scope.distributionPlan.id,
                    tree_position: uiPlanNode.isEndUser ? 'END_USER' : (parentNodeId() === null ? 'IMPLEMENTING_PARTNER' : 'MIDDLE_MAN'),
                    parent: parentNodeId(),
                    item: uiPlanNode.item,
                    targeted_quantity: uiPlanNode.targetedQuantity,
                    planned_distribution_date: formatDateForSave(plannedDate),
                    remark: uiPlanNode.remark,
                    track: user.consignee_id ? true : $scope.track
                };
                if ($scope.selectedPurchaseOrder.isSingleIp === null) {
                    savePurchaseOrderIPMode();
                }

                if (nodeId) {
                    node.id = nodeId;
                    node.children = uiPlanNode.children ? uiPlanNode.children : [];

                    DistributionPlanNodeService.update(node).then(function(){
                        deferred.resolve(uiPlanNode);
                    });
                }
                else {
                    DistributionPlanNodeService.create(node).then(function(retNode){
                        uiPlanNode.id = retNode.id;
                        uiPlanNode.canReceiveSubConsignees = function () {
                            return this.id && !this.isEndUser;
                        }.bind(uiPlanNode);
                        deferred.resolve(uiPlanNode);
                    });
                }
            }).catch(function(){
                deferred.reject();
            });
            return deferred.promise;
        }

        function savePurchaseOrderIPMode() {
            var purchaseOrder = $scope.selectedPurchaseOrder;
            if ($scope.inSingleIpMode) {
                purchaseOrder.isSingleIp = true;
            } else if ($scope.inMultipleIpMode) {
                purchaseOrder.isSingleIp = false;
            }
            var items = [];
            for (var item in $scope.selectedPurchaseOrder.purchaseorderitem_set) {
                items.push(item.id);
            }
            purchaseOrder.purchaseorderitem_set = items;
            PurchaseOrderService.update(purchaseOrder);
        }

        function saveMultipleIpDeliveryNodes() {
            var message = 'Delivery Saved!';
            var pNodes = $scope.distributionPlanNodes;
            $scope.distributionPlanNodes = [];
            var nodesCumulator = [];
            var saveNodePromises = [];

            pNodes.forEach(function (node) {
                saveNodePromises.push[saveNode(node).then(function(upToDateNode){
                    return nodesCumulator.push(upToDateNode);
                })];
            });

            $q.all(saveNodePromises).then(function () {
                $scope.distributionPlanNodes = nodesCumulator;
                createToast(message, 'success');
            });

        }

        $scope.warnBeforeSaving = function () {
            if($scope.inMultipleIpMode || ($scope.inSingleIpMode && isValidDelivery())) {
                if ($scope.selectedPurchaseOrder.isSingleIp === null) {
                    $('#confirmation-modal').modal();
                } else {
                    $scope.warningAccepted();
                }
            }
        };

        $scope.warningAccepted = function(){
            $('#confirmation-modal').modal('hide');
            $scope.saveDistributionPlanNodes();
        };

        $scope.saveDistributionPlanNodes = function(){
            if (!$scope.distributionPlanId) {
                DistributionPlanService.createPlan({programme: $scope.selectedPurchaseOrder.programme})
                    .then(function (createdPlan) {
                        $scope.distributionPlan = createdPlan;
                        $scope.distributionPlanId = createdPlan.id;
                        if($scope.inSingleIpMode) {
                            saveSingleIPDeliveryNodes();
                        } else if($scope.inMultipleIpMode) {
                            saveMultipleIpDeliveryNodes();
                        }
                    });
            } else {
                if($scope.inSingleIpMode) {
                    saveSingleIPDeliveryNodes();
                } else if($scope.inMultipleIpMode) {
                    saveMultipleIpDeliveryNodes();
                }
            }
        };


        $scope.addSubConsignee = function (node) {
            var locPath = $location.path().split('/')[1];
            var documentId = $scope.selectedPurchaseOrder.id;
            $location.path(
                '/' + locPath + '/' +
                documentId + '-' +
                $scope.selectedPurchaseOrderItem.information.id + '-' +
                node.id
            );
        };

        $scope.showSubConsigneeButton = function (node) {
            return node.id && !node.isEndUser;
        };

        $scope.previousConsignee = function (planNode) {
            var locPath = $location.path().split('/')[1];
            var documentId = $scope.distributionPlanReport ? $scope.selectedPurchaseOrder.id : $scope.selectedPurchaseOrder.id;
            if (planNode.parent) {
                $location.path(
                    '/' + locPath + '/' +
                    documentId + '-' +
                    $scope.selectedPurchaseOrderItem.information.id + '-' +
                    planNode.parent
                );
            }
            else {
                $location.path(
                    '/' + locPath + '/' +
                    documentId + '-' +
                    $scope.selectedPurchaseOrderItem.information.id
                );
            }
        };

        showLoadingModal(false);


    });

