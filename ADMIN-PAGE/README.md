# XIONCO — Dashboard Admin Portal

Sistem Dashboard Admin XIONCO adalah portal manajemen katalog produk furnitur, stok/inventaris, dan pencatatan transaksi pembelian pelanggan. Portal ini mengadopsi gaya desain minimalis monokrom premium khas XIONCO dan dilengkapi sistem visualisasi grafik data penjualan secara real-time.

---

## 🛠️ Tech Stack
- **Backend Framework**: Node.js & Express.js
- **Database Engine**: PostgreSQL (Dapat diintegrasikan langsung dengan **Supabase** / Neon / Postgres Lokal)
- **View Engine**: EJS (Embedded JavaScript Templates) & Express EJS Layouts
- **CSS System**: Custom Vanilla CSS (Sangat responsif, bersih, beranimasi halus, dan modular)
- **Library Tambahan**:
  - **Chart.js** (Grafik tren penjualan harian & distribusi kategori produk)
  - **SweetAlert2** (Pop-up Toast notifikasi interaktif & dialog konfirmasi pembatalan transaksi)

---

## ✨ Fitur Utama
1. **Sistem Autentikasi Login & Proteksi Rute**: Membatasi akses seluruh dashboard; hanya admin terautentikasi (menggunakan Session) yang dapat mengelola portal.
2. **Dashboard Ringkasan Penjualan**: Menampilkan total produk aktif, total transaksi, sebaran kategori produk, dan total pendapatan aktif.
3. **Grafik Visualisasi Interaktif**: 
   - **Line Chart**: Tren pendapatan harian dari transaksi aktif dalam 7 hari terakhir.
   - **Doughnut Chart**: Distribusi stok berdasarkan kategori produk di katalog.
4. **Manajemen Katalog & Stok**:
   - Menambahkan produk furnitur baru dengan validasi harga dan stok awal.
   - Menggunakan **Modal Dialog Pop-Up** untuk restock kuantitas produk secara cepat di tabel inventaris.
5. **Kategori Produk Dinamis**: Halaman manajemen kategori untuk melihat dan menambahkan kategori baru secara instan yang langsung terintegrasi dengan form input produk.
6. **Transaksi Pembelian & Pembatalan Aman**:
   - Sistem transaksi pembelian baru dilengkapi dengan visualisasi harga total secara live dan validasi stok di sisi klien.
   - Pembatalan transaksi menggunakan **SweetAlert2 Confirmation Dialog** dengan pemulihan kuantitas stok otomatis ke inventaris berbasis transaksi aman (`BEGIN/COMMIT/ROLLBACK`).

---

## ⚡ Langkah-Langkah Pemasangan & Setup

### 1. Prasyarat
Pastikan Anda sudah menginstal **Node.js** (versi 16 atau lebih tinggi) di perangkat Anda.

### 2. Kloning & Pindah ke Folder Project
Masuk ke dalam subdirektori proyek `ADMIN-PAGE`:
```bash
cd ADMIN-PAGE
```

### 3. Instalasi Dependensi
Jalankan perintah berikut untuk menginstal seluruh dependensi node-postgres dan pendukungnya:
```bash
npm install
```

