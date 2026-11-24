import { useEffect, useMemo, useRef, useState } from 'react'
import { BOOKING_API_URL, CLINIC, DOCTORS, PROMO, TREATMENTS, asset } from './config'
import { campaignRange, dayLabel, daysLeft, formatLongDate, slotKey, slotsFor, toKey, upcomingDays } from './schedule'
import { initPixel, isBracesTraffic, metaBrowserIds, newEventId, readAttribution, sourceCode, trackSchedule } from './tracking'
import './App.css'

function DoctorPhoto({ doctor }) {
  const [failed, setFailed] = useState(false)
  const initials = doctor.name.replace(/^drg?\.\s*/i, '').split(' ').slice(0, 2).map((w) => w[0]).join('')
  if (failed) return <div className="doctor-photo doctor-initials">{initials}</div>
  return <img className="doctor-photo" src={doctor.photo} alt={doctor.name} loading="lazy" onError={() => setFailed(true)} />
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

// The WhatsApp message the patient sends after booking (and the fallback if booking fails).
function whatsappText({ chosen, name, phone, date, time, note, attr, locked }) {
  const lines = [
    'Halo Baruga Medical Center,',
    locked ? 'Saya sudah booking *Konsultasi Gratis* lewat website.' : 'Saya ingin booking *Konsultasi Gratis*.',
    '',
    `Perawatan: ${chosen ? chosen.title : '-'}`,
  ]
  if (chosen) lines.push(`Promo: ${chosen.offers.join(' + ')}`)
  lines.push(`Nama: ${name}`, `No. WA: ${phone}`)
  if (date) lines.push(`Tanggal: ${formatLongDate(date)}`)
  if (time) lines.push(`Jam: ${time} WITA`)
  if (note) lines.push(`Keluhan/Catatan: ${note}`)
  const code = sourceCode(attr)
  if (code) lines.push(`Kode: ${code}`)
  lines.push('', 'Terima kasih!')
  return lines.join('\n')
}
const waLink = (text) => `https://wa.me/${CLINIC.whatsapp}?text=${encodeURIComponent(text)}`

function Confirmation({ done }) {
  const [copied, setCopied] = useState(false)
  const cardRef = useRef(null)
  // The card is shorter than the form it replaces, so bring it into view.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const card = cardRef.current
      if (card) window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 90 })
    })
    return () => cancelAnimationFrame(id)
  }, [])
  async function copy() {
    try {
      await navigator.clipboard.writeText(done.text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="booking-card confirm" role="status" ref={cardRef}>
      <span className="confirm-tick" aria-hidden="true">✓</span>
      <h3 className="confirm-title">Jadwal Anda sudah terkunci</h3>
      <p className="confirm-when">{formatLongDate(done.date)} · {done.time} WITA</p>
      <p className="hint">Konsultasi {done.chosen.title} untuk <b>{done.name}</b> di {CLINIC.name}.</p>
      <a className="btn btn-primary btn-block" href={waLink(done.text)}><WhatsAppIcon /> Kirim konfirmasi ke WhatsApp</a>
      <button type="button" className="btn btn-secondary btn-block" onClick={copy}>
        {copied ? 'Pesan tersalin' : 'Salin pesan'}
      </button>
      <p className="hint">
        Kalau WhatsApp tidak terbuka, salin pesan lalu kirim ke {CLINIC.phoneDisplay}.<br />
        <a href={CLINIC.mapsUrl} target="_blank" rel="noreferrer">{CLINIC.address}</a>
      </p>
    </div>
  )
}

function BookingForm({ attr }) {
  const { booked, loading, markTaken: onTaken } = useBookedSlots()
  const days = useMemo(() => upcomingDays(booked), [booked])
  const [pickedKey, setDateKey] = useState('')
  const dateKey = days.some((d) => toKey(d) === pickedKey) ? pickedKey : (days[0] ? toKey(days[0]) : '')
  const [time, setTime] = useState('')
  const [treatment, setTreatment] = useState(isBracesTraffic(attr) ? 'Ortodonti' : '')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fallback, setFallback] = useState('')
  const [done, setDone] = useState(null)

  const selectedDate = days.find((d) => toKey(d) === dateKey)
  const slots = selectedDate ? slotsFor(selectedDate, booked) : []

  function pickDate(d) {
    setDateKey(toKey(d))
    setTime('')
  }

  // Reserve the slot (and create the calendar event) before handing off to WhatsApp.
  async function reserve(eventId) {
    if (!BOOKING_API_URL) {
      console.warn('VITE_BOOKING_API_URL not set: skipping slot reservation')
      return { ok: true }
    }
    const res = await fetch(BOOKING_API_URL, {
      method: 'POST',
      // text/plain keeps this a "simple" request, which Apps Script needs (no CORS preflight).
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        treatment, name: name.trim(), phone: phone.trim(), note: note.trim(), date: dateKey, time,
        source: attr, eventId, ...metaBrowserIds(attr),
        pageUrl: window.location.href.split('#')[0], userAgent: navigator.userAgent,
      }),
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
    setFallback('')
    setSubmitting(true)

    const chosen = TREATMENTS.find((t) => t.id === treatment)
    const details = { chosen, name: name.trim(), phone: phone.trim(), date: selectedDate, time, note: note.trim(), attr }
    const eventId = newEventId()
    let result
    try {
      result = await reserve(eventId)
    } catch {
      result = { ok: false, error: 'network' }
    }
    setSubmitting(false)
    if (!result.ok) {
      if (result.error === 'taken') {
        onTaken(slotKey(selectedDate, time))
        setTime('')
        return setError('Maaf, jam tersebut baru saja dibooking pasien lain. Silakan pilih jam lain.')
      }
      if (result.error === 'invalid_slot') {
        setTime('')
        return setError('Jam tersebut sudah tidak tersedia. Silakan pilih jam lain.')
      }
      // Never a dead end: offer the same booking by WhatsApp.
      setFallback(waLink(whatsappText({ ...details, locked: false })))
      return setError(result.error === 'busy'
        ? 'Sistem booking sedang sibuk. Coba lagi sebentar, atau kirim booking Anda lewat WhatsApp.'
        : 'Booking belum terkirim. Coba lagi, atau kirim booking Anda lewat WhatsApp.')
    }

    trackSchedule(eventId)
    setDone({ ...details, text: whatsappText({ ...details, locked: true }) })
  }

  if (done) return <Confirmation done={done} />

  if (!loading && days.length === 0) {
    return (
      <div className="booking-card">
        <p className="hint">Periode promo telah berakhir atau jadwal sudah penuh. Hubungi kami via WhatsApp untuk info jadwal berikutnya.</p>
        <a className="btn btn-primary btn-block" href={`https://wa.me/${CLINIC.whatsapp}`}><WhatsAppIcon /> Chat via WhatsApp</a>
      </div>
    )
  }

  return (
    <form className="booking-card" onSubmit={submit} noValidate>
      <p className="field-label"><span>01</span> Pilih tanggal</p>
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

      <p className="field-label"><span>02</span> Pilih jam <em>WITA</em></p>
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

      <p className="field-label"><span>03</span> Data diri</p>
      <label className="input-label" htmlFor="name">Nama lengkap</label>
      <input id="name" className="input" placeholder="cth. Andi Rahman" autoComplete="name"
        value={name} onChange={(e) => setName(e.target.value)} />
      <label className="input-label" htmlFor="phone">Nomor WhatsApp</label>
      <input id="phone" className="input" placeholder="cth. 0812xxxxxxx" inputMode="tel" autoComplete="tel"
        value={phone} onChange={(e) => setPhone(e.target.value)} />

      <p className="field-label"><span>04</span> Perawatan &amp; keluhan</p>
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
      <label className="input-label" htmlFor="note">Keluhan / catatan <em>(opsional)</em></label>
      <textarea id="note" className="input" rows={2} placeholder="cth. gigi depan berjejal"
        value={note} onChange={(e) => setNote(e.target.value)} />

      {error && <p className="error" role="alert">{error}</p>}
      {fallback && <a className="btn btn-secondary btn-block" href={fallback}><WhatsAppIcon /> Kirim booking lewat WhatsApp</a>}

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        <WhatsAppIcon /> {submitting ? 'Memproses booking…' : 'Booking via WhatsApp'}
      </button>
      <p className="hint">Jadwal Anda langsung kami kunci. Setelah itu Anda bisa mengirim konfirmasi ke WhatsApp klinik.</p>
    </form>
  )
}

