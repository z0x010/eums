from django.core.paginator import Paginator
from django.db.models import Q
from eums.models import UserProfile, DistributionPlan, Question, PurchaseOrderItem, ReleaseOrderItem, \
    DistributionPlanNode, Runnable
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.utils.urls import replace_query_param

PAGE_SIZE = 10


@api_view(['GET'])
def ip_feedback_by_delivery_endpoint(request):
    logged_in_user = request.user
    if UserProfile.objects.filter(user=logged_in_user).exists():
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    deliveries = _get_filtered_deliveries(request)
    results = _build_delivery_answers(deliveries)
    paginated_results = Paginator(results, PAGE_SIZE)

    page_number = _get_page_number(request)
    results_current_page = paginated_results.page(page_number)

    data = {
        'next': _has_page(results_current_page.has_next(), _get_page_number(request) + 1, request),
        'previous': _has_page(results_current_page.has_previous(), _get_page_number(request) - 1, request),
        'count': len(results),
        'pageSize': PAGE_SIZE,
        'results': results_current_page.object_list
    }

    return Response(data=data, status=status.HTTP_200_OK)


def _build_delivery_answers(deliveries):
    delivery_answers = []
    for delivery in deliveries:
        answers = delivery.answers()
        delivery_answers.append({Question.LABEL.deliveryReceived: _value(Question.LABEL.deliveryReceived, answers),
                                 'shipmentDate': delivery.delivery_date,
                                 Question.LABEL.dateOfReceipt: _value(Question.LABEL.dateOfReceipt, answers),
                                 'orderNumber': delivery.number(),
                                 'programme': delivery.programme.name,
                                 'consignee': delivery.consignee.name,
                                 Question.LABEL.isDeliveryInGoodOrder:
                                     _value(Question.LABEL.isDeliveryInGoodOrder, answers),
                                 Question.LABEL.satisfiedWithDelivery:
                                     _value(Question.LABEL.satisfiedWithDelivery, answers),
                                 Question.LABEL.additionalDeliveryComments:
                                     _value(Question.LABEL.additionalDeliveryComments, answers),
                                 'value': int(delivery.total_value)
                                 })
    return delivery_answers


def _value(question_label, answers):
    return filter(lambda answer: answer['question_label'] == question_label, answers)[0]['value']


def _get_page_number(request):
    if request.GET.get('page'):
        return int(request.GET.get('page'))
    else:
        return 1


def _has_page(has_page, page, request):
    base_url = replace_query_param(request.build_absolute_uri(), 'page', page)
    return None if has_page is False else base_url


def _get_filtered_deliveries(request):
    search_query = request.GET.get('query')
    if search_query:
        purchase_order_item = PurchaseOrderItem.objects.filter(purchase_order__order_number__icontains=search_query)
        release_order_item = ReleaseOrderItem.objects.filter(release_order__waybill__icontains=search_query)
        delivery_ids = DistributionPlanNode.objects \
            .filter(track=True, distribution_plan__track=True, tree_position=Runnable.IMPLEMENTING_PARTNER) \
            .filter(Q(distribution_plan__consignee__name__icontains=search_query) |
                    Q(distribution_plan__programme__name__icontains=search_query) |
                    Q(item__in=purchase_order_item) |
                    Q(item__in=release_order_item)).values_list('distribution_plan', flat=True)

        return DistributionPlan.objects.filter(id__in=delivery_ids)

    delivery_ids = DistributionPlanNode.objects \
        .filter(track=True, distribution_plan__track=True, tree_position=Runnable.IMPLEMENTING_PARTNER) \
        .values_list('distribution_plan',
                     flat=True)
    return DistributionPlan.objects.filter(id__in=delivery_ids)
