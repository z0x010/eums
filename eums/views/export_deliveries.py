from eums.services.csv_export_service import generate_delivery_export_csv
from rest_framework.response import Response
from rest_framework.views import APIView


class ExportDeliveriesCSV(APIView):

    def get(self, request, *args, **kwargs):
        generate_delivery_export_csv.delay(request.user, request.GET.get('type'))
        message = {'message': 'Generating CSV, you will be notified via email once it is done.'}
        return Response(message, status=200)