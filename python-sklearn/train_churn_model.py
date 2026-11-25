"""Scikit-learn & Pandas syllabus pipeline for UC-04 Customer Churn Predictor.

Demonstrates ColumnTransformer (StandardScaler + OneHotEncoder), stratified
80/20 evaluation, LogisticRegression vs RandomForestClassifier comparison, and
feature importance extraction on the exact same CSV datasets used by the web app.
"""

from __future__ import annotations

from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


ID_COLUMNS = {"customer_id", "customer_name", "id", "name", "nama"}


def train_and_evaluate(csv_path: str | Path, target_col: str = "churn") -> dict:
    path = Path(csv_path)
    df = pd.read_csv(path)

    feature_cols = [
        c for c in df.columns if c != target_col and c.lower() not in ID_COLUMNS
    ]
    X = df[feature_cols]
    y = df[target_col].astype(int)

    numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = [c for c in feature_cols if c not in numeric_cols]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                numeric_cols,
            ),
            (
                "cat",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_cols,
            ),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    logreg_pipe = Pipeline(
        [
            ("prep", preprocessor),
            (
                "clf",
                LogisticRegression(
                    max_iter=1000, C=1.0, class_weight="balanced", random_state=42
                ),
            ),
        ]
    )
    rf_pipe = Pipeline(
        [
            ("prep", preprocessor),
            (
                "clf",
                RandomForestClassifier(
                    n_estimators=150,
                    max_depth=10,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )

    logreg_pipe.fit(X_train, y_train)
    rf_pipe.fit(X_train, y_train)

    logreg_probs = logreg_pipe.predict_proba(X_test)[:, 1]
    rf_probs = rf_pipe.predict_proba(X_test)[:, 1]

    logistic_auc = float(roc_auc_score(y_test, logreg_probs))
    rf_auc = float(roc_auc_score(y_test, rf_probs))

    # Extract standardized Logistic Regression feature importance
    encoded_names = list(logreg_pipe.named_steps["prep"].get_feature_names_out())
    coefs = logreg_pipe.named_steps["clf"].coef_[0]
    abs_total = float(np.sum(np.abs(coefs))) or 1.0

    top_features = sorted(
        [
            {
                "feature": name.replace("num__", "").replace("cat__", ""),
                "coefficient": round(float(w), 4),
                "importance_pct": round(abs(float(w)) / abs_total * 100.0, 2),
                "direction": "Meningkatkan Risiko" if w > 0 else "Menurunkan Risiko",
            }
            for name, w in zip(encoded_names, coefs)
        ],
        key=lambda item: item["importance_pct"],
        reverse=True,
    )

    return {
        "dataset": path.name,
        "rows": int(len(df)),
        "churn_rate": round(float(y.mean()), 4),
        "logistic_auc": round(logistic_auc, 4),
        "rf_auc": round(rf_auc, 4),
        "top_features": top_features[:8],
        "report": classification_report(
            y_test, (logreg_probs >= 0.5).astype(int), digits=3
        ),
    }


if __name__ == "__main__":
    datasets_dir = Path(__file__).resolve().parent.parent / "web" / "public" / "datasets"
    for csv_file in sorted(datasets_dir.glob("*.csv")):
        res = train_and_evaluate(csv_file)
        print(f"\n=== {res['dataset']} ({res['rows']} rows, churn={res['churn_rate']:.1%}) ===")
        print(f"LogisticRegression ROC-AUC: {res['logistic_auc']:.4f}")
        print(f"RandomForest      ROC-AUC: {res['rf_auc']:.4f}")
        print("Top 5 Churn Drivers:")
        for feat in res["top_features"][:5]:
            print(f"  - {feat['feature']}: {feat['importance_pct']}% ({feat['direction']})")
