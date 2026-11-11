import { useEffect, useMemo, useRef, useState } from 'react'
import { BOOKING_API_URL, CLINIC, DOCTORS, PROMO, TREATMENTS, asset } from './config'
import { campaignRange, dayLabel, formatLongDate, slotKey, slotsFor, toKey, upcomingDays } from './schedule'
import './App.css'

function Logo({ size = 40 }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <span className="logo-fallback" style={{ width: size, height: size }}>B</span>
  }
  return (
    <img src={asset('logo.png')} alt={CLINIC.shortName} width={size} height={size}
      className="logo" onError={() => setFailed(true)} />
  )
}

function DoctorPhoto({ doctor }) {
  const [failed, setFailed] = useState(false)
  const initials = doctor.name.replace(/^drg?\.\s*/i, '').split(' ').slice(0, 2).map((w) => w[0]).join('')
  if (failed) return <div className="doctor-photo doctor-initials">{initials}</div>
  return <img className="doctor-photo" src={doctor.photo} alt={doctor.name} onError={() => setFailed(true)} />
}

const INCLUDED = [
  'Konsultasi awal GRATIS',
  'Diskon 10% perawatan ortodonti (behel)',
  'Pemeriksaan & rencana perawatan',
  'Ditangani langsung dokter gigi spesialis',
]

// Patient photos cropped from @barugamedicalcenter posts and color-matched, in /public/before-after.
const BEFORE_AFTER = [
  { n: 3, treatment: 'Ortodonti' },
  { n: 6, treatment: 'Ortodonti' },
  { n: 1, treatment: 'Ortodonti' },
  { n: 2, treatment: 'Ortodonti' },
].map(({ n, treatment }) => ({
  treatment,
  before: asset(`before-after/case-${n}-before.jpg`),
  after: asset(`before-after/case-${n}-after.jpg`),
}))

function BeforeAfter() {
  const trackRef = useRef(null)
  const [index, setIndex] = useState(0)

  // Distance between the starts of two neighbouring cards.
  function step() {
    const cards = trackRef.current.children
    return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 1
  }

  function onScroll() {
    setIndex(Math.round(trackRef.current.scrollLeft / step()))
  }

  function goTo(i) {
    trackRef.current.scrollTo({ left: i * step(), behavior: 'smooth' })
  }

  return (
    <div className="ba">
      <div className="ba-track" ref={trackRef} onScroll={onScroll}>
        {BEFORE_AFTER.map((c, i) => (
          <figure className="ba-card" key={c.before}>
            <figcaption className="ba-card-head">
              <span>Pasien {String(i + 1).padStart(2, '0')}</span>
              <span className="muted">Perawatan {c.treatment}</span>
            </figcaption>
            <div className="ba-photo">
              <img src={c.before} alt={`Pasien ${i + 1} sebelum perawatan`} loading={i < 2 ? 'eager' : 'lazy'} />
              <span className="ba-chip">Sebelum</span>
            </div>
            <div className="ba-arrow" aria-hidden="true">↓</div>
            <div className="ba-photo">
              <img src={c.after} alt={`Pasien ${i + 1} sesudah perawatan`} loading={i < 2 ? 'eager' : 'lazy'} />
              <span className="ba-chip ba-chip-after">Sesudah</span>
              <img className="ba-mark" src={asset('logo.png')} alt="" aria-hidden="true" />
            </div>
          </figure>
        ))}
      </div>
      <div className="ba-dots">
        {BEFORE_AFTER.map((c, i) => (
          <button key={c.before} type="button" aria-label={`Pasien ${i + 1}`}
            className={`ba-dot ${i === index ? 'active' : ''}`} onClick={() => goTo(i)} />
        ))}
      </div>
      <p className="hint">Geser untuk melihat hasil lainnya. Hasil perawatan dapat berbeda pada setiap pasien.</p>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.5 9.5 0 0 1-4.84-1.33l-.35-.2-3.6.94.96-3.5-.23-.36a9.46 9.46 0 0 1-1.45-5.05c0-5.24 4.27-9.5 9.52-9.5a9.46 9.46 0 0 1 9.5 9.51c0 5.24-4.27 9.5-9.5 9.5zm8.09-17.6A11.36 11.36 0 0 0 12.04.5C5.74.5.62 5.62.62 11.92c0 2.01.52 3.98 1.52 5.71L.5 23.5l6.02-1.58a11.4 11.4 0 0 0 5.51 1.4h.01c6.3 0 11.42-5.12 11.42-11.42 0-3.05-1.19-5.92-3.33-8.08z" />
    </svg>
  )
}

