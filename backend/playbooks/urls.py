from rest_framework.routers import DefaultRouter

from playbooks.views import PlaybookViewSet

router = DefaultRouter()
router.register("playbooks", PlaybookViewSet, basename="playbook")

urlpatterns = router.urls
