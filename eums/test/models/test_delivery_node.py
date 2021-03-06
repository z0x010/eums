from datetime import datetime
from unittest import TestCase

from django.db import IntegrityError
from mock import patch, MagicMock

from eums.models import DistributionPlanNode as DeliveryNode, SalesOrder, DistributionPlan, Arc, PurchaseOrderItem, \
    Item, Consignee, Alert, Flow
from eums.test.factories.answer_factory import MultipleChoiceAnswerFactory
from eums.test.factories.arc_factory import ArcFactory
from eums.test.factories.consignee_factory import ConsigneeFactory
from eums.test.factories.delivery_factory import DeliveryFactory
from eums.test.factories.delivery_node_factory import DeliveryNodeFactory
from eums.test.factories.delivery_node_loss_factory import DeliveryNodeLossFactory
from eums.test.factories.flow_factory import FlowFactory
from eums.test.factories.item_factory import ItemFactory
from eums.test.factories.option_factory import OptionFactory
from eums.test.factories.purchase_order_factory import PurchaseOrderFactory
from eums.test.factories.purchase_order_item_factory import PurchaseOrderItemFactory
from eums.test.factories.question_factory import MultipleChoiceQuestionFactory
from eums.test.factories.release_order_factory import ReleaseOrderFactory
from eums.test.factories.release_order_item_factory import ReleaseOrderItemFactory
from eums.test.factories.run_factory import RunFactory


