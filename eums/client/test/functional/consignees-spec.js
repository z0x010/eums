'use strict';

var loginPage = require('./pages/login-page.js');
var consigneesPage = require('./pages/consignees-page.js');

describe('Consignees and subconsignees', function () {

    describe('main functionality', function() {

        beforeEach(function () {
            loginPage.visit();
            loginPage.loginAs('admin', 'admin');
            consigneesPage.visit();
        });

        it('should list consignees existing in the system', function () {
            consigneesPage.searchFor('Wakiso');

            expect(consigneesPage.consigneeCount).toEqual(1);
            expect(consigneesPage.consigneeNames).toContain('WAKISO DHO');
            expect(consigneesPage.consigneeIDs).toContain('L438000484');
        });

        it('should update consignees imported from vision', function () {
            consigneesPage.searchFor('Wakiso');
            expect(consigneesPage.consigneeRemarks).toContain('');

            consigneesPage.editConsignee();
            consigneesPage.setConsigneeRemarks('Updated Remarks');
            consigneesPage.saveConsignee();
            expect(consigneesPage.consigneeRemarks).toContain('Updated Remarks');
        });

        it('should add consignees to the list when their details are specified', function () {
            consigneesPage.addConsignee();
            consigneesPage.setConsigneeName('New Consignee');
            consigneesPage.setConsigneeLocation('New Consignee Location');
            consigneesPage.setConsigneeRemarks('New Consignee Remarks');
            consigneesPage.saveConsignee();

            consigneesPage.visit();
            consigneesPage.searchFor('New Consignee');
            expect(consigneesPage.consigneeNames).toContain('New Consignee');
            expect(consigneesPage.consigneeLocations).toContain('New Consignee Location');
            expect(consigneesPage.consigneeIDs).toContain('');
            expect(consigneesPage.consigneeRemarks).toContain('New Consignee Remarks');
        });

        it('should show which consignees are imported from vision', function () {
            consigneesPage.searchFor('New Consignee');
            expect(consigneesPage.consigneeTypeClass).toContain('ng-hide');

            consigneesPage.searchFor('WAKISO');
            expect(consigneesPage.consigneeTypeClass).not.toContain('ng-hide');
        });

        it('should be able to delete consignees not imported from vision', function () {
            consigneesPage.searchFor('New Consignee');
            consigneesPage.deleteConsignee();
            consigneesPage.confirmDeleteConsignee();

            consigneesPage.searchFor('New Consignee');
            expect(consigneesPage.consigneeCount).toEqual(0);
        });
    });

    describe('permission functionality', function () {

        it('should give add, edit and delete consignees permissions to appropriate IP roles', function() {
            loginPage.visit();
            loginPage.loginAs('wakiso', 'wakiso');
            consigneesPage.visit();

            expect(consigneesPage.addConsigneeButton.isDisplayed()).toBeTruthy();

            consigneesPage.addConsignee();
            consigneesPage.setConsigneeName('IP Editor New Consignee');
            consigneesPage.setConsigneeLocation('IP Editor New Consignee Location');
            consigneesPage.setConsigneeRemarks('IP Editor New Consignee Remarks');
            consigneesPage.saveConsignee();

            consigneesPage.searchFor('IP Editor New Consignee');

            expect(consigneesPage.editConsigneeButton.isDisplayed()).toBeTruthy();
            expect(consigneesPage.deleteConsigneeButton.isDisplayed()).toBeTruthy();

            // Search for consignee imported from Vision
            consigneesPage.searchFor('WAKISO');

            expect(consigneesPage.editConsigneeButton.isDisplayed()).toBeTruthy();
            expect(consigneesPage.deleteConsigneeButton.isDisplayed()).toBeFalsy();

            loginPage.logout();

            loginPage.visit();
            loginPage.loginAs('wakiso_viewer', 'wakiso');
            consigneesPage.visit();

            expect(consigneesPage.addConsigneeButton.isDisplayed()).toBeFalsy();

            consigneesPage.searchFor('IP Editor New Consignee');

            expect(consigneesPage.editConsigneeButton.isDisplayed()).toBeFalsy();
            expect(consigneesPage.deleteConsigneeButton.isDisplayed()).toBeFalsy();
        });

        it('should give add, edit and delete consignees permissions to appropriate UNICEF roles', function() {
            loginPage.visit();
            loginPage.loginAs('unicef_admin', 'wakiso');
            consigneesPage.visit();

            expect(consigneesPage.addConsigneeButton.isDisplayed()).toBeTruthy();

            consigneesPage.addConsignee();
            consigneesPage.setConsigneeName('UNICEF Admin New Consignee');
            consigneesPage.setConsigneeLocation('UNICEF Admin New Consignee Location');
            consigneesPage.setConsigneeRemarks('UNICEF Admin New Consignee Remarks');
            consigneesPage.saveConsignee();

            consigneesPage.searchFor('UNICEF Admin New Consignee');

            expect(consigneesPage.editConsigneeButton.isDisplayed()).toBeTruthy();
            expect(consigneesPage.deleteConsigneeButton.isDisplayed()).toBeTruthy();

            // Search for consignee imported from Vision
            consigneesPage.searchFor('WAKISO');

            expect(consigneesPage.editConsigneeButton.isDisplayed()).toBeTruthy();
            expect(consigneesPage.deleteConsigneeButton.isDisplayed()).toBeFalsy();

            loginPage.logout();

            loginPage.visit();
            loginPage.loginAs('unicef_editor', 'wakiso');
            consigneesPage.visit();

            expect(consigneesPage.addConsigneeButton.isDisplayed()).toBeTruthy();

            consigneesPage.searchFor('UNICEF Admin New Consignee');

            expect(consigneesPage.editConsigneeButton.isDisplayed()).toBeTruthy();
            expect(consigneesPage.deleteConsigneeButton.isDisplayed()).toBeTruthy();

            // Search for consignee imported from Vision
            consigneesPage.searchFor('WAKISO');

            expect(consigneesPage.editConsigneeButton.isDisplayed()).toBeTruthy();
            expect(consigneesPage.deleteConsigneeButton.isDisplayed()).toBeFalsy();            

            loginPage.logout();

            loginPage.visit();
            loginPage.loginAs('unicef_viewer', 'wakiso');
            consigneesPage.visit();

            expect(consigneesPage.addConsigneeButton.isDisplayed()).toBeFalsy();

            consigneesPage.searchFor('UNICEF Admin New Consignee');

            expect(consigneesPage.editConsigneeButton.isDisplayed()).toBeFalsy();
            expect(consigneesPage.deleteConsigneeButton.isDisplayed()).toBeFalsy();                        
        });
    });
});