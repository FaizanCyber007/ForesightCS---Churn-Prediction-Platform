from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Default pagination for all tenant-scoped list endpoints."""

    page_size_query_param = "page_size"
    max_page_size = 200
