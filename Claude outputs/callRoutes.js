// callRoutes.js
// Express routes for the click-to-call button on the student profile page.
//
// Mount in your app:
//   const callRoutes = require('./callRoutes');
//   app.use('/api/calls', callRoutes);

const express = require('express');
const router = express.Router();
const edesy = require('./edesyClient');

// TODO: wire these to your actual HRMS/CRM data layer (Mongoose/Prisma/
// Sequelize/raw SQL — whatever this project uses). Kept as plain
// functions here so the routes below don't depend on a specific ORM.
const CallRecord = {
  /** Create a row for a just-initiated call. */
  async create({ callSid, studentId, staffId, staffNumber, studentNumber, maskedNumber }) {
    // e.g. return db.calls.insertOne({ callSid, studentId, staffId, ... status: 'initiated', createdAt: new Date() })
    throw new Error('CallRecord.create not implemented — plug in your DB layer');
  },
  /** Update a row once the recording is fetched. */
  async saveRecording({ callSid, recordingUrl, durationSec, status }) {
    // e.g. return db.calls.updateOne({ callSid }, { $set: { recordingUrl, durationSec, status } })
    throw new Error('CallRecord.saveRecording not implemented — plug in your DB layer');
  },
};

// TODO: replace with your real auth middleware (whatever protects
// staff-only routes elsewhere in the HRMS).
function requireStaffAuth(req, res, next) {
  next();
}

/**
 * POST /api/calls/click-to-call
 * body: { studentId, studentNumber, staffNumber, maxDurationSec? }
 *
 * staffId/staffNumber should come from the logged-in session, not the
 * request body, once auth is wired in — left explicit here for clarity.
 */
router.post('/click-to-call', requireStaffAuth, async (req, res) => {
  const { studentId, studentNumber, staffNumber, maxDurationSec } = req.body;

  if (!studentId || !studentNumber || !staffNumber) {
    return res.status(400).json({ error: 'studentId, studentNumber and staffNumber are required' });
  }

  try {
    const call = await edesy.initiateCall(staffNumber, studentNumber, maxDurationSec);

    await CallRecord.create({
      callSid: call.call_sid,
      studentId,
      staffId: req.user && req.user.id, // from your auth middleware
      staffNumber,
      studentNumber,
      maskedNumber: call.masked_number,
    });

    res.status(201).json({
      callSid: call.call_sid,
      status: call.status,
      maskedNumber: call.masked_number,
    });
  } catch (err) {
    const status = err.code === 'insufficient_balance' ? 402
      : err.code === 'invalid_numbers' ? 400
      : 502;
    res.status(status).json({ error: err.code || 'call_failed', message: err.message });
  }
});

/**
 * GET /api/calls/:callSid/status
 * Lets the frontend poll call progress if you're not using webhooks
 * for UI updates (webhooks are still the right way to trigger the
 * recording save — see webhookRoutes.js).
 */
router.get('/:callSid/status', requireStaffAuth, async (req, res) => {
  try {
    const status = await edesy.getCallStatus(req.params.callSid);
    res.json(status);
  } catch (err) {
    res.status(502).json({ error: err.code || 'status_fetch_failed', message: err.message });
  }
});

/**
 * POST /api/calls/:callSid/sync-recording
 * Manual fallback: fetch + save a recording on demand, in case the
 * webhook was missed or you want a "refresh" button in the UI.
 */
router.post('/:callSid/sync-recording', requireStaffAuth, async (req, res) => {
  const { callSid } = req.params;
  try {
    const recording = await edesy.getCallRecording(callSid);

    // NOTE: confirm the exact field name for the recording URL once
    // you see a live response — the public docs don't name it.
    const recordingUrl = recording.recording_url || recording.url || recording.recording;

    await CallRecord.saveRecording({
      callSid,
      recordingUrl,
      durationSec: recording.duration_sec,
      status: 'completed',
    });

    res.json({ callSid, recordingUrl });
  } catch (err) {
    res.status(502).json({ error: err.code || 'recording_fetch_failed', message: err.message });
  }
});

module.exports = router;
