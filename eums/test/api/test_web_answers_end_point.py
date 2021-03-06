import datetime as datetime
import json

from django.db.models import Q
from django.test import override_settings
from mock import MagicMock, patch
from rest_framework.status import HTTP_403_FORBIDDEN, HTTP_201_CREATED

from eums.models import MultipleChoiceAnswer, TextAnswer, Flow, Run, \
    NumericAnswer, Alert, RunQueue
from eums.test.api.authorization.authenticated_api_test_case import AuthenticatedAPITestCase
from eums.test.config import BACKEND_URL
from eums.test.factories.consignee_factory import ConsigneeFactory
from eums.test.factories.delivery_factory import DeliveryFactory
from eums.test.factories.delivery_node_factory import DeliveryNodeFactory
from eums.test.factories.flow_factory import FlowFactory
from eums.test.factories.option_factory import OptionFactory
from eums.test.factories.purchase_order_factory import PurchaseOrderFactory
from eums.test.factories.purchase_order_item_factory import PurchaseOrderItemFactory
from eums.test.factories.question_factory import TextQuestionFactory, MultipleChoiceQuestionFactory, \
    NumericQuestionFactory

ENDPOINT_URL = BACKEND_URL + 'web-answers'


class WebAnswerEndpointTest(AuthenticatedAPITestCase):
    mock_get = MagicMock(return_value={})
    mock_distribution_alert_raise = MagicMock()

    def setUp(self):
        super(WebAnswerEndpointTest, self).setUp()
        self.setup_flow_with_questions(Flow.Label.IMPLEMENTING_PARTNER)

    def setup_flow_with_questions(self, flow_type):
        flow = FlowFactory(label=flow_type)
        delivery_received_qn = MultipleChoiceQuestionFactory(label='deliveryReceived', flow=flow)
        OptionFactory(question=delivery_received_qn, text='Yes')
        OptionFactory(question=delivery_received_qn, text='No')
        TextQuestionFactory(label='dateOfReceipt', flow=flow)
        good_order_qn = MultipleChoiceQuestionFactory(label='isDeliveryInGoodOrder', flow=flow)
        OptionFactory(question=good_order_qn, text='Yes')
        OptionFactory(question=good_order_qn, text='No')
        OptionFactory(question=good_order_qn, text='Incomplete')
        satisfied_qn = MultipleChoiceQuestionFactory(label='areYouSatisfied', flow=flow)
        OptionFactory(question=satisfied_qn, text='Yes')
        OptionFactory(question=satisfied_qn, text='No')
        TextQuestionFactory(label='additionalDeliveryComments', flow=flow)

    @override_settings(CELERY_LIVE=True)
    @patch('eums.services.contact_service.ContactService.get', mock_get)
    @patch('eums.services.flow_scheduler.distribution_alert_raise', mock_distribution_alert_raise)
    def test_should_save_answers(self):
        delivery = DeliveryFactory()
        date_of_receipt = self.__get_current_date()
        good_comment = "All is good"

        data = {
            'runnable': delivery.id, 'answers': [
                {'question_label': 'deliveryReceived', 'value': 'Yes'},
                {'question_label': 'dateOfReceipt', 'value': date_of_receipt},
                {'question_label': 'isDeliveryInGoodOrder', 'value': 'Yes'},
                {'question_label': 'areYouSatisfied', 'value': 'Yes'},
                {'question_label': 'additionalDeliveryComments', 'value': good_comment}
            ]}

        response = self.client.post(ENDPOINT_URL, data=json.dumps(data), content_type='application/json')

        answer_for_delivery_received = self._get_answer_for(MultipleChoiceAnswer, delivery.id, 'deliveryReceived')
        answer_for_date_of_receipt = self._get_answer_for(TextAnswer, delivery.id, 'dateOfReceipt')
        answer_for_delivery_order = self._get_answer_for(MultipleChoiceAnswer, delivery.id, 'isDeliveryInGoodOrder')
        answer_for_satisfaction = self._get_answer_for(MultipleChoiceAnswer, delivery.id, 'areYouSatisfied')
        answer_for_additional_comments = self._get_answer_for(TextAnswer, delivery.id, 'additionalDeliveryComments')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(answer_for_delivery_received.value.text, 'Yes')
        self.assertEqual(answer_for_date_of_receipt.value, date_of_receipt)
        self.assertEqual(answer_for_delivery_order.value.text, 'Yes')
        self.assertEqual(answer_for_satisfaction.value.text, 'Yes')
        self.assertEqual(answer_for_additional_comments.value, good_comment)
        self.assertTrue(self.mock_distribution_alert_raise.delay.called)

    @override_settings(CELERY_LIVE=True)
    @patch('eums.services.contact_service.ContactService.get', mock_get)
    @patch('eums.services.flow_scheduler.distribution_alert_raise', mock_distribution_alert_raise)
    @patch('eums.models.DistributionPlan.confirm')
    def test_should_confirm_delivery_when_answers_are_saved(self, mock_confirm):
        delivery = DeliveryFactory()
        date_of_receipt = self.__get_current_date()
        good_comment = "All is good"

        data = {
            'runnable': delivery.id, 'answers': [
                {'question_label': 'deliveryReceived', 'value': 'Yes'},
                {'question_label': 'dateOfReceipt', 'value': date_of_receipt},
                {'question_label': 'isDeliveryInGoodOrder', 'value': 'Yes'},
                {'question_label': 'areYouSatisfied', 'value': 'Yes'},
                {'question_label': 'additionalDeliveryComments', 'value': good_comment}
            ]}

        response = self.client.post(ENDPOINT_URL, data=json.dumps(data), content_type='application/json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(mock_confirm.called)
        self.assertTrue(self.mock_distribution_alert_raise.delay.called)

    @override_settings(CELERY_LIVE=True)
    @patch('eums.services.contact_service.ContactService.get', mock_get)
    @patch('eums.services.flow_scheduler.distribution_alert_raise', mock_distribution_alert_raise)
    @patch('eums.services.response_alert_handler.ResponseAlertHandler')
    def test_should_format_answers_to_rapidpro_hook_api_and_handle_corresponding_alerts(self, mock_alert_handler):
        delivery = DeliveryFactory()
        date_of_receipt = self.__get_current_date()
        good_comment = "All is good"

        data = {
            'runnable': delivery.id, 'answers': [
                {'question_label': 'deliveryReceived', 'value': 'Yes'},
                {'question_label': 'dateOfReceipt', 'value': date_of_receipt},
                {'question_label': 'isDeliveryInGoodOrder', 'value': 'Yes'},
                {'question_label': 'areYouSatisfied', 'value': 'Yes'},
                {'question_label': 'additionalDeliveryComments', 'value': good_comment}
            ]}

        response = self.client.post(ENDPOINT_URL, data=json.dumps(data), content_type='application/json')

        self.assertEqual(response.status_code, 201)
        rapidpro_formatted_answers = [
            {"category": {'eng': 'Yes', 'base': 'Yes'}, 'label': 'deliveryReceived'},
            {"category": {'eng': date_of_receipt, 'base': date_of_receipt}, 'label': 'dateOfReceipt'},
            {"category": {'eng': 'Yes', 'base': 'Yes'}, 'label': 'isDeliveryInGoodOrder',},
            {"category": {'eng': 'Yes', 'base': 'Yes'}, 'label': 'areYouSatisfied'},
            {"category": {'eng': good_comment, 'base': good_comment}, 'label': 'additionalDeliveryComments'}
        ]

        self.assertTrue(mock_alert_handler.called_once_with(delivery, rapidpro_formatted_answers))
        self.assertTrue(self.mock_distribution_alert_raise.delay.called)

    @override_settings(CELERY_LIVE=True)
    @patch('eums.services.contact_service.ContactService.get', mock_get)
    @patch('eums.services.flow_scheduler.distribution_alert_raise', mock_distribution_alert_raise)
    @patch('eums.services.response_alert_handler.ResponseAlertHandler.process')
    def test_should_process_alerts(self, mock_process):
        delivery = DeliveryFactory()
        date_of_receipt = self.__get_current_date()
        good_comment = "All is good"

        data = {
            'runnable': delivery.id, 'answers': [
                {'question_label': 'deliveryReceived', 'value': 'Yes'},
                {'question_label': 'dateOfReceipt', 'value': date_of_receipt},
                {'question_label': 'isDeliveryInGoodOrder', 'value': 'Yes'},
                {'question_label': 'areYouSatisfied', 'value': 'Yes'},
                {'question_label': 'additionalDeliveryComments', 'value': good_comment}
            ]}

        response = self.client.post(ENDPOINT_URL, data=json.dumps(data), content_type='application/json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(mock_process.called)
        self.assertTrue(self.mock_distribution_alert_raise.delay.called)

    @override_settings(CELERY_LIVE=True)
    @patch('eums.services.contact_service.ContactService.get', mock_get)
    @patch('eums.services.flow_scheduler.distribution_alert_raise', mock_distribution_alert_raise)
    def test_should_create_alerts_integration(self):
        purchase_order = PurchaseOrderFactory(order_number=5678)
        purchase_order_item = PurchaseOrderItemFactory(purchase_order=purchase_order)
        consignee = ConsigneeFactory(name="Liverpool FC")
        delivery = DeliveryFactory(consignee=consignee)
        DeliveryNodeFactory(item=purchase_order_item, distribution_plan=delivery)

        date_of_receipt = self.__get_current_date()
        good_comment = "All is good"

        data = {
            'runnable': delivery.id, 'answers': [
                {'question_label': 'deliveryReceived', 'value': 'No'},
                {'question_label': 'dateOfReceipt', 'value': date_of_receipt},
                {'question_label': 'isDeliveryInGoodOrder', 'value': 'Yes'},
                {'question_label': 'areYouSatisfied', 'value': 'Yes'},
                {'question_label': 'additionalDeliveryComments', 'value': good_comment}
            ]}

        response = self.client.post(ENDPOINT_URL, data=json.dumps(data), content_type='application/json')

        self.assertEqual(response.status_code, 201)

        alert = Alert.objects.get(consignee_name="Liverpool FC", order_number=5678)
        self.assertEqual(alert.issue, Alert.ISSUE_TYPES.not_received)
        self.assertTrue(self.mock_distribution_alert_raise.delay.called)

    @override_settings(CELERY_LIVE=True)
    @patch('eums.services.contact_service.ContactService.get', mock_get)
    @patch('eums.services.flow_scheduler.distribution_alert_raise', mock_distribution_alert_raise)
    def test_should_cancel_existing_runs_when_saving_a_new_set_of_answers(self):
        delivery = DeliveryFactory()

        data = {
            'runnable': delivery.id, 'answers': [
                {'question_label': 'deliveryReceived', 'value': 'Yes'}
            ]}

        self.client.post(ENDPOINT_URL, data=json.dumps(data), content_type='application/json')

        runs = Run.objects.filter(runnable=delivery)
        self.assertEqual(len(runs), 1)

        self.client.post(ENDPOINT_URL, data=json.dumps(data), content_type='application/json')

        runs = Run.objects.filter(runnable=delivery)

        self.assertEqual(len(runs), 2)
        self.assertEqual(len(Run.objects.filter(runnable=delivery, status='cancelled')), 1)
        self.assertEqual(len(Run.objects.filter(runnable=delivery, status='completed')), 1)
        self.assertTrue(self.mock_distribution_alert_raise.delay.called)

    @override_settings(CELERY_LIVE=True)
    @patch('eums.services.contact_service.ContactService.get', mock_get)
    @patch('eums.services.flow_scheduler.distribution_alert_raise', mock_distribution_alert_raise)
    def test_should_save_delivery_node_answers(self):
        self.setup_flow_with_questions(Flow.Label.WEB)
        node = DeliveryNodeFactory()
        date_of_receipt = self.__get_current_date()
        data = {
            'runnable': node.id, 'answers': [
                {'question_label': 'deliveryReceived', 'value': 'Yes'},
                {'question_label': 'dateOfReceipt', 'value': date_of_receipt}
            ]}

        self.client.post(ENDPOINT_URL, data=json.dumps(data), content_type='application/json')

        runs = Run.objects.filter(runnable=node)
        self.assertEqual(len(runs), 1)
        self.assertEqual(len(TextAnswer.objects.filter(run__runnable=node)), 1)
        self.assertEqual(len(MultipleChoiceAnswer.objects.filter(run__runnable=node)), 1)
        self.assertTrue(self.mock_distribution_alert_raise.delay.called)

    @override_settings(CELERY_LIVE=True)
    @patch('eums.services.contact_service.ContactService.get', mock_get)
    @patch('eums.services.flow_scheduler.distribution_alert_raise', mock_distribution_alert_raise)
    def test_should_save_delivery_node_answers_to_web_flow(self):
        self.setup_flow_with_questions(Flow.Label.WEB)
        node = DeliveryNodeFactory()

        date_of_receipt = self.__get_current_date()
        data = {
            'runnable': node.id, 'answers': [
                {'question_label': 'deliveryReceived', 'value': 'Yes'},
                {'question_label': 'dateOfReceipt', 'value': date_of_receipt}
            ]}

        self.client.post(ENDPOINT_URL, data=json.dumps(data), content_type='application/json')

        web_flow = Flow.objects.get(label=Flow.Label.WEB)
        self.assertEqual(len(TextAnswer.objects.filter(question__flow=web_flow)), 1)
        self.assertEqual(len(MultipleChoiceAnswer.objects.filter(question__flow=web_flow)), 1)
        self.assertTrue(self.mock_distribution_alert_raise.delay.called)

    @override_settings(CELERY_LIVE=True)
    @patch('eums.services.contact_service.ContactService.get', mock_get)
    @patch('eums.services.flow_scheduler.distribution_alert_raise', mock_distribution_alert_raise)
    def test_should_save_numeric_answers(self):
        self.setup_flow_with_questions(Flow.Label.WEB)
        web_flow = Flow.objects.filter(label=Flow.Label.WEB).first()
        NumericQuestionFactory(label='quantityDelivered', flow=web_flow)

        node = DeliveryNodeFactory()
        data = {
            'runnable': node.id, 'answers': [
                {'question_label': 'deliveryReceived', 'value': 'Yes'},
                {'question_label': 'quantityDelivered', 'value': '2'}
            ]}

        self.client.post(ENDPOINT_URL, data=json.dumps(data), content_type='application/json')

        self.assertEqual(len(NumericAnswer.objects.filter(question__flow=web_flow)), 1)
        self.assertTrue(self.mock_distribution_alert_raise.delay.called)

    @override_settings(CELERY_LIVE=True)
    @patch('eums.services.contact_service.ContactService.get', mock_get)
    @patch('eums.services.flow_scheduler.distribution_alert_raise', mock_distribution_alert_raise)
    def test_should_dequeue_next_run_in_the_queue(self):
        first_delivery_to_be_answered = DeliveryFactory(track=True)
        contact = {'name': 'Some name', 'phone': '098765433'}
        first_delivery_to_be_answered.build_contact = MagicMock(return_value=contact)
        self._schedule_run_for(first_delivery_to_be_answered)
        second_delivery_to_be_answered = DeliveryFactory(track=True)
        self._schedule_run_for(second_delivery_to_be_answered)

        data = {
            'runnable': first_delivery_to_be_answered.id, 'answers': [
                {'question_label': 'deliveryReceived', 'value': 'Yes'}]
        }

        next_run = RunQueue.objects.filter(
            Q(contact_person_id=second_delivery_to_be_answered.contact_person_id) & Q(
                status='not_started')).order_by(
            '-run_delay').first()
        self.client.post(ENDPOINT_URL, data=json.dumps(data), content_type='application/json')

        first_runs = Run.objects.filter(runnable=first_delivery_to_be_answered)
        next_run = RunQueue.objects.get(id=next_run.id)

        self.assertEqual(len(first_runs), 2)
        self.assertEqual(next_run.status, 'started')
        self.assertTrue(self.mock_distribution_alert_raise.delay.called)

    def _get_answer_for(self, answer_type, delivery_id, question_label):
        return answer_type.objects.filter(run__runnable=delivery_id, question__label=question_label).first()

    def _schedule_run_for(self, runnable):
        if runnable.completed_run() is None:
            if Run.has_scheduled_run(runnable.contact_person_id):
                RunQueue.enqueue(runnable, 0)
            else:
                contact = runnable.build_contact()
                task = '231x31231231'
                Run.objects.create(scheduled_message_task_id=task, runnable=runnable,
                                   status=Run.STATUS.scheduled, phone=contact['phone'] if contact else None)

    def __get_current_date(self):
        return datetime.datetime.strftime(datetime.datetime.now().date(), '%Y-%m-%d')

    def test_unicef_admin_should_not_have_permission_to_create_web_answer(self):
        self.log_and_assert_create_web_answer_permission(self.log_unicef_admin_in, HTTP_403_FORBIDDEN)

    def test_unicef_editor_should_not_have_permission_to_create_web_answer(self):
        self.log_and_assert_create_web_answer_permission(self.log_unicef_editor_in, HTTP_403_FORBIDDEN)

    def test_unicef_viewer_should_not_have_permission_to_create_web_answer(self):
        self.log_and_assert_create_web_answer_permission(self.log_unicef_viewer_in, HTTP_403_FORBIDDEN)

    @override_settings(CELERY_LIVE=True)
    @patch('eums.services.contact_service.ContactService.get', mock_get)
    @patch('eums.services.flow_scheduler.distribution_alert_raise', mock_distribution_alert_raise)
    def test_ip_editor_should_have_permission_to_create_web_answer(self):
        self.log_and_assert_create_web_answer_permission(self.log_ip_editor_in, HTTP_201_CREATED)
        self.assertTrue(self.mock_distribution_alert_raise.delay.called)

    def test_ip_viewer_should_not_have_permission_to_create_web_answer(self):
        self.log_and_assert_create_web_answer_permission(self.log_ip_viewer_in, HTTP_403_FORBIDDEN)

    def log_and_assert_create_web_answer_permission(self, log_func, expected_status_code):
        log_func()
        self.setup_flow_with_questions(Flow.Label.WEB)
        web_flow = Flow.objects.filter(label=Flow.Label.WEB).first()
        NumericQuestionFactory(label='quantityDelivered', flow=web_flow)

        node = DeliveryNodeFactory()
        request_body = {
            'runnable': node.id, 'answers': [
                {'question_label': 'deliveryReceived', 'value': 'Yes'},
                {'question_label': 'quantityDelivered', 'value': '2'}
            ]}

        response = self.client.post(ENDPOINT_URL, data=json.dumps(request_body), content_type='application/json')
        self.assertEqual(response.status_code, expected_status_code)
