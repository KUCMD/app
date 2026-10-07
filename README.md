# KU-CMD — إدارة الإنشاءات والصيانة · Kuwait University

Mobile web app (PWA) for the Department of Construction & Maintenance, built from the proposal PDF.
Static front-end (GitHub Pages) + Firebase (Auth, Firestore, Storage). No build step — plain HTML/CSS/ES modules.

## Files
```
index.html        app shell
css/style.css     styles (RTL/LTR aware)
js/config.js      Firebase config + hotline / WhatsApp / e-mail domain constants  ← edit here
js/data.js        departments, jobs, zones, danger types, trades, message types, services
js/i18n.js        Arabic / English strings
js/core.js        Firebase init, state, router, upload helper
js/public.js      home, about pages, rating/complaint/suggestion, user / staff / company pages
js/employee.js    sign-in, registration + approval chain, dashboard, correspondence, emergencies, site works, settings
sw.js, manifest.json, icons/   PWA (installable on phones)
firestore.rules, storage.rules  security rules — deploy these in Firebase
```

## 1. Deploy to GitHub Pages
1. Create a repo (e.g. `ku-cmd`) and push every file in this folder to the root of `main`.
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.
3. Open `https://<user>.github.io/ku-cmd/`.

## 2. Firebase setup (project `kuwait-uni`)
1. **Authentication → Sign-in method**: enable *Email/Password*.
2. **Authentication → Settings → Authorized domains**: add `<user>.github.io` (and your custom domain if any).
3. **Authentication → Templates**: (optional) translate the *E-mail verification* and *Password reset* e-mails to Arabic.
4. **Firestore Database**: create (production mode), then **Rules** → paste `firestore.rules` → Publish.
5. **Storage**: create, then **Rules** → paste `storage.rules` → Publish.
6. Edit `js/config.js`:
   - `UNIVERSITY_EMAIL_DOMAIN` — registration only accepts e-mails on this domain (default `ku.edu.kw`).
   - `WHATSAPP` — hotline WhatsApp number in international format.

### Bootstrap the first Director (one time)
Nobody can approve the first account, so:
1. Register from the app choosing *مكتب مدير الإدارة → مدير الإدارة*, and verify the e-mail.
2. In Firestore → `users/<uid>` set `status` = `approved`.
From then on all approvals happen inside the app.

## How it works
- **Language** chosen on first open (AR/EN), changeable in Settings. UI direction switches automatically.
- **Public**: about / vision / mission / goals / org chart / contacts, rating forms (star survey), suggestions, complaints, hotline call + WhatsApp; *User*, *University staff* and *Companies* get services request, FAQ, inquiries, contracts.
  Public submissions go to the `feedback` collection; employees handle them from the dashboard.
- **Department employee**: register (department → job → details → terms) → e-mail verification → **approval chain**:
  staff → section head → supervisor → Director (heads skip to supervisor, supervisors to Director). Director can approve/reject at any stage.
- **Dashboard**: inbox/outbox, compose letter / memo / report / task / meeting minutes / meeting appointment (to a unit or a specific employee, with attachments),
  task status (ongoing / postponed / done), meeting schedule, correspondence matrix with every other unit (unread badges), emergencies by zone with danger type + camera/upload,
  site works per trade (electrical / HVAC / mechanical / plumbing / civil), lists of complaints / suggestions / requests / ratings / inquiries.
- **Settings**: language, password, favourite start page; Director (or a delegated supervisor): activate/suspend the whole app, activate/suspend users, delegate Director powers to the three supervisors.

## Firestore collections
| collection | written by | notes |
|---|---|---|
| `settings/app` | Director | `{active, delegates:{sup_contracts, sup_design, sup_maint}}` |
| `users/{uid}` | self + approvers | `status`: pending → approved / rejected / suspended; `stage`: head / supervisor / manager |
| `messages` | employees | correspondence; `toUid` null = whole unit; `readBy[]`, `replies[]`, `status` |
| `emergencies` | employees | `target` (zone), `danger`, `location`, attachments |
| `site_works` | employees | `trade`, `location`, `status` |
| `feedback` | public | `kind`: complaint / suggestion / rating / inquiry / request |

All queries use single-field `where` filters and sort client-side, so no composite indexes are required.

## Notes / possible next steps
- The PDF mentions an SMS/e-mail code. The app uses Firebase e-mail verification (no extra cost). To add SMS OTP, enable *Phone* sign-in in Firebase Auth and add `signInWithPhoneNumber` with reCAPTCHA.
- Push notifications for new inbox items can be added with Firebase Cloud Messaging.
- To change phone numbers, Instagram handle or the e-mail domain, edit `js/config.js`; to change department/job lists, edit `js/data.js`.
