# Setup

The project brief is in [README.md](README.md). This file covers running the code.

## Requirements

- Node.js 22.12 or newer
- A running PostgreSQL, 14 or newer
- An internet connection and WebGL 2 for the map, which loads three.js from a CDN

## Run it

```sh
npm install
npm run db:setup   # creates the campus_quest database and its tables
npm run dev        # web: http://localhost:5173, API: http://127.0.0.1:4000
```

By default the API connects to local PostgreSQL as your OS user. For anything else, copy
`backend/.env.example` to `backend/.env` and edit `DATABASE_URL`.

Use `localhost:5173` rather than `127.0.0.1:5173`: the API checks the request origin.

**Emails are not sent in development.** Verification and reset links are printed in the terminal running
`npm run dev`. Set `SMTP_URL` and `MAIL_FROM` to send real email.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | API and frontend with live reload |
| `npm run dev:mock` | Frontend only, with sample data, on http://localhost:5174. Can run beside `npm run dev`. The demo account shows a part-filled booklet. Login: `explorer@metu.edu.tr` / `campusquest` |
| `npm test` | API tests. Creates temporary databases and drops them afterwards |
| `npm run typecheck` | Type checks both apps |
| `npm run build` | Type checks, then builds the frontend |

## Layout

```
shared/authRules.ts        validation used by browser and API
shared/gameRules.ts        daily search and hide limits
shared/giftRules.ts        hiding rules and placement messages
shared/huntRules.ts        search radii, time and attempt limits
3d-harita/                 the 3D map, plain ES modules
  js/api.js                the app's only door into the map
  js/harita.js             the map engine
  js/konum.js              GPS reader
  js/secim-katmani.js      selection markers and campus boundary
  js/yerlesim.js           where a gift may be hidden, used by browser and server
backend/
  migrations/              numbered SQL files, applied once each
  src/authRoutes.ts        HTTP: input checks, cookies
  src/authService.ts       auth rules and queries
  src/studentService.ts    booklet and activity counts
  src/giftService.ts       hiding gifts
  src/huntService.ts       assigning, checking in, solving
  src/answers.ts           forgiving answer matching
  src/photo.ts             safe re-encoding of photo proof
  src/notification*.ts     notification list and live stream
  src/security.ts          password and token hashing
  src/mailer.ts            SMTP, or terminal output in development
  test/                    API tests
frontend/src/
  styles/globals.css       design tokens
  components/common/       Button, Input, Checkbox, Alert, PageHeading
  components/auth/         layout, forms, illustration
  components/map/          map frame and hide form
  components/hunt/         search, clue, riddle, photo
  components/notifications/ bell and toast
  components/student/      booklet, stickers, daily counters
  pages/                   one file per screen
  hooks/useForm.ts         validation timing, loading, duplicate-submit guard
  services/authService.ts  chooses the real or mock implementation
```

To change the schema, add a new file such as `005_reports.sql`. Never edit a migration that has been applied.

## How authentication works

1. Registering stores a *pending* registration and emails a link. No user exists yet, and the username isn't reserved.
2. The link asks for the password chosen at registration, then creates the user and logs them in. The password
   step stops someone from registering with another student's email and having that student activate it for them.
3. A session is a random token in an HttpOnly, SameSite cookie. The database stores only its hash. It lasts one
   day, or 30 days with "Remember me".
4. Password reset links work once, for an hour, and log out every device.

Passwords are hashed with scrypt. Login and password reset don't reveal which emails have accounts, and neither
does registration with an available username.

## Student page and game data

`/student` reads `GET /api/student/profile`, which uses the session cookie and returns today's and all-time
counts, the next reset time and the booklet.

- **Limits:** 2 searches and 3 hidden gifts per day, resetting at 00:00 in Ankara. To change them, edit
  `shared/gameRules.ts` and add a migration that replaces the `gift_actions_daily_limit` constraint.
- **Locked stickers:** the API omits their name and emoji, so removing the CSS blur reveals nothing. The catalogue
  is in a migration, so anyone who can read this repository can see it.
- **Counters:** each search or hide is one row in `gift_actions`, with `slot` numbered from 1 within that day.
  The database rejects a slot over the limit and a slot used twice.
- **Unlocking:** insert a row into `user_collection`. The page refreshes when it becomes visible again.

## Hiding gifts

`/hide` shows the map. A student chooses a main location, then writes a clue, a riddle, the accepted answer and a
note for the finder. The server then, in one transaction, uses a daily slot, saves the gift with a randomly drawn
sticker and records a notification.

