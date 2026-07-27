import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_django_cache():
    """
    Resets Django's cache before every test.

    pytest-django wraps each test in a DB transaction (rolled back
    afterward), but Django's cache framework is untouched by that --
    without this, state written via the cache (DRF throttle counters,
    core.mixins.IdempotencyKeyMixin's cached responses) would leak across
    tests run in the same process, causing failures that depend on test
    execution order/count rather than on the actual behavior being tested.
    """
    cache.clear()
