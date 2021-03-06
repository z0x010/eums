from eums.test.api.authorization.authenticated_api_test_case import AuthenticatedAPITestCase
from eums.test.config import BACKEND_URL
from eums.test.factories.answer_factory import MultipleChoiceAnswerFactory, NumericAnswerFactory
from eums.test.factories.delivery_node_factory import DeliveryNodeFactory
from eums.test.factories.item_factory import ItemFactory
from eums.test.factories.purchase_order_item_factory import PurchaseOrderItemFactory
from eums.test.factories.question_factory import MultipleChoiceQuestionFactory, NumericQuestionFactory
from eums.test.factories.run_factory import RunFactory
from eums.test.factories.sales_order_factory import SalesOrderFactory
from eums.test.factories.sales_order_item_factory import SalesOrderItemFactory


class DistributionPlanResponsesEndpointTest(AuthenticatedAPITestCase):
    def test_gets_all_response_for_node_consignee(self):
        multichoice_question = MultipleChoiceQuestionFactory(label='productReceived')
        yes = multichoice_question.option_set.first()
        numeric_question = NumericQuestionFactory(label='AmountReceived')

        salt = ItemFactory(description='Salt')

        sales_order = SalesOrderFactory()
        sales_order_item = SalesOrderItemFactory(item=salt, description='10 bags of salt', sales_order=sales_order)
        item = PurchaseOrderItemFactory(sales_order_item=sales_order_item)

        node = DeliveryNodeFactory(quantity=100, item=item)
        child_node_one = DeliveryNodeFactory(parents=[(node, 50)], item=item)
        child_node_two = DeliveryNodeFactory(parents=[(node, 50)], item=item)
        child_node_three = DeliveryNodeFactory(parents=[(child_node_one, 50)], item=item)

        run = RunFactory(runnable=node, status='completed')
        run_one = RunFactory(runnable=child_node_one, status='completed')
        run_two = RunFactory(runnable=child_node_two, status='completed')
        run_three = RunFactory(runnable=child_node_three, status='completed')
        NumericAnswerFactory(run=run, value=80, question=numeric_question)
        MultipleChoiceAnswerFactory(run=run_one,
                                    question=multichoice_question,
                                    value=yes)
        MultipleChoiceAnswerFactory(run=run_two,
                                    question=multichoice_question, value=yes)
        NumericAnswerFactory(run=run_three, value=80, question=numeric_question)

        self.maxDiff = None
        expected_data = {'node': node.consignee.name,
                         'children': [
                             {'node': child_node_one.consignee.name,
                              'children': [
                                  {
                                      'node': child_node_three.consignee.name,
                                      'children': [],
                                      'answers': {u'AmountReceived': u'80'}
                                  }
                              ],
                              'answers': {u'productReceived': u'UNCATEGORISED'}
                              },
                             {'node': child_node_two.consignee.name, 'children': [],
                              'answers': {u'productReceived': u'UNCATEGORISED'}
                              }
                         ],
                         'answers': {u'AmountReceived': u'80'}
                         }

        response_details_route = 'distribution-plan-responses/%s/sales_order_item/%s/'
        endpoint_url = BACKEND_URL + response_details_route % (node.consignee.id, item.id)

        response = self.client.get(endpoint_url)

        self.assertDictContainsSubset({'node': expected_data['node']}, response.data)
        self.assertDictContainsSubset({'answers': expected_data['answers']}, response.data)
        self.assertItemsEqual(expected_data['children'], response.data['children'])
