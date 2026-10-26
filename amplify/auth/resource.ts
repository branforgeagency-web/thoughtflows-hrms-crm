import { defineAuth } from '@aws-amplify/backend';

/**
 * Authentication configuration for Thoughtflows HRMS & CRM
 * Supports email login for administrators, trainers, staff, and students.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    preferredUsername: {
      required: false,
      mutable: true,
    },
  },
});