### 4. Konfigurasi Variabel Lingkungan (`.env`)
1. Salin berkas `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
2. Buka berkas `.env` dan masukkan tautan koneksi PostgreSQL Anda pada variabel `DATABASE_URL`. Contoh (jika menggunakan Supabase):
   ```env
   DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   PORT=3000
   ```

### 5. Inisialisasi Skema Database (Supabase / Postgres)
1. Salin seluruh isi dari berkas [db/schema.sql](db/schema.sql).
2. Tempel dan jalankan di **SQL Editor** pada dashboard **Supabase** (atau client database Postgres pilihan Anda) untuk membuat semua tabel yang diperlukan secara otomatis.

### 6. Seeding Data Default
Isi database dengan data produk premium XIONCO, kategori inisiasi, dan akun administrator default dengan menjalankan:
```bash
npm run seed
```

### 7. Jalankan Server Pengembangan
Jalankan aplikasi dalam mode dev (menggunakan `nodemon` agar aplikasi me-reload otomatis saat Anda merubah kode):
```bash
npm run dev
```
Buka browser Anda dan akses portal admin di [http://localhost:3000](http://localhost:3000).

---

## 🔑 Kredensial Administrator Default
Untuk login pertama kali, gunakan akun default berikut:
- **Username**: `admin`
- **Password**: `admin`

---

## 🚀 Panduan Deployment ke Vercel

Aplikasi dashboard admin ini sudah dikonfigurasi untuk dapat dideploy ke **Vercel** sebagai Serverless Function menggunakan file konfigurasi [vercel.json](vercel.json).

### 1. Persiapan Database Production
Karena Vercel tidak mendukung database lokal persisten:
1. Buat database PostgreSQL di cloud provider seperti **Supabase**, Neon, atau render.com.
2. Salin seluruh isi dari berkas [db/schema.sql](db/schema.sql) dan jalankan di SQL Editor dashboard database cloud Anda.
3. Lakukan seeding data awal ke database production dengan mengubah sementara `DATABASE_URL` di file `.env` lokal Anda ke database cloud, kemudian jalankan:
   ```bash
   npm run seed
   ```

### 2. Push Code ke GitHub
1. Pastikan Anda menginisiasi git di root project workspace:
   ```bash
   git init
   git add .
   git commit -m "Setup: Vercel deployment & AI integration"
   ```
2. Buat repositori baru di GitHub dan lakukan push.

### 3. Deploy ke Vercel
1. Masuk ke dashboard [Vercel](https://vercel.com) dan hubungkan akun GitHub Anda.
2. Klik **Add New Project**, pilih repositori yang telah di-push.
3. Pada halaman konfigurasi, sesuaikan parameter berikut:
   - **Root Directory**: Ubah ke `ADMIN-PAGE` (karena workspace kita berisi subfolder).
   - **Framework Preset**: Pilih `Other`.
4. Buka tab **Environment Variables** dan masukkan variabel lingkungan berikut:
   - `DATABASE_URL` = (Tautan koneksi PostgreSQL Supabase/Neon Anda)
   - `GEMINI_API_KEY` = (API Key Google Gemini Anda)
   - `AI_PROVIDER` = `gemini`
   - `AI_MODEL` = `gemini-2.5-flash`
   - `SYSTEM_PROMPT` = `Kamu adalah asisten AI dari XIONCO...` (sesuaikan dengan prompt Anda)
   - `NODE_ENV` = `production`
5. Klik **Deploy** dan tunggu proses build selesai.

### ⚠️ Catatan Penting Mengenai Sesi (Session) di Vercel
Secara default, aplikasi ini menggunakan penyimpanan sesi berbasis memori (`MemoryStore` bawaan dari `express-session`). Karena Vercel menggunakan Serverless Functions yang bersifat *stateless* (kontainer dapat mati, hidup, dan berskala secara dinamis):
- Sesi login admin dapat ter-reset atau logout sendiri secara berkala jika kontainer serverless di-restart oleh Vercel.
- **Rekomendasi untuk Production**: Gunakan database-backed session store seperti `connect-pg-simple` agar data sesi admin tersimpan aman di tabel PostgreSQL Anda:
  1. Install package: `npm install connect-pg-simple`
  2. Buat tabel sesi di database PostgreSQL Anda menggunakan SQL:
     ```sql
     CREATE TABLE "session" (
       "sid" varchar NOT NULL COLLATE "default",
       "sess" json NOT NULL,
       "expire" timestamp(6) NOT NULL
     )
     WITH (OIDS=FALSE);
     ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
     CREATE INDEX "IDX_session_expire" ON "session" ("expire");
     ```
  3. Konfigurasi `session` di `app.js` Anda agar menggunakan store baru tersebut.

