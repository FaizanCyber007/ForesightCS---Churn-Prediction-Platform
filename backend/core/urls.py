from django.urls import path

from .views import (
    LoginView,
    LogoutView,
    MeView,
    OrganizationMeView,
    RefreshView,
    RegisterView,
    UserMeView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path("auth/login/", LoginView.as_view(), name="auth_login"),
    path("auth/logout/", LogoutView.as_view(), name="auth_logout"),
    path("auth/refresh/", RefreshView.as_view(), name="auth_refresh"),
    path("auth/me/", MeView.as_view(), name="auth_me"),
    path("auth/user/", UserMeView.as_view(), name="auth_user_me"),
    path("organizations/me/", OrganizationMeView.as_view(), name="organization_me"),
]
