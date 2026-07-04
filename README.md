# Live Counting Pemilihan Himpunan

Website live counting pemilihan ketua & wakil ketua himpunan. Data suara dari Google Spreadsheet diverifikasi PANWASLU (`SAH` / `TIDAK_SAH`); hanya suara **SAH** yang dihitung di halaman publik.

## Menjalankan

```bash
cp .env.example .env
docker compose up -d
```

Image di-build otomatis jika belum ada (pertama kali beberapa menit). Setelah ubah kode:

```bash
docker compose up -d --build
```

Buka [http://localhost:3000](http://localhost:3000)

| | |
| --- | --- |
| Login admin | `admin@example.com` / `admin123` |
| Stop | `docker compose down` |
| Log | `docker compose logs -f` |

Migrasi database dan seed admin berjalan otomatis saat container start.

## Setelah jalan

1. Login sebagai ADMIN.
2. **Mahasiswa** — import Excel (kolom: `NIM`, `NAMA`, `KELAS`, `ANGKATAN`, `PRODI`).
3. **Paslon** — tambah pasangan calon (nomor `01`, `02`, … sesuai form).
4. **Sinkronisasi** — isi Spreadsheet ID (atau set di `.env`).
5. **Users** — buat akun PANWASLU.
6. Sinkronkan suara, lalu PANWASLU verifikasi di **Dashboard**.

### Pengecekan otomatis suara

Setiap suara dicek terhadap master mahasiswa:

| Hasil cek | Arti | Bisa SAH / TIDAK SAH? |
| --- | --- | --- |
| Layak diverifikasi | NIM terdaftar & belum memilih | Ya |
| NIM tidak terdaftar | NIM tidak ada di master | Tidak |
| Sudah memilih | NIM sudah punya suara SAH | Tidak |

Saat suara di-**SAH**, status mahasiswa berubah menjadi **Sudah memilih**.

## Variabel `.env`

Salin dari `.env.example`. Yang penting:

```env
AUTH_SECRET=ganti-dengan-secret-panjang-acak
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin Pemilu

# Opsional — Google Sheets
SPREADSHEET_ID=
SHEET_NAME=Form Responses 1
GOOGLE_SERVICE_ACCOUNT=
```

Untuk Sheets: enable Google Sheets API, buat service account, share spreadsheet sebagai Viewer, lalu isi `SPREADSHEET_ID` dan `GOOGLE_SERVICE_ACCOUNT` (JSON satu baris).

Kolom spreadsheet A–H: Timestamp, Email Address, Nama Lengkap, NIM / NPM, Program Studi, KELAS, pilihan paslon, PERNYATAAN PRIBADI.

## Halaman

| Route | Akses |
| --- | --- |
| `/` | Live counting publik (persentase + grafik) |
| `/login` | Login staff |
| `/dashboard` | Analytics (sidebar) |
| `/dashboard/votes` | Verifikasi suara |
| `/dashboard/mahasiswa` | Master mahasiswa (pagination + import) |
| `/dashboard/paslon` | Kelola paslon |
| `/dashboard/users` | Kelola PANWASLU |
| `/dashboard/sync` | Sinkronisasi spreadsheet |
