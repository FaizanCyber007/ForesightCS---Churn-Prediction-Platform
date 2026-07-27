from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("playbooks", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="playbook",
            old_name="accounts_in_play",
            new_name="customers_in_play",
        ),
    ]
