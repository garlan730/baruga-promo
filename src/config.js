// Edit campaign details here.

// Files in /public, resolved against the deploy base (e.g. /baruga-promo/ on GitHub Pages).
export const asset = (path) => `${import.meta.env.BASE_URL}${path}`

export const CLINIC = {
  name: 'Klinik Utama Baruga Medical Center',
  shortName: 'Baruga Medical Center',
  instagram: 'barugamedicalcenter',
  whatsapp: '6285121019161', // Poli Gigi, international format without "+"
  address: 'Jl. Raya Baruga No.28, Antang, Manggala, Makassar 90234',
  mapsUrl: 'https://maps.app.goo.gl/yTKFD9eF7oSNfg1E9',
  timeZone: 'Asia/Makassar',
}

export const PROMO = {
  discount: '20%',
  title: 'Diskon 20% Perawatan Ortodonti (Behel)',
  subtitle: 'Plus konsultasi awal GRATIS untuk perawatan ortodonti & prostodonti bersama dokter gigi spesialis.',
  terms: 'Berlaku 23 Okt – 22 Nov 2026. Syarat & ketentuan berlaku. Kuota terbatas.',
}

// Campaign window (inclusive, clinic dates). Keep in sync with apps-script/Code.gs.
export const CAMPAIGN = {
  start: '2026-10-23',
  end: '2026-11-22',
}

// Google Apps Script web app that reserves slots and adds them to Google Calendar.
// Set VITE_BOOKING_API_URL in .env.local (see apps-script/README.md).
export const BOOKING_API_URL = import.meta.env.VITE_BOOKING_API_URL || ''

// Treatments covered by the promo; `id` is what the booking form sends.
export const TREATMENTS = [
  {
    id: 'Ortodonti',
    short: 'Behel',
    offers: ['Diskon 20%', 'Konsultasi gratis'],
    icon: '😁',
    title: 'Ortodonti (Behel)',
    text: 'Merapikan gigi berjejal, renggang, atau maju agar senyum rapi dan fungsi kunyah lebih baik.',
    items: ['Kawat gigi / behel', 'Rencana perawatan bertahap', 'Kontrol rutin'],
  },
  {
    id: 'Prostodonti',
    short: 'Gigi Palsu',
    offers: ['Konsultasi gratis'],
    icon: '🦷',
    title: 'Prostodonti (Gigi Tiruan)',
    text: 'Mengganti gigi yang hilang atau rusak, termasuk implan gigi, agar nyaman makan, berbicara, dan tersenyum.',
    items: ['Gigi palsu lepasan', 'Gigi palsu cekat', 'Crown & bridge', 'Implan gigi'],
  },
]

// Photos go in /public/doctors/<photo>; a missing photo falls back to initials.
export const DOCTORS = [
  { name: 'drg. Gerwyn Dewanta P., Sp.Orto', specialty: 'Ortodonti', photo: asset('doctors/gerwyn.jpg') },
  { name: 'drg. Muh. Arizal Fuad Alam, Sp.Ort', specialty: 'Ortodonti', photo: asset('doctors/arizal.jpg') },
  { name: 'drg. Ian Afifah Sudarman, Sp.Pros', specialty: 'Prostodonti', photo: asset('doctors/ian.jpg') },
  { name: 'drg. Andi Adhiyat Takdir, Sp.Pros', specialty: 'Prostodonti', photo: asset('doctors/adhiyat.jpg') },
  { name: 'drg. Rezki Wahyuni Syamsuddin, Sp.Pros', specialty: 'Prostodonti', photo: asset('doctors/rezki.jpg') },
  { name: 'drg. Husnul Basyar, Sp.BMM', specialty: 'Bedah Mulut & Maksilofasial', photo: asset('doctors/husnul.jpg') },
  { name: 'drg. Nur Masyta Suriadi, Sp.Perio', specialty: 'Periodonti', photo: asset('doctors/masyta.jpg') },
]

// Consultation hours: Monday–Saturday (1–6), 17.00–22.00, 30-minute slots.
export const SCHEDULE = {
  openDays: [1, 2, 3, 4, 5, 6],
  startHour: 17,
  endHour: 22,
  slotMinutes: 30,
}
