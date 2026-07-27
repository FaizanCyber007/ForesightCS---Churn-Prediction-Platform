import factory
from django.utils import timezone

from core.factories import OrganizationFactory
from tasks.models import Task


class TaskFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Task

    customer = None
    organization = factory.LazyAttribute(
        lambda obj: obj.customer.organization if obj.customer else OrganizationFactory()
    )
    title = factory.Sequence(lambda n: f"Task {n}")
    description = ""
    priority = Task.Priority.MEDIUM
    status = Task.Status.OPEN
    task_type = Task.TaskType.MANUAL
    due_date = factory.LazyFunction(lambda: (timezone.now() + timezone.timedelta(days=7)).date())
