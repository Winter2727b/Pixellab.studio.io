# PixelLab Studio v2 — Image Editor

Editor gambar dan reka bentuk untuk Android, iPhone dan desktop, dibina dengan HTML, CSS dan JavaScript tulen. Tiada keperluan akaun, langganan atau API luaran.

## Cara menjalankan

- **Satu fail:** buka `PixelLab_Studio_v2_Offline.html` di Chrome, Safari atau browser moden.
- **Sebagai website:** ekstrak ZIP, muat naik `index.html`, `style.css`, `app.js` ke folder root hosting statik, kemudian lawati domain hosting.
- Untuk ujian secara lokal, buka `index.html` atau gunakan pelayan statik seperti `python -m http.server 8000` dalam folder ini.

## Fitur baharu v2

1. **Buka imej:** tekan butang **Buka imej** di atas untuk memilih gambar. Pilih nisbah crop dan kemudian tekan **Buka sebagai kanvas**. Kanvas baru menggunakan dimensi/nibah hasil crop; imej kekal sebagai layer yang boleh diedit.
2. **Crop ketika import:** pilih Asal, 1:1, 4:5, 3:4, 16:9, 9:16, 3:2 atau Bebas. Seret bahagian tengah bingkai untuk mengalih crop atau seret penjuru untuk mengubah saiznya. Pilih **Tambah layer** jika hendak menggunakan projek yang ada.
3. **Maintain Ratio:** apabila memilih objek, buka panel **Saiz & posisi**, aktifkan **Maintain Ratio** untuk mengekalkan nisbah lebar/tinggi semasa resize dari panel atau bucu pada kanvas. Tekan Shift ketika drag untuk mengganti sementara status kunci nisbah.
4. **Relative Size:** gerakkan slider dari 10–300% atau tekan preset 50%, 75%, 100%, 150%. Saiz relatif diukur terhadap saiz objek pada masa mula dimasukkan / mula menggunakan tetapan relatif.
5. **Saiz kanvas:** pilih Saiz tersuai pada bahagian atas. Maintain Ratio di dialog ini akan mengubah tinggi secara automatik apabila lebar diubah (dan sebaliknya).
6. **Reka bentuk minimalis:** antara muka terang dan responsif dengan toolbar bawah untuk telefon.

## Fitur sedia ada

- Tambah teks, font, tipografi, outline, bayang, gradient, 3D, curve, reflection, emboss, tekstur
- Import imej, crop (termasuk crop manual selepas import), efek, opacity, perspektif, remove background mengikut warna
- Bentuk, stiker, emoji, lukisan, berus, latar warna/gradient/imej/transparan
- Layers, lock, duplicate, delete, susun ke depan/belakang, undo/redo
- Simpan dan buka projek JSON, eksport PNG/JPG/WebP pada resolusi 1×/2×/3×, kongsi melalui Web Share apabila disokong browser

## Nota

- Crop ketika import menghasilkan salinan imej crop pada layer, jadi bahagian di luar crop bukan sebahagian daripada imej import baharu.
- Gambar yang sangat besar dikecilkan kepada panjang maksimum 5000 px pada proses import sambil mengekalkan nisbah.
- Projek boleh disimpan sebagai JSON untuk diedit kemudian. Autosave ke browser juga dicuba secara setempat bergantung pada ruang storan.
- Remove Background menggunakan padanan warna (bukan AI semantik).
