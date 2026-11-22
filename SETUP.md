# Setup

The project brief is in [README.md](README.md). This file covers running the code.

## Requirements

- Node.js 22.12 or newer
- A running PostgreSQL, 14 or newer

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
backend/
  migrations/              numbered SQL files, applied once each
  src/authRoutes.ts        HTTP: input checks, cookies
  src/authService.ts       auth rules and queries
  src/studentService.ts    booklet and activity counts
  src/security.ts          password and token hashing
  src/mailer.ts            SMTP, or terminal output in development
  test/                    API tests
frontend/src/
  styles/globals.css       design tokens
  components/common/       Button, Input, Checkbox, Alert, PageHeading
  components/auth/         layout, forms, illustration
  components/student/      booklet, stickers, daily counters
  pages/                   one file per screen
  hooks/useForm.ts         validation timing, loading, duplicate-submit guard
  services/authService.ts  chooses the real or mock implementation
```

To change the schema, add a new file such as `003_map_gifts.sql`. Never edit a migration that has been applied.

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

### Connecting the map

No endpoint writes game data yet. When the engine in `HARITA-MOTORU.md` is ready:

1. The page passes boxes to `harita.hediyeleriGoster([{ id, enlem, boylam, alinabilir }])`.
2. On `hediye-tiklandi` it calls a new backend endpoint with the gift id and the device's GPS position, not
   `harita.oyuncu()`.
3. The backend checks the distance, then records the action and the unlock in one transaction.

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
- Move rate limits to a shared store if more than one API process runs.
