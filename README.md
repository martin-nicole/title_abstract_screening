# Blinded title & abstract screening

A small website for assessors to screen titles and abstracts independently. You can set up **any number of assessors**; **each record is screened by exactly two** of them.

- **Assessors** open a web page (hosted free on GitHub Pages), sign in with a personal access code, and mark each record **Include / Maybe / Exclude**. They only see the records assigned to them.
- **Blinding:** an assessor's browser only ever receives their own assigned records and *their own* decisions. The other assessor's decisions, and who that assessor is, are never sent to it.
- **Results** are written to a Google Sheet owned by an **independent person**, who is the only one with access. They can see each record's two decisions side by side, conflicts, workload, percent agreement and Cohen's kappa.

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
- `Reviewers`: one row per assessor, with a randomly generated access code (it starts with `R1` and `R2`)
- `Decisions`: the append-only log of every decision

**Add all your assessors** to `Reviewers`: type a unique ID (`R3`, `R4`, …) and a name on each new row, then run **Screening → 2. Generate missing access codes**. Any number is fine.

### 4. Add the records
Paste or import your records into `Records` with these columns:

`record_id | title | abstract | authors | year | journal | doi | assessor_1 | assessor_2`

`record_id` must be unique. Only `record_id` and `title` are essential. You can export this from a reference manager (Zotero, EndNote, Rayyan, Covidence, etc.) as CSV and map the columns. `sample-records.csv` shows the layout.

### 4b. Assign two assessors to each record
The last two columns hold the reviewer IDs of the two assessors for that record. Either:

- **Automatic:** leave them blank and run **Screening → 3. Assign two assessors to unassigned records**. Each record gets two different assessors and the workload is kept even.
- **By hand:** type the IDs yourself (for example `R1` and `R4`). You can mix both: records that already have an assignment are left alone.

Do this **before screening starts**. It never reassigns a record that already has decisions. If both assessor cells are left blank and you never run the assignment, the record is screened by the first two assessors in `Reviewers`, as in a simple two-person review.

An ID that doesn't match a row in `Reviewers`, or two identical IDs on one record, shows as `Check assignment` in the summary, and nobody will see that record until it is fixed.

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
- Excluding a record **requires a reason** from the dropdown (set the list in `config.js`). Clicking Exclude without one saves nothing and highlights the dropdown. The backend enforces this too.
- A reviewer can change an earlier decision. Every change is added to the `Decisions` log with a timestamp, and the latest one counts.
- Optional keyword highlighting is stored only in the reviewer's own browser.

## Seeing the results (independent person only)

**Screening → Refresh summary & agreement** builds:

- `Summary`: the two assigned assessors' decisions per record, reasons, notes, and a status (`Agree: …`, `Conflict`, `Pending`, `Check assignment`)
- `Agreement`: pooled counts, percent agreement and Cohen's kappa (with and without counting Maybe as Include), each assessor's workload (assigned, screened, remaining), and agreement for each assessor pair

With more than two assessors the pooled kappa mixes different pairs, so treat it as an overall guide and use the per-pair table for pair-level agreement.

Resolve conflicts however your protocol says (discussion or a third reviewer). That happens outside this tool.

## Updating the backend later

After editing `Code.gs`: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The URL stays the same.

**If you set this up with the earlier two-assessor version:** paste the new `Code.gs`, redeploy as above, reload the spreadsheet and run **Screening → 1. Set up sheets** once. That adds the `assessor_1` / `assessor_2` headers to `Records` without touching your data. Existing records with those cells blank keep being screened by your first two assessors.

## Keeping it properly blinded

- The independent person must **not** be one of the assessors.
- Never share the spreadsheet or the Apps Script project with an assessor, and do not make them editors of either.
- Give each assessor only their own code. Codes are 64-bit random strings and wrong guesses are delayed.
- The session code lives in the browser tab's session storage and is cleared when the tab closes or the reviewer clicks **Sign out**. Reviewers should not share a computer account while screening.
- Reviewer free text (notes, reasons) is stored as plain text, so it can never run as a spreadsheet formula.

## Limits to be aware of

- Google's normal Apps Script quotas apply. The site makes one request to load and one per decision, which is fine for typical review sizes. For very large reviews (many thousands of records) loading may take a few seconds.
- Records are held in Google Sheets, so check that is acceptable under your data-governance rules.
- Blinding here is technical (the data is never sent). It can't stop reviewers discussing records with each other.

## Quick local test

Open `index.html` directly in a browser after setting `config.js`. Use the three rows in `sample-records.csv` as test records.
