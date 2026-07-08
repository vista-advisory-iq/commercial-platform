# Seed the standard handover pack onto projects created before the checklist
# existed, so every project shows the same five default items.
from django.db import migrations

DEFAULT_PACK = [
    "Signed contract & annexes",
    "Tariff & escalation schedule",
    "KYC / credit file",
    "Metering & billing plan",
    "Customer contacts & escalation points",
]


def seed_packs(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    HandoverItem = apps.get_model("projects", "HandoverItem")
    for project in Project.objects.filter(handover_items__isnull=True).distinct():
        HandoverItem.objects.bulk_create([
            HandoverItem(project=project, name=name, order=i)
            for i, name in enumerate(DEFAULT_PACK)
        ])


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0002_handoveritem"),
    ]

    operations = [
        migrations.RunPython(seed_packs, migrations.RunPython.noop),
    ]
