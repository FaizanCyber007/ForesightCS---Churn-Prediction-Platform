"""
Replace field-level `unique=True` with partial UniqueConstraints that
only enforce uniqueness when `deleted_at IS NULL` (CLAUDE.md ##2 soft-delete
standard). Soft-deleted rows must not block reuse of the same name/slug/
username/Lemon Squeezy customer id.
"""

import django.contrib.auth.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_idempotencyrecord_and_more'),
    ]

    operations = [
        # Drop the field-level unique constraint on lemon_squeezy_customer_id
        # (added in 0003) -- it's being replaced by a partial UniqueConstraint
        # below that only applies to active rows.
        migrations.AlterField(
            model_name='organization',
            name='lemon_squeezy_customer_id',
            field=models.CharField(
                blank=True,
                default=None,
                help_text='Lemon Squeezy `customer_id`, used to map incoming billing webhooks.',
                max_length=64,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='organization',
            name='name',
            field=models.CharField(max_length=255),
        ),
        migrations.AlterField(
            model_name='organization',
            name='slug',
            field=models.SlugField(max_length=255),
        ),
        # CustomUser.username inherits unique=True from AbstractUser; redefine
        # it without field-level unique so the partial constraint below
        # becomes the source of truth.
        migrations.AlterField(
            model_name='customuser',
            name='username',
            field=models.CharField(
                error_messages={'unique': 'A user with that username already exists.'},
                help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.',
                max_length=150,
                unique=False,
                validators=[django.contrib.auth.validators.UnicodeUsernameValidator()],
                verbose_name='username',
            ),
        ),
        migrations.AddConstraint(
            model_name='organization',
            constraint=models.UniqueConstraint(
                fields=['name'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_active_organization_name',
            ),
        ),
        migrations.AddConstraint(
            model_name='organization',
            constraint=models.UniqueConstraint(
                fields=['slug'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_active_organization_slug',
            ),
        ),
        migrations.AddConstraint(
            model_name='organization',
            constraint=models.UniqueConstraint(
                fields=['lemon_squeezy_customer_id'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_active_organization_lemon_squeezy_customer_id',
            ),
        ),
        migrations.AddConstraint(
            model_name='customuser',
            constraint=models.UniqueConstraint(
                fields=['username'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_active_customuser_username',
            ),
        ),
        migrations.AddIndex(
            model_name='organization',
            index=models.Index(fields=['name'], name='idx_organization_name'),
        ),
        migrations.AddIndex(
            model_name='organization',
            index=models.Index(fields=['slug'], name='idx_organization_slug'),
        ),
        migrations.AddIndex(
            model_name='organization',
            index=models.Index(
                fields=['lemon_squeezy_customer_id'], name='idx_org_ls_customer_id'
            ),
        ),
        migrations.AddIndex(
            model_name='customuser',
            index=models.Index(fields=['username'], name='idx_customuser_username'),
        ),
    ]
