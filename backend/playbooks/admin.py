from django.contrib import admin

from playbooks.models import Playbook


@admin.register(Playbook)
class PlaybookAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "trigger", "status", "customers_in_play")
    list_filter = ("organization", "status")
    search_fields = ("name", "description")
