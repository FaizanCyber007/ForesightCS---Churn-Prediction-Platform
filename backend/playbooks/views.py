from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from core.mixins import IdempotencyKeyMixin, TenantScopedViewSetMixin
from playbooks.models import Playbook
from playbooks.serializers import PlaybookSerializer


class PlaybookViewSet(TenantScopedViewSetMixin, IdempotencyKeyMixin, ModelViewSet):
    queryset = Playbook.objects.select_related("organization")
    serializer_class = PlaybookSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status"]
