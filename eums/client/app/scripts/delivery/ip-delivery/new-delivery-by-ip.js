'use strict';

angular.module('NewDeliveryByIp', ['eums.config', 'eums.service-factory', 'ngToast', 'SystemSettingsService', 'SysUtils',
        'DeliveryNode'])
    .config(['ngToastProvider', function (ngToast) {
        ngToast.configure({maxNumber: 1, horizontalPosition: 'center'});
    }])
    .controller('NewDeliveryByIpController', function ($scope, $q, $routeParams, $location, ngToast, DeliveryNodeService,
                                                       DeliveryNode, IPService, LoaderService, ItemService, UserService,
                                                       ConsigneeItemService, SystemSettingsService, SysUtilsService) {
        var itemId = $routeParams.itemId;

        $scope.currentUser = {};
        $scope.errors = false;
        $scope.districts = [];
        $scope.isAssigningItemsToSelf = $routeParams.deliveryMode === 'self';
        $scope.newDelivery = new DeliveryNode({
            track: true,
            treePosition: 'END_USER',
            isAssignedToSelf: $scope.isAssigningItemsToSelf
        });

        init();

        $scope.addContact = function () {
            $scope.$broadcast('add-contact');
        };

        $scope.addConsignee = function () {
            $scope.$broadcast('add-consignee');
        };

        $scope.$on('contact-saved', function (event, contact) {
            var contactInput = angular.element('#contact-select');
            var contactSelect2Input = contactInput.siblings('div').find('a span.select2-chosen');
            contactSelect2Input.text(contact.firstName + ' ' + contact.lastName);

            $scope.newDelivery.contact = contact;
            $scope.newDelivery.contact_person_id = contact._id;

            event.stopPropagation();
        });

        $scope.$on('consignee-saved', function (event, consignee) {
            $scope.newDelivery.consignee = consignee;
            $scope.$broadcast('set-consignee', consignee);
            event.stopPropagation();
        });

        $scope.$watch('selectedOrderNumber', function (selectedOrderNumber) {
            if ($scope.allDeliveries) {
                $scope.selectedDeliveries = $scope.allDeliveries.filter(function (delivery) {
                    return delivery.orderNumber == selectedOrderNumber;
                });
            }
        });

        $scope.$watch('selectedDeliveries', function (deliveries) {
            if (deliveries) {
                $scope.totalQuantityShipped = deliveries.reduce(function (acc, delivery) {
                    acc.quantityShipped += delivery.quantityShipped || 0;
                    return acc;
                }, {quantityShipped: 0}).quantityShipped;
            }
        }, true);

        $scope.save = function () {
            $scope.newDelivery.deliveryDate = SysUtilsService.formatDateToYMD($scope.newDelivery.deliveryDate);

            var parentDeliveries = $scope.selectedDeliveries.filter(function (delivery) {
                return delivery.quantityShipped > 0;
            });
            $scope.newDelivery.parents = parentDeliveries.map(function (delivery) {
                return {id: delivery.id, quantity: delivery.quantityShipped};
            });

            if (parentDeliveries.length && scopeDataIsValid(parentDeliveries)) {
                LoaderService.showLoader();
                $scope.newDelivery.item = parentDeliveries.first().item;
                createNewDeliveryNode();
            }
            else {
                $scope.errors = true;
                createToast('Cannot save. Please fill out or fix values for all fields marked in red', 'danger');
            }
        };

        $scope.discard = function (itemId) {
            $location.path('/deliveries-by-ip/' + itemId);
        };

        $scope.updateSelectedOrderNumber = function (orderNumber) {
            if ($scope.selectedOrderNumber != orderNumber) {
                $scope.selectedOrderNumber = orderNumber;
            } else {
                $scope.selectedOrderNumber = undefined;
            }
        };

        function init() {
            var promises = [];
            promises.push(loadCurrentUser());
            promises.push(SystemSettingsService.getSettingsWithDefault());
            $q.all(promises).then(function (returns) {
                $scope.systemSettings = returns[1];
                $scope.newDelivery.consignee = $scope.isAssigningItemsToSelf ? $scope.currentUser.consignee_id : null;
            });

            var loadPromises = [];
            LoaderService.showLoader();
            loadPromises.push(IPService.loadAllDistricts().then(function (response) {
                $scope.districts = response.data.map(function (districtName) {
                    return {id: districtName, name: districtName};
                });
                $scope.districtsLoaded = true;
            }));

            loadPromises.push(ItemService.get(itemId).then(function (item) {
                $scope.item = item;
            }));

            loadPromises.push(ConsigneeItemService.filter({item: itemId}).then(function (response) {
                $scope.quantityAvailable = response.results.first().availableBalance;
            }));

            loadPromises.push(DeliveryNodeService.filter({
                item__item: $routeParams.itemId,
                is_distributable: true
            }).then(function (nodes) {
                $scope.deliveryGroups = [];
                $scope.selectedOrderNumber = "";
                nodes.forEach(function (node) {
                    updateDeliveryGroups(node, nodes);
                });
                $scope.allDeliveries = nodes;
                $scope.deliveryGroups = _.sortBy($scope.deliveryGroups, "orderNumber");
                $scope.selectedOrderNumber = $scope.deliveryGroups.first().orderNumber;
            }));

            $q.all(loadPromises).catch(function () {
                createToast('failed to load deliveries', 'danger');
            }).finally(LoaderService.hideLoader);
        }

        function loadCurrentUser() {
            return UserService.getCurrentUser().then(function (user) {
                $scope.currentUser = user;
            });
        }

        function updateDeliveryGroups(node, nodes) {
            var orderNumber = node.orderNumber;
            var deliveryGroups = $scope.deliveryGroups.filter(function (deliveryGroup) {
                return deliveryGroup.orderNumber == orderNumber;
            });
            if (deliveryGroups.length == 0) {
                var deliveryGroup = {orderNumber: orderNumber};
                deliveryGroup.totalQuantity = getTotalValueFrom(nodes, orderNumber, 'balance', function (balance) {
                    return balance || 0;
                });
                deliveryGroup.numberOfShipments = getTotalValueFrom(nodes, orderNumber, 'numberOfShipment', function (balance) {
                    return 1;
                });
                deliveryGroup.isOpen = function () {
                    return this.orderNumber == $scope.selectedOrderNumber;
                };
                $scope.deliveryGroups.push(deliveryGroup);
            }
        }

        function getTotalValueFrom(nodes, orderNumber, key, rule) {
            return nodes.reduce(function (acc, delivery) {
                if (delivery.orderNumber == orderNumber) {
                    acc += rule(delivery[key]);
                }
                return acc;
            }, 0);
        }

        function createNewDeliveryNode() {
            DeliveryNodeService.create($scope.newDelivery).then(function () {
                createToast('Delivery Successfully Created', 'success');
                $location.path('/deliveries-by-ip/' + $routeParams.itemId);
            }).catch(function () {
                createToast('Failed to save delivery', 'danger');
            }).finally(function () {
                LoaderService.hideLoader();
            });
        }

        function scopeDataIsValid(parentDeliveries) {
            return requiredFieldsAreFilled() && allQuantitiesAreValid() && deliveriesAreFromOneOrder(parentDeliveries);
        }

        function requiredFieldsAreFilled() {
            return $scope.newDelivery.location
                && $scope.newDelivery.contact_person_id
                && $scope.newDelivery.consignee
                && $scope.newDelivery.deliveryDate;
        }

        function allQuantitiesAreValid() {
            return !$scope.selectedDeliveries.any(function (delivery) {
                return delivery.quantityShipped > delivery.balance;
            });
        }

        function deliveriesAreFromOneOrder(parentDeliveries) {
            var parentDeliveryOrderHashes = parentDeliveries.map(function (delivery) {
                return delivery.orderNumber + delivery.orderType;
            });
            return parentDeliveryOrderHashes.unique().length == 1;
        }

        function createToast(message, klass) {
            ngToast.create({content: message, class: klass});
        }
    });
