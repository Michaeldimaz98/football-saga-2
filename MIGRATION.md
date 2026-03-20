# Football Saga 2 — Panduan Migrasi

## Cara Jalankan (Baru)

```bash
node index.js
# atau
npm start
```

## Yang Berubah

| Sebelum | Sesudah |
|---------|---------|
| `node server.js` | `node index.js` |
| Session Map (hilang saat restart) | Cookie HMAC (persistent) |
| SHA256 password | PBKDF2 (lebih aman) |
| 1 file 1600+ baris | Modular: src/services, src/routes |

## Fallback ke server.js lama

```bash
node server.js
# atau
npm run start:legacy
```

## Struktur Folder

```
football_saga_v2/
├── index.js          ← Entry point BARU
├── server.js         ← Legacy (masih bisa dipakai)
├── src/              ← Sistem modular
│   ├── app.js
│   ├── config/
│   ├── services/
│   ├── routes/
│   └── ...
├── data/
│   ├── users.json        ← Format array (sudah dikonversi)
│   ├── save_template.json ← Template user baru (kosong)
│   ├── equipment.json
│   ├── shop.json
│   └── saves/
│       └── michaeldimaz.json  ← Save data user
└── public/
    ├── index.html
    ├── main.js
    └── style.css
```

## Login Tidak Berubah

Password kamu tetap sama. Sistem baru otomatis
membaca hash lama (SHA256) dan tetap bisa login.
