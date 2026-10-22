// edesyClient.js
// Thin wrapper around Edesy's Number Masking API.
// Docs: https://edesy.in/docs/number-masking
//
// Required env vars (see .env.example):
//   EDESY_API_KEY   - Bearer token from masking.edesy.in > API Keys

const axios = require('axios');

const BASE_URL = 'https://voice-api.edesy.in/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.EDESY_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * Initiate a click-to-call: dials partyA first, bridges partyB once
 * partyA answers. Both see the masked number as caller ID.
 *
 * @param {string} partyA - counselor/staff 10-digit mobile number
 * @param {string} partyB - student 10-digit mobile number
 * @param {number} [maxDurationSec] - optional cap, 10-7200 seconds
 * @returns {Promise<{call_sid, status, masked_number}>}
 */
async function initiateCall(partyA, partyB, maxDurationSec) {
  if (partyA === partyB) {
    throw Object.assign(new Error('Party A and Party B cannot be the same number'), {
      code: 'invalid_numbers',
    });
  }

  const body = { party_a: partyA, party_b: partyB };
  if (maxDurationSec) body.max_duration_sec = maxDurationSec;

  try {
    const { data } = await client.post('/masking/calls', body);
    return data.data; // { call_sid, status, party_a, party_b, masked_number }
  } catch (err) {
    throw normalizeEdesyError(err);
  }
}

/**
 * Poll the current status of a call.
 * @param {string} callSid
 */
async function getCallStatus(callSid) {
  try {
    const { data } = await client.get(`/masking/calls/${callSid}`);
    return data.data;
  } catch (err) {
    throw normalizeEdesyError(err);
  }
}

/**
 * Fetch the recording for a finished call.
 * Call this after the call has ended (via webhook, or by polling
 * getCallStatus until status is a terminal state).
 * @param {string} callSid
 * @returns {Promise<object>} whatever Edesy returns — expect a
 *   recording URL field; confirm exact field name once you see a
 *   live response, since it isn't published in the docs.
 */
async function getCallRecording(callSid) {
  try {
    const { data } = await client.get(`/masking/calls/${callSid}/recording`);
    return data.data;
  } catch (err) {
    throw normalizeEdesyError(err);
  }
}

/**
 * List recent call logs (duration, status, hangup cause, recording link).
 * Useful as a fallback / reconciliation job if a webhook is ever missed.
 */
async function listCallLogs(params = {}) {
  try {
    const { data } = await client.get('/masking/call-logs', { params });
    return data.data;
  } catch (err) {
    throw normalizeEdesyError(err);
  }
}

function normalizeEdesyError(err) {
  if (err.response && err.response.data && err.response.data.error) {
    const { code, message } = err.response.data.error;
    const e = new Error(message || 'Edesy API error');
    e.code = code;
    e.status = err.response.status;
    return e;
  }
  return err;
}

module.exports = {
  initiateCall,
  getCallStatus,
  getCallRecording,
  listCallLogs,
};
