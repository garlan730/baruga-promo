# Booking backend (Google Apps Script)

`Code.gs` adds each booking to your Google Calendar and makes sure no one else can book a time that's already taken. It runs for free under your own Google account.

## Setup (about 5 minutes, one time only)

1. Sign in to the Google account whose calendar should receive the bookings, then go to <https://script.google.com> → **New project**.
2. Delete the sample code, paste all of `Code.gs`, and save. Name the project "Baruga Ortho Booking".
3. Optional: to use a separate calendar (for example "Promo Ortho"), create it in Google Calendar. Go to **Settings → Integrate calendar**, copy the **Calendar ID**, and put it in `CALENDAR_ID` in `Code.gs`.
4. **Deploy → New deployment** → type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, then **Authorize access**. Choose your account → **Advanced** → **Go to Baruga Ortho Booking (unsafe)** → **Allow**. Google shows this warning for every personal script; the script only reads and writes your calendar.
6. Copy the **Web app URL** (it ends in `/exec`).
7. In the project root, create `.env.local`:
   ```
   VITE_BOOKING_API_URL=https://script.google.com/macros/s/XXXX/exec
   ```
   Then restart `npm run dev` or rebuild.

Check that it works: open the `/exec` URL in a browser. It should return `{"booked":[]}`.

## Changing things later

- Campaign dates or opening hours: change them in **both** `Code.gs` and `src/config.js`.
- After you edit `Code.gs`, go to **Deploy → Manage deployments → Edit → Version: New version → Deploy**. This keeps the same URL.
- To cancel a booking, delete its event in Google Calendar. The time becomes available again.
- Only events this script creates block a time. Your personal calendar events do not.
