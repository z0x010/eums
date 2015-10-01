describe('Consignee Model', function () {
    var ConsigneeModel;
    beforeEach(function () {
        module('Consignee');
        inject(function (Consignee) {
            ConsigneeModel = Consignee;
        });
    });

    it('should construct null object if nothing is passed to constructor', function () {
        var consignee = new ConsigneeModel();
        expect(consignee.id).toBeUndefined();
        expect(consignee.name).toBe(null);
        expect(consignee.location).toBe(null);
        expect(consignee.remarks).toBe(null);
        expect(consignee.customerId).toBe(null);
        expect(consignee.importedFromVision).toBe(false);
    });

    it('should construct a consignee from json', function () {
        var consignee = new ConsigneeModel({
            id: 1, name: 'Some name', location: 'Kampala', remarks: 'something',
            customerId: 'L200', importedFromVision: true
        });
        expect(consignee.id).toBe(1);
        expect(consignee.name).toBe('Some name');
        expect(consignee.location).toBe('Kampala');
        expect(consignee.remarks).toBe('something');
        expect(consignee.customerId).toBe('L200');
        expect(consignee.importedFromVision).toBe(true);
    });

    it('should by default not be inEditMode if it has an id', function () {
        var consignee = new ConsigneeModel({id: 10});
        expect(consignee.inEditMode).toBe(false);
    });

    it('should by default be inEditMode if it does not have an id', function () {
        var consignee = new ConsigneeModel();
        expect(consignee.inEditMode).toBe(true);
    });

    it('should switch to edit mode upon request', function () {
        var consignee = new ConsigneeModel({id: 11});
        expect(consignee.inEditMode).toBe(false);
        expect(consignee.inEditRemarkMode).toBe(false);
        consignee.switchToEditMode();
        expect(consignee.inEditMode).toBe(true);
        expect(consignee.inEditRemarkMode).toBe(true);
    });

    it('should switch to read mode upon request', function () {
        var consignee = new ConsigneeModel();
        expect(consignee.inEditMode).toBe(true);
        expect(consignee.inEditRemarkMode).toBe(true);
        consignee.id = 12;
        consignee.switchToReadMode();
        expect(consignee.inEditMode).toBe(false);
        expect(consignee.inEditRemarkMode).toBe(false);
    });

    it('should switch to edit remark mode upon request', function () {
        var consignee = new ConsigneeModel({id: 12});
        expect(consignee.inEditRemarkMode).toBe(false);
        expect(consignee.inEditMode).toBe(false);
        consignee.switchToEditRemarkMode();
        expect(consignee.inEditRemarkMode).toBe(true);
        expect(consignee.inEditMode).toBe(false);
    });

    it('should be invalid if name is not set', function() {
        var consignee_one = new ConsigneeModel({name: ''});
        var consignee_two = new ConsigneeModel();
        expect(consignee_one.isValid).toBeFalsy();
        expect(consignee_two.isValid).toBeFalsy();
    });

    it('should be valid if it has a name set', function() {
        var consignee = new ConsigneeModel({name: 'some name'});
        expect(consignee.isValid).toBeTruthy();
    });
});