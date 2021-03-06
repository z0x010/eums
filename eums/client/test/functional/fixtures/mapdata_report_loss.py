from eums.models import Consignee, DistributionPlanNode
from eums.test.factories.arc_factory import ArcFactory
from eums.test.factories.consignee_item_factory import ConsigneeItemFactory
from eums.test.factories.delivery_factory import DeliveryFactory
from eums.test.factories.delivery_node_factory import DeliveryNodeFactory
from eums.test.factories.item_factory import ItemFactory
from eums.test.factories.purchase_order_item_factory import PurchaseOrderItemFactory

consignee_wakiso = Consignee.objects.get(name='WAKISO DHO')

item = ItemFactory(description='Three-pronged power cables')
order_item = PurchaseOrderItemFactory(item=item)
order_item_2 = PurchaseOrderItemFactory(item=item)
delivery_one = DeliveryFactory(confirmed=True)
delivery_two = DeliveryFactory(confirmed=True)
delivery_three = DeliveryFactory(confirmed=True)
deliver_node_one = DeliveryNodeFactory(
        item=order_item,
        consignee=consignee_wakiso,
        distribution_plan=delivery_one,
        acknowledged=30,
        tree_position=DistributionPlanNode.IMPLEMENTING_PARTNER)
deliver_node_two = DeliveryNodeFactory(
        item=order_item,
        consignee=consignee_wakiso,
        distribution_plan=delivery_two,
        acknowledged=20,
        tree_position=DistributionPlanNode.IMPLEMENTING_PARTNER)
deliver_node_three = DeliveryNodeFactory(
        item=order_item_2,
        consignee=consignee_wakiso,
        distribution_plan=delivery_three,
        acknowledged=10,
        tree_position=DistributionPlanNode.IMPLEMENTING_PARTNER)

ArcFactory(quantity=30, source=None, target=deliver_node_one)
ArcFactory(quantity=20, source=None, target=deliver_node_two)
ArcFactory(quantity=10, source=None, target=deliver_node_three)

ConsigneeItemFactory(
    item=item,
    amount_received=60,
    consignee=consignee_wakiso,
    deliveries=[deliver_node_one.id, deliver_node_two.id, deliver_node_three.id])
