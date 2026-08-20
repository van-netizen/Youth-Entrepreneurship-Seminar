import { lookup } from "./config";

export type Recipient = {
  name: string;
  email?: string;
};

export class LookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LookupError";
  }
}

export function parseCertificateParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  return {
    token: params.get("token")?.trim() || "",
    email: params.get("email")?.trim() || "",
  };
}

/**
 * Proper CSV parser that handles:
 * - Quoted fields containing commas
 * - Quoted fields containing newlines
 * - Escaped quotes ("" inside quoted fields)
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(current);
      current = "";
    } else if (ch === "\n") {
      row.push(current);
      current = "";
      // Skip \r if present (Windows line endings)
      if (row.length > 1 || row[0].trim() !== "") {
        rows.push(row);
      }
      row = [];
    } else if (ch === "\r") {
      // Ignore carriage return (handled by \n)
    } else {
      current += ch;
    }
  }

  // Push the last row if there's content
  row.push(current);
  if (row.length > 1 || row[0].trim() !== "") {
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Fetch the spreadsheet as CSV directly from Google Sheets — no Apps Script needed. */
async function fetchSpreadsheetCsv(): Promise<string[][]> {
  // Only include gid if it's explicitly set (not "0"), otherwise use the default sheet
  const gidParam = lookup.sheetGid && lookup.sheetGid !== "0" ? `&gid=${encodeURIComponent(lookup.sheetGid)}` : "";
  const url = `https://docs.google.com/spreadsheets/d/${lookup.spreadsheetId}/export?format=csv${gidParam}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new LookupError("Could not reach the participant database. Try again in a moment.");
  }
  const text = await res.text();
  return parseCsv(text);
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/:+$/, "")
    .replace(/\s+/g, " ");
}

function findHeader(headers: string[], wanted: string): number {
  const needle = normalizeHeader(wanted);
  return headers.findIndex((h) => normalizeHeader(h) === needle);
}

/** Look up a recipient directly from the Google Sheet. */
async function lookupFromSheet(query: { token?: string; email?: string }): Promise<Recipient> {
  const rows = await fetchSpreadsheetCsv();
  if (rows.length < 2) {
    throw new LookupError("No feedback responses yet.");
  }

  const headers = rows[0];
  const nameCol = findHeader(headers, "Full Name:");
  const emailCol = findHeader(headers, "Email Address");
  const tokenCol = findHeader(headers, "Certificate Token");

  if (nameCol < 0 || emailCol < 0) {
    throw new LookupError(
      "Name or Email column was not found in the spreadsheet. Check the sheet headers.",
    );
  }

  const token = query.token?.trim();
  const email = query.email?.trim().toLowerCase();

  for (let r = rows.length - 1; r >= 1; r--) {
    const row = rows[r];
    const rowEmail = (row[emailCol] || "").trim().toLowerCase();
    const rowToken = tokenCol >= 0 ? (row[tokenCol] || "").trim() : "";
    const rowName = (row[nameCol] || "").trim();

    const match = token ? rowToken && rowToken === token : email && rowEmail === email;
    if (match && rowName) {
      return { name: rowName, email: rowEmail };
    }
  }

  throw new LookupError(
    token
      ? "This certificate link is invalid or has expired."
      : "No feedback submission was found for that email.",
  );
}

export async function fetchRecipient(query: {
  token?: string;
  email?: string;
}): Promise<Recipient> {
  if (!query.token && !query.email) {
    throw new LookupError("Enter the email you used on the feedback form.");
  }

  return lookupFromSheet(query);
}