import logging

from django.db import transaction
from rest_framework import serializers
from rest_framework import status
from rest_framework.decorators import detail_route
from rest_framework.permissions import DjangoModelPermissions
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter
from rest_framework.viewsets import ModelViewSet

from eums.api.standard_pagination import StandardResultsSetPagination
from eums.models import DistributionPlanNode as DeliveryNode, UserProfile
from eums.permissions.distribution_plan_node_permissions import DistributionPlanNodePermissions

logger = logging.getLogger(__name__)


class DistributionPlanNodeSerialiser(serializers.ModelSerializer):
    quantity = serializers.IntegerField(write_only=True, required=False)
    parents = serializers.ListField(required=False)
    balance = serializers.IntegerField(read_only=True, required=False)
    consignee_name = serializers.CharField(read_only=True, source='consignee.name')
    item_description = serializers.CharField(read_only=True, source='item.item.description')
    order_type = serializers.CharField(read_only=True, source='type')

    class Meta:
        model = DeliveryNode
        fields = ('id', 'distribution_plan', 'location', 'consignee', 'tree_position', 'parents', 'quantity_in',
                  'contact_person_id', 'item', 'delivery_date', 'remark', 'track', 'quantity', 'quantity_out',
                  'balance', 'has_children', 'consignee_name', 'item_description', 'order_number', 'order_type',
                  'time_limitation_on_distribution', 'additional_remarks', 'is_assigned_to_self')


class DistributionPlanNodeViewSet(ModelViewSet):
    permission_classes = (DjangoModelPermissions, DistributionPlanNodePermissions)
    queryset = DeliveryNode.objects.all()
    serializer_class = DistributionPlanNodeSerialiser
    pagination_class = StandardResultsSetPagination
    search_fields = ('location', 'consignee__name', 'delivery_date')
    filter_fields = ('consignee', 'item', 'distribution_plan', 'contact_person_id', 'item__item')

    def get_queryset(self):
        user_profile = UserProfile.objects.filter(user_id=self.request.user.id).first()

        logger.info('user profile = %s' % user_profile)
        logger.info('user id = %s' % self.request.user.id)

        if user_profile and user_profile.consignee:
            logger.info('user consignee = %s' % user_profile.consignee)
            return self._get_consignee_queryset(user_profile)
        is_root = self.request.GET.get('is_root')
        if is_root:
            logger.info('root nodes = %s(%s)' % (DeliveryNode.objects.root_nodes(), DeliveryNode.objects.root_nodes()))
            return DeliveryNode.objects.root_nodes()
        logger.info('queryset clone node = %s(%s)' % (self.queryset._clone(), len(self.queryset._clone())))
        return self.queryset._clone()

    def _get_consignee_queryset(self, user_profile):
        item_id = self.request.GET.get('consignee_deliveries_for_item')
        if item_id:
            return DeliveryNode.objects.delivered_by_consignee(user_profile.consignee, item_id).order_by('-id')
        parent_id = self.request.GET.get('parent')
        if parent_id:
            logger.info('parent_id = %s' % parent_id)
            parent = DeliveryNode.objects.get(pk=parent_id)
            return parent.children()
        return self._consignee_nodes(user_profile)

    def _consignee_nodes(self, user_profile):
        queryset = DeliveryNode.objects.filter(ip=user_profile.consignee)
        logger.info('is_distributable = %s' % self.request.GET.get('is_distributable'))
        if self.request.GET.get('is_distributable'):
            queryset = queryset.filter(balance__gt=0, distribution_plan__confirmed=True,
                                       tree_position=DeliveryNode.IMPLEMENTING_PARTNER)
            logger.info('user consignee nodes after query = %s(%s)' % (queryset, len(queryset)))
            return queryset
        return queryset

    def list(self, request, *args, **kwargs):
        paginate = request.GET.get('paginate', None)
        if paginate != 'true':
            self.paginator.page_size = 0
        return super(DistributionPlanNodeViewSet, self).list(request, *args, **kwargs)

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save()

    @detail_route()
    def lineage(self, request, pk=None):
        node = self.get_object()
        lineage = node.lineage()
        return Response(self.get_serializer(lineage, many=True).data)

    @detail_route(methods=['patch'])
    def report_loss(self, request, pk=None):
        quantity_lost = request.data['quantity']
        justification = request.data['justification']
        node = self.get_object()
        node.losses.create(quantity=quantity_lost, remark=justification)
        node.save()  # for updating the balance on the node - DO NOT REMOVE
        return Response(status=status.HTTP_204_NO_CONTENT)


distributionPlanNodeRouter = DefaultRouter()
distributionPlanNodeRouter.register(r'distribution-plan-node', DistributionPlanNodeViewSet)
