// Where a visitor came from (ad tags), and the optional Meta Pixel.
//
// The UTM tags and fbclid from the ad link are kept for the browser session, sent with
// each booking (so the clinic's Google Calendar shows which ad brought it) and added to
// the WhatsApp message as a short code.
//
// The Meta Pixel only loads when VITE_META_PIXEL_ID is set. It sends PageView and, after
// a booking is locked, Schedule. The same Schedule event is sent from Apps Script through
// the Conversions API with the same event ID, so Meta counts it once. No treatment,
// complaint or other health detail is ever sent to Meta.

const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid']
const STORE = 'bmc_attribution'
export const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || ''

export function readAttribution() {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = {}
  for (const k of KEYS) {
    const v = params.get(k)
    if (v) fromUrl[k] = v.slice(0, 200)
  }
  try {
    if (Object.keys(fromUrl).length) {
      sessionStorage.setItem(STORE, JSON.stringify(fromUrl))
      return fromUrl
    }
    return JSON.parse(sessionStorage.getItem(STORE) || '{}')
  } catch {
    return fromUrl // private mode or blocked storage
  }
}

// Visitors from a braces ad get the braces headline and Ortodonti preselected.
export const isBracesTraffic = (attr) => /behel|ortho|orto/i.test(attr.utm_campaign || '')

// Short code for the WhatsApp message, e.g. "behel-reel-b (instagram/paid)".
export function sourceCode(attr) {
  if (!attr.utm_campaign && !attr.utm_source) return ''
  const via = [attr.utm_source, attr.utm_medium].filter(Boolean).join('/')
  return [attr.utm_campaign, via && `(${via})`].filter(Boolean).join(' ')
}

export function newEventId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `bk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function cookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : ''
}

// Browser IDs the Conversions API uses to match the server event to the same person.
export function metaBrowserIds(attr) {
  let fbc = cookie('_fbc')
  if (!fbc && attr.fbclid) fbc = `fb.1.${Date.now()}.${attr.fbclid}`
  return { fbp: cookie('_fbp'), fbc }
}

export function initPixel() {
  if (!PIXEL_ID || window.fbq) return
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', PIXEL_ID)
  window.fbq('track', 'PageView')
}

// Fired once, when the booking is locked in the calendar.
export function trackSchedule(eventId) {
  if (PIXEL_ID && window.fbq) window.fbq('track', 'Schedule', {}, { eventID: eventId })
}
