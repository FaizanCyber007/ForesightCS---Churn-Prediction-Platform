from django.urls import path

from billing.views import LemonSqueezyWebhookView

urlpatterns = [
    path(
        "billing/webhooks/lemon-squeezy/",
        LemonSqueezyWebhookView.as_view(),
        name="lemon-squeezy-webhook",
    ),
]
