from rest_framework.routers import DefaultRouter

from notes.views import CustomerNoteViewSet

router = DefaultRouter()
router.register("notes", CustomerNoteViewSet, basename="note")

urlpatterns = router.urls
