import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notes", "0001_initial"),
    ]

    operations = [
        migrations.RenameModel(old_name="AccountNote", new_name="CustomerNote"),
        migrations.AlterModelOptions(
            name="customernote",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Customer note",
                "verbose_name_plural": "Customer notes",
            },
        ),
        migrations.AlterField(
            model_name="customernote",
            name="author",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="customer_notes",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="customernote",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="customer_notes",
                to="core.organization",
            ),
        ),
    ]
