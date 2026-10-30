# Kyuso Boys High School Alumni Association (KBHSAA) Website — Phase 1–4

Plain HTML/CSS/JS, no frameworks or npm. Runs locally with:
```
python -m http.server 8000
```

## Setup
1. Create a free project at supabase.com
2. In the SQL editor, run in this order: `supabase/schema.sql` → `phase2-schema.sql` → `phase3-schema.sql` → `phase4-schema.sql`
3. In Settings → API, copy your Project URL and anon public key into `js/supabase-config.js`
4. In Authentication → Providers, turn OFF public sign-ups — then manually create one admin user under Authentication → Users for yourself (Auto Confirm User ON)
5. Create a free Flutterwave account at flutterwave.com, get your **public** key (Settings → API Keys — use the public key only, never the secret key) and paste it into `js/payment-config.js`
6. Log into `admin.html` with your admin account

## Pages
- `index.html` — home: stats bar, alumni spotlight, latest news, upcoming events, newsletter signup
- `about.html` — vision, mission, values, objectives, what we do, leadership
- `directory.html` — search by name/profession/location/skill, grad-year filter, one-click email contact
- `events.html` — Ongoing/Upcoming tabs; free events get RSVP, events with a ticket price get a Flutterwave checkout (card or M-Pesa)
- `gallery.html` — photo gallery (admin-managed image links)
- `jobs.html` — job/internship board (pending admin approval)
- `mentorship.html` — mentor / mentee sign-up and browsing, matched by email
- `class-notes.html` — per-graduation-year message board
- `donate.html` — one-off donations via Flutterwave, a public running total, and a "recent supporters" wall (names only — no amounts or emails shown publicly)
- `memorial.html` — in-memoriam tributes (pending admin approval before publishing)
- `register.html` — alumni registration, including a skills field (pending admin approval)
- `contact.html` — contact info
- `admin.html` — the full control panel: approve members, feature a spotlight, track dues, manage announcements/events/photos, view RSVP and ticket-buyer lists per event, approve/moderate jobs, mentorship, class notes, donations, and memorials

## About the payment integration — please read
Event tickets and donations use **Flutterwave's Inline Checkout** (supports card and M-Pesa). Because this site is static HTML/JS with Supabase as its only backend — no custom server — payment confirmation works like this:

1. The browser opens Flutterwave's checkout widget using your **public** key only (safe to expose)
2. The buyer pays
3. Flutterwave's widget calls back to the browser saying "successful"
4. The browser then writes the ticket/donation record straight into Supabase

**The gap:** nothing server-side re-verifies that callback against Flutterwave's own records using your secret key. For a small community site this is a reasonable trade-off, but a technically determined person could theoretically fabricate a success callback without actually paying. If you ever need this to be fraud-proof (e.g. once real money volume grows), the fix is a **Supabase Edge Function** that calls Flutterwave's `/transactions/verify` endpoint with your secret key and only then writes the "paid" record — happy to build that when you're ready; it's a genuinely different piece of infrastructure than anything else on this site.

In the meantime: your Flutterwave dashboard is always the source of truth for what was actually paid — cross-check against it periodically.

## How "messaging" and "mentorship matching" work
No in-app chat or alumni login system (that's a bigger change — separate from the single admin login this site uses). Directory members, job posters, and mentorship sign-ups all show an email link; people reach out directly.

## Adding photos
Still no file upload — paste a direct image link in the admin "Add a photo" form (Supabase Storage, Imgur, or a public Google Drive link all work).

## Still to personalize
- Replace contact.html placeholder email/phone/address
- Add your leadership team to about.html
- Swap in your school's colors if you want something other than navy/gold

## Not built (said no to this round)
Merchandise store, scholarship application portal — straightforward additions whenever you want them.

## Possible next steps
- Server-side payment verification (Supabase Edge Function) for the hardening described above
- Real alumni accounts + in-app messaging, if the email-based contact approach stops being enough
- Merch store / scholarship portal
