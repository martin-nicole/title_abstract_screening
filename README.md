# Blinded title & abstract screening

A small website for two reviewers to screen titles and abstracts independently.

- **Reviewers** open a web page (hosted free on GitHub Pages), sign in with a personal access code, and mark each record **Include / Maybe / Exclude**.
- **Blinding:** each reviewer's browser only ever receives the records and *their own* decisions. The other reviewer's decisions are never sent to it.
- **Results** are written to a Google Sheet owned by an **independent person**, who is the only one with access. They can see both reviewers' decisions side by side, conflicts, percent agreement and Cohen's kappa.

```
Reviewer browser  ──(access code)──▶  Google Apps Script web app  ──▶  Google Sheet
 (GitHub Pages)                       runs as the independent person    (only they can open it)
```

The GitHub repository contains **only code**. No records, decisions or reviewer codes are stored in it.

## Files

| File | Purpose |
|---|---|
| `index.html`, `style.css`, `app.js` | The screening website |
| `config.js` | Settings you edit (backend URL, exclusion reasons) |
| `apps-script/Code.gs`, `apps-script/appsscript.json` | Backend, pasted into Google Apps Script |
| `sample-records.csv` | Example records for testing |

## Setup (about 20 minutes)

The independent person does steps 1 to 5. Whoever manages the GitHub repo does steps 6 to 7.

### 1. Create the spreadsheet
Create a new Google Sheet **with the independent person's Google account**. Do not share it with the reviewers.

### 2. Add the backend
1. In the sheet: **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with `apps-script/Code.gs` from this repo.
3. *Project Settings (gear icon) → tick "Show appsscript.json manifest file in editor"*, then replace its contents with `apps-script/appsscript.json`.
4. Save, then reload the spreadsheet. A **Screening** menu appears.

### 3. Set up the sheets
**Screening → 1. Set up sheets** (approve the permissions the first time). This creates:

- `Records`: one row per record
- `Reviewers`: two reviewers with randomly generated access codes
- `Decisions`: the append-only log of every decision

Edit the reviewer names in `Reviewers` if you like. Keep the IDs (`R1`, `R2`) and the first two rows as the two reviewers.

### 4. Add the records
Paste or import your records into `Records` with these columns:

`record_id | title | abstract | authors | year | journal | doi`

`record_id` must be unique. Only `record_id` and `title` are essential. You can export this from a reference manager (Zotero, EndNote, Rayyan, Covidence, etc.) as CSV and map the columns. `sample-records.csv` shows the layout.

### 5. Deploy the web app
1. In Apps Script: **Deploy → New deployment → type: Web app**.
2. **Execute as: Me**. **Who has access: Anyone**.
3. Deploy and copy the **Web app URL** (it starts with `https://script.google.com/macros/s/...`).

"Anyone" only means the URL is reachable. Every request still needs a valid reviewer access code, so nobody can read or write anything without one.

> If the independent person uses a Google Workspace (work/school) account, the organisation may block "Anyone". A personal Google account avoids this.

### 6. Configure the website
Edit `config.js` and set `APPS_SCRIPT_URL` to the URL you copied. Adjust the exclusion reasons if needed.

### 7. Host on GitHub Pages
1. Push this folder to a GitHub repository.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root**.
3. After a minute the site is live at `https://<username>.github.io/<repo>/`.

### 8. Hand out access
Send each reviewer the site URL and **their own** access code from the `Reviewers` sheet, through a private channel.

## Using the website

- **I / M / E** keys record Include / Maybe / Exclude. **← →** move between records. **N** jumps to the next unscreened record.
- A reviewer can change an earlier decision. Every change is added to the `Decisions` log with a timestamp, and the latest one counts.
- Optional keyword highlighting is stored only in the reviewer's own browser.

## Seeing the results (independent person only)

**Screening → Refresh summary & agreement** builds:

- `Summary`: both decisions per record, reasons, notes, and a status (`Agree: …`, `Conflict`, `Pending`)
- `Agreement`: counts, percent agreement and Cohen's kappa (with and without counting Maybe as Include)

Resolve conflicts however your protocol says (discussion or a third reviewer). That happens outside this tool.

## Updating the backend later

After editing `Code.gs`: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The URL stays the same.

## Keeping it properly blinded

- The independent person must **not** be one of the two reviewers.
- Never share the spreadsheet or the Apps Script project with a reviewer, and do not make them editors of either.
- Give each reviewer only their own code. Codes are 64-bit random strings and wrong guesses are delayed.
- The session code lives in the browser tab's session storage and is cleared when the tab closes or the reviewer clicks **Sign out**. Reviewers should not share a computer account while screening.
- Reviewer free text (notes, reasons) is stored as plain text, so it can never run as a spreadsheet formula.

## Limits to be aware of

- Google's normal Apps Script quotas apply. The site makes one request to load and one per decision, which is fine for typical review sizes. For very large reviews (many thousands of records) loading may take a few seconds.
- Records are held in Google Sheets, so check that is acceptable under your data-governance rules.
- Blinding here is technical (the data is never sent). It can't stop reviewers discussing records with each other.

## Quick local test

Open `index.html` directly in a browser after setting `config.js`. Use the three rows in `sample-records.csv` as test records.
