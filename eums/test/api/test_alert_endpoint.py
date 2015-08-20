from eums.models.alert import Alert
from eums.test.api.authenticated_api_test_case import AuthenticatedAPITestCase
from eums.test.config import BACKEND_URL
from eums.test.factories.alert_factory import AlertFactory
from eums.test.factories.runnable_factory import RunnableFactory
from eums.test.factories.user_factory import UserFactory

ENDPOINT_URL = BACKEND_URL + 'alert/'


class AlertEndpointTest(AuthenticatedAPITestCase):

    def test_should_return_information_on_an_alert(self):
        runnable = RunnableFactory()
        user = UserFactory()
        AlertFactory(
            order_type=Alert.ORDER_TYPES.waybill,
            order_number=123456,
            issue=Alert.ISSUE_TYPES.not_received,
            is_resolved=False,
            remarks='some remarks',
            consignee_name='wakiso',
            contact_name='john doe',
            delivery_sender=user,
            runnable=runnable)

        response = self.client.get(ENDPOINT_URL)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        first_alert = response.data[0]
        self.assertEqual(first_alert['order_type'], Alert.ORDER_TYPES.waybill)
        self.assertEqual(first_alert['order_number'], 123456)
        self.assertEqual(first_alert['issue'], Alert.ISSUE_TYPES.not_received)
        self.assertEqual(first_alert['is_resolved'], False)
        self.assertEqual(first_alert['remarks'], 'some remarks')
        self.assertEqual(first_alert['consignee_name'], 'wakiso')
        self.assertEqual(first_alert['contact_name'], 'john doe')

    def test_should_return_multiple_alerts_when_multiple_exist(self):
        AlertFactory()
        AlertFactory()
        AlertFactory()

        response = self.client.get(ENDPOINT_URL)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)