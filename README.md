# UC-04: Customer Churn Predictor & Retention Planner

Proyek showcase **AI Engineer Bootcamp Ruangguru** untuk modul **Machine Learning (Scikit-learn, Pandas)** dan **Agentic AI (Gemini API)**.

## Fitur Utama

1. **Alur Upload-First dengan 1 Dataset `dummy.csv` (1.000 Pelanggan) + CSV Kustom:**
   - File contoh siap demo tersedia di `dummy.csv` (1.000 pelanggan langganan Indonesia).
   - **Auto-Schema Mapper:** Otomatis mendeteksi kolom ID, nama, target `churn` (opsional), tagihan bulanan, serta fitur numerik & kategorikal (mendukung pemisah `,`/`;`, UTF-8 BOM, dan format Rupiah).
2. **Engine Machine Learning Deterministik (`web/src/lib/ml/`):**
   - **L2-Regularized Logistic Regression** (*class-weight balanced*, 100% deterministik — skor identik di setiap pengulangan).
   - Evaluasi *stratified 80/20 split* menampilkan **ROC-AUC, Precision, Recall, F1-Score, Accuracy, dan Confusion Matrix**.
   - **Diagram Pengaruh (Tornado)** dengan penjelasan Bahasa Indonesia untuk faktor penahan vs pemicu churn, serta **Diagram Donat** sebaran segmen risiko interaktif.
3. **Dashboard Analitik & Gemini Retention Planner (`web/src/app/api/retention-plan/`):**
   - **Dark Executive KPI Band** di bagian atas (tanpa sticky header), tombol **Unggah Ulang**, dan tombol **Unduh CSV** langsung di kanan atas tabel pelanggan.
   - **Rencana Retensi Segmen Risiko Tinggi:** 3 langkah prioritas + estimasi pendapatan terselamatkan/bulan.
   - **Panel Detail Pelanggan (1-on-1):** Penyebab risiko lokal, saran penawaran, kanal outreach, dan draf pesan WhatsApp/Email siap salin.
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
