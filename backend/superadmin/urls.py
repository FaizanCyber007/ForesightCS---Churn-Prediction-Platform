from rest_framework.routers import DefaultRouter

from superadmin.views import AuditLogViewSet, OrganizationAdminViewSet

router = DefaultRouter()
router.register("admin/organizations", OrganizationAdminViewSet, basename="admin-organization")
router.register("admin/audit-logs", AuditLogViewSet, basename="admin-audit-log")

urlpatterns = router.urls
