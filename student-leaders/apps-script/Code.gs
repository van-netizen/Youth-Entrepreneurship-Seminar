/**
 * Bind this script to the Google Form's response spreadsheet
 * (Extensions → Apps Script from the Sheet, or from the Form).
 *
 * After deploy: Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Then paste the /exec URL into the frontend .env as VITE_APPS_SCRIPT_URL
 *
 * Form confirmation message (Forms → Settings → Presentation):
 *   Thank you for your feedback. Generate your e-certificate here:
 *   https://YOUR-FRONTEND-URL/
 *
 * Optional: the installable onFormSubmit trigger emails each respondent a
 * unique link: https://YOUR-FRONTEND-URL/?token=...
 */

const CONFIG = {
  /** Spreadsheet ID from the URL: https://docs.google.com/spreadsheets/d/<ID>/edit */
  spreadsheetId: "1uKvuSwkBpDyTbkVsRTG6aqMG8YEK7334K30A8U26jSw",
  /** Matches the Form question "Full Name:" (colon optional in the sheet header) */
  nameHeader: "Full Name:",
  /** Matches the Form question "Email Address" */
  emailHeader: "Email Address",
  tokenHeader: "Certificate Token",
  /** Public frontend origin, no trailing slash */
  frontendUrl: "https://YOUR-FRONTEND-URL",
  sendEmailWithLink: false,
  emailSubject: "Your Student Leaders' Investiture e-certificate",
};

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = String(params.callback || "").trim();
  const token = String(params.token || "").trim();
  const email = String(params.email || "")
    .trim()
    .toLowerCase();

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.spreadsheetId).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return json_({ ok: false, error: "No feedback responses yet." }, callback);
    }

    const headers = data[0].map(function (h) {
      return String(h).trim();
    });
    const nameCol = findHeader_(headers, CONFIG.nameHeader);
    const emailCol = findHeader_(headers, CONFIG.emailHeader);
    const tokenCol = findHeader_(headers, CONFIG.tokenHeader);

    if (nameCol < 0 || emailCol < 0) {
      return json_(
        {
          ok: false,
          error:
            "Name or Email column was not found. Update nameHeader / emailHeader in Apps Script to match your sheet headers.",
        },
        callback,
      );
    }

    for (let r = data.length - 1; r >= 1; r--) {
      const row = data[r];
      const rowEmail = String(row[emailCol] || "")
        .trim()
        .toLowerCase();
      const rowToken = tokenCol >= 0 ? String(row[tokenCol] || "").trim() : "";
      const rowName = String(row[nameCol] || "").trim();

      const match = token ? rowToken && rowToken === token : email && rowEmail === email;
      if (match && rowName) {
        return json_({ ok: true, name: rowName, email: rowEmail }, callback);
      }
    }

    return json_(
      {
        ok: false,
        error: token
          ? "This certificate link is invalid or has expired."
          : "No feedback submission was found for that email.",
      },
      callback,
    );
  } catch (err) {
    return json_({ ok: false, error: "Lookup failed." }, callback);
  }
}

function onFormSubmit(e) {
  const sheet = e.range.getSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let tokenCol = findHeader_(headers, CONFIG.tokenHeader);
  if (tokenCol < 0) {
    tokenCol = headers.length;
    sheet.getRange(1, tokenCol + 1).setValue(CONFIG.tokenHeader);
  }

  const row = e.range.getRow();
  const token = Utilities.getUuid();
  sheet.getRange(row, tokenCol + 1).setValue(token);

  if (!CONFIG.sendEmailWithLink) return;

  const nameCol = findHeader_(headers, CONFIG.nameHeader);
  const emailCol = findHeader_(headers, CONFIG.emailHeader);
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const email = emailCol >= 0 ? String(values[emailCol] || "").trim() : "";
  const name = nameCol >= 0 ? String(values[nameCol] || "").trim() : "";
  if (!email) return;

  const certUrl = CONFIG.frontendUrl + "/?token=" + encodeURIComponent(token);
  MailApp.sendEmail({
    to: email,
    subject: CONFIG.emailSubject,
    htmlBody:
      "<p>Hi " +
      escapeHtml_(name || "participant") +
      ",</p><p>Thank you for submitting seminar feedback. Generate your e-certificate here:</p><p><a href=\"" +
      certUrl +
      "\">" +
      certUrl +
      "</a></p>",
  });
}

function normalizeHeader_(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/:+$/, "")
    .replace(/\s+/g, " ");
}

function findHeader_(headers, wanted) {
  const needle = normalizeHeader_(wanted);
  for (let i = 0; i < headers.length; i++) {
    if (normalizeHeader_(headers[i]) === needle) return i;
  }
  return -1;
}

function json_(payload, callback) {
  const body = JSON.stringify(payload);
  if (callback && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + "(" + body + ")").setMimeType(
      ContentService.MimeType.JAVASCRIPT,
    );
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml_(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
