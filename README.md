# Blinded title & abstract screening

A small website for assessors to screen titles and abstracts independently. You can set up **any number of assessors**. **Each record is screened by two of them**, and by **a third only if the first two disagree or both say Maybe**. The third can be any assessor who is not one of that record's first two.

- **Assessors** open a web page (hosted free on GitHub Pages), sign in with a personal access code, and mark each record **Include / Maybe / Exclude**. They only see the records they may screen.
- **Blinding:** an assessor's browser only ever receives their own records and *their own* decisions. The one exception is a third assessor, who also receives the first two assessments for the records they are deciding (unnamed). No one else's decisions, and nobody's identity, are sent. A third assessor can't see a record at all until it needs one, and then also sees the first two assessments (without names).
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
- `Reviewers`: one row per person, with a randomly generated access code (it starts with `R1`, `R2` and `R3`)
- `Decisions`: the append-only log of every decision

**Add all your assessors** to `Reviewers`: type a unique ID (`R4`, `R5`, …) and a name on each new row, then run **Screening → 2. Generate missing access codes**. Any number is fine. (If you used the earlier version with a `role` column, it is no longer used and can be deleted.)

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

The third assessor can be **any reviewer who is not the first or second assessor of that record**. They may be a first or second assessor on other records. Choose them in the `assessor_3` column:

- **Automatic:** run **Screening → 4. Assign a third assessor where needed**. It fills `assessor_3` for every record that currently needs one, picking someone outside that record's first two and keeping the workload even. Run it again whenever more disagreements have come in; it never overwrites an `assessor_3` that is already filled in.
- **By hand:** type a reviewer ID into `assessor_3`. You can fill it in ahead of time. It has no effect until the record actually needs a third assessor.

The third assessor **cannot see a record until it needs them**. When it does, they **see the first two assessments** (decision, reason and note) in an "Earlier assessments" box, labelled *Assessor 1* and *Assessor 2* with no names. They see nothing else about the others. The first two assessors are never shown the third's decision or told a third assessor was involved. The third assessor's **Include or Exclude becomes the final decision**. This needs at least three people in `Reviewers`.

The third assessor must **refresh the page** (or sign out and in) to see newly arrived records, because their list grows as the first two finish.

### 4d. Unassign and reassign (if your reviewers change)
Two menu items clear assignments that nobody has acted on yet, so you can reassign them with items 3 and 4:

- **Unassign records not yet assessed (all):** records with no decisions from anyone lose `assessor_1`, `assessor_2` and `assessor_3`. On records that already have decisions, a third assessor who hasn't decided yet is removed (run item 4 to pick another).
- **Unassign one reviewer's records not yet assessed:** enter a reviewer ID (for example someone who is leaving).
  - Records nobody has started go back to the unassigned pool.
  - Where that reviewer was the third assessor and hasn't decided, `assessor_3` is cleared.
  - If the other first-round assessor has already decided, the record is left alone and the message tells you how many, so you can change those by hand.

Anything already assessed by the person concerned is never changed, and no decision is ever deleted.

### 4e. Take a reviewer off
Use **Screening → Take a reviewer off (no new assignments)** and enter the reviewer ID. This:

- marks them `Inactive` in a new `status` column of `Reviewers` (you can also type `Inactive` there yourself; blank means active),
- stops them signing in,
- never gives them new records, as a first or a third assessor (menu items 3 and 4 skip them),
- releases the records they have not assessed (same rules as 4d), and
- **keeps everything they already assessed**: their decisions stay in `Decisions` and `Summary`, and the records stay assigned to them.

Then run menu items 3 and 4 to reassign what was released. Run **1. Set up sheets** once first if your `Reviewers` sheet has no `status` column. A record where the departed person hasn't assessed but the other assessor has is left for you to change by hand, and a hand-typed `assessor_3` who is inactive is treated as invalid. To bring someone back, clear their `status` cell.

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
- A collapsible **Inclusion & exclusion criteria** box sits between the decision buttons and the abstract. Its wording comes from `CRITERIA` in `config.js` (both the inclusion and exclusion criteria are pre-filled; an empty part is hidden). If your `config.js` has no `CRITERIA`, the built-in criteria are shown.
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
| `Conflict: needs 3rd assessor` / `Both Maybe: needs 3rd assessor` | A third assessor is needed but none is assigned. If `(check assessor_3)` is shown, what is in `assessor_3` is invalid | blank |
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
2. **What the website is running.** Open your web app URL (the one in `config.js`) in a browser tab. You should see `"version":"assign-7"`.
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
