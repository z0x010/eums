'use strict';

angular.module('eums.config', [])
.constant('EumsConfig', {
  BACKEND_URLS: {
    DISTRIBUTION_REPORT: '/api/distribution-report/',
    DISTRIBUTION_PLAN: '/api/distribution-plan/',
    DISTRIBUTION_PLAN_NODE: '/api/distribution-plan-node/',
    ITEM: '/api/item/',
    ITEM_UNIT: '/api/item-unit/',
    CONSIGNEE: '/api/consignee/',
    DISTRIBUTION_PLAN_LINE_ITEM: '/api/distribution-plan-line-item/',
    RUN: '/api/run/',
    SALES_ORDER: '/api/sales-order/',
    SALES_ORDER_ITEM: '/api/sales-order-item/',
    PURCHASE_ORDER: '/api/purchase-order/',
    PURCHASE_ORDER_ITEM: '/api/purchase-order-item/',
    RELEASE_ORDER: '/api/release-order/',
    RELEASE_ORDER_ITEM: '/api/release-order-item/',
    PO_ITEM_FOR_SO_ITEM: '/api/so-item-po-item/',
    CONSIGNEE_PURCHASE_ORDERS: '/api/consignee-purchase-orders/',
    CONSIGNEE_ITEM: '/api/consignee-item/',
    PROGRAMME: '/api/programme/',
    USER: '/api/user/',
    QUESTION: '/api/question/',
    RESPONSES: '/api/responses/',
    END_USER_RESPONSES: '/api/end-user-responses/',
    IP_RESPONSES: '/api/ip-responses/',
    IP_FEEDBACK_REPORT: '/api/ip-feedback-report',
    NODE_RESPONSES: '/api/node-responses/',
    STOCK_REPORT: '/api/stock-report/',
    DISTRIBUTION_PLAN_RESPONSES: '/api/distribution-plan-responses/',
    DATE_ANSWERS: '/api/date-answers/',
    TEXT_ANSWERS: '/api/text-answers/',
    NUMERIC_ANSWERS: '/api/numeric-answers/',
    MULTIPLE_CHOICE_ANSWERS: '/api/multiple-choice-answers/',
    WEB_ANSWERS: '/api/web-answers/',
    IMPORT_SALES_ORDERS: '/api/import-sales-orders/',
    IMPORT_RELEASE_ORDERS: '/api/import-release-orders/',
    IMPORT_PURCHASE_ORDERS: '/api/import-purchase-orders/',
    IMPORT_CONSIGNEES: '/api/import-consignees/',
    IMPORT_PROGRAMMES: '/api/import-programmes/',
    RECEIVED_OPTIONS: 'api/received-options/',
    QUALITY_OPTIONS: 'api/quality-options/',
    SATISFIED_OPTIONS: 'api/satisfied-options/',
    PERMISSION: '/api/permission',
    ALERTS: '/api/alert'
  },
  CONTACT_SERVICE_URL: '/api/contacts/',
  DISTRICTGEOJSONURL: 'static/app/data/districts.json',
  DISTRICTJSONURL: 'static/app/data/district_name.json',
  districtLayerStyle: {
    weight: 1,
    color: '#036E97',
    fillColor: '#CCE9F4',
    fillOpacity: 0.2,
    opacity: 0.7
  },
  selectedLayerStyle: {
    weight: 1,
    color: '@brand-primary',
    fillOpacity: 0.8
  },
  MAP_OPTIONS: {
    CENTER: [1.406, 32],
    ZOOM_LEVEL: 7
  },
  DISTRICT_NAME_LOCATOR: 'DNAME_2010'
});