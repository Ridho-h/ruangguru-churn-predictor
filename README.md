# UC-04: Customer Churn Predictor & Retention Planner

Proyek showcase **AI Engineer Bootcamp Ruangguru** untuk modul **Machine Learning (Scikit-learn, Pandas)** dan **Agentic AI (Gemini API)**.

## Fitur Utama

1. **2 Dataset Contoh Indonesia (1.000 Pelanggan) + Upload CSV Kustom:**
   - **EdTech / SaaS Indonesia (`edtech_saas_indonesia_1000.csv`)** — paket Starter/Pro/Enterprise, sesi aktif mingguan, hari sejak login terakhir, tiket support, keterlambatan bayar, NPS.
   - **Telco / ISP Fiber Indonesia (`telco_isp_indonesia_1000.csv`)** — paket bandwidth, lama berlangganan, gangguan jaringan, komplain CS, auto-debit, tipe kontrak.
   - **Auto-Schema Mapper:** Otomatis mendeteksi kolom ID, nama, target `churn` (opsional), pendapatan bulanan/MRR, serta fitur numerik & kategorikal (termasuk dukungan delimiter `,`/`;`, UTF-8 BOM, dan format `"Rp 450.000"`).
2. **Engine Machine Learning Deterministik (`web/src/lib/ml/`):**
   - **L2-Regularized Logistic Regression** (*class-weight balanced*, 100% deterministik — skor identik di setiap pengulangan).
   - Evaluasi *stratified 80/20 split* menampilkan **ROC-AUC, Precision, Recall, F1-Score, Accuracy, dan Confusion Matrix**.
   - **Global Feature Importance** (arah pengaruh meningkatkan/menurunkan risiko) & **Per-Customer Local Attribution** (3 pendorong utama per pelanggan).
3. **Gemini AI Retention Planner (`web/src/app/api/retention-plan/`):**
   - **Strategi Segmen Risiko Tinggi:** 3 playbook prioritas + estimasi pendapatan terselamatkan/bulan.
   - **Rencana Retensi Personal 1-on-1:** Diagnosis risiko, aksi 48 jam, rekomendasi penawaran, kanal terbaik, dan draf pesan WhatsApp/Email siap salin.
4. **Materi Silabus Scikit-learn & Pandas (`python-sklearn/`):**
   - Generator dataset deterministik (`generate_datasets.py`), pipeline Scikit-learn (`train_churn_model.py` — `LogisticRegression` vs `RandomForestClassifier`), dan notebook interaktif (`churn_analysis.ipynb`) yang memakai **2 CSV yang sama persis** dengan web app.

## Cara Menjalankan Lokal

### 1. Web App (Next.js)
```bash
cd web
npm install
# Tambahkan GEMINI_API_KEY=... di web/.env.local
npm run dev
```
Buka `http://localhost:3000`.

### 2. Materi Python (Scikit-learn & Pandas)
```bash
cd python-sklearn
uv run --with pandas --with numpy --with scikit-learn python train_churn_model.py
uv run --with pytest --with pandas --with numpy --with scikit-learn python -m pytest tests/test_ml_pipeline.py -v
```
