from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from core.mixins import IdempotencyKeyMixin, TenantScopedViewSetMixin
from tasks.models import Task
from tasks.serializers import TaskSerializer


class TaskViewSet(TenantScopedViewSetMixin, IdempotencyKeyMixin, ModelViewSet):
    queryset = Task.objects.select_related("customer", "organization")
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "priority", "task_type", "customer"]
