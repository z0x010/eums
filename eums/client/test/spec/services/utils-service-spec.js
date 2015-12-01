describe('Utils Service', function () {
    var sysUtilService;

    beforeEach(function () {
        module('SysUtils');
        inject(function (SysUtilsService) {
            sysUtilService = SysUtilsService
        });
    });

    it('should format as 21-Sep-2015 when 21/09/2015 is given', function () {
        var resultData = sysUtilService.formatDate("21/09/2015");
        expect(resultData).toEqual("21-Sep-2015");
    });


    it('should format as empty string when empty string is given', function () {
        var resultData = sysUtilService.formatDate("");
        expect(resultData).toEqual("");
    });

    it('should format as empty string when nothing is given', function () {
        var resultData = sysUtilService.formatDate();
        expect(resultData).toEqual("");
    });

    it('should format as empty string when null is given', function () {
        var resultData = sysUtilService.formatDate(null);
        expect(resultData).toEqual("");
    });
});

