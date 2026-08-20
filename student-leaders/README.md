# Student Leaders — E-Certificate

Vite + React site that issues a named e-certificate after seminar feedback is submitted on Google Forms. Names come from the Form responses sheet through Google Apps Script, not from whatever the visitor types.

## How issuance works

Google Forms confirmation text is the same for every respondent, so the confirmation message should contain **one shared link** to this site:

```text
Thank you for your feedback. Generate your e-certificate here:
https://YOUR-FRONTEND-URL/
```

On the site, the participant enters the **same email** they used on the form. Apps Script looks up that row and returns the **Name** field exactly as submitted. If you enable email in Apps Script, each person can also receive a unique `?token=` link that skips the email step.

## 1. Frontend

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in:

- `VITE_APPS_SCRIPT_URL` — web app URL ending in `/exec`
- `VITE_FEEDBACK_FORM_URL` — public Google Form link (optional, shown as a fallback)

Seminar wording and name placement live in `src/config.ts`.

The official template lives at `public/img/STUDENT INV.png` and is referenced in `src/config.ts` via `certificateLayout.templateUrl`. Adjust `certificateLayout.name` (`x` / `y` are 0–1 positions on the image) to align the recipient name.

Deploy the `dist` folder to any static host (Vercel, Netlify, GitHub Pages).

## 2. Google Form + Apps Script

1. Open the feedback Form → Responses → Link to Sheets.
2. In that spreadsheet: Extensions → Apps Script.
3. Paste `apps-script/Code.gs`.
4. `nameHeader` is already set to **Full Name:** and `emailHeader` to **Email Address** (the questions on this Form). Confirm those match the first row of the response sheet.
5. Set `frontendUrl` to the deployed site origin.
6. Deploy → New deployment → Web app.
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Copy the web app URL into `.env` as `VITE_APPS_SCRIPT_URL`.
8. Triggers → Add trigger → `onFormSubmit` → From spreadsheet → On form submit.
9. In the Form: Settings → Presentation → Confirmation message, paste the frontend URL.

Turn `sendEmailWithLink` to `true` if you also want a personalized token link emailed after each submission.

## Feedback form

Public form (use this in the confirmation message and `.env`):

https://docs.google.com/forms/d/e/1FAIpQLScqla-k7CPjSKDP73qvPELWads4orb4toUgA3f6e27thYcErw/viewform

Editor link:

https://docs.google.com/forms/d/e/1FAIpQLScqla-k7CPjSKDP73qvPELWads4orb4toUgA3f6e27thYcErw/viewform

Name on the certificate comes from **Full Name:**. Lookup uses **Email Address**.

When you have the official template, put it at `public/img/STUDENT INV.png`, set `useCustomTemplate: true` in `src/config.ts`, and we will align the name line.
