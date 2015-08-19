angular.module('IpDeliveredItems', ['eums.config', 'ngTable', 'siTable', 'Loader', 'Delivery', 'DeliveryNode', 'Answer'])
    .controller('IpDeliveredItemsController', function ($scope, $routeParams, $location, $q, LoaderService,
                                                       DeliveryService, DeliveryNodeService, AnswerService) {

        $scope.activeDelivery = {};

        loadData();

        $scope.saveAnswers = function () {
            LoaderService.showLoader();
            var answerPromises = []
                ;
            $scope.combinedDeliveryNodes.forEach(function (node) {
                answerPromises.push(AnswerService.createWebAnswer(node, node.answers))
            });

            $q.all(answerPromises)
                .then(function () {
                    $location.path('/ip-deliveries');
                })
                .finally(function () {
                    LoaderService.hideLoader();
                });
        };

        $scope.$watch('combinedDeliveryNodes', function () {
            var areValid = [];
            if ($scope.combinedDeliveryNodes) {
                $scope.combinedDeliveryNodes.forEach(function (node) {

                    if (node.answers.first().value == 'No') {
                        node.answers[1].value = '0';
                        node.answers[2].value = 'Incomplete';
                        node.answers[3].value = 'No';
                    }

                    areValid.push(areValidAnswers(node.answers));
                });

                $scope.areValidAnswers = areValid.indexOf(false) <= -1;

            }
        }, true);

        $scope.addRemark = function (index) {
            var remarksModalId = index + '-add-remark-answer-modal';
            LoaderService.showModal(remarksModalId)
        };

        function areValidAnswers(nodeAnswers) {
            var isValid = [];
            nodeAnswers.forEach(function (nodeAnswer) {
                if (nodeAnswer.question_label == 'additionalDeliveryComments') {
                    isValid.add(true);
                } else {
                    if (nodeAnswer.type == 'multipleChoice') {
                        isValid.add(nodeAnswer.options.indexOf(nodeAnswer.value) > -1);
                    } else if (nodeAnswer.type == 'text') {
                        isValid.add(nodeAnswer.value !== '');
                    } else if (nodeAnswer.type == 'numeric') {
                        isValid.add(!isNaN(nodeAnswer.value) && nodeAnswer.value !== '' && nodeAnswer.value.valueOf() >= 0)
                    }
                }
            });
            return isValid.indexOf(false) <= -1;
        }

        function combineNodeAnswers(answers) {
            $scope.combinedDeliveryNodes = [];
            if ($scope.deliveryNodes) {
                $scope.deliveryNodes.forEach(function(node) {
                    var result = answers.filter(function(answerSet) {
                        return answerSet.id == node.id;
                    });

                    if(result) {
                        var deliveryNode = Object.merge(node, { answers: result[0].answers});
                        $scope.combinedDeliveryNodes.push(deliveryNode);
                    }
                });
            }
        }

        function loadData() {
            LoaderService.showLoader();
            DeliveryService.get($routeParams.activeDeliveryId)
                .then(function (delivery) {
                    $scope.shipmentDate = delivery.deliveryDate;
                    $scope.totalValue = delivery.totalValue;
                    $scope.activeDelivery = delivery;
                })
                .then(function () {
                    var item = $scope.activeDelivery.type == 'Purchase Order' ? 'item.item' : 'release_order_item.item';
                    DeliveryNodeService.filter({distribution_plan: $scope.activeDelivery.id}, [item])
                        .then(function (nodes) {
                            $scope.deliveryNodes = nodes;
                        })
                        .then(function () {
                            DeliveryService.getDetail($scope.activeDelivery, 'node_answers')
                                .then(function (answers) {
                                    combineNodeAnswers(answers);
                                })
                                .finally(function () {
                                    LoaderService.hideLoader();
                                });
                        })
                })
        }
    });