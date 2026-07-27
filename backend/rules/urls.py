from rest_framework.routers import DefaultRouter

from rules.views import HealthRuleViewSet

router = DefaultRouter()
router.register("rules", HealthRuleViewSet, basename="healthrule")

urlpatterns = router.urls
