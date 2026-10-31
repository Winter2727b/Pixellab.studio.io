# PixelLab Studio v2.3 — font kekal & import pukal

Versi kemas kini kepada PixelLab Studio v2.2. Reka bentuk minimalis, alat utama, aliran import/crop imej, nisbah kanvas, Relative Size, layers, simpanan projek dan eksport **dikekalkan**.

## Ditambah dalam v2.3

- **Import banyak font sekali gus:** Tekan alat **Font** pada bar sebelah, **Pustaka font** pada panel utama atau dalam editor teks, kemudian pilih banyak fail `.ttf`, `.otf`, `.woff`, `.woff2` pada satu masa. Had maksimum **15 MB setiap fail**. Jika layer teks dipilih, font pertama yang berjaya diimport digunakan secara automatik.
- **Font tersimpan secara kekal pada pelayar tersebut:** Pustaka font menggunakan **IndexedDB** (dan fallback localStorage jika IndexedDB tidak tersedia). Font yang telah dipasang boleh digunakan pada projek baharu dan selepas editor dibuka semula pada pelayar/origin yang sama. Tiada server diperlukan.
- **Font boleh digunakan pada banyak projek:** Semua font yang tersimpan muncul pada pilihan font untuk mana-mana layer teks; tekan **Pustaka font** untuk melihat koleksi dan menerapkan font.
- **Projek boleh dipindahkan:** Fail `.pixellab.json` menyertakan data font tersuai yang digunakan atau dikaitkan dengan projek. Import projek pada pelayar lain akan memasukkan fontnya ke pustaka pada pelayar tersebut.
- **Autosave lebih tahan kuota:** Simpanan automatik projek juga menggunakan IndexedDB. Sejarah undo/redo menyimpan rujukan font sahaja supaya koleksi besar tidak memenuhi memori. Simpan JSON secara berkala untuk backup.
- **Nota storan:** Font tersimpan pada data laman/pelayar, bukan ditulis ke dalam fail `.html` itu sendiri. Mengosongkan data laman, membuka dari alamat/lokasi fail yang lain, atau menggunakan mod privasi boleh memisahkan/memadam pustaka. Eksport fail projek JSON untuk membawa font yang digunakan bersama projek.

## Ditambah dalam v2.2

- **Dark / Light Mode:** Tekan butang **☾ Gelap / ☀ Cerah** pada bar atas untuk menukar tema antara mod cerah dan gelap. Pada telefon, butang memaparkan ikon sahaja.
- **Tema disimpan secara automatik:** Pilihan dipulihkan apabila website dibuka semula menggunakan storan pelayar (`pixellab-studio-theme`). Tema asal bagi pengguna baharu kekal **cerah**.
- **Tema untuk antaramuka sahaja:** Warna kanvas, objek, imej dan fail PNG/JPG/WebP eksport tidak terjejas. Panel, butang, borang, modals dan aliran crop menggunakan tema yang dipilih.
- Website berfungsi secara statik tanpa sambungan internet atau server.

## Penambahan terdahulu dalam v2.1

- **Import font sendiri:** Buka alat **Teks**, pilih atau tambah layer teks, kemudian tekan **＋ Import font sendiri**. Pilih fail `.ttf`, `.otf`, `.woff` atau `.woff2` (maksimum 15 MB). Font akan digunakan pada teks dipilih dan tersedia dalam pilihan jenis font projek.
- **Font bersama projek:** Data font disertakan dalam fail projek `.pixellab.json`, supaya font dipulihkan ketika projek dibuka semula. Fail projek boleh menjadi lebih besar selepas memasukkan font. Auto-save dan pustaka font menggunakan storan browser, tetapi simpan JSON sebagai salinan projek.
- **14 bentuk baharu:** segi lima, segi enam, segi lapan, hati, palang, kilat, buih dialog, awan, trapezium, paralelogram, chevron, segi tiga siku, separuh bulat dan perisai. Semua boleh diubah warna, saiz, putaran, gradient dan outline melalui editor bentuk sedia ada.
- **Stiker/emoji tambahan:** Koleksi baharu dipecahkan mengikut kumpulan Popular, Hiasan & simbol, Emoji & ekspresi, Alam & haiwan, Makanan & minuman, Aktiviti & objek, serta Hati & isyarat. Ikon menggunakan emoji sistem, jadi rupa glyph mungkin sedikit berbeza antara telefon dan komputer.

## Cara jalankan

1. Buka `index.html` pada browser (Chrome, Safari, Firefox, Edge) atau hos folder ini pada penyedia hosting statik.
2. Editor berjalan di pihak browser; tiada server atau akaun diperlukan.
3. Untuk penggunaan offline satu fail, buka `PixelLab_Studio_v2.3_Offline.html` yang disertakan dalam ZIP.

## Kandungan

- `index.html` — susun atur editor
- `style.css` — gaya antaramuka cerah dan gelap yang responsif
- `app.js` — fungsi editor, font, bentuk, pelekat dan pengurusan tema
- `PixelLab_Studio_v2.3_Offline.html` — semua HTML/CSS/JS dalam satu fail, boleh terus dibuka dalam browser
- `README.md` — panduan ini
