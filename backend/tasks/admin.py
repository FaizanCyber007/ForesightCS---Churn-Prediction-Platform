from django.contrib import admin

from tasks.models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "customer", "priority", "status", "due_date")
    list_filter = ("organization", "priority", "status", "task_type")
    search_fields = ("title", "description")
