"""
Cost-model computations. Pure functions — outputs are derived from the stored
inputs and never persisted, so the figures always reflect the current model.

A deliberately simple model: CAPEX is a year-0 outflow, net annual cash flow
(revenue − OPEX) recurs over the project life. Payback, NPV (at the discount
rate) and a bisection IRR follow from that cash-flow profile.
"""
from decimal import Decimal


def _d(value):
    return Decimal(str(value)) if value is not None else Decimal("0")


def _npv(rate, flows):
    return sum(cf / (1 + rate) ** t for t, cf in enumerate(flows))


def _irr(flows):
    """IRR by bisection; None when there's no sign change (no real return)."""
    if len(flows) < 2 or flows[0] >= 0:
        return None
    lo, hi = -0.99, 10.0
    f_lo, f_hi = _npv(lo, flows), _npv(hi, flows)
    if f_lo * f_hi > 0:
        return None
    mid = lo
    for _ in range(200):
        mid = (lo + hi) / 2
        f_mid = _npv(mid, flows)
        if abs(f_mid) < 1e-7:
            break
        if f_lo * f_mid < 0:
            hi, f_hi = mid, f_mid
        else:
            lo, f_lo = mid, f_mid
    return round(mid * 100, 2)


def compute(cost_model):
    """Return the derived cost/return figures for a model."""
    lines = list(cost_model.lines.all())
    capex = sum((_d(l.amount) for l in lines if l.kind == "CAPEX"), Decimal("0"))
    opex = sum((_d(l.amount) for l in lines if l.kind == "OPEX"), Decimal("0"))
    revenue = _d(cost_model.annual_revenue)
    net = revenue - opex

    out = {
        "currency": cost_model.currency,
        "total_capex": float(capex),
        "total_opex_annual": float(opex),
        "annual_revenue": float(revenue),
        "net_annual_cashflow": float(net),
        "debt_amount": None,
        "equity_amount": None,
        "equity_pct": None,
        "simple_payback_years": None,
        "npv": None,
        "irr_pct": None,
    }

    if cost_model.debt_pct is not None:
        debt_amt = capex * _d(cost_model.debt_pct) / 100
        out["debt_amount"] = float(debt_amt)
        out["equity_amount"] = float(capex - debt_amt)
        out["equity_pct"] = float(100 - _d(cost_model.debt_pct))

    if net > 0 and capex > 0:
        out["simple_payback_years"] = round(float(capex / net), 2)

    life = cost_model.project_life_years or 0
    if life > 0 and capex > 0:
        flows = [-float(capex)] + [float(net)] * life
        if cost_model.discount_rate_pct is not None:
            out["npv"] = round(_npv(float(cost_model.discount_rate_pct) / 100, flows), 2)
        out["irr_pct"] = _irr(flows)

    return out
