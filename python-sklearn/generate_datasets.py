"""Deterministic synthetic Indonesian customer churn dataset generators.

Generates two realistic 1,000-row CSV datasets (EdTech/SaaS & Telco/ISP) with
calibrated logistic churn signals so both the Next.js ML engine and the
Scikit-learn syllabus pipeline achieve ROC-AUC ~0.85-0.90.
"""

from __future__ import annotations

from pathlib import Path
import numpy as np
import pandas as pd


FIRST_NAMES = [
    "Aditya", "Agus", "Aisyah", "Andi", "Anisa", "Arief", "Ayu", "Bagas",
    "Bayu", "Budi", "Citra", "Dewi", "Dian", "Dimas", "Dina", "Eka",
    "Fajar", "Farhan", "Fitri", "Galih", "Hendra", "Indah", "Intan", "Irfan",
    "Joko", "Kartika", "Lestari", "Maya", "Mega", "Nadia", "Nanda", "Nugroho",
    "Putri", "Rahmat", "Raka", "Rani", "Reza", "Rina", "Rizky", "Sari",
    "Siti", "Taufik", "Tiara", "Tri", "Wahyu", "Wulan", "Yogi", "Yuni",
]

LAST_NAMES = [
    "Pratama", "Saputra", "Wijaya", "Santoso", "Hidayat", "Kusuma", "Nugraha",
    "Permana", "Putra", "Ramadhan", "Setiawan", "Susanto", "Utama", "Wibowo",
    "Gunawan", "Hakim", "Mahendra", "Maulana", "Purnama", "Syahputra",
    "Anggraini", "Handayani", "Lestari", "Maharani", "Ningsih", "Puspita",
    "Rahayu", "Sari", "Wulandari", "Yuliana",
]


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20.0, 20.0)))


def _make_names(rng: np.random.Generator, n: int) -> list[str]:
    firsts = rng.choice(FIRST_NAMES, size=n)
    lasts = rng.choice(LAST_NAMES, size=n)
    return [f"{f} {l}" for f, l in zip(firsts, lasts)]


