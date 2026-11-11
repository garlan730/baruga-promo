/**
 * Baruga Medical Center – Promo Ortodonti booking backend.
 *
 * Deployed as a Google Apps Script web app under the clinic's Google account:
 *   GET  ?from=YYYY-MM-DD&to=YYYY-MM-DD  -> { booked: ["2026-10-24T20.00", ...] }
 *   POST {name, phone, note, date, time} -> { ok: true } | { ok: false, error }
 *
 * Each booking becomes a Google Calendar event. Only events created by this
 * script (tagged with TAG_KEY) block a slot, so personal events don't.
 */

const CALENDAR_ID = 'primary' // or a dedicated calendar's ID
const TZ = 'Asia/Makassar'
const CAMPAIGN_START = '2026-10-23' // keep in sync with src/config.js
const CAMPAIGN_END = '2026-12-31'
const OPEN_DAYS = [1, 2, 3, 4, 5, 6] // Mon–Sat
const START_HOUR = 17
const END_HOUR = 22
const SLOT_MINUTES = 30
const TAG_KEY = 'bmcOrthoPromo'

function doGet(e) {
  const from = (e.parameter.from || CAMPAIGN_START)
  const to = (e.parameter.to || CAMPAIGN_END)
  const events = calendar_().getEvents(toDate_(from, '00.00'), toDate_(to, '23.59'))
  const booked = events
    .filter((ev) => ev.getTag(TAG_KEY))
    .map((ev) => Utilities.formatDate(ev.getStartTime(), TZ, "yyyy-MM-dd'T'HH.mm"))
  return json_({ booked: booked })
}

function doPost(e) {
  let body
  try {
    body = JSON.parse(e.postData.contents)
  } catch (err) {
    return json_({ ok: false, error: 'invalid' })
  }

  const treatment = String(body.treatment || '').trim().slice(0, 40)
  const name = String(body.name || '').trim().slice(0, 80)
  const phone = String(body.phone || '').trim().slice(0, 20)
  const note = String(body.note || '').trim().slice(0, 500)
  const date = String(body.date || '')
  const time = String(body.time || '')

  if (!name || !/^[0-9+\s-]{9,16}$/.test(phone)) return json_({ ok: false, error: 'invalid' })
  if (!isValidSlot_(date, time)) return json_({ ok: false, error: 'invalid_slot' })

  const start = toDate_(date, time)
  const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000)
  if (start.getTime() <= Date.now()) return json_({ ok: false, error: 'invalid_slot' })

  // Serialize bookings so two patients can't grab the same slot at once.
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(15000)) return json_({ ok: false, error: 'busy' })
  try {
    const cal = calendar_()
    const taken = cal.getEvents(start, end).some((ev) => ev.getTag(TAG_KEY))
    if (taken) return json_({ ok: false, error: 'taken' })

    const event = cal.createEvent('Konsultasi ' + (treatment || 'Promo') + ' – ' + name, start, end, {
      description: [
        'Booking dari landing page Promo 20% Ortodonti & Prostodonti',
        'Perawatan: ' + (treatment || '-'),
        'Nama: ' + name,
        'WhatsApp: ' + phone,
        'Catatan: ' + (note || '-'),
        'https://wa.me/' + toWaNumber_(phone),
      ].join('\n'),
      location: 'Klinik Utama Baruga Medical Center',
    })
    event.setTag(TAG_KEY, '1')
    return json_({ ok: true })
  } finally {
    lock.releaseLock()
  }
}

function isValidSlot_(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}\.\d{2}$/.test(time)) return false
  if (date < CAMPAIGN_START || date > CAMPAIGN_END) return false
  const day = toDate_(date, '12.00')
  const weekday = Number(Utilities.formatDate(day, TZ, 'u')) % 7 // 1=Mon … 7=Sun -> 0
  if (OPEN_DAYS.indexOf(weekday) === -1) return false
  const [h, m] = time.split('.').map(Number)
  const minutes = h * 60 + m
  return minutes >= START_HOUR * 60 && minutes < END_HOUR * 60 && m % SLOT_MINUTES === 0
}

// "2026-10-24", "20.00" -> Date at that WITA wall-clock time.
function toDate_(date, time) {
  return new Date(date + 'T' + time.replace('.', ':') + ':00+08:00')
}

function toWaNumber_(phone) {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('0') ? '62' + digits.slice(1) : digits
}

function calendar_() {
  return CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CALENDAR_ID)
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