function useScrolled(offset = 12) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [offset])
  return scrolled
}

function SectionHead({ label, children, sub, center }) {
  return (
    <div className={`section-head ${center ? 'center' : ''}`}>
      <span className="section-label">{label}</span>
      <h2 className="headline">{children}</h2>
      {sub && <p className="body-text">{sub}</p>}
    </div>
  )
}

export default function App() {
  const attr = useMemo(() => readAttribution(), [])
  const braces = isBracesTraffic(attr)
  useEffect(initPixel, [])
  const bookingRef = useRef(null)
  const scrolled = useScrolled()
  const left = daysLeft()
  const scrollToBooking = () => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const specialties = [...new Set(DOCTORS.map((doc) => doc.specialty))]

  return (
    <>
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container header-inner">
          <a href={CLINIC.website} className="brand" aria-label={CLINIC.name}>
            <img src={asset('logo-wordmark.png')} alt={CLINIC.shortName} />
          </a>
          <button className="btn btn-primary btn-sm" onClick={scrollToBooking}>Booking Gratis</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-overlay" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-content">
              {braces ? (
                <>
                  <span className="hero-label">Pemeriksaan Awal Behel · Makassar</span>
                  <h1 className="hero-title">Pemeriksaan awal behel,<br /><em>tanpa biaya konsultasi.</em></h1>
                  <p className="hero-subtitle">
                    Gigi dan rahang diperiksa dokter gigi spesialis ortodonti, lalu dijelaskan rencana perawatan yang
                    cocok. Diskon {PROMO.discount} perawatan behel juga berlaku sampai {PROMO.deadline}.
                  </p>
                </>
              ) : (
                <>
                  <span className="hero-label">Promo Ortodonti · Makassar</span>
                  <h1 className="hero-title">Senyum rapi,<br /><em>hemat {PROMO.discount}.</em></h1>
                  <p className="hero-subtitle">
                    Diskon {PROMO.discount} perawatan behel bersama dokter gigi spesialis ortodonti, plus konsultasi
                    awal gratis untuk ortodonti &amp; prostodonti.
                  </p>
                </>
              )}
              <div className="hero-buttons">
                <button className="btn btn-primary" onClick={scrollToBooking}>{braces ? 'Pilih Jadwal Pemeriksaan' : 'Booking Konsultasi Gratis'}</button>
                <a className="btn btn-secondary" href="#hasil">Lihat Hasil Perawatan</a>
              </div>
              {left > 0 && (
                <p className="hero-notice">
                  <span className="hero-notice-tag">{left === 1 ? 'Hari terakhir' : `${left} hari lagi`}</span>
                  Promo berlaku sampai {PROMO.deadline}
                </p>
              )}
            </div>

            <aside className="promo-card">
              <span className="promo-tag">Promo Terbatas</span>
              <p className="promo-value">Diskon {PROMO.discount}</p>
              <p className="promo-title">Perawatan Behel (Ortodonti)</p>
              <ul className="promo-list">
                {INCLUDED.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <button className="btn btn-light promo-cta" onClick={scrollToBooking}>Ambil Promo</button>
              <p className="promo-terms">{PROMO.terms}</p>
            </aside>
          </div>
        </section>

        <div className="trust-bar">
          <div className="container trust-items">
            <span className="trust-item">Dokter gigi spesialis</span>
            <span className="trust-item">Konsultasi awal gratis</span>
            <span className="trust-item">Rating Google {CLINIC.rating}</span>
            <span className="trust-item">Buka sampai 22.00</span>
          </div>
        </div>

        <section className="section">
          <div className="container">
            <SectionHead label="Perawatan" sub="Promo ini berlaku untuk dua layanan spesialis kami. Konsultasi awal gratis untuk keduanya.">
              Rapikan gigi, atau <em>lengkapi senyum</em> Anda.
            </SectionHead>
            <div className="treatments">
              {TREATMENTS.map((t, i) => (
                <article className="treatment" key={t.id}>
                  <span className="treatment-index">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{t.title}</h3>
                  <div className="offers">
                    {t.offers.map((o) => <span className={`offer ${o.startsWith('Diskon') ? 'offer-strong' : ''}`} key={o}>{o}</span>)}
                  </div>
                  <p>{t.text}</p>
                  <ul className="treatment-list">
                    {t.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section alt" id="hasil">
          <div className="container">
            <SectionHead label="Hasil Perawatan">Before &amp; after <em>pasien kami.</em></SectionHead>
            <BeforeAfter />
          </div>
        </section>

        <section className="section">
          <div className="container">
            <SectionHead label="Tim Dokter" sub="Setiap perawatan ditangani langsung oleh dokter gigi spesialis, dari konsultasi pertama sampai kontrol terakhir.">
              Ditangani <em>dokter gigi spesialis.</em>
            </SectionHead>
            <div className="doctors-grid">
              {specialties.flatMap((specialty) => DOCTORS.filter((doc) => doc.specialty === specialty)).map((doc) => (
                <div className="doctor-card" key={doc.name}>
                  <DoctorPhoto doctor={doc} />
                  <span className="doctor-group">Spesialis {doc.specialty}</span>
                  <h3>{doc.name}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section alt booking" ref={bookingRef} id="booking">
          <div className="container bk-wrap">
            <div className="bk-intro">
              <SectionHead label="Buat Janji" sub="Pilih jadwal yang cocok. Slot Anda langsung kami kunci, lalu detailnya terkirim ke WhatsApp klinik.">
                Booking konsultasi <em>gratis.</em>
              </SectionHead>
              <div className="bk-contact">
                <div>
                  <h5>Jam praktik</h5>
                  <p>{CLINIC.hours}</p>
                </div>
                <div>
                  <h5>WhatsApp</h5>
                  <a href={`https://wa.me/${CLINIC.whatsapp}`}>{CLINIC.phoneDisplay}</a>
                </div>
                <div>
                  <h5>Alamat</h5>
                  <a href={CLINIC.mapsUrl} target="_blank" rel="noreferrer">{CLINIC.address}</a>
                </div>
                <div>
                  <h5>Instagram</h5>
                  <a href={`https://instagram.com/${CLINIC.instagram}`} target="_blank" rel="noreferrer">@{CLINIC.instagram}</a>
                </div>
              </div>
            </div>
            <BookingForm attr={attr} />
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <img src={asset('logo-white.png')} alt={CLINIC.shortName} className="footer-logo" />
            <p className="footer-tagline">Klinik gigi spesialis dan dokter umum di Makassar, melayani dengan sepenuh hati.</p>
          </div>
          <div>
            <h5>Kontak</h5>
            <a href={`https://wa.me/${CLINIC.whatsapp}`}>WhatsApp {CLINIC.phoneDisplay}</a>
            <a href={CLINIC.mapsUrl} target="_blank" rel="noreferrer">Google Maps</a>
            <a href={`https://instagram.com/${CLINIC.instagram}`} target="_blank" rel="noreferrer">Instagram</a>
          </div>
          <div>
            <h5>Klinik</h5>
            <a href={CLINIC.website}>barugamedicalcenter.com</a>
            <a href={`${CLINIC.website}/#doctors`}>Semua dokter</a>
            <a href={`${CLINIC.website}/vaksin-umroh`}>Vaksin Umroh &amp; Haji</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} {CLINIC.name}</span>
          <span>{PROMO.terms}</span>
        </div>
      </footer>

      <div className="sticky-cta">
        <button className="btn btn-primary btn-block" onClick={scrollToBooking}>Booking Konsultasi Gratis</button>
      </div>
    </>
  )
}
