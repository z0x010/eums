from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission

GROUP_PERMISSIONS = {
    'UNICEF_admin': [
        'can_view_users', 
        'can_view_dashboard', 
        'can_view_distribution_plans', 
        'can_view_delivery_reports',
        'can_view_reports',
        'can_view_contacts',
        'can_view_consignees',
        'add_consignee',
        'change_consignee',
        'delete_consignee'
    ],
    'UNICEF_viewer': [
        'can_view_dashboard', 
        'can_view_consignees'
    ],
    'Implementing Partner_editor': [
        'can_view_delivery_reports', 
        'can_view_dashboard',
        'add_consignee'
    ]
}

class Command(BaseCommand):
    help = 'Associates Auth_Groups with permissions'

    def handle(self, *args, **options):
        for group_name, codenames in GROUP_PERMISSIONS.iteritems():
            group = Group.objects.get(name=group_name)
            group_permissions = []
            for codename in codenames:
                group_permissions.append(Permission.objects.get(codename=codename))

            group.permissions = group_permissions
            group.save()