import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';

/**
 * Thoughtflows HRMS & CRM AWS Amplify Gen 2 Backend Definition
 * Combines Authentication and S3 Storage resources.
 */
export const backend = defineBackend({
  auth,
  storage,
});
