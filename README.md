# XIONCO — Unified Admin Panel & AI Assistant

Selamat datang di repositori **XIONCO**. Repositori ini berisi dua proyek utama yang dirancang untuk mengelola katalog furnitur, stok inventaris, pencatatan transaksi pembelian, serta asisten AI interaktif untuk membantu administrasi toko.

---

## 📁 Struktur Workspace

Workspace ini terbagi menjadi dua sub-direktori utama:

1. **[ADMIN-PAGE/](file:///d:/Project-Preinterview-XIONCO%202026/ADMIN-PAGE)** (Portal Utama - Port 3000):
   * Aplikasi dashboard admin utama berbasis **Express.js** & **EJS**.
   * Memiliki sistem visualisasi grafik keuangan & kategori (Chart.js), manajemen produk & stok, manajemen kategori, transaksi pembelian (SweetAlert2), serta **AI Assistant yang sudah terintegrasi secara nativ**.
   * Dilengkapi fitur pembagian hak akses **Role (Super Admin & Admin)** dan pengelolaan parameter AI dinamis berbasis database dengan *fallback* cerdas ke mode in-memory (Demo Mode).
2. **[CHATBOT-AI/](file:///d:/Project-Preinterview-XIONCO%202026/CHATBOT-AI)** (Sandbox Mockup - Port 3001):
   * Proyek purwarupa (*sandbox mockup*) chatbot AI mandiri.
   * Dibuat menggunakan **Tailwind CSS** bertema *dark mode* premium untuk simulasi percakapan multi-turn AI dengan Server-Sent Events (SSE).

---

## 🚀 Fitur Utama & Integrasi Nativ (`ADMIN-PAGE`)

* **Dashboard Analitik**: Menampilkan total produk aktif, transaksi, total omzet, chart tren pendapatan harian (Line Chart), dan sebaran kategori produk (Doughnut Chart).
* **Autentikasi Session & Hak Akses Role**:
  * **Super Admin** (`superadmin`/`superadmin`): Memiliki akses penuh ke dashboard serta panel konfigurasi AI ⚙️.
  * **Admin Biasa** (`admin`/`admin`): Dapat mengelola katalog dan menggunakan chatbot asisten, tetapi diblokir dari panel konfigurasi AI.
* **AI Assistant Terintegrasi**: Chatbot asisten AI interaktif yang mengalirkan teks secara real-time (*streaming* SSE), mendukung markdown (Marked.js), turn-taking memory, dan tombol salin teks respons.
* **Hybrid Database Engine (Demo Mode / PostgreSQL)**:
  * **Production Mode**: Mendukung PostgreSQL (Supabase / Neon / Postgres Lokal) menggunakan connection pooling aman.
  * **In-Memory Demo Mode**: Jika `DATABASE_URL` kosong atau koneksi database gagal/offline, aplikasi secara otomatis **beralih ke database in-memory JS** dengan data dummy yang sudah terisi lengkap (10 produk, stok, kategori, dan riwayat transaksi). Aplikasi dapat langsung dicoba tanpa setup database cloud!

---

## ⚙️ Variabel Lingkungan (.env)

Masing-masing proyek memiliki konfigurasi `.env` sendiri. Salin `.env.example` ke `.env` di masing-masing sub-folder.

### Konfigurasi [ADMIN-PAGE/.env](file:///d:/Project-Preinterview-XIONCO%202026/ADMIN-PAGE/.env):
```env
# Database (Kosongkan jika ingin masuk ke In-Memory Demo Mode)
DATABASE_URL=postgresql://postgres:password@host:port/postgres
PORT=3000

# Konfigurasi AI Engine
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_gemini_api_key_here
SYSTEM_PROMPT=Kamu adalah asisten AI dari XIONCO...
```

### Konfigurasi [CHATBOT-AI/.env](file:///d:/Project-Preinterview-XIONCO%202026/CHATBOT-AI/.env):
```env
PORT=3001
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_gemini_api_key_here
SYSTEM_PROMPT=Kamu adalah asisten AI dari XIONCO...
```

---

## ⚡ Langkah Pemasangan & Menjalankan secara Lokal

### 1. Jalankan Portal Admin Utama (`ADMIN-PAGE` - Port 3000)
1. Pindah ke direktori `ADMIN-PAGE`:
   ```bash
   cd ADMIN-PAGE
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Lakukan seeding awal (opsional, hanya jika menggunakan database PostgreSQL aktif):
   ```bash
   npm run seed
   ```
4. Jalankan aplikasi dalam mode dev:
   ```bash
   npm run dev
   ```
   Buka browser pada alamat [http://localhost:3000](http://localhost:3000).

### 2. Jalankan Sandbox Chatbot Mandiri (`CHATBOT-AI` - Port 3001)
1. Pindah ke direktori `CHATBOT-AI`:
   ```bash
   cd CHATBOT-AI
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Jalankan aplikasi:
   ```bash
   npm run dev
   ```
   Buka browser pada alamat [http://localhost:3001](http://localhost:3001).

---

## 🚀 Panduan Deployment ke Vercel

Deployment ke Vercel dikonfigurasi menggunakan **Vercel Zero Config** melalui file [ADMIN-PAGE/vercel.json](file:///d:/Project-Preinterview-XIONCO%202026/ADMIN-PAGE/vercel.json).

### Langkah-langkah Deploy:
1. Hubungkan repositori GitHub Anda ke akun **Vercel**.
2. Buat proyek baru di Vercel dan pilih repositori workspace ini.
3. Sesuaikan parameter konfigurasi Vercel berikut:
   * **Root Directory**: Ubah menjadi **`ADMIN-PAGE`** (karena kita hanya men-deploy sistem admin portal yang telah menyatu dengan AI).
   * **Framework Preset**: Pilih **`Other`**.
4. Di bagian **Environment Variables**, tambahkan:
   * `NODE_ENV` = `production`
   * `GEMINI_API_KEY` = *(API Key Google Gemini Anda)*
   * `AI_PROVIDER` = `gemini`
   * `AI_MODEL` = `gemini-2.5-flash`
   * `SYSTEM_PROMPT` = *(Instruksi prompt sistem)*
   * `DATABASE_URL` = *(Kosongkan jika ingin menggunakan mode in-memory demo, atau isi dengan tautan PostgreSQL cloud Supabase/Neon Anda)*
5. Klik **Deploy**.

> [!TIP]
> **Sesi Login di Vercel**: Karena Vercel menggunakan Serverless Functions yang bersifat *stateless*, user admin mungkin akan logout secara acak jika menggunakan memori bawaan. Di lingkungan production, disarankan untuk mengonfigurasi penyimpanan sesi berbasis database (`connect-pg-simple`) menggunakan database PostgreSQL yang sama. Langkah instalasinya dapat dilihat pada berkas [ADMIN-PAGE/README.md](file:///d:/Project-Preinterview-XIONCO%202026/ADMIN-PAGE/README.md).