class DeliveryNodeTest(TestCase):
    def setUp(self):
        self.clean_up()

    def tearDown(self):
        self.clean_up()

    def test_should_create_itself_with_any_type_of_order_item(self):
        purchase_order_item = PurchaseOrderItemFactory()
        release_order_item = ReleaseOrderItemFactory()

        node_with_po_item = DeliveryNodeFactory(item=purchase_order_item)
        node_with_ro_item = DeliveryNodeFactory(item=release_order_item)

        self.assertEqual(DeliveryNode.objects.get(item=purchase_order_item), node_with_po_item)
        self.assertEqual(DeliveryNode.objects.get(item=release_order_item), node_with_ro_item)

    def test_should_create_itself_with_parent_as_list_of_parent_quantity_tuples(self):
        parent_one = DeliveryNodeFactory(quantity=100)
        parent_two = DeliveryNodeFactory(quantity=40)

        node = DeliveryNodeFactory(parents=[(parent_one, 50), (parent_two, 40)])

        self.assertEqual(node.quantity_in(), 90)
        self.assertEqual(parent_one.quantity_out(), 50)
        self.assertEqual(parent_two.quantity_out(), 40)

    def test_should_save_node_when_quantity_is_not_specified_but_parents_are(self):
        parent = DeliveryNodeFactory(consignee=ConsigneeFactory())
        node = DeliveryNode.objects.create(parents=[(parent, 5)],
                                           consignee=ConsigneeFactory(),
                                           item=PurchaseOrderItemFactory(),
                                           tree_position=Flow.Label.MIDDLE_MAN,
                                           location='Jinja',
                                           contact_person_id='89878528-864A-4320-8426-1DB5C9A5A337',
                                           delivery_date=datetime.today())
        self.assertEqual(DeliveryNode.objects.get(pk=node.id), node)

    def test_should_compute_quantity_in_from_incoming_arcs(self):
        node = DeliveryNodeFactory(quantity=0)
        ArcFactory(source=None, target=node, quantity=50)
        self.assertEqual(node.quantity_in(), 50)

        ArcFactory(source=None, target=node, quantity=50)
        self.assertEqual(node.quantity_in(), 100)

        Arc.objects.all().delete()
        self.assertEqual(node.quantity_in(), 0)

    def test_should_compute_quantity_out_from_outgoing_arcs(self):
        node_one = DeliveryNodeFactory(quantity=50)
        node_two = DeliveryNodeFactory()
        ArcFactory(source=node_one, target=node_two, quantity=50)
        self.assertEqual(node_one.quantity_out(), 50)
        self.assertEqual(node_two.quantity_out(), 0)

        Arc.objects.all().delete()
        self.assertEqual(node_one.quantity_out(), 0)

    def test_should_create_null_source_arc_for_node_if_parents_are_not_specified_but_quantity_is(self):
        root_node = DeliveryNodeFactory(quantity=70)
        arc = Arc.objects.filter(target=root_node).first()
        self.assertEqual(arc.quantity, 70)
        self.assertIsNone(arc.source)

    def test_should_allow_zero_quantity_nodes_to_be_saved(self):
        node = DeliveryNodeFactory(quantity=0)
        self.assertEqual(node.id, DeliveryNode.objects.get(pk=node.id).id)

    def test_should_not_create_node_when_parents_and_quantity_are_not_specified(self):
        create_node = lambda: DeliveryNodeFactory(quantity=None, parents=None)
        self.assertRaises(IntegrityError, create_node)

    def test_should_create_an_arc_for_each_parent_specified_when_creating_a_node(self):
        parent_one = DeliveryNodeFactory()
        parent_two = DeliveryNodeFactory()

        node = DeliveryNodeFactory(parents=[{'id': parent_one.id, 'quantity': 5}, {'id': parent_two.id, 'quantity': 8}])
        arc_quantities = [arc.quantity for arc in node.arcs_in.all()]
        arc_sources = [arc.source.id for arc in node.arcs_in.all()]

        self.assertEqual(node.arcs_in.count(), 2)
        self.assertIn(8, arc_quantities)
        self.assertIn(5, arc_quantities)
        self.assertIn(parent_one.id, arc_sources)
        self.assertIn(parent_two.id, arc_sources)

    def test_should_list_all_root_nodes_for_a_delivery(self):
        delivery = DeliveryFactory()
        root_node_one = DeliveryNodeFactory(distribution_plan=delivery)
        root_node_two = DeliveryNodeFactory(distribution_plan=delivery)
        child_node = DeliveryNodeFactory(distribution_plan=delivery, parents=[{'id': root_node_one.id, 'quantity': 5}])

        root_nodes = DeliveryNode.objects.root_nodes_for(delivery=delivery)
        self.assertEqual(root_nodes.count(), 2)

        root_node_ids = [node.id for node in root_nodes]
        self.assertIn(root_node_one.id, root_node_ids)
        self.assertIn(root_node_two.id, root_node_ids)
        self.assertNotIn(child_node.id, root_node_ids)

    def test_should_list_all_root_nodes(self):
        root_node_one = DeliveryNodeFactory(quantity=7)
        root_node_two = DeliveryNodeFactory(quantity=8)
        child_node = DeliveryNodeFactory(parents=[{'id': root_node_one.id, 'quantity': 5}])

        root_nodes = DeliveryNode.objects.root_nodes()
        self.assertEqual(root_nodes.count(), 2)

        root_node_ids = [node.id for node in root_nodes]
        self.assertIn(root_node_one.id, root_node_ids)
        self.assertIn(root_node_two.id, root_node_ids)
        self.assertNotIn(child_node.id, root_node_ids)

    def test_update_should_override_parents_when_parents_list_is_passed(self):
        node_one = DeliveryNodeFactory()
        node_two = DeliveryNodeFactory()

        node = DeliveryNodeFactory(parents=[{'id': node_one.id, 'quantity': 8}, {'id': node_two.id, 'quantity': 10}])
        self.assertEqual(node.quantity_in(), 18)

        node.parents = [{'id': node_one.id, 'quantity': 7}]
        node.save()
        self.assertEqual(node.quantity_in(), 7)

        node.parents = []
        node.save()
        self.assertEqual(node.quantity_in(), 0)

    def test_update_should_leave_parents_intact_if_parents_are_not_specified(self):
        node_one = DeliveryNodeFactory()
        node_two = DeliveryNodeFactory()

        node = DeliveryNodeFactory(parents=[{'id': node_one.id, 'quantity': 8}, {'id': node_two.id, 'quantity': 10}])

        node.location = 'Changed'
        node.save()
        self.assertEqual(node.quantity_in(), 18)
        self.assertEqual(node.location, 'Changed')

    def test_update_quantity_on_root_node_should_update_quantity(self):
        node = DeliveryNodeFactory(quantity=100)
        node.quantity = 50
        node.save()
        self.assertEqual(node.quantity_in(), 50)

    def test_update_quantity_to__zero_on_root_node(self):
        node = DeliveryNodeFactory(quantity=100)
        node.quantity = 0
        node.save()
        self.assertEqual(node.quantity_in(), 0)

    def test_should_ignore_updates_to_quantity_on_non_root_node(self):
        node_one = DeliveryNodeFactory()
        node = DeliveryNodeFactory(parents=[{'id': node_one.id, 'quantity': 7}])

        node.quantity = 50
        node.save()

        self.assertEqual(node.quantity_in(), 7)

    def test_should_ignore_quantity_on_update_if_parents_are_specified(self):
        node_one = DeliveryNodeFactory()

        node = DeliveryNodeFactory(quantity=0)

        node.parents = [{'id': node_one.id, 'quantity': 7}]
        node.quantity = 50
        node.save()
        self.assertEqual(node.quantity_in(), 7)

        node.parents = []
        node.save()
        self.assertEqual(node.quantity_in(), 0)

    def test_should_get_a_nodes_ip_from_the_root_node_of_the_node_delivery(self):
        delivery = DeliveryFactory()

        root_node = DeliveryNodeFactory(distribution_plan=delivery)
        self.assertEqual(root_node.get_ip(),
                         {'id': root_node.id, 'consignee': root_node.consignee, 'location': root_node.location})

        intermediary_node = DeliveryNodeFactory(distribution_plan=delivery, parents=[(root_node, 5)])
        self.assertEqual(intermediary_node.get_ip(),
                         {'id': root_node.id, 'consignee': root_node.consignee, 'location': root_node.location})

        leaf_node = DeliveryNodeFactory(parents=[(intermediary_node, 3)], distribution_plan=delivery)
        self.assertEqual(leaf_node.get_ip(),
                         {'id': root_node.id, 'consignee': root_node.consignee, 'location': root_node.location})

    def test_should_get_a_nodes_ip_from_the_root_node_of_its_first_parent(self):
        root_node = DeliveryNodeFactory()
        self.assertEqual(root_node.get_ip(),
                         {'id': root_node.id, 'consignee': root_node.consignee, 'location': root_node.location})

        second_parent = DeliveryNodeFactory()
        self.assertEqual(second_parent.get_ip(),
                         {'id': second_parent.id, 'consignee': second_parent.consignee,
                          'location': second_parent.location})

        first_level_child_node = DeliveryNodeFactory(parents=[(root_node, 2), (second_parent, 3)])
        self.assertEqual(first_level_child_node.get_ip(),
                         {'id': root_node.id, 'consignee': root_node.consignee, 'location': root_node.location})

        second_level_child_node = DeliveryNodeFactory(parents=[(first_level_child_node, 2)])
        self.assertEqual(second_level_child_node.get_ip(),
                         {'id': root_node.id, 'consignee': root_node.consignee, 'location': root_node.location})

    def test_should_get_sender_name(self):
        sender_name = 'Save the children'
        root_node = DeliveryNodeFactory(consignee=ConsigneeFactory(name=sender_name))
        self.assertEqual(root_node.sender_name(), 'UNICEF')

        node = DeliveryNodeFactory(parents=[(root_node, 5)])
        self.assertEqual(node.sender_name(), sender_name)

    def test_should_return_list_of_children(self):
        parent_node = DeliveryNodeFactory(quantity=100)
        child_one = DeliveryNodeFactory(parents=[(parent_node, 30)])
        child_two = DeliveryNodeFactory(parents=[(parent_node, 20)])

        children = parent_node.children()
        self.assertEqual(children.count(), 2)
        self.assertIn(child_one, children)
        self.assertIn(child_two, children)

    def test_should_get_root_nodes_for_an_order_item_list(self):
        purchase_order_item_one = PurchaseOrderItemFactory()
        purchase_order_item_two = PurchaseOrderItemFactory()
        root_node_one = DeliveryNodeFactory(item=purchase_order_item_one)
        root_node_two = DeliveryNodeFactory(item=purchase_order_item_two)
        DeliveryNodeFactory(item=purchase_order_item_one, parents=[(root_node_one, 5)])

        item_list = PurchaseOrderItem.objects.filter(pk__in=[purchase_order_item_one.pk, purchase_order_item_two.pk])

        root_nodes = DeliveryNode.objects.root_nodes_for(order_items=item_list)

        self.assertEqual(root_nodes.count(), 2)
        self.assertIn(root_node_one, root_nodes)
        self.assertIn(root_node_two, root_nodes)

    def test_should_not_save_tracked_nodes_with_quantity_delivered_equal_to_zero(self):
        self.assertEqual(DeliveryNode.objects.count(), 0)
        node = DeliveryNodeFactory(quantity=0, track=True)
        self.assertEqual(DeliveryNode.objects.count(), 0)
        self.assertTrue(isinstance(node, DeliveryNode))

    def test_should_delete_zero_quantity_nodes_on_update_with_track_true(self):
        node = DeliveryNodeFactory(quantity=0, track=False)
        self.assertEqual(DeliveryNode.objects.count(), 1)

        node.track = True
        returned_node = node.save()
        self.assertEqual(DeliveryNode.objects.count(), 0)
        self.assertTrue(isinstance(returned_node, DeliveryNode))

    def test_should_delete_tracked_node_on_update_with_zero_quantity(self):
        node = DeliveryNodeFactory(quantity=10, track=True)
        self.assertEqual(DeliveryNode.objects.count(), 1)

        node.quantity = 0
        returned_node = node.save()
        self.assertEqual(DeliveryNode.objects.count(), 0)
        self.assertTrue(isinstance(returned_node, DeliveryNode))

    def test_should_get_all_nodes_delivered_by_a_consignee_for_a_specific_item(self):
        item = ItemFactory()
        consignee = ConsigneeFactory()

        node_one = DeliveryNodeFactory(item=PurchaseOrderItemFactory(item=item), consignee=consignee)
        child_node_one = DeliveryNodeFactory(item=PurchaseOrderItemFactory(item=item), parents=[(node_one, 10)])

        node_two = DeliveryNodeFactory(item=PurchaseOrderItemFactory(item=item), consignee=consignee)
        child_node_two = DeliveryNodeFactory(item=PurchaseOrderItemFactory(item=item), parents=[(node_two, 10)])

        other_item_node_to_consignee = DeliveryNodeFactory(consignee=consignee, quantity=200)
        non_item_child_node = DeliveryNodeFactory(parents=[(other_item_node_to_consignee, 100)])

        non_consignee_child_node = DeliveryNodeFactory(item=PurchaseOrderItemFactory(item=item))

        returned_nodes = DeliveryNode.objects.delivered_by_consignee(consignee, item)

        self.assertItemsEqual([child_node_one, child_node_two], returned_nodes)
        self.assertNotIn(non_consignee_child_node, returned_nodes)
        self.assertNotIn(non_item_child_node, returned_nodes)

    def test_should_not_get_duplicate_nodes_when_delivery_comes_from_multiple_nodes_of_same_po(self):
        item = ItemFactory()
        consignee = ConsigneeFactory()
        po = PurchaseOrderFactory()

        node_one = DeliveryNodeFactory(item=PurchaseOrderItemFactory(item=item, purchase_order=po), consignee=consignee)
        node_two = DeliveryNodeFactory(item=PurchaseOrderItemFactory(item=item, purchase_order=po), consignee=consignee)
        child_node_one = DeliveryNodeFactory(item=PurchaseOrderItemFactory(item=item),
                                             parents=[(node_one, 10), (node_two, 5)])

        returned_nodes = DeliveryNode.objects.delivered_by_consignee(consignee, item)

        self.assertItemsEqual([child_node_one], returned_nodes)

    def test_should_confirm_delivery_from_node_when_all_nodes_in_delivery_are_answered(self):
        delivery = DeliveryFactory()
        node_one = DeliveryNodeFactory(distribution_plan=delivery)
        node_two = DeliveryNodeFactory(distribution_plan=delivery)

        item_question = MultipleChoiceQuestionFactory(label='itemReceived')
        option_one = OptionFactory(text='Yes', question=item_question)
        option_two = OptionFactory(text='No', question=item_question)

        node_one.confirm()
        self.assertFalse(delivery.confirmed)

        MultipleChoiceAnswerFactory(run=RunFactory(runnable=node_one), question=item_question, value=option_one)
        node_one.confirm()
        self.assertFalse(delivery.confirmed)

        MultipleChoiceAnswerFactory(run=RunFactory(runnable=node_two), question=item_question, value=option_two)
        node_one.confirm()
        self.assertTrue(delivery.confirmed)

    def test_should_return_node_with_order_number(self):
        po = PurchaseOrderFactory(order_number=123456)
        po_item = PurchaseOrderItemFactory(purchase_order=po)
        node = DeliveryNodeFactory(item=po_item)

        self.assertEqual(node.number(), 123456)

    def test_should_return_delivery_with_waybill_number(self):
        release_order = ReleaseOrderFactory(waybill=98765)
        release_order_item = ReleaseOrderItemFactory(release_order=release_order)
        node = DeliveryNodeFactory(item=release_order_item)

        self.assertEqual(node.number(), 98765)

    def test_should_return_delivery_type_purchase_order(self):
        po_item = PurchaseOrderItemFactory()
        node = DeliveryNodeFactory(item=po_item)

        self.assertEqual(node.type(), 'Purchase Order')

    def test_should_return_delivery_type_waybill(self):
        ro_item = ReleaseOrderItemFactory()
        node = DeliveryNodeFactory(item=ro_item)

        self.assertEqual(node.type(), 'Waybill')

    def test_should_set_balance_to_zero_when_no_acknowledged(self):
        node = DeliveryNodeFactory(quantity=100)
        self.assertEqual(node.balance, 0)

    def test_should_set_balance_to_acknowledged(self):
        node = DeliveryNodeFactory(quantity=100, acknowledged=73)
        self.assertEqual(node.balance, 73)

    def test_should_update_balance_when_node_quantities_change(self):
        node = DeliveryNodeFactory(quantity=100, acknowledged=100)
        child = DeliveryNodeFactory(parents=[(node, 50)])

        self.assertEqual(child.balance, 50)
        self.assertEqual(DeliveryNode.objects.get(id=node.id).balance, 50)

        child_two = DeliveryNodeFactory(parents=[(node, 40)])
        self.assertEqual(child_two.balance, 40)
        self.assertEqual(DeliveryNode.objects.get(id=node.id).balance, 10)

        child_two.delete()
        self.assertEqual(DeliveryNode.objects.get(id=node.id).balance, 50)

    def test_should_take_losses_into_account_when_calculating_balance(self):
        node = DeliveryNodeFactory(acknowledged=50)
        DeliveryNodeLossFactory(quantity=10, delivery_node=node)
        node.save()
        self.assertEqual(node.balance, 40)

    def test_should_take_multiple_losses_into_account_when_calculating_balance(self):
        node = DeliveryNodeFactory(acknowledged=50)
        DeliveryNodeLossFactory(quantity=10, delivery_node=node)
        DeliveryNodeLossFactory(quantity=25, delivery_node=node)
        node.save()
        self.assertEqual(node.balance, 15)

    def test_should_set_total_value_on_single_parent_node_when_saved(self):
        po_item = PurchaseOrderItemFactory(quantity=100, value=1000.0)
        node = DeliveryNodeFactory(quantity=80, item=po_item)
        self.assertEqual(node.total_value, 800)

    def test_should_set_total_value_on_multiple_parent_node_when_saved(self):
        parent_one = DeliveryNodeFactory(quantity=100)
        parent_two = DeliveryNodeFactory(quantity=100)
        po_item = PurchaseOrderItemFactory(quantity=100, value=1000.0)

        node = DeliveryNodeFactory(parents=[(parent_one, 50), (parent_two, 40)], item=po_item)

        self.assertEqual(node.total_value, 900)

    def test_should_update_parent_total_value_if_root_node_when_saved(self):
        po_item = PurchaseOrderItemFactory(quantity=100, value=1000.0)
        parent = DeliveryFactory()
        DeliveryNodeFactory(quantity=80, item=po_item, distribution_plan=parent)
        self.assertEqual(parent.total_value, 800)

        DeliveryNodeFactory(quantity=90, item=po_item, distribution_plan=parent)
        self.assertEqual(parent.total_value, 1700)

    def test_should_save_acknowledged_quantity(self):
        node = DeliveryNodeFactory(quantity=100, acknowledged=100)
        child = DeliveryNodeFactory(parents=[(node, 50)])

        self.assertEqual(node.acknowledged, 100)
        self.assertEqual(child.acknowledged, 0)
        self.assertEqual(child.balance, 50)

    def test_should_know_its_order_number(self):
        purchase_order = PurchaseOrderFactory(order_number=200)
        po_node = DeliveryNodeFactory(item=PurchaseOrderItemFactory(purchase_order=purchase_order))
        self.assertEqual(po_node.order_number(), 200)

        release_order = ReleaseOrderFactory(waybill=300)
        ro_node = DeliveryNodeFactory(item=ReleaseOrderItemFactory(release_order=release_order))
        self.assertEqual(ro_node.order_number(), 300)

    def test_delivery_node_knows_its_item_description(self):
        purchase_order = PurchaseOrderFactory(order_number=200)
        description = "some description"
        item = ItemFactory(description=description)
        po_node = DeliveryNodeFactory(item=PurchaseOrderItemFactory(purchase_order=purchase_order, item=item))

        self.assertEqual(po_node.item_description(), description)

    @patch('eums.models.runnable.Runnable.build_contact')
    def test_should_create_alert_with_item_description(self, mock_contact):
        purchase_order = PurchaseOrderFactory(order_number=5678)
        description = "some description"
        item = ItemFactory(description=description)
        purchase_order_item = PurchaseOrderItemFactory(purchase_order=purchase_order, item=item)
        consignee = ConsigneeFactory(name="Liverpool FC")

        contact_person_id = 'some_id'
        contact = {u'_id': contact_person_id,
                   u'firstName': u'Chris',
                   u'lastName': u'George',
                   u'phone': u'+256781111111'}
        mock_contact.return_value = contact

        node = DeliveryNodeFactory(item=purchase_order_item, consignee=consignee, contact_person_id=contact_person_id)

        node.create_alert(Alert.ISSUE_TYPES.not_received)

        alerts = Alert.objects.filter(consignee_name="Liverpool FC", order_number=5678)
        self.assertEqual(alerts.count(), 1)
        alert = alerts.first()
        self.assertEqual(alert.order_type, PurchaseOrderItem.PURCHASE_ORDER)
        self.assertEqual(alert.order_number, 5678)
        self.assertEqual(alert.consignee_name, "Liverpool FC")
        self.assertEqual(alert.contact['contact_name'], "Chris George")
        self.assertEqual(alert.issue, Alert.ISSUE_TYPES.not_received)
        self.assertFalse(alert.is_resolved)
        self.assertIsNone(alert.remarks)
        self.assertEqual(alert.runnable, node)
        self.assertEqual(alert.item_description, description)

    def test_node_end_user(self):
        node = DeliveryNode(tree_position=Flow.Label.END_USER)

        self.assertTrue(node.is_end_user())

        node.tree_position = Flow.Label.MIDDLE_MAN

        self.assertFalse(node.is_end_user())

    def test_node_flow_is_middleman_for_non_end_user_node(self):
        middleman_flow = FlowFactory(label=Flow.Label.MIDDLE_MAN)
        runnable = DeliveryNodeFactory(tree_position=Flow.Label.IMPLEMENTING_PARTNER)

        self.assertEqual(runnable.flow(), middleman_flow)

        runnable.tree_position = Flow.Label.MIDDLE_MAN

        self.assertEqual(runnable.flow(), middleman_flow)

    def test_node_flow_is_end_user_for_end_user_node(self):
        end_user_flow = FlowFactory(label=Flow.Label.END_USER)
        runnable = DeliveryNodeFactory(tree_position=Flow.Label.END_USER)

        self.assertEqual(runnable.flow(), end_user_flow)

    def test_nodes_should_be_saved_with_their_ip(self):
        consignee = ConsigneeFactory()
        root = DeliveryNodeFactory(consignee=consignee, quantity=100)
        child = DeliveryNodeFactory(parents=[(root, 60)])
        grandchild = DeliveryNodeFactory(parents=[(child, 30)])

        self.assertEqual(root.ip, consignee)
        self.assertEqual(child.ip, consignee)
        self.assertEqual(grandchild.ip, consignee)

    def test_node_should_calculate_total_value_from_order_item_value(self):
        po_item_one = PurchaseOrderItemFactory(value=400, quantity=200)
        po_item_two = PurchaseOrderItemFactory(value=600, quantity=100)

        node_one = DeliveryNodeFactory(item=po_item_one, quantity=50)
        node_two = DeliveryNodeFactory(item=po_item_two, quantity=50)

        self.assertEqual(node_one.total_value, 100)
        self.assertEqual(node_two.total_value, 300)

    def should_set_programme_on_root_node(self):
        delivery = DeliveryFactory()
        node = DeliveryNodeFactory(distribution_plan=delivery)
        self.assertEqual(delivery.programme, node.programme)

    def should_set_programme_on_none_root_node(self):
        delivery = DeliveryFactory()
        consignee = ConsigneeFactory()

        root = DeliveryNodeFactory(consignee=consignee, quantity=100, distribution_plan=delivery)
        child = DeliveryNodeFactory(parents=[(root, 60)], distribution_plan=None)
        grandchild = DeliveryNodeFactory(parents=[(child, 30)], distribution_plan=None)
        second_grand_child = DeliveryNodeFactory(parents=[(grandchild, 30)], distribution_plan=None)

        self.assertEqual(child.programme, delivery.programme)
        self.assertEqual(grandchild.programme, delivery.programme)
        self.assertEqual(second_grand_child.programme, delivery.programme)

    def test_node_should_its_lineage_without_unicef_root_nodes(self):
        consignee = ConsigneeFactory()
        delivery = DeliveryFactory(consignee=consignee)

        root_one = DeliveryNodeFactory(consignee=consignee, quantity=100, distribution_plan=delivery)
        root_two = DeliveryNodeFactory(consignee=consignee, quantity=100, distribution_plan=delivery)
        child = DeliveryNodeFactory(parents=[(root_one, 60), (root_two, 50)], distribution_plan=None,
                                    tree_position=DeliveryNode.IMPLEMENTING_PARTNER)
        grand_child_one = DeliveryNodeFactory(parents=[(child, 30)], distribution_plan=None,
                                              tree_position=DeliveryNode.MIDDLE_MAN)
        grand_child_two = DeliveryNodeFactory(parents=[(child, 20)], distribution_plan=None,
                                              tree_position=DeliveryNode.MIDDLE_MAN)
        self.assertItemsEqual(grand_child_one.lineage(), [child])
        self.assertItemsEqual(grand_child_two.lineage(), [child])

        great_grand_child_one = DeliveryNodeFactory(parents=[(grand_child_one, 20)], distribution_plan=None,
                                                    tree_position=DeliveryNode.END_USER)
        great_grand_child_two = DeliveryNodeFactory(parents=[(grand_child_two, 10)], distribution_plan=None,
                                                    tree_position=DeliveryNode.END_USER)

        self.assertItemsEqual(great_grand_child_one.lineage(), [child, grand_child_one])
        self.assertItemsEqual(great_grand_child_two.lineage(), [child, grand_child_two])

    def test_node_should_get_its_parents_distribution_plan_when_for_single_parent(self):
        purchaser_order_item = PurchaseOrderItemFactory()
        delivery_one = DeliveryFactory()
        delivery_two = DeliveryFactory()

        root_one = DeliveryNodeFactory(distribution_plan=delivery_one, item=purchaser_order_item, quantity=50)
        root_two = DeliveryNodeFactory(distribution_plan=delivery_two, item=purchaser_order_item, quantity=60)

        child_one = DeliveryNodeFactory(parents=[(root_one, 10)], distribution_plan=None)
        child_two = DeliveryNodeFactory(parents=[(root_two, 20)], distribution_plan=None)
        child_three = DeliveryNodeFactory(parents=[(root_one, 10), (root_two, 10)], distribution_plan=None)

        self.assertEqual(child_one.distribution_plan, delivery_one)
        self.assertEqual(child_two.distribution_plan, delivery_two)
        self.assertIsNone(child_three.distribution_plan)

        grand_child_one = DeliveryNodeFactory(parents=[(child_one, 5)], distribution_plan=None)
        grand_child_two = DeliveryNodeFactory(parents=[(child_two, 20)], distribution_plan=None)
        grand_child_three = DeliveryNodeFactory(parents=[(child_three, 15)], distribution_plan=None)

        self.assertEqual(grand_child_one.distribution_plan, delivery_one)
        self.assertEqual(grand_child_two.distribution_plan, delivery_two)
        self.assertIsNone(grand_child_three.distribution_plan)

    def test_should_create_a_loss_associated_with_particular_node(self):
        delivery_node = DeliveryNodeFactory()
        DeliveryNodeLossFactory(quantity=10, remark='building fire', delivery_node=delivery_node)
        DeliveryNodeLossFactory(quantity=5, remark='building down', delivery_node=delivery_node)

        self.assertEqual(delivery_node.losses.count(), 2)
        self.assertEqual(delivery_node.losses.first().quantity, 10)
        self.assertEqual(delivery_node.losses.first().remark, 'building fire')
        self.assertEqual(delivery_node.losses.last().quantity, 5)
        self.assertEqual(delivery_node.losses.last().remark, 'building down')

    def test_should_update_track_status_if_assign_to_self(self):
        original_method = DeliveryNode.append_positive_answers
        DeliveryNode.append_positive_answers = MagicMock(return_value=None)
        distribution_plan = DeliveryFactory(track=True)
        parent_one = DeliveryNodeFactory(distribution_plan=distribution_plan, quantity=100)
        node = DeliveryNodeFactory(distribution_plan=distribution_plan, parents=[(parent_one, 88)],
                                   is_assigned_to_self=True)

        self.assertTrue(distribution_plan.track)
        self.assertFalse(node.track)
        DeliveryNode.append_positive_answers = original_method

    def clean_up(self):
        SalesOrder.objects.all().delete()
        Item.objects.all().delete()
        Consignee.objects.all().delete()
        Flow.objects.all().delete()
        DistributionPlan.objects.all().delete()
        DeliveryNode.objects.all().delete()
