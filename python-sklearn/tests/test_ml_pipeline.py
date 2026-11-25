from pathlib import Path
import pandas as pd

from generate_datasets import (
    generate_edtech_dataset,
    generate_telco_dataset,
    write_all_datasets,
)
from train_churn_model import train_and_evaluate


def test_edtech_dataset_schema_determinism_and_distribution():
    df1 = generate_edtech_dataset(n=1000, seed=42)
    df2 = generate_edtech_dataset(n=1000, seed=42)

    assert len(df1) == 1000
    assert df1.equals(df2)
    expected_cols = [
        "customer_id",
        "customer_name",
        "plan_tier",
        "tenure_months",
        "monthly_revenue_idr",
        "weekly_active_sessions",
        "last_login_days_ago",
        "support_tickets_30d",
        "payment_delays_90d",
        "nps_score",
        "contract_type",
        "churn",
    ]
    assert list(df1.columns) == expected_cols
    assert df1.isna().sum().sum() == 0
    churn_rate = float(df1["churn"].mean())
    assert 0.18 <= churn_rate <= 0.35


def test_telco_dataset_schema_determinism_and_distribution():
    df1 = generate_telco_dataset(n=1000, seed=42)
    df2 = generate_telco_dataset(n=1000, seed=42)

    assert len(df1) == 1000
    assert df1.equals(df2)
    expected_cols = [
        "customer_id",
        "customer_name",
        "package_name",
        "tenure_months",
        "monthly_bill_idr",
        "avg_usage_gb",
        "outage_incidents_30d",
        "cs_complaints_30d",
        "late_payments_90d",
        "contract_type",
        "auto_debit",
        "churn",
    ]
    assert list(df1.columns) == expected_cols
    assert df1.isna().sum().sum() == 0
    churn_rate = float(df1["churn"].mean())
    assert 0.18 <= churn_rate <= 0.35


def test_sklearn_pipeline_achieves_strong_roc_auc_on_both_datasets(tmp_path: Path):
    paths = write_all_datasets(tmp_path)
    assert len(paths) == 2

    for csv_path in paths:
        df = pd.read_csv(csv_path)
        assert len(df) == 1000
        result = train_and_evaluate(csv_path)
        assert result["rows"] == 1000
        assert result["logistic_auc"] >= 0.80
        assert result["rf_auc"] >= 0.80
        assert len(result["top_features"]) >= 5
