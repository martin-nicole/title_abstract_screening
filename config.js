// Edit this file after you have deployed the Apps Script web app (see README.md).
// The URL is not a secret: the backend only answers requests that carry a valid reviewer access code.
window.SCREENING_CONFIG = {
  TITLE: 'Title & abstract screening',

  // Paste the "Web app" URL from Apps Script > Deploy > Manage deployments
  APPS_SCRIPT_URL: 'PASTE_YOUR_WEB_APP_URL_HERE',

  // Shown in the dropdown when a reviewer excludes a record
  EXCLUSION_REASONS: [
    'Wrong population',
    'Wrong intervention / exposure',
    'Wrong comparator',
    'Wrong outcome',
    'Wrong study design',
    'Not primary research (editorial, comment, etc.)',
    'Duplicate',
    'Language',
    'Other',
  ],

  // true = reviewers must pick a reason before they can Exclude
  REQUIRE_EXCLUSION_REASON: false,
};
