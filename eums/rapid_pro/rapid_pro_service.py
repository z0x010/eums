import json
import requests
from celery.utils.log import get_task_logger
from django.conf import settings
from eums.models import Flow, Question
from eums.rapid_pro.exception.rapid_pro_exception import FlowLabelNonExistException, QuestionLabelNonExistException
from eums.rapid_pro.flow_request_template import FlowRequestTemplate
from eums.rapid_pro.in_memory_cache import InMemoryCache

HEADER = {'Authorization': 'Token %s' % settings.RAPIDPRO_API_TOKEN, "Content-Type": "application/json"}

logger = get_task_logger(__name__)


class RapidProService(object):
    def __init__(self):
        super(RapidProService, self).__init__()
        self.cache = InMemoryCache()

    def create_run(self, contact, flow, item, sender):
        payload = FlowRequestTemplate().build(phone=contact['phone'], flow=self.flow_id(flow),
                                              sender=sender, item=item,
                                              contact_name="%s %s" % (contact['firstName'], contact['lastName']))

        logger.info("payload %s" % json.dumps(payload))

        if settings.RAPIDPRO_LIVE:
            response = requests.post(settings.RAPIDPRO_URLS['RUNS'], data=json.dumps(payload), headers=HEADER)
            logger.info("Response from RapidPro: %s, %s" % (response.status_code, response.json()))

    def question(self, question_uuid):
        self.__sync_if_required()

        if question_uuid not in self.cache.question_label_mapping:
            raise QuestionLabelNonExistException()

        return Question.objects.filter(label=self.cache.question_label_mapping[question_uuid]).first()

    def flow(self, flow_id):
        self.__sync_if_required()

        if flow_id not in self.cache.flow_label_mapping:
            raise FlowLabelNonExistException()

        return Flow.objects.filter(label__in=self.cache.flow_label_mapping[flow_id]).first()

    def flow_id(self, flow):
        self.__sync_if_required()

        for flow_id, labels in self.cache.flow_label_mapping.iteritems():
            if flow.label in labels:
                return flow_id

        raise FlowLabelNonExistException()

    def __sync_if_required(self):
        if self.cache.expired:
            self.__sync()

    def __sync(self):
        response = requests.get(settings.RAPIDPRO_URLS['FLOWS'], headers=HEADER)
        if response.status_code == 200:
            self.cache.invalidate()
            flows = response.json()['results']
            self.cache.update(
                flow_label_mapping={rapid['flow']: rapid['labels'] for rapid in flows if len(rapid['labels']) > 0})
            self.cache.update(
                question_label_mapping=self.__question_mapping(flows))

    def __question_mapping(self, flows):
        result = {}
        for rapid in flows:
            result.update({ruleset['node']: ruleset['label'] for ruleset in rapid['rulesets']})
        return result


rapid_pro_service = RapidProService()