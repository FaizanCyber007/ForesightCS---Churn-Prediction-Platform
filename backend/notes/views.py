from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from core.mixins import IdempotencyKeyMixin, TenantScopedViewSetMixin
from notes.models import CustomerNote
from notes.serializers import CustomerNoteSerializer


class CustomerNoteViewSet(TenantScopedViewSetMixin, IdempotencyKeyMixin, ModelViewSet):
    queryset = CustomerNote.objects.select_related("customer", "author")
    serializer_class = CustomerNoteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["customer"]

    def extra_create_kwargs(self) -> dict:
        return {"author": self.request.user}
