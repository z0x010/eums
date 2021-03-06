'use strict';

angular.module('ReleaseOrder', ['eums.config', 'eums.service-factory', 'ReleaseOrderItem', 'SalesOrder', 'Consignee', 'Delivery'])
    .factory('ReleaseOrderService', function ($http, EumsConfig, ServiceFactory, ReleaseOrderItemService,
                                              SalesOrderService, ConsigneeService, DeliveryService) {
        return ServiceFactory.create({
            uri: EumsConfig.BACKEND_URLS.RELEASE_ORDER,
            propertyServiceMap: {
                consignee: ConsigneeService,
                sales_order: SalesOrderService,
                items: ReleaseOrderItemService,
                delivery: DeliveryService
            },
            methods: {
                forUser: function (user, nestedFields) {
                    return user.consignee_id ?
                        this.filter({consignee: user.consignee_id}, nestedFields)
                        : this.filter({delivered:true}, nestedFields);
                }
            }
        });
    });