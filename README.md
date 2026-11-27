# UC-04: Customer Churn Predictor & Retention Planner

Proyek showcase **AI Engineer Bootcamp Ruangguru** untuk modul **Machine Learning (Scikit-learn, Pandas)** dan **Agentic AI (Gemini API)**.

## Fitur Utama

1. **Alur Upload-First dengan 1 Dataset `dummy.csv` (1.000 Pelanggan) + CSV Kustom:**
   - File contoh siap demo tersedia di `dummy.csv` (1.000 pelanggan langganan Indonesia).
   - **Auto-Schema Mapper:** Otomatis mendeteksi kolom ID, nama, target `churn` (opsional), tagihan bulanan, serta fitur numerik & kategorikal (mendukung pemisah `,`/`;`, UTF-8 BOM, dan format Rupiah).
2. **Engine Machine Learning Deterministik (`web/src/lib/ml/`):**
   - **L2-Regularized Logistic Regression** (*class-weight balanced*, 100% deterministik — skor identik di setiap pengulangan).
   - **Global Feature Importance** dengan penjelasan Bahasa Indonesia kontekstual per faktor (dipisah menjadi **Top 3 Pemicu Churn** vs **Top 3 Penahan Churn**) serta **Per-Customer Local Attribution** (3 pendorong utama per pelanggan).
3. **Workspace 3 Tab Production-Ready (`Dashboard`, `Data Pelanggan`, `Strategi Retensi`):**
   - **Dashboard (1 layar tanpa scroll):** 3 KPI bisnis (*Total Pelanggan*, *Pendapatan Berisiko/Bulan*, *Paket Paling Rentan Churn*), panel **Top 3 Pemicu vs Top 3 Penahan Churn**, **Sebaran Risiko Pelanggan** (Diagram Donat klik-langsung ke daftar pelanggan), dan **Risiko Churn per Paket** (proporsi 3 warna).
   - **Data Pelanggan:** Tabel terurut dari risiko tertinggi dengan single scrollbar, pencarian, popover **Filter** ikon-saja (segmen risiko), tombol **Unduh CSV** ikon-saja, dan panel detail pelanggan 1-on-1 (saran penawaran + draf pesan WhatsApp/Email siap salin).
   - **Strategi Retensi:** Halaman khusus berisi estimasi **Potensi Pendapatan Diselamatkan** dan 3 kartu playbook prioritas (Sasaran, Langkah Aksi Utama, Target KPI) berbasis Gemini AI.
4. **Materi Silabus Scikit-learn & Pandas (`python-sklearn/`):**
   - Generator dataset deterministik (`generate_datasets.py`), pipeline Scikit-learn (`train_churn_model.py` — `LogisticRegression` vs `RandomForestClassifier`), dan notebook interaktif (`churn_analysis.ipynb`).

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