- **Allowed places:** inside a building listed in `3d-harita/data/hediye-binalari.json`, or up to 75 m from one.
  Never off campus, in another building, on a car road or water, in Teknokent, or next to dorms, schools and
  sensitive sites. The server runs `3d-harita/js/yerlesim.js` on the map's data, so deploy the backend together
  with the `3d-harita` folder.
- **Opening a building:** add it to `hediye-binalari.json` and restart the API. Students will walk in and take
  photos, so list only buildings open to every student. A name in `bina-adlari.json` doesn't open a building.
- **Secrets:** students can list only their own gifts. The sticker inside is never sent to a browser.
- **Map limit:** the map ends at latitude 39.903 (`SINIR` in `projeksiyon.js`) and the campus reaches about 39.908,
  so the northern strip can't be used until the map is extended.
- **Map contract:** the app talks only to `window.kampusHarita`, documented at the top of `3d-harita/js/api.js`.
  A replacement engine needs to provide the same functions and events.

| Method | Path | Body |
| --- | --- | --- |
| POST | `/api/gifts` | `requestId (uuid), latitude, longitude, clue, riddle, answer, note` |
| POST | `/api/gifts/:id/puzzle` | `clue, riddle, answer`: once, for gifts older than searching |
| GET | `/api/gifts/mine` | |

## Notifications

Every hidden gift notifies every student who already had an account, without saying who or where. Open tabs get
it live over server-sent events. Everyone else sees it on their next visit. There is no push notification to a
closed browser.

| Method | Path | Body |
| --- | --- | --- |
| GET | `/api/notifications` | |
| POST | `/api/notifications/read` | `upTo` |
| GET | `/api/notifications/stream` | event stream |

Live delivery is in memory, so it works with one API process. The reverse proxy must not buffer the stream, and
serverless hosting such as Vercel functions doesn't suit it.

## Searching

1. **Assign.** A search draws a random gift hidden by someone else and shows only its main location. It is
   reserved for that student for 24 hours. An empty map doesn't cost a search.
2. **Arrive.** The browser sends the device's GPS reading. Within 40 m of the building's edge, plus up to 30 m
   for GPS error, the server reveals the clue and riddle. Until then they aren't in any response.
3. **Solve.** The student sends the answer, a photo and a current position (within 80 m, plus up to 70 m for GPS
   error indoors). Five wrong answers end the hunt. Place and photo problems don't cost an attempt.
4. **Unlock.** The sticker joins the booklet, the note is revealed and the gift is retired. A sticker the finder
   already has is swapped for one they don't.

Answers ignore capitals, Turkish letters, punctuation and generic words such as "hall" or "salonu", and forgive
one typo in longer answers. Numbers and block letters must match.

Positions are never stored. Photos are re-encoded without EXIF, stored in `find_photos`, and visible only to the
finder and the hider.

| Method | Path | Body |
| --- | --- | --- |
| GET | `/api/hunts/current` | |
| POST | `/api/hunts` | `{}` |
| POST | `/api/hunts/:id/location` | `latitude, longitude, accuracy` |
| POST | `/api/hunts/:id/solve` | `latitude, longitude, accuracy, answer, photo (base64 JPEG or PNG)` |
| POST | `/api/hunts/:id/give-up` | `{}` |
| GET | `/api/hunts/:id/photo` | |

**What this can't prove.** GPS readings come from the browser and can be faked, GPS can't tell floors apart, and
the photo's content isn't checked. The checks stop casual cheating only.

**Testing at a desk.** Development builds show "Test mode: simulate GPS" on the search page. Production builds
don't contain it. On a phone, location needs HTTPS.

## Auth API

All under `/api/auth`, JSON only.

| Method | Path | Body |
| --- | --- | --- |
| POST | `/register` | `username, email, password, acceptTerms` |
| POST | `/resend-verification` | `registrationId` |
| POST | `/verify-email` | `token, password` |
| POST | `/login` | `email, password, remember` |
| GET | `/session` | |
| POST | `/logout` | `{}` |
| POST | `/forgot-password` | `email` |
| POST | `/reset-password` | `token, password` |

## Before launch

- Replace the placeholder Terms page and add a KVKK privacy notice.
- Configure SMTP and test delivery to a real METU inbox.
- Serve `frontend/dist` and proxy `/api` on one HTTPS origin, with `NODE_ENV=production` and `TRUST_PROXY` set.
- Move rate limits and notification fan-out to a shared store if more than one API process runs.
- Add a way to report or remove notes, clues, riddles and photos, because strangers see them.
- Decide how long photo proofs are kept, and state it in the KVKK notice.
- Have the university review `hediye-binalari.json`. Allow request bodies of 5 MB at the reverse proxy.
