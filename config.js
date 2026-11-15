// Edit this file after you have deployed the Apps Script web app (see README.md).
// The URL is not a secret: the backend only answers requests that carry a valid reviewer access code.
window.SCREENING_CONFIG = {
  TITLE: 'Title & abstract screening',

  // Paste the "Web app" URL from Apps Script > Deploy > Manage deployments
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzgd_a6RUw5eR7OcWjWv27L5-YuZTrOGTyd6F55xwxj78FrhEFIANLnao83-lL11JzQqg/exec',

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
