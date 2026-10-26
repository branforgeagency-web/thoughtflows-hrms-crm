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
    'student-submissions/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    // General student submissions path
    'student-submissions/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    // Student resumes and placement preparation materials
    'resumes/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
    ],
    // Audio / video recordings and training session captures
    'recordings/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
    ],
    // Public academy branding, brochures, and handouts
    'public/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
    ],
  }),
});
