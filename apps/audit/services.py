"""
Helpers the rest of the app calls to write audit rows.

Keeping this logic in one place means every history write goes through the
same door, carries the current user automatically, and stays consistent.
"""
from .middleware import get_current_user
from .models import DealStateHistory, DealFieldHistory


def record_state_change(deal, from_state, to_state, reason="", actor=None):
    """Append a lifecycle-transition row."""
    return DealStateHistory.objects.create(
        deal=deal,
        from_state=from_state or "",
        to_state=to_state,
        actor=actor or get_current_user(),
        reason=reason or "",
    )


def record_field_changes(deal, entity, changes, actor=None):
    """
    Append one row per changed field.

    `changes` is a dict of {field_name: (old_value, new_value)}. Only fields
    whose value actually changed should be passed in; callers use
    `diff_fields` below to build it.
    """
    actor = actor or get_current_user()
    rows = [
        DealFieldHistory(
            deal=deal,
            entity=entity,
            field_name=name,
            old_value=_stringify(old),
            new_value=_stringify(new),
            actor=actor,
        )
        for name, (old, new) in changes.items()
    ]
    if rows:
        DealFieldHistory.objects.bulk_create(rows)
    return rows


def diff_fields(old_instance, new_instance, field_names):
    """
    Build a {field: (old, new)} dict of fields that changed between two
    instances of the same model. `old_instance` may be None (a create), in
    which case only fields with a meaningful (non-empty) value are reported.

    Empty-to-empty changes (None vs "" vs blank) are treated as no change, so
    the audit trail records real edits rather than default-population noise.
    """
    changes = {}
    for name in field_names:
        new_val = getattr(new_instance, name, None)
        old_val = getattr(old_instance, name, None) if old_instance else None
        if _normalise(old_val) == _normalise(new_val):
            continue
        changes[name] = (old_val, new_val)
    return changes


def _normalise(value):
    """Treat None and empty string as equivalent, and compare by string form
    so that e.g. Decimal('322.54') and '322.54' don't register as a change."""
    if value is None or value == "":
        return None
    return str(value)


def _stringify(value):
    if value is None:
        return None
    return str(value)
