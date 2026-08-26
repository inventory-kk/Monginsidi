# Inventory KK — Rebuild

Rebuild dari awal berdasarkan obrolan sesi: dashboard inventory, master item, gudang IN/OUT + FEFO, batch expire, Daily SO, estimasi order, draft order, export/import, dan login berbasis group.

## Login demo
- `admin / admin123` → Admin
- `manager / 654321` → Manager
- `staff / 123456` → Staff
- `viewer / 111111` → Viewer

## Catatan penting
Ini adalah static web yang cocok untuk GitHub Pages. Login dan data saat ini disimpan di browser (`localStorage`), sehingga **bukan autentikasi produksi** dan data antar-device belum sinkron.

Untuk versi produksi dengan user/grup nyata, tahap berikutnya adalah mengganti auth + penyimpanan ke backend (misalnya Supabase/Firebase) dan menambahkan Row Level Security/role rules.

## Deploy ke GitHub Pages
Upload `index.html`, `style.css`, `app.js`, `manifest.webmanifest`, dan `sw.js` ke repository Pages.
