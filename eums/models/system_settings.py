from django.db import models


class SystemSettings(models.Model):
    auto_track = models.BooleanField(default=False)
    sync_start_date = models.DateField(null=True)
    sync_end_date = models.DateField(null=True)
    notification_message = models.TextField(max_length=300, blank=True, default='')
    district_label = models.TextField(max_length=300, blank=True, default='District')
    country_label = models.TextField(max_length=300, blank=True, default='')

    class Meta:
        app_label = 'eums'

    def __unicode__(self):
        return 'SystemSettings = ' \
               '{id : %s, auto_track : %s, sync_start_date : %s, sync_end_date : %s, notification_message : %s, district_label : %s, \
                country_label : %s}' % (str(self.id), str(self.auto_track), str(self.sync_start_date),
                                        str(self.sync_end_date), str(self.notification_message),
                                        str(self.district_label), str(self.country_label))

    @staticmethod
    def get_sync_start_date():
        start_date = SystemSettings.objects.first().sync_start_date
        return start_date.strftime('%d%m%Y') if start_date else ''

    @staticmethod
    def get_sync_end_date():
        end_date = SystemSettings.objects.first().sync_end_date
        return end_date.strftime('%d%m%Y') if end_date else ''
