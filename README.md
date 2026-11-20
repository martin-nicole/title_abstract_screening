# Blinded title & abstract screening

A small website for assessors to screen titles and abstracts independently. You can set up **any number of screening assessors**. **Each record is screened by two of them**, and by **one dedicated third assessor (who takes no part in the first round) only if the first two disagree or both say Maybe**.

- **Assessors** open a web page (hosted free on GitHub Pages), sign in with a personal access code, and mark each record **Include / Maybe / Exclude**. They only see the records they may screen.
- **Blinding:** an assessor's browser only ever receives their own records and *their own* decisions. Other assessors' decisions, and who they are, are never sent to it. A third assessor can't see a record at all until it needs one.
- **Results** are written to a Google Sheet owned by an **independent person**, who is the only one with access. They can see each record's decisions side by side, the third assessor's resolution, a final decision, workload, percent agreement and Cohen's kappa.

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
- `Reviewers`: one row per person, with a randomly generated access code and a `role` column (it starts with `R1` and `R2` as screeners and `R3` as the third assessor)
- `Decisions`: the append-only log of every decision

**Add all your people** to `Reviewers`: type a unique ID (`R4`, `R5`, …) and a name on each new row, then run **Screening → 2. Generate missing access codes**. Any number of screeners is fine. Leave `role` blank for screeners. Put `Adjudicator` in `role` for the **one** person who is the third assessor (setup does this for `R3`).

### 4. Add the records
Paste or import your records into `Records` with these columns:

`record_id | title | abstract | authors | year | journal | doi | assessor_1 | assessor_2 | assessor_3`

`record_id` must be unique. Leave `assessor_3` blank for now (see "Third assessor" below). Only `record_id` and `title` are essential. You can export this from a reference manager (Zotero, EndNote, Rayyan, Covidence, etc.) as CSV and map the columns. `sample-records.csv` shows the layout.

### 4b. Assign two assessors to each record
The last two columns hold the reviewer IDs of the two assessors for that record. Either:

- **Automatic:** leave them blank and run **Screening → 3. Assign two assessors to unassigned records**. Each record gets two different assessors and the workload is kept even.
- **By hand:** type the IDs yourself (for example `R1` and `R4`). You can mix both: records that already have an assignment are left alone.

Do this **before screening starts**. It never reassigns a record that already has decisions. If both assessor cells are left blank and you never run the assignment, the record is screened by the first two assessors in `Reviewers`, as in a simple two-person review.

An ID that doesn't match a row in `Reviewers`, or two identical IDs on one record, shows as `Check assignment` in the summary, and nobody will see that record until it is fixed.

### 4c. Third assessor (conflicts and double Maybes)
A record **needs a third assessor** when both of the first two assessors have decided and either:

- their decisions **differ** (for example Include vs Exclude, or Include vs Maybe), or
- they **both said Maybe**.

The third assessor is **always the same person**: the one row in `Reviewers` whose `role` is `Adjudicator`. They are **not involved in the initial screening**: they are never given records in the first round, can't be put in `assessor_1` / `assessor_2` (such a record shows `Check assignment`), and are skipped by the automatic assignment. Nothing needs assigning for them, and `assessor_3` is ignored (menu item 4 does nothing in this mode).

The third assessor **cannot see a record until it needs them**, and sees no one else's decisions. The first two assessors are never told a third assessor was involved. The third assessor's **Include or Exclude becomes the final decision**. They must **refresh the page** (or sign out and in) to see newly arrived records.

*Without an Adjudicator row*, the older behaviour applies: type a reviewer ID into `assessor_3`, or run **Screening → 4. Assign a third assessor where needed**.

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
- **Exclude** opens a list of exclusion reasons (set the list in `config.js`). Picking a reason saves the decision straight away; nothing is saved before that. **Esc** or Cancel closes the list without saving. With the list open, keys **1–9** pick the matching reason. The backend also refuses an Exclude without a reason.
- **Maybe** opens a note box (the only place a note is written). A note explaining the uncertainty is required, and nothing is saved until one is written (**Ctrl/⌘ + Enter** or *Save Maybe*; **Esc** cancels). The backend also refuses a Maybe without a note.
- A reviewer can change an earlier decision. Every change is added to the `Decisions` log with a timestamp, and the latest one counts.
- Optional keyword highlighting is stored only in the reviewer's own browser.

## Seeing the results (independent person only)

**Screening → Refresh summary & agreement** builds:

- `Summary`: each record's decisions, reasons and notes from the first two assessors and, where needed, the third; a `status`; and a `final decision`.
- `Agreement`: counts, percent agreement and Cohen's kappa for the first two assessors (with and without counting Maybe as Include), a third-assessor progress table, each assessor's workload (assigned, screened, remaining), and agreement for each assessor pair.

**Status values**

| Status | Meaning | Final decision |
|---|---|---|
| `Pending` | The first two haven't both decided yet | blank |
| `Agree: Include` / `Agree: Exclude` | First two agree | that decision |
| `Conflict: needs 3rd assessor` / `Both Maybe: needs 3rd assessor` | A third assessor is needed but there is none (no `Adjudicator` in `Reviewers`, and no valid `assessor_3`) | blank |
| `…: awaiting 3rd assessor` | Third assessor assigned, hasn't decided | blank |
| `Resolved by 3rd: Include` / `Resolved by 3rd: Exclude` | The third assessor decided | the third's decision |
| `…: 3rd said Maybe (discuss)` | The third assessor also said Maybe. This needs a decision outside the tool | blank |
| `Check assignment` | The first two assessors are invalid | blank |

If an assessor later changes a decision so that the first two agree on Include or Exclude, the third assessor is no longer needed, the record goes back to `Agree: …`, and the third's earlier decision is ignored.

Percent agreement and kappa describe the first two assessors only. A double Maybe counts as agreement there, even though it still goes to a third assessor. With more than two assessors the pooled kappa mixes different pairs, so treat it as an overall guide and use the per-pair table for pair-level agreement.

## Updating the backend later

After editing `Code.gs`: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The URL stays the same.

**If you set this up with the earlier two-assessor version:** paste the new `Code.gs`, redeploy as above, reload the spreadsheet and run **Screening → 1. Set up sheets** once. That adds any missing `assessor_1` / `assessor_2` / `assessor_3` headers to `Records` without touching your data. Existing records with the first two cells blank keep being screened by your first two assessors.

## Troubleshooting: assessors see the wrong records

The spreadsheet menu runs the script **as saved**. The website runs the version **as deployed**. They can differ, so check both:

1. **What the saved script does.** Run **Screening → Check who sees which records**. The `Assignment check` tab lists how many records each assessor can see right now, and flags any record where both assessor cells are blank (then the first two assessors see it), the assignment is invalid, or the third assessor is invalid or held back.
2. **What the website is running.** Open your web app URL (the one in `config.js`) in a browser tab. You should see `"version":"assign-4"`.
   - No `version` at all, or an older one: the deployed copy is stale. Use **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
   - If you used **New deployment** instead, you now have a *different* URL. Put that new URL in `config.js` and push it to GitHub.
3. After fixing, each assessor should **Sign out** and sign in again. Their record count should match the `Assignment check` tab.

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
