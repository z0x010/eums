import ast
import logging

from django.http.response import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from eums import settings

from eums.models import Run, RunQueue, Question
from eums.rapid_pro.rapid_pro_service import rapid_pro_service
from eums.services.flow_scheduler import schedule_run_for
from eums.services.response_alert_handler import ResponseAlertHandler

logger = logging.getLogger(__name__)


@csrf_exempt
def hook(request):
    logger.info("************Access web hook***********")
    try:
        params = request.POST
        logger.info("param=%s" % params)
        flow = rapid_pro_service.flow(params['flow_uuid'])
        logger.info("flow uuid=%s" % params['flow_uuid'])
        logger.info("flow=%s" % flow)
        run = Run.objects.filter(Q(phone=params['phone']) & ~Q(scheduled_message_task_id='Web') & (
            Q(status=Run.STATUS.scheduled) | Q(status=Run.STATUS.completed))).order_by('-id').first()
        logger.info("run=%s" % run)
        answer = _save_answer(flow, params, run)
        logger.info("answer=%s" % answer)

        if flow.is_temp_ended(answer) or flow.is_final_ended(answer):
            run.update_status(Run.STATUS.completed)
            run_delay = settings.TEMP_DELIVERY_BUFFER_IN_SECONDS if flow.is_temp_ended(answer) else \
                settings.DELIVERY_BUFFER_IN_SECONDS
            _raise_alert(params, run.runnable)
            _dequeue_next_run(run.runnable.contact_person_id, run_delay)

        if flow.is_optional_ended(answer):
            run_delay = settings.DELIVERY_BUFFER_IN_SECONDS
            _reschedule_next_run(run.phone, run_delay)

        logger.info("save answer successfully")
        return HttpResponse(status=200)

    except (StandardError, Exception), e:
        logger.error('Exception occurs while access web hook, detail information: %s' % e.message)
        logger.error(e)
        return HttpResponse(status=200)


def _save_answer(flow, params, run):
    answer_values = ast.literal_eval(params['values'])
    logger.info("answer_values=%s" % answer_values)
    latest_answer = answer_values[-1]
    logger.info("latest_answer=%s" % latest_answer)
    question = Question.objects.filter(flow=flow, label=latest_answer['label']).first().get_subclass_instance()
    logger.info("question=%s" % question)
    return question.create_answer(params, run)


def _raise_alert(params, runnable):
    answer_values = ast.literal_eval(params['values'])
    handler = ResponseAlertHandler(runnable, answer_values)
    handler.process()


def _dequeue_next_run(contact_person_id, run_delay):
    next_run_queue = RunQueue.dequeue(contact_person_id=contact_person_id)
    if next_run_queue:
        schedule_run_for(next_run_queue.runnable, run_delay)
        next_run_queue.update_status(RunQueue.STATUS.started)


def _reschedule_next_run(phone, run_delay):
    current_run = Run.objects.filter(Q(phone=phone) & (Q(status='scheduled') | Q(status='not_started'))).order_by(
        'modified').first()
    if current_run:
        schedule_run_for(current_run.runnable, run_delay)
