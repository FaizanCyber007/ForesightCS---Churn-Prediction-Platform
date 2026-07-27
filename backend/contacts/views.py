from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from contacts.models import Contact
from contacts.serializers import ContactSerializer
from core.mixins import IdempotencyKeyMixin, TenantScopedViewSetMixin


class ContactViewSet(TenantScopedViewSetMixin, IdempotencyKeyMixin, ModelViewSet):
    queryset = Contact.objects.select_related("customer", "organization")
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["customer"]
