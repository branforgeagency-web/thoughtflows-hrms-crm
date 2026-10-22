// webhookRoutes.js
// Receives real-time events from Edesy (call start, call end, recording
// availability, etc.) so recordings get saved automatically instead of
// relying on the frontend to poll.
//
// Configure this URL in the dashboard sidebar: Event Webhook
// e.g. https://yourdomain.com/api/webhooks/edesy
//
// Mount in your app BEFORE any global JSON body-size limits that might
// reject large payloads, and make sure this route uses raw/json body
// parsing consistent with how Edesy signs requests (see verifySignature
// below — fill in once you confirm their signing scheme from the
// dashboard's Event Webhook docs).

const express = require('express');
const router = express.Router();
const edesy = require('./edesyClient');

// TODO: same DB layer as callRoutes.js — reuse that module instead of
// duplicating in a real project. Repeated here only so this file is
// self-contained to read.
const CallRecord = {
  async saveRecording({ callSid, recordingUrl, durationSec, status }) {
    throw new Error('CallRecord.saveRecording not implemented — plug in your DB layer');
  },
  async updateStatus({ callSid, status, hangupCause }) {
    throw new Error('CallRecord.updateStatus not implemented — plug in your DB layer');
  },
};

/**
 * TODO: Edesy's webhook signing scheme isn't published in the pages we
 * pulled. Check the "Event Webhook" section in the masking dashboard —
 * it likely gives you a signing secret and a header name (commonly
 * something like X-Edesy-Signature). Verify it here before trusting
 * the payload, the same way you'd verify a Stripe/Razorpay webhook.
 */
function verifySignature(req) {
  // const signature = req.headers['x-edesy-signature'];
  // const expected = crypto.createHmac('sha256', process.env.EDESY_WEBHOOK_SECRET)
  //   .update(req.rawBody).digest('hex');
  // return signature === expected;
  return true; // placeholder until the signing scheme is confirmed
}

router.post('/edesy', express.json(), async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).json({ error: 'invalid_signature' });
  }

  const event = req.body;
  // Exact envelope shape isn't published — log the first few live
  // payloads and adjust the field names below (event.type, event.data
  // are reasonable guesses based on Edesy's other responses, which
  // wrap payloads in a `data` object).
  console.log('[edesy webhook]', JSON.stringify(event));

  const eventType = event.type || event.event;
  const payload = event.data || event;
  const callSid = payload.call_sid;

  try {
    switch (eventType) {
      case 'call.ended':
      case 'call_ended':
        await CallRecord.updateStatus({
          callSid,
          status: 'completed',
          hangupCause: payload.hangup_cause,
        });
        break;

      case 'recording.available':
      case 'recording_available': {
        // Fetch via the API rather than trusting a URL in the webhook
        // body, in case the payload only signals availability.
        const recording = await edesy.getCallRecording(callSid);
        const recordingUrl = recording.recording_url || recording.url || recording.recording;

        await CallRecord.saveRecording({
          callSid,
          recordingUrl,
          durationSec: recording.duration_sec,
          status: 'completed',
        });
        break;
      }

      default:
        // Unhandled event types are fine to ignore — just ack them.
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[edesy webhook] handling failed', err);
    // Still ack with 200 if you don't want Edesy retrying forever on a
    // DB hiccup; switch to 500 if you want their retry behavior to
    // paper over transient failures. Confirm their retry policy first.
    res.status(200).json({ received: true, warning: 'processing_failed' });
  }
});

module.exports = router;
