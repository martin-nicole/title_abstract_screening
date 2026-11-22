// Edit this file after you have deployed the Apps Script web app (see README.md).
// The URL is not a secret: the backend only answers requests that carry a valid reviewer access code.
window.SCREENING_CONFIG = {
  TITLE: 'Title & abstract screening',

  // Paste the "Web app" URL from Apps Script > Deploy > Manage deployments
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzIxUGqhvUWyGLhHK8W_rPbqjmkMGB4dN6xAaOKYCxcyECgicR_sspzUjlyh0mAXkyOiA/exec',

  // Shown to reviewers in a collapsible box between the decision buttons and the abstract.
  // Edit the wording freely; a part with no text and no items is hidden, and if both are empty the box is hidden.
  CRITERIA: {
    inclusion: {
      items: [
        'protocols of systematic reviews',
        'health interventions',
        'with or without planned meta-analyses',
        'regardless of inclusion of randomised trials and/or non-randomised studies',
        'plan to assess efficacy, effectiveness and/or safety outcomes.',
      ],
    },
    exclusion: {
       items: [
        'protocols for other types of systematic reviews (diagnostic test accuracy, prognosis, overviews of reviews and reviews of methodology)',
        'protocols for systematic reviews for the assessment of prevalence or incidence, with a focus on genetic topics or medical education',
        'for scoping reviews, qualitative and mixed-methods reviews, realist reviews, individual patient data or living SRs',
        'that are an amendment to a previously published version or a planned update of a previously published completed systematic review (both as stated in the accepted manuscript)',
        'with a planned network meta-analysis',
        'that underwent an expedited review process due to funder peer-review',
      ],
    },
  },

  // A reason is mandatory to Exclude a record; reviewers pick one from this list.
  // Keep at least one entry, otherwise records cannot be excluded.
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
};
