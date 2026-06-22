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
7. **AI Assistant - Chatbot Cek Stok Real-Time**:
   - Chatbot built-in yang bisa mengecek stok produk langsung dari database **tanpa memerlukan API key AI eksternal**.
   - Mendukung berbagai jenis query: ringkasan stok, stok habis, stok rendah, filter kategori, dan pencarian produk.
   - Integrasi dengan AI provider eksternal (Gemini, OpenAI, Claude, Ollama) untuk pertanyaan umum selain stok.
   - Mode demo berjalan dengan in-memory database tanpa perlu konfigurasi PostgreSQL.

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

## 🤖 AI Assistant - Chatbot Cek Stok

Aplikasi ini dilengkapi dengan chatbot AI yang dapat mengecek stok produk langsung dari database.

### Fitur Utama
- **Cek Stok Tanpa API Key**: Query stok berjalan lokal tanpa memerlukan API key AI eksternal
- **Query Cerdas**: Mendeteksi otomatis pertanyaan tentang stok menggunakan keyword
- **Respons Terformat**: Menampilkan data stok dengan emoji status (🟢 TERSEDIA, 🟡 RENDAH, 🔴 HABIS)
- **Mode Demo**: Berjalan dengan in-memory database untuk testing

### Contoh Query yang Didukung
```
"Ringkasan stok produk"        → Menampilkan semua produk dan stok
"Stok habis"                   → Filter produk dengan stok 0
"Stok rendah"                  → Filter produk dengan stok < 5 unit
"Produk kategori SEATS"        → Stok berdasarkan kategori
"Cek stok kursi"               → Pencarian berdasarkan nama produk
```

### Konfigurasi AI Eksternal (Opsional)
Untuk pertanyaan non-stok, Anda dapat mengkonfigurasi AI provider:
1. Login sebagai **superadmin** (username: `superadmin`, password: `superadmin`)
2. Buka menu **Pengaturan** di halaman Assistant
3. Pilih provider (Gemini/OpenAI/Claude/Ollama) dan masukkan API key

---

## 🗄️ Database Schema

### Struktur Tabel

**categories** - Kategori produk
- `id` - SERIAL PRIMARY KEY
- `name` - TEXT UNIQUE (SEATS, TABLE, BEDFRAME, CABINET, DECOR)
- `created_at` - TIMESTAMP

**products** - Data produk furnitur
- `id` - SERIAL PRIMARY KEY
- `name` - TEXT
- `category` - TEXT (Foreign Key ke categories)
- `price` - DOUBLE PRECISION (Harga dalam Rupiah)
- `created_at` - TIMESTAMP

**product_stocks** - Stok/inventaris produk
- `id` - SERIAL PRIMARY KEY
- `product_id` - INTEGER UNIQUE (Foreign Key ke products)
- `quantity` - INTEGER (Jumlah stok)
- `updated_at` - TIMESTAMP

**purchases** - Transaksi pembelian
- `id` - SERIAL PRIMARY KEY
- `product_id` - INTEGER (Foreign Key ke products)
- `quantity` - INTEGER
- `total_price` - DOUBLE PRECISION
- `status` - TEXT ('active' atau 'cancelled')
- `notes` - TEXT
- `purchased_at` - TIMESTAMP
- `cancelled_at` - TIMESTAMP

**admins** - Akun administrator
- `id` - SERIAL PRIMARY KEY
- `username` - TEXT UNIQUE
- `password` - TEXT
- `role` - TEXT ('admin' atau 'super_admin')

**settings** - Pengaturan aplikasi
- `key` - TEXT PRIMARY KEY
- `value` - TEXT

---

## 📡 API Endpoints

### Public Routes
- `GET /login` - Halaman login
- `POST /login` - Proses autentikasi
- `GET /logout` - Logout

### Protected Routes (Memerlukan Login)
- `GET /` - Dashboard utama
- `GET /products` - Daftar produk
- `GET /products/add` - Form tambah produk
- `POST /products/add` - Proses tambah produk
- `POST /products/:id/restock` - Restok produk
- `GET /categories` - Daftar kategori
- `POST /categories/add` - Tambah kategori
- `GET /purchases` - Daftar pembelian
- `GET /purchases/add` - Form tambah pembelian
- `POST /purchases/add` - Proses tambah pembelian
- `POST /purchases/:id/cancel` - Batalkan pembelian

### AI Assistant Routes
- `GET /assistant` - Halaman chatbot
- `POST /assistant/chat` - Kirim pesan ke chatbot
- `POST /assistant/clear` - Hapus riwayat chat
- `GET /assistant/settings` - Pengaturan AI (Super Admin only)
- `POST /assistant/settings` - Simpan pengaturan AI (Super Admin only)

---

## 📄 License

ISC