def generate_edtech_dataset(n: int = 1000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    customer_ids = [f"EDT-{i + 1:04d}" for i in range(n)]
    customer_names = _make_names(rng, n)

    plan_tiers = rng.choice(
        ["Starter", "Pro", "Enterprise"], size=n, p=[0.48, 0.37, 0.15]
    )
    contract_types = rng.choice(["Bulanan", "Tahunan"], size=n, p=[0.66, 0.34])
    tenure_months = rng.integers(1, 37, size=n)

    base_rev = np.where(
        plan_tiers == "Starter",
        199_000,
        np.where(plan_tiers == "Pro", 499_000, 1_450_000),
    )
    addons = rng.choice([0, 50_000, 100_000, 250_000], size=n, p=[0.55, 0.2, 0.15, 0.1])
    monthly_revenue_idr = (base_rev + addons).astype(int)

    weekly_active_sessions = np.clip(
        rng.normal(loc=5.2, scale=2.8, size=n).round().astype(int), 0, 16
    )
    last_login_days_ago = np.clip(
        rng.exponential(scale=9.0, size=n).round().astype(int), 0, 45
    )
    support_tickets_30d = np.clip(rng.poisson(lam=1.3, size=n), 0, 9)
    payment_delays_90d = np.clip(rng.poisson(lam=0.7, size=n), 0, 6)
    nps_score = np.clip(
        (
            7.6
            - 0.45 * support_tickets_30d
            - 0.05 * last_login_days_ago
            + rng.normal(0, 1.4, size=n)
        )
        .round()
        .astype(int),
        1,
        10,
    )

    # Calibrated logistic log-odds producing ~26% churn with clear learnable drivers
    logits = (
        -2.35
        + 0.11 * last_login_days_ago
        + 0.72 * payment_delays_90d
        + 0.48 * support_tickets_30d
        - 0.24 * weekly_active_sessions
        - 0.045 * tenure_months
        - 0.22 * (nps_score - 6.0)
        + np.where(contract_types == "Bulanan", 0.95, -0.85)
        + np.where(plan_tiers == "Starter", 0.35, np.where(plan_tiers == "Enterprise", -0.45, 0.0))
        + rng.normal(0.0, 0.45, size=n)
    )
    probs = _sigmoid(logits)
    churn = (rng.uniform(0.0, 1.0, size=n) < probs).astype(int)

    return pd.DataFrame(
        {
            "customer_id": customer_ids,
            "customer_name": customer_names,
            "plan_tier": plan_tiers,
            "tenure_months": tenure_months,
            "monthly_revenue_idr": monthly_revenue_idr,
            "weekly_active_sessions": weekly_active_sessions,
            "last_login_days_ago": last_login_days_ago,
            "support_tickets_30d": support_tickets_30d,
            "payment_delays_90d": payment_delays_90d,
            "nps_score": nps_score,
            "contract_type": contract_types,
            "churn": churn,
        }
    )


def generate_telco_dataset(n: int = 1000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed + 100)

    customer_ids = [f"TLC-{i + 1:04d}" for i in range(n)]
    customer_names = _make_names(rng, n)

    package_names = rng.choice(
        ["Fiber 30Mbps", "Fiber 50Mbps", "Fiber 100Mbps", "Enterprise"],
        size=n,
        p=[0.36, 0.34, 0.20, 0.10],
    )
    contract_types = rng.choice(
        ["Bulanan", "12 Bulan", "24 Bulan"], size=n, p=[0.52, 0.30, 0.18]
    )
    auto_debit = rng.choice(["Ya", "Tidak"], size=n, p=[0.46, 0.54])
    tenure_months = rng.integers(1, 49, size=n)

    base_bill = np.select(
        [
            package_names == "Fiber 30Mbps",
            package_names == "Fiber 50Mbps",
            package_names == "Fiber 100Mbps",
        ],
        [295_000, 425_000, 675_000],
        default=1_850_000,
    )
    monthly_bill_idr = (
        base_bill + rng.choice([0, 35_000, 75_000], size=n, p=[0.6, 0.25, 0.15])
    ).astype(int)

    avg_usage_gb = np.clip(
        rng.normal(loc=340, scale=140, size=n).round().astype(int), 40, 1200
    )
    outage_incidents_30d = np.clip(rng.poisson(lam=1.1, size=n), 0, 8)
    cs_complaints_30d = np.clip(
        rng.poisson(lam=0.5 + 0.55 * outage_incidents_30d), 0, 9
    )
    late_payments_90d = np.clip(rng.poisson(lam=0.65, size=n), 0, 6)

    logits = (
        -2.55
        + 0.62 * outage_incidents_30d
        + 0.54 * cs_complaints_30d
        + 0.68 * late_payments_90d
        - 0.04 * tenure_months
        - 0.0018 * (avg_usage_gb - 300)
        + np.where(contract_types == "Bulanan", 1.05, np.where(contract_types == "24 Bulan", -1.0, -0.35))
        + np.where(auto_debit == "Tidak", 0.55, -0.45)
        + rng.normal(0.0, 0.45, size=n)
    )
    probs = _sigmoid(logits)
    churn = (rng.uniform(0.0, 1.0, size=n) < probs).astype(int)

    return pd.DataFrame(
        {
            "customer_id": customer_ids,
            "customer_name": customer_names,
            "package_name": package_names,
            "tenure_months": tenure_months,
            "monthly_bill_idr": monthly_bill_idr,
            "avg_usage_gb": avg_usage_gb,
            "outage_incidents_30d": outage_incidents_30d,
            "cs_complaints_30d": cs_complaints_30d,
            "late_payments_90d": late_payments_90d,
            "contract_type": contract_types,
            "auto_debit": auto_debit,
            "churn": churn,
        }
    )


def write_all_datasets(out_dir: str | Path) -> list[Path]:
    target = Path(out_dir)
    target.mkdir(parents=True, exist_ok=True)

    edtech_path = target / "edtech_saas_indonesia_1000.csv"
    telco_path = target / "telco_isp_indonesia_1000.csv"

    generate_edtech_dataset(n=1000, seed=42).to_csv(edtech_path, index=False)
    generate_telco_dataset(n=1000, seed=42).to_csv(telco_path, index=False)
    return [edtech_path, telco_path]


if __name__ == "__main__":
    web_datasets = Path(__file__).resolve().parent.parent / "web" / "public" / "datasets"
    written = write_all_datasets(web_datasets)
    for p in written:
        df = pd.read_csv(p)
        print(f"Generated {p.name}: {len(df)} rows, churn_rate={df['churn'].mean():.2%}")
