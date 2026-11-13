import { defineStorage } from '@aws-amplify/backend';

/**
 * Storage configuration for Thoughtflows HRMS & CRM using AWS S3
 * Manages training materials, student submissions (assignments, resumes, recordings),
 * KYC verification documents, and shared academy media.
 */
export const storage = defineStorage({
  name: 'thoughtflowsStorage',
  access: (allow) => ({
    // Shared teaching materials uploaded by trainers (PPT decks, PDFs, class
    // videos up to 200 MB).
    // The HRMS/CRM app uses its own JWT-based staff login (not Cognito), so
    // uploads/deletes from the Trainer LMS upload desk arrive as an
    // unauthenticated Amplify "guest" identity — grant that identity
    // write/delete too, not just read, or every upload from the browser is
    // rejected by the Identity Pool (same reason as 'recordings/*' below).
    'training-materials/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read', 'write', 'delete']),
    ],
    // Work sent by students to trainers (assignments, test submissions, break
    // request documents). Guest write for the same reason as above: the Student
    // Portal authenticates with the app's own JWT, not Cognito.
    'student-submissions/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read', 'write', 'delete']),
    ],
    // Student resumes and placement preparation materials. Guest write for the
    // same reason as above.
    'resumes/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read', 'write', 'delete']),
    ],
    // Audio / video recordings and training session captures.
    // The HRMS/CRM app uses its own JWT-based staff login (not Cognito), so
    // uploads/deletes from the dashboard arrive as an unauthenticated Amplify
    // "guest" identity — grant that identity write/delete too, not just read,
    // or every upload from the browser is rejected by the Identity Pool.
    'recordings/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read', 'write', 'delete']),
    ],
    // Public academy branding, brochures, and handouts
    'public/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
    ],
  }),
});
