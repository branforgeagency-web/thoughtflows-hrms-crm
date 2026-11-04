import { defineStorage } from '@aws-amplify/backend';

/**
 * Storage configuration for Thoughtflows HRMS & CRM using AWS S3
 * Manages training materials, student submissions (assignments, resumes, recordings),
 * KYC verification documents, and shared academy media.
 */
export const storage = defineStorage({
  name: 'thoughtflowsStorage',
  access: (allow) => ({
    // Shared teaching materials uploaded by trainers
    'training-materials/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
    ],
    // Work sent by students to trainers (assignments, test submissions, recordings)
    'student-submissions/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
    ],
    // Student resumes and placement preparation materials
    'resumes/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
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
