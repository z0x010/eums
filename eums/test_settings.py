
from eums.settings import *

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'eums_test',
        'USER': 'postgres',
        'HOST': 'localhost',
        'PORT': '5432'
    }
}

CONTACTS_SERVICE_URL = 'http://localhost:9005/api/contacts/'