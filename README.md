# Live Counting Pemilihan Himpunan

Website live counting pemilihan ketua & wakil ketua himpunan. Data suara di-import dari file Excel/CSV (export form), lalu diverifikasi PANWASLU (`SAH` / `TIDAK_SAH`); hanya suara **SAH** yang dihitung di halaman publik.

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
4. **Users** — buat akun PANWASLU.
5. **Verifikasi Suara** — import file suara (export form / spreadsheet), lalu PANWASLU verifikasi.

### Format file suara

Export dari form / spreadsheet dengan kolom:

| Kolom | Header |
| --- | --- |
| Timestamp | `Timestamp` |
| Nama | `Nama Lengkap` |
| NIM | `NIM / NPM` |
| Prodi | `Program Studi` |
| Kelas | `Kelas` |
| Pilihan | `Silakan Pilih Salah Satu Pasang Calon` (mis. `Paslon 01 - Dimas & Aldo`) |
| Pernyataan | `Pernyataan Pribadi` |

Format: `.xlsx`, `.xls`, atau `.csv`. Import ulang aman — baris yang sama (NIM + timestamp) diperbarui, bukan diduplikasi.

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
```

## Halaman

| Route | Akses |
| --- | --- |
| `/` | Live counting publik (persentase + grafik) |
| `/login` | Login staff |
| `/dashboard` | Analytics (sidebar) |
| `/dashboard/votes` | Verifikasi suara + import (admin) |
| `/dashboard/mahasiswa` | Master mahasiswa (pagination + import) |
| `/dashboard/paslon` | Kelola paslon |
| `/dashboard/users` | Kelola PANWASLU |