function useBookedSlots() {
  const [booked, setBooked] = useState(new Set())
  const [loading, setLoading] = useState(Boolean(BOOKING_API_URL))

  useEffect(() => {
    if (!BOOKING_API_URL) return
    const { from, to } = campaignRange()
    fetch(`${BOOKING_API_URL}?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data) => setBooked(new Set(data.booked || [])))
      .catch(() => {}) // the server still rejects taken slots on submit
      .finally(() => setLoading(false))
  }, [])

  const markTaken = (key) => setBooked((prev) => new Set(prev).add(key))
  return { booked, loading, markTaken }
}

function BookingForm() {
  const { booked, loading, markTaken: onTaken } = useBookedSlots()
  const days = useMemo(() => upcomingDays(booked), [booked])
  const [pickedKey, setDateKey] = useState('')
  const dateKey = days.some((d) => toKey(d) === pickedKey) ? pickedKey : (days[0] ? toKey(days[0]) : '')
  const [time, setTime] = useState('')
  const [treatment, setTreatment] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedDate = days.find((d) => toKey(d) === dateKey)
  const slots = selectedDate ? slotsFor(selectedDate, booked) : []

  function pickDate(d) {
    setDateKey(toKey(d))
    setTime('')
  }

  // Reserve the slot (and create the calendar event) before handing off to WhatsApp.
  async function reserve() {
    if (!BOOKING_API_URL) {
      console.warn('VITE_BOOKING_API_URL not set: skipping slot reservation')
      return { ok: true }
    }
    const res = await fetch(BOOKING_API_URL, {
      method: 'POST',
      // text/plain keeps this a "simple" request, which Apps Script needs (no CORS preflight).
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ treatment, name: name.trim(), phone: phone.trim(), note: note.trim(), date: dateKey, time }),
    })
    return res.json()
  }

  async function submit(e) {
    e.preventDefault()
    if (!selectedDate || !time) return setError('Mohon pilih tanggal dan jam konsultasi.')
    if (!name.trim()) return setError('Mohon isi nama lengkap.')
    if (!/^[0-9+\s-]{9,16}$/.test(phone.trim())) return setError('Mohon isi nomor WhatsApp yang valid.')
    if (!treatment) return setError('Mohon pilih jenis perawatan.')
    setError('')
    setSubmitting(true)

    let result
    try {
      result = await reserve()
    } catch {
      result = { ok: false, error: 'network' }
    }
    if (!result.ok) {
      setSubmitting(false)
      if (result.error === 'taken') {
        onTaken(slotKey(selectedDate, time))
        setTime('')
        return setError('Maaf, jam tersebut baru saja dibooking pasien lain. Silakan pilih jam lain.')
      }
      if (result.error === 'invalid_slot') {
        setTime('')
        return setError('Jam tersebut sudah tidak tersedia. Silakan pilih jam lain.')
      }
      return setError('Booking gagal terkirim. Periksa koneksi internet Anda lalu coba lagi.')
    }

    const chosen = TREATMENTS.find((t) => t.id === treatment)
    const lines = [
      'Halo Baruga Medical Center,',
      'Saya ingin booking *Konsultasi Gratis*.',
      '',
      `Perawatan: ${chosen.title}`,
      `Promo: ${chosen.offers.join(' + ')}`,
      `Nama: ${name.trim()}`,
      `No. WA: ${phone.trim()}`,
      `Tanggal: ${formatLongDate(selectedDate)}`,
      `Jam: ${time} WITA`,
    ]
    if (note.trim()) lines.push(`Keluhan/Catatan: ${note.trim()}`)
    lines.push('', 'Terima kasih!')

    window.location.href = `https://wa.me/${CLINIC.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`
  }

  if (!loading && days.length === 0) {
    return (
      <div className="booking-card">
        <p className="hint">Periode promo telah berakhir atau jadwal sudah penuh. Hubungi kami via WhatsApp untuk info jadwal berikutnya.</p>
        <a className="btn btn-primary btn-block" href={`https://wa.me/${CLINIC.whatsapp}`}><WhatsAppIcon /> Chat WhatsApp</a>
      </div>
    )
  }

  return (
    <form className="booking-card" onSubmit={submit} noValidate>
      <p className="field-label">1. Pilih tanggal</p>
      <div className="date-strip" role="radiogroup" aria-label="Tanggal">
        {days.map((d) => {
          const l = dayLabel(d)
          const active = toKey(d) === dateKey
          return (
            <button type="button" key={toKey(d)} role="radio" aria-checked={active}
              className={`date-chip ${active ? 'active' : ''}`} onClick={() => pickDate(d)}>
              <span className="date-day">{l.day}</span>
              <span className="date-num">{l.date}</span>
              <span className="date-month">{l.month}</span>
            </button>
          )
        })}
      </div>

      <p className="field-label">2. Pilih jam <span className="muted">(WITA)</span></p>
      {loading ? (
        <p className="hint">Memuat jadwal yang tersedia…</p>
      ) : (
        <div className="slot-grid" role="radiogroup" aria-label="Jam">
          {slots.map((s) => (
            <button type="button" key={s.label} role="radio" aria-checked={time === s.label}
              disabled={!s.available}
              className={`slot ${time === s.label ? 'active' : ''} ${s.booked ? 'booked' : ''}`}
              onClick={() => setTime(s.label)}>
              {s.label}
              {s.booked && <span className="slot-tag">Penuh</span>}
            </button>
          ))}
        </div>
      )}

      <label className="field-label" htmlFor="name">3. Data diri</label>
      <input id="name" className="input" placeholder="Nama lengkap" autoComplete="name"
        value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="No. WhatsApp (cth. 0812xxxx)" inputMode="tel" autoComplete="tel"
        aria-label="Nomor WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />

      <p className="field-label">4. Perawatan &amp; keluhan</p>
      <div className="treatment-grid" role="radiogroup" aria-label="Perawatan">
        {TREATMENTS.map((t) => (
          <button type="button" key={t.id} role="radio" aria-checked={treatment === t.id}
            className={`treatment-option ${treatment === t.id ? 'active' : ''}`}
            onClick={() => setTreatment(t.id)}>
            <span className="treatment-label">
              {t.id}
              <small>({t.short})</small>
            </span>
          </button>
        ))}
      </div>
      <textarea className="input" rows={2} placeholder="Keluhan / catatan (opsional)"
        aria-label="Keluhan atau catatan" value={note} onChange={(e) => setNote(e.target.value)} />

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        <WhatsAppIcon /> {submitting ? 'Memproses booking…' : 'Booking via WhatsApp'}
      </button>
      <p className="hint">Jadwal Anda langsung kami kunci, lalu Anda diarahkan ke WhatsApp untuk mengirim detail booking.</p>
    </form>
  )
}

export default function App() {
  const bookingRef = useRef(null)
  const scrollToBooking = () => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="page">
      <header className="topbar">
        <Logo size={36} />
        <div>
          <div className="brand-name">{CLINIC.shortName}</div>
          <div className="brand-sub">Klinik Utama · Makassar</div>
        </div>
      </header>

      <section className="hero">
        <span className="badge">PROMO ORTODONTI</span>
        <h1>
          Senyum Rapi,<br />Hemat <span className="hero-discount">{PROMO.discount}</span>
        </h1>
        <p className="hero-title">{PROMO.title}</p>
        <p className="hero-sub">{PROMO.subtitle}</p>
        <button className="btn btn-light" onClick={scrollToBooking}>Booking Konsultasi Gratis</button>
        <p className="hero-terms">{PROMO.terms}</p>
      </section>

      <section className="section section-tint">
        <h2>Yang Anda dapatkan</h2>
        <ul className="checklist">
          {INCLUDED.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="section">
        <h2>Layanan dokter gigi spesialis</h2>
        <div className="benefits">
          {TREATMENTS.map((t) => (
            <div className="benefit" key={t.id}>
              <span className="benefit-icon" aria-hidden="true">{t.icon}</span>
              <div>
                <div className="offers">{t.offers.map((o) => <span className="offer" key={o}>{o}</span>)}</div>
                <h3>{t.title}</h3>
                <p>{t.text}</p>
                <ul className="tags">
                  {t.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section section-tint">
        <h2>Before – After pasien kami</h2>
        <BeforeAfter />
      </section>

      <section className="section">
        <h2>Tim dokter gigi spesialis</h2>
        {[...new Set(DOCTORS.map((doc) => doc.specialty))].map((specialty) => (
          <div className="doctor-group" key={specialty}>
            <p className="doctor-group-title">Spesialis {specialty}</p>
            {DOCTORS.filter((doc) => doc.specialty === specialty).map((doc) => (
              <div className="doctor-card" key={doc.name}>
                <DoctorPhoto doctor={doc} />
                <div>
                  <h3>{doc.name}</h3>
                  <p className="doctor-role">Dokter Gigi Spesialis {doc.specialty}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="section section-tint" ref={bookingRef} id="booking">
        <h2>Booking Konsultasi Gratis</h2>
        <p className="section-sub">Senin – Sabtu · 17.00 – 22.00 WITA</p>
        <BookingForm />
      </section>

      <section className="section">
        <h2>Lokasi klinik</h2>
        <p>{CLINIC.address}</p>
        <div className="location-actions">
          <a className="btn btn-outline" href={CLINIC.mapsUrl} target="_blank" rel="noreferrer">📍 Google Maps</a>
          <a className="btn btn-outline" href={`https://instagram.com/${CLINIC.instagram}`} target="_blank" rel="noreferrer">@{CLINIC.instagram}</a>
        </div>
      </section>

      <footer className="footer">© {new Date().getFullYear()} {CLINIC.name}</footer>

      <div className="sticky-cta">
        <button className="btn btn-primary btn-block" onClick={scrollToBooking}>
          Booking Konsultasi Gratis
        </button>
      </div>
    </div>
  )
}
