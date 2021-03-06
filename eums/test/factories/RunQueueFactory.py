from eums.test.factories.delivery_node_factory import DeliveryNodeFactory
import factory

from eums.models import RunQueue
from eums.test.helpers.fake_datetime import FakeDate


class RunQueueFactory(factory.DjangoModelFactory):
    class Meta:
        model = RunQueue

    runnable = factory.SubFactory(DeliveryNodeFactory)
    contact_person_id = 'b8f951a0-4d5a-11e4-9af8-0002a5d5c51b'
    run_delay = 0.0
    status = RunQueue.STATUS.not_started
    start_time = FakeDate.today()


