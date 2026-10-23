import { CAMPAIGN, CLINIC, SCHEDULE } from './config'

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

// Current wall-clock time at the clinic (WITA), regardless of the visitor's device timezone.
function clinicNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: CLINIC.timeZone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  )
  return {
    date: new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

export function toKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function formatLongDate(date) {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

export function dayLabel(date) {
  return { day: DAY_NAMES[date.getDay()].slice(0, 3), date: date.getDate(), month: MONTH_NAMES[date.getMonth()] }
}

function allSlots() {
  const slots = []
  for (let m = SCHEDULE.startHour * 60; m < SCHEDULE.endHour * 60; m += SCHEDULE.slotMinutes) {
    slots.push({
      minutes: m,
      label: `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`,
    })
  }
  return slots
}

// Same "YYYY-MM-DDTHH.MM" key the Apps Script returns for booked slots.
export function slotKey(date, label) {
  return `${toKey(date)}T${label}`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Slots for a date; slots that already started (today) or are booked are unavailable.
export function slotsFor(date, booked = new Set()) {
  const now = clinicNow()
  const isToday = toKey(date) === toKey(now.date)
  return allSlots().map((s) => ({
    ...s,
    booked: booked.has(slotKey(date, s.label)),
    available: (!isToday || s.minutes > now.minutes) && !booked.has(slotKey(date, s.label)),
  }))
}

// Open days from today until the campaign ends that still have a slot left.
export function upcomingDays(booked = new Set()) {
  const { date: today } = clinicNow()
  const start = parseKey(CAMPAIGN.start)
  const end = parseKey(CAMPAIGN.end)
  const days = []
  for (let d = new Date(Math.max(today, start)); d <= end; d.setDate(d.getDate() + 1)) {
    if (!SCHEDULE.openDays.includes(d.getDay())) continue
    if (!slotsFor(d, booked).some((s) => s.available)) continue
    days.push(new Date(d))
  }
  return days
}

export function campaignRange() {
  const { date: today } = clinicNow()
  return { from: toKey(new Date(Math.max(today, parseKey(CAMPAIGN.start)))), to: CAMPAIGN.end }
}
