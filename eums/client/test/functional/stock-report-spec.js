'use strict';

var stockReportPage = require('./pages/stock-report-page.js');
var loginPage = require('./pages/login-page.js');
var ftUtils = require('./functional-test-utils.js');

describe('Stock Report', function () {

    it('should show the report with filtering', function () {
        loginPage.visit();
        loginPage.loginAs('admin', 'admin');

        stockReportPage.visit();
        ftUtils.waitForPageToLoad();

        stockReportPage.selectConsignee('kaabong');
        ftUtils.waitForPageToLoad();

        expect(stockReportPage.totalReceived).toContain('$87.14');
        expect(stockReportPage.totalDispensed).toContain('$0.00');
        expect(stockReportPage.totalBalance).toContain('$87.14');

        expect(stockReportPage.stockDocumentNumbers).toContain('12345');
        expect(stockReportPage.stockReceivedValues).toContain('$87.14');
        expect(stockReportPage.stockBalances).toContain('$87.14');

        stockReportPage.selectFirstPO();
        expect(stockReportPage.itemCodes).toContain('S0060240');
        expect(stockReportPage.itemCodes).toContain('S0145620');
        expect(stockReportPage.itemDescriptions).toContain('Therapeutic spread,sachet 92g/CAR-150');
        expect(stockReportPage.itemDescriptions).toContain('MUAC,Child 11.5 Red/PAC-50');
        expect(stockReportPage.itemDeliveredQty).toContain('80');
        expect(stockReportPage.itemDeliveredQty).toContain('500');
        expect(stockReportPage.itemConfirmedQty).toContain('80');
        expect(stockReportPage.itemConfirmedQty).toContain('500');
        expect(stockReportPage.itemDeliveryDate).toContain('11-Jul-2015');
        expect(stockReportPage.itemBalances).toContain('80');
        expect(stockReportPage.itemBalances).toContain('500');
    });
});