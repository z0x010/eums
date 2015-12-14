'use strict';


angular.module('SystemSettingsService', ['eums.config'])
    .factory('SystemSettingsService', function ($http, $q, $timeout, EumsConfig) {
        return {
            getSystemSetting: function () {
                var result = $q.defer();
                $http.get(EumsConfig.BACKEND_URLS.SYSTEM_SETTINGS).then(function (response) {
                    result.resolve(response.data[0].auto_track);
                }, function () {
                    result.reject();
                });
                return result.promise
            },
            updateSystemSetting: function (auto_track) {
                var result = $q.defer();
                var data = {auto_track: auto_track};
                $http.put(EumsConfig.BACKEND_URLS.SYSTEM_SETTINGS + '/1', data).then(function (response) {
                    result.resolve(response);
                }, function () {
                    result.reject();
                });
                return result.promise
            },
        }
    });

