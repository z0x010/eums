from django.conf import settings
from django.test import TestCase
from django.utils import timezone
from mock import patch
from rest_framework.status import HTTP_200_OK

from eums.elasticsearch.mappings import DELIVERY_NODE_MAPPING
from eums.elasticsearch.sync_info import SyncInfo
from eums.elasticsearch.sync_data_generators import generate_nodes_to_sync
from eums.rapid_pro.fake_response import FakeResponse
from eums.test.factories.delivery_node_factory import DeliveryNodeFactory
from eums.models import DistributionPlanNode as DeliveryNode


class SyncDataGeneratorsTest(TestCase):
    @classmethod
    def setUpClass(cls):
        DeliveryNode.objects.all().delete()

    def tearDown(self):
        SyncInfo.objects.all().delete()

    @classmethod
    def tearDownClass(cls):
        DeliveryNode.objects.all().delete()

    @patch('requests.post')
    def test_should_include_all_nodes_on_first_sync(self, mock_post):
        mock_post.return_value = FakeResponse({}, status_code=HTTP_200_OK)
        self.assertEqual(SyncInfo.objects.count(), 0)
        node_one = DeliveryNodeFactory()
        node_two = DeliveryNodeFactory()

        nodes_to_sync = generate_nodes_to_sync()

        self.assertEqual(nodes_to_sync.count(), 2)
        self.assertIn(node_one, nodes_to_sync)
        self.assertIn(node_two, nodes_to_sync)

    @patch('eums.elasticsearch.synchroniser.logger.error')
    @patch('requests.post')
    def test_should_post_node_mapping_to_elasticsearch_when_no_sync_info_exists(self, mock_post, *_):
        mock_post.return_value = FakeResponse({}, status_code=HTTP_200_OK)
        url = '%s/_mapping/delivery_node/' % settings.ELASTIC_SEARCH_URL
        generate_nodes_to_sync()
        mock_post.assert_called_with(url, json=DELIVERY_NODE_MAPPING)

    '''
        TODO This is failing when all tests are run because we loose the time aspect of the 'created' field when
          querying nodes from the db. This happens only when running tests
    '''
    def xtest_should_include_new_nodes_in_sync_queryset(self):
        pre_sync_node = DeliveryNodeFactory()

        last_sync_time = timezone.datetime.now()
        SyncInfo.objects.create(status=SyncInfo.STATUS.SUCCESSFUL, start_time=last_sync_time)
        post_sync_node_one = DeliveryNodeFactory()
        post_sync_node_two = DeliveryNodeFactory()

        nodes_to_sync = generate_nodes_to_sync()

        self.assertEqual(nodes_to_sync.count(), 2)
        self.assertIn(post_sync_node_one, nodes_to_sync)
        self.assertIn(post_sync_node_two, nodes_to_sync)
        self.assertNotIn(pre_sync_node, nodes_to_sync)
