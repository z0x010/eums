import copy
import json
import logging
from urllib import urlencode

import requests
from django.conf import settings

from rest_framework.status import HTTP_200_OK, HTTP_504_GATEWAY_TIMEOUT
from urllib3.connection import ConnectionError

from eums.celery import app
from eums.rapid_pro.rapid_pro_service import HEADER

logger = logging.getLogger(__name__)


class ContactClient(object):
    @staticmethod
    def get(contact_person_id):
        default_contact = {'_id': '', 'firstName': '', 'lastName': '', 'phone': '',
                           'types': [], 'outcomes': [], 'ips': [], 'districts': []}
        try:
            response = requests.get(url='%s%s' % (settings.CONTACTS_SERVICE_URL, contact_person_id))
            if response.status_code is HTTP_200_OK:
                return response.json()

            logger.error('Contact not found')
            return default_contact
        except ConnectionError, error:
            logger.error(error)
            return default_contact

    @staticmethod
    def get_all():
        contacts = [{'_id': '', 'firstName': '', 'lastName': '', 'phone': '',
                     'types': [], 'outcomes': [], 'ips': [], 'districts': []}]
        try:
            response = requests.get(url='%s' % settings.CONTACTS_SERVICE_URL)
            if response.status_code is HTTP_200_OK:
                return response.json()

            logger.error('Contact not found')
            return contacts
        except ConnectionError, error:
            logger.error(error)
            return contacts

    @staticmethod
    def update(contact):
        try:
            response = requests.put(settings.CONTACTS_SERVICE_URL, contact)
            return response.status_code
        except ConnectionError, error:
            logger.error(error)
            return HTTP_504_GATEWAY_TIMEOUT

    @staticmethod
    def update_after_delivery_creation(contact_id, type, outcome, district, ip):
        try:
            origin_contact = ContactClient.get(contact_id)
            updated_contact = ContactClient._update_contact(origin_contact, type, outcome, district, ip)

            if origin_contact != updated_contact:
                ContactClient.update(updated_contact)
        except Exception, e:
            logger.error(e)

    @staticmethod
    def _append_if_not_exist(val, value_list=[]):
        if val and (val not in value_list):
            value_list.append(val)

    @staticmethod
    def _update_contact(origin_contact, type, outcome, district, ip):
        updated_contact = copy.deepcopy(origin_contact)
        ContactClient._append_if_not_exist(type, updated_contact['types'])
        ContactClient._append_if_not_exist(outcome, updated_contact['outcomes'])
        ContactClient._append_if_not_exist(ip, updated_contact['ips'])
        ContactClient._append_if_not_exist(district, updated_contact['districts'])

        return updated_contact

    @staticmethod
    def add_or_update_rapid_pro_contact(contact):
        logger.info('rapid pro live = %s' % settings.RAPIDPRO_LIVE)

        if settings.RAPIDPRO_LIVE:
            rapid_pro_contact = ContactClient.build_rapid_pro_contact(contact)
            logger.info('rapid pro contact = %s' % rapid_pro_contact)
            logger.info('url = %s' % settings.RAPIDPRO_URLS.get('CONTACTS'))

            response = requests.post(settings.RAPIDPRO_URLS.get('CONTACTS'), data=json.dumps(rapid_pro_contact),
                                     headers=HEADER, verify=settings.RAPIDPRO_SSL_VERIFY)
            logger.info('add or update rapid pro contact response = [%s]' % response)
            return response

    @staticmethod
    def get_rapid_pro_contact(phone):
        if settings.RAPIDPRO_LIVE:
            url_add_rapid_pro_contact = '%s?%s' % (settings.RAPIDPRO_URLS.get('CONTACTS'), urlencode({
                'urns': 'tel:%s' % phone
            }))
            response = requests.get(url_add_rapid_pro_contact, headers=HEADER, verify=settings.RAPIDPRO_SSL_VERIFY)
            return response

    @staticmethod
    def delete_rapid_pro_contact(phone):
        if settings.RAPIDPRO_LIVE:
            url_delete_rapid_pro_contact = '%s?%s' % (settings.RAPIDPRO_URLS.get('CONTACTS'), urlencode({
                'urns': 'tel:%s' % phone
            }))
            response = requests.delete(url_delete_rapid_pro_contact, headers=HEADER,
                                       verify=settings.RAPIDPRO_SSL_VERIFY)
            return response

    @staticmethod
    def build_rapid_pro_contact(contact):
        logger.info(contact)
        return {
            'name': '%(firstName)s %(lastName)s' % contact,
            'groups': ['EUMS'],
            'urns': ['tel:%(phone)s' % contact],
            'fields': ContactClient.build_rapid_pro_contact_fields(contact)
        }

    @staticmethod
    def build_rapid_pro_contact_fields(contact):
        return {
            'firstname': contact.get('firstName'),
            'lastname': contact.get('lastName'),
            'districts': ','.join(contact.get('districts')) if contact.get('districts') else ',',
            'ips': ','.join(contact.get('ips')) if contact.get('ips') else ',',
            'types': ','.join(contact.get('types')) if contact.get('types') else ',',
            'outcomes': ','.join(contact.get('outcomes')) if contact.get('outcomes') else ',',
        }


@app.task
def execute_rapid_pro_contact_update(contact):
    logger.info('%s%s%s' % ('*' * 10, 'update rapid pro contact', '*' * 10))
    ContactClient.add_or_update_rapid_pro_contact(contact)


@app.task
def execute_rapid_pro_contact_delete(phone):
    logger.info('%s%s%s' % ('*' * 10, 'delete rapid pro contact', '*' * 10))
    ContactClient.delete_rapid_pro_contact(phone)
