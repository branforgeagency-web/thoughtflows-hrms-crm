import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Department from '../models/Department.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import StudentLead from '../models/StudentLead.js';
import Student from '../models/Student.js';
import Demo from '../models/Demo.js';
import Trainer from '../models/Trainer.js';
import CourseFeeRate from '../models/CourseFeeRate.js';
import { DEFAULT_COURSE_FEE_RATES } from '../constants/courses.js';
import Approval from '../models/Approval.js';
import Escalation from '../models/Escalation.js';
import TeamMember from '../models/TeamMember.js';
import Attendance from '../models/Attendance.js';
import CollegePartner from '../models/CollegePartner.js';
import CorporatePartner from '../models/CorporatePartner.js';
import PlacementRecord from '../models/PlacementRecord.js';
import BillingDeal from '../models/BillingDeal.js';
import CccpFollowUp from '../models/CccpFollowUp.js';
import MarketingCampaign from '../models/MarketingCampaign.js';
import MarketingCreative from '../models/MarketingCreative.js';
import TrainerDoubt from '../models/TrainerDoubt.js';
import TrainerAssessment from '../models/TrainerAssessment.js';
import IncentiveSlab from '../models/IncentiveSlab.js';
import AuditLog from '../models/AuditLog.js';
import CallRecording from '../models/CallRecording.js';
import DailyClosure from '../models/DailyClosure.js';
import HrTarget from '../models/HrTarget.js';
import ClassAttendance from '../models/ClassAttendance.js';
import TrainingMaterial from '../models/TrainingMaterial.js';
import Notification from '../models/Notification.js';
import ClassFeedback from '../models/ClassFeedback.js';
import LmsProgress from '../models/LmsProgress.js';
import CallLog from '../models/CallLog.js';
import { MANDATORY_MODULES, MODULE_ITEMS, PASS_MARK, COURSE_PASS_MARK, QUESTION_BANK, courseQuestions, courseModuleFor } from '../constants/hrLms.js';
import { requireAuth, signToken, signFileToken, checkPassword, hashPassword, hashIfPlain } from '../middleware/auth.js';
import LiveClassSession from '../models/LiveClassSession.js';
import StudentSubmission from '../models/StudentSubmission.js';
import { PLACEMENT_EDITORS, autoStage, effectiveStage, blockReason, stageChecks } from '../constants/placement.js';
import StudentRequest, { TRAINER_REQUEST_TYPES } from '../models/StudentRequest.js';
import AppSetting from '../models/AppSetting.js';
import ContentPiece from '../models/ContentPiece.js';
import BranchLeadDemand from '../models/BranchLeadDemand.js';
import SopDocument from '../models/SopDocument.js';
import TeamTask from '../models/TeamTask.js';
import { BRANCH_MASTER, DEPARTMENT_MASTER, DEPT_CODE_BY_DASHBOARD } from '../constants/org.js';

const router = express.Router();

// Drop legacy unique index if it exists in MongoDB so group demos up to 6 students work smoothly
Demo.collection?.dropIndex('trainerId_1_preferredDate_1_timeSlot_1').catch(() => {});

// Every API call needs a valid login token (see middleware/auth.js for the few public routes)
router.use(requireAuth);

// Health Check
router.get('/health', (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'online',
    system: 'Thoughtflows HRMS & CRM API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    database: isMongoConnected ? 'connected' : 'offline'
  });
});

// ==========================================
// CALLING — Exotel click-to-call
//   1. /calls/dial        Exotel rings the counsellor, then connects the lead
//   2. /calls/:sid/status polled by the call screen
//   3. /calls/exotel/webhook  Exotel posts the final status + recording, which
//      is saved even if the counsellor closed the call screen
// ==========================================
function exotelConfig() {
  return {
    sid: process.env.EXOTEL_SID || '',
    apiKey: process.env.EXOTEL_API_KEY || '',
    apiToken: process.env.EXOTEL_API_TOKEN || '',
    exophone: process.env.EXOTEL_EXOPHONE || '',
    subdomain: process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
    defaultAgentPhone: process.env.EXOTEL_DEFAULT_AGENT_PHONE || '',
    // Public URL of this API (e.g. https://thoughtflows-hrms-crm.onrender.com) — enables the status webhook
    publicApiUrl: String(process.env.PUBLIC_API_URL || '').replace(/\/+$/, ''),
    webhookKey: process.env.EXOTEL_WEBHOOK_KEY || ''
  };
}

function exotelMissing() {
  const c = exotelConfig();
  return [['EXOTEL_SID', c.sid], ['EXOTEL_API_KEY', c.apiKey], ['EXOTEL_API_TOKEN', c.apiToken], ['EXOTEL_EXOPHONE', c.exophone]]
    .filter(([, v]) => !v).map(([k]) => k);
}

function exotelBaseUrl() {
  const c = exotelConfig();
  return `https://${c.subdomain}/v1/Accounts/${c.sid}`;
}

function exotelAuthHeader() {
  const c = exotelConfig();
  const token = Buffer.from(`${c.apiKey}:${c.apiToken}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

// Indian numbers only need normalizing to E.164 — a bare 10-digit mobile
// gets a +91 prefix, anything already prefixed is left alone.
function toE164India(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
  return digits;
}

// Map Exotel's call status to the one the call screen understands
const EXOTEL_STATUS = { queued: 'queued', ringing: 'ringing', 'in-progress': 'in-progress', completed: 'completed', failed: 'failed', busy: 'busy', 'no-answer': 'no-answer', canceled: 'canceled' };

// Create or update the recording row for one Exotel call (keyed by CallSid)
async function upsertExotelRecording({ callSid, leadId, leadName, leadPhone, counselorName, counselorPhone, durationSeconds, audioUrl, outcome, notes }) {
  if (!callSid) return null;
  let rec = await CallRecording.findOne({ callSid });
  const isNew = !rec;
  if (!rec) {
    rec = new CallRecording({ callSid, source: 'exotel', leadName: leadName || 'Lead', leadPhone: leadPhone || '' });
  }
  if (leadId && mongoose.isValidObjectId(leadId)) rec.leadId = leadId;
  if (leadName) rec.leadName = leadName;
  if (leadPhone) rec.leadPhone = leadPhone;
  if (counselorName) rec.counselorName = counselorName;
  if (counselorPhone) rec.counselorPhone = counselorPhone;
  if (Number(durationSeconds)) rec.durationSeconds = Number(durationSeconds);
  if (audioUrl) rec.audioUrl = audioUrl;
  if (outcome) rec.outcome = outcome;
  if (notes) rec.notes = notes;
  if (!rec.audioUrl) return null; // Exotel had no recording (call not answered)
  await rec.save();
  if (isNew && rec.leadId) {
    await StudentLead.findByIdAndUpdate(rec.leadId, { $inc: { callCount: 1 }, lastCallTime: new Date() });
  }
  return rec;
}

router.get('/calls/config-status', (req, res) => {
  const missing = exotelMissing();
  res.json({ provider: 'exotel', configured: missing.length === 0, missing, webhook: Boolean(exotelConfig().publicApiUrl) });
});

router.post('/calls/dial', async (req, res) => {
  const { leadPhone, agentPhone, leadId = '', leadName = '' } = req.body || {};
  if (!leadPhone) return res.status(400).json({ error: 'leadPhone is required' });
  const missing = exotelMissing();
  if (missing.length) return res.status(503).json({ error: `Exotel is not configured. Add ${missing.join(', ')} to server/.env and restart.` });

  const c = exotelConfig();
  // Counsellor's phone: their user profile, else what the screen sent, else the default agent
  let profilePhone = '';
  try {
    const me = req.user?.email ? await User.findOne({ email: req.user.email }).select('phone') : null;
    profilePhone = me?.phone || '';
  } catch (_) {}
  const from = toE164India(profilePhone || agentPhone || c.defaultAgentPhone);
  const to = toE164India(leadPhone);
  if (!from) return res.status(400).json({ error: 'No phone number is set for your login. Ask admin to add your mobile number to your user account.' });
  if (!to) return res.status(400).json({ error: 'The lead has no usable phone number on file.' });

  try {
    const params = new URLSearchParams({
      From: from,
      To: to,
      CallerId: c.exophone,
      CallType: 'trans',
      Record: 'true',
      CustomField: JSON.stringify({ leadId, leadName, counselor: req.user?.name || '' }).slice(0, 250)
    });
    if (c.publicApiUrl) {
      params.set('StatusCallback', `${c.publicApiUrl}/api/calls/exotel/webhook${c.webhookKey ? `?key=${encodeURIComponent(c.webhookKey)}` : ''}`);
      params.set('StatusCallbackContentType', 'application/json');
    }
    const response = await fetch(`${exotelBaseUrl()}/Calls/connect.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...exotelAuthHeader() },
      body: params.toString()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.RestException?.Message || data?.error || `Exotel returned HTTP ${response.status}`;
      return res.status(502).json({ error: message });
    }
    const call = data?.Call || {};
    res.json({ provider: 'exotel', callSid: call.Sid, status: EXOTEL_STATUS[String(call.Status || '').toLowerCase()] || 'queued', from, to });
  } catch (err) {
    res.status(502).json({ error: `Could not reach Exotel: ${err.message}` });
  }
});

router.get('/calls/:callSid/status', async (req, res) => {
  const missing = exotelMissing();
  if (missing.length) return res.status(503).json({ error: 'Exotel is not configured.' });
  try {
    const response = await fetch(`${exotelBaseUrl()}/Calls/${encodeURIComponent(req.params.callSid)}.json`, {
      headers: { ...exotelAuthHeader() }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.RestException?.Message || `Exotel returned HTTP ${response.status}`;
      return res.status(502).json({ error: message });
    }
    const call = data?.Call || {};
    res.json({
      provider: 'exotel',
      callSid: call.Sid,
      status: EXOTEL_STATUS[String(call.Status || '').toLowerCase()] || call.Status,
      duration: Number(call.ConversationDuration || call.Duration || 0),
      startTime: call.StartTime,
      endTime: call.EndTime,
      recordingUrl: call.RecordingUrl || null
    });
  } catch (err) {
    res.status(502).json({ error: `Could not reach Exotel: ${err.message}` });
  }
});

// Exotel status callback (public — protected by EXOTEL_WEBHOOK_KEY when set)
router.post('/calls/exotel/webhook', async (req, res) => {
  try {
    const key = exotelConfig().webhookKey;
    if (key && req.query.key !== key) return res.status(403).json({ error: 'Bad key' });
    const b = req.body || {};
    const callSid = b.CallSid || b.callSid;
    let custom = {};
    try { custom = JSON.parse(b.CustomField || '{}'); } catch (_) {}
    const status = String(b.Status || b.CallStatus || '').toLowerCase();
    const leadPhone = String(b.To || '').replace(/\D/g, '').slice(-10);
    const lead = custom.leadId && mongoose.isValidObjectId(custom.leadId)
      ? await StudentLead.findById(custom.leadId)
      : (leadPhone ? await StudentLead.findOne({ phone: { $regex: leadPhone } }) : null);
    await upsertExotelRecording({
      callSid,
      leadId: lead?._id?.toString() || custom.leadId,
      leadName: lead?.fullName || custom.leadName,
      leadPhone,
      counselorName: custom.counselor || lead?.counselorAssigned || '',
      counselorPhone: String(b.From || '').replace(/\D/g, '').slice(-10),
      durationSeconds: b.ConversationDuration || b.Legs?.[1]?.OnCallDuration || 0,
      audioUrl: b.RecordingUrl || '',
      outcome: status === 'completed' ? 'Follow-up Needed' : 'Not Reachable'
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Exotel webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/calls/:callSid/hangup', async (req, res) => {
  const missing = exotelMissing();
  if (missing.length) return res.status(503).json({ error: 'Exotel is not configured.' });
  try {
    const response = await fetch(`${exotelBaseUrl()}/Calls/${encodeURIComponent(req.params.callSid)}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...exotelAuthHeader() },
      body: new URLSearchParams({ Status: 'completed' }).toString()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.RestException?.Message || `Exotel returned HTTP ${response.status}`;
      return res.status(502).json({ error: message });
    }
    res.json({ success: true, status: data?.Call?.Status || 'completed' });
  } catch (err) {
    res.status(502).json({ error: `Could not reach Exotel: ${err.message}` });
  }
});

router.get('/recordings', async (req, res) => {
  try {
    const { leadPhone, leadId, search } = req.query;
    // Counsellors only hear their own calls; managers may filter by name
    const counselorName = isScopedHr(req) ? req.user?.name : (req.query.counselorName || req.query.counselor);
    let query = {};
    if (leadPhone) {
      const digits = leadPhone.replace(/[^\d]/g, '');
      if (digits) query.leadPhone = { $regex: digits, $options: 'i' };
    }
    if (leadId && mongoose.isValidObjectId(leadId)) {
      query.leadId = leadId;
    }
    if (counselorName && counselorName !== 'all') query.counselorName = exactNameRx(counselorName);
    if (search) {
      query.$or = [
        { leadName: { $regex: search, $options: 'i' } },
        { leadPhone: { $regex: search, $options: 'i' } },
        { counselorName: { $regex: search, $options: 'i' } },
        { outcome: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }
    const recordings = await CallRecording.find(query).sort({ createdAt: -1 });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recordings', async (req, res) => {
  try {
    const {
      leadId,
      leadName,
      leadPhone,
      counselorName,
      counselorPhone,
      callSid,
      durationSeconds,
      outcome,
      notes,
      audioBase64,
      audioUrl: directAudioUrl,
      fileName,
      source
    } = req.body;

    if (!leadName || !leadPhone) {
      return res.status(400).json({ error: 'leadName and leadPhone are required' });
    }

    let audioUrl = directAudioUrl || '';

    // If an audioBase64 string was sent (in-browser MediaRecorder or a file uploaded from the phone)
    if (audioBase64) {
      const AUDIO_EXTS = ['webm', 'mp3', 'wav', 'ogg', 'opus', 'm4a', 'mp4', 'aac', 'amr', '3gp', 'flac'];
      const MIME_EXT = { mpeg: 'mp3', 'x-m4a': 'm4a', mp4: 'm4a', 'x-wav': 'wav', wave: 'wav', '3gpp': '3gp', 'x-aac': 'aac', 'x-flac': 'flac' };
      const mime = (audioBase64.match(/^data:audio\/([\w.+-]+)(?:;[^,]*)?;base64,/i) || [])[1]?.toLowerCase();
      const nameExt = path.extname(String(fileName || '')).slice(1).toLowerCase();
      const mimeExt = mime ? (MIME_EXT[mime] || mime) : '';
      const ext = AUDIO_EXTS.includes(nameExt) ? nameExt : (AUDIO_EXTS.includes(mimeExt) ? mimeExt : 'webm');
      const base64Data = audioBase64.replace(/^data:[^,]*,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const filename = `call_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const uploadsDir = path.join(process.cwd(), 'uploads/recordings');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      audioUrl = `/recordings/${filename}`;
    }

    if (!audioUrl) {
      return res.status(400).json({ error: 'No audio data or audioUrl provided' });
    }

    // Exotel calls: the status webhook may already have stored this call
    if (callSid && directAudioUrl && !audioBase64) {
      const merged = await upsertExotelRecording({
        callSid, leadId, leadName, leadPhone,
        counselorName: counselorName || req.user?.name || '',
        counselorPhone, durationSeconds, audioUrl, outcome, notes
      });
      if (merged) return res.status(201).json(merged);
    }

    const recording = new CallRecording({
      leadId: leadId && mongoose.isValidObjectId(leadId) ? leadId : undefined,
      leadName,
      leadPhone,
      counselorName: counselorName || req.user?.name || '',
      counselorPhone: counselorPhone || '',
      callSid: callSid || '',
      durationSeconds: Number(durationSeconds) || 0,
      outcome: outcome || 'Follow-up Needed',
      notes: notes || '',
      audioUrl,
      source: source || (directAudioUrl ? 'exotel' : 'browser_mic')
    });

    await recording.save();

    // If leadId is valid, increment lead's call count and lastCallTime
    if (leadId && mongoose.isValidObjectId(leadId)) {
      await StudentLead.findByIdAndUpdate(leadId, {
        $inc: { callCount: 1 },
        lastCallTime: new Date()
      });
    }

    res.status(201).json(recording);
  } catch (err) {
    console.error('Error saving call recording:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/recordings/:id', async (req, res) => {
  try {
    const recording = await CallRecording.findByIdAndDelete(req.params.id);
    if (!recording) return res.status(404).json({ error: 'Recording not found' });
    if (recording.audioUrl && recording.audioUrl.startsWith('/recordings/')) {
      const filename = path.basename(recording.audioUrl);
      const filePath = path.join(process.cwd(), 'uploads/recordings', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.json({ success: true, message: 'Recording deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DAILY END-OF-DAY CLOSURES API
// ==========================================
router.get('/closures/today', async (req, res) => {
  try {
    const counselorName = isScopedHr(req) ? req.user?.name : req.query.counselor;
    const date = req.query.date || todayStr();
    if (!counselorName) {
      return res.status(400).json({ error: 'counselor query param is required' });
    }
    const closure = await DailyClosure.findOne({
      counselorName: exactNameRx(counselorName),
      date
    });
    res.json(closure || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/closures', async (req, res) => {
  try {
    const { date, callsMade, connected, demosBooked, admissions, feesCollected, pendingFus, notes, branch, systemMetrics } = req.body;
    // A counsellor can only close their own day
    const counselorName = isScopedHr(req) ? String(req.user?.name || "") : String(req.body.counselorName || req.user?.name || "");
    if (!counselorName || !date) {
      return res.status(400).json({ error: 'counselorName and date are required' });
    }
    const closure = await DailyClosure.findOneAndUpdate(
      {
        counselorName: exactNameRx(counselorName),
        date
      },
      {
        $set: {
          counselorName: counselorName.trim(),
          date,
          callsMade: Number(callsMade) || 0,
          connected: Number(connected) || 0,
          demosBooked: Number(demosBooked) || 0,
          admissions: Number(admissions) || 0,
          feesCollected: Number(feesCollected) || 0,
          pendingFus: Number(pendingFus) || 0,
          branch: branch || req.user?.branch || '',
          status: 'submitted',
          submittedAt: new Date(),
          notes: notes || '',
          counselorEmail: req.body.counselorEmail || req.user?.email || '',
          // What the system counted, so any hand-corrected number is visible to managers
          systemMetrics: systemMetrics || null,
          editedFields: systemMetrics
            ? ['callsMade', 'connected', 'demosBooked', 'admissions', 'feesCollected', 'pendingFus']
                .filter((k) => Number(systemMetrics[k] ?? 0) !== Number(req.body[k] ?? 0))
            : [],
          submittedBy: req.user?.name || ''
        }
      },
      { new: true, upsert: true }
    );
    res.status(200).json(closure);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Head of HR marks an EOD closure as reviewed (visible to every manager)
router.patch('/closures/:id/review', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Closure not found' });
    const updated = await DailyClosure.findByIdAndUpdate(
      req.params.id,
      { reviewedBy: req.user?.name || '', reviewedAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Closure not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/closures', async (req, res) => {
  try {
    const query = {};
    if (req.query.date) query.date = req.query.date;
    const counselor = isScopedHr(req) ? req.user?.name : req.query.counselor;
    if (counselor) query.counselorName = exactNameRx(counselor);
    const closures = await DailyClosure.find(query).sort({ date: -1, createdAt: -1 });
    res.json(closures);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HR TARGETS ASSIGNMENT API (Assigned by Head of HR to HR staff)
router.get('/hr/targets', async (req, res) => {
  try {
    const { period, assignedTo } = req.query;
    const query = {};
    if (period) query.period = period;
    if (assignedTo) query.assignedTo = assignedTo;
    const targets = await HrTarget.find(query).sort({ createdAt: -1 });
    res.json(targets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/hr/targets', async (req, res) => {
  try {
    const { title, target, achieved, unit, period, assignedTo, assignedBy } = req.body;
    const newTarget = await HrTarget.create({
      title: title || 'New Target',
      target: Number(target) || 0,
      achieved: Number(achieved) || 0,
      unit: unit || 'Count',
      period: period || 'today',
      assignedTo: assignedTo || 'All HR',
      assignedBy: assignedBy || req.user?.name || ''
    });
    res.status(201).json(newTarget);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/hr/targets/:id', async (req, res) => {
  try {
    const updated = await HrTarget.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Target not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/hr/targets/:id', async (req, res) => {
  try {
    await HrTarget.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Portal Statistics Overview (Live Calculated from DB)
// ==========================================
// ORGANISATION DATA — branches, departments & staff roster.
// Master records hold identity only; every count is computed live from the
// Student, StudentLead, User and TeamMember collections.
// ==========================================
const monthStartIST = () => {
  const now = new Date(Date.now() + 330 * 60000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 330 * 60000);
};
const LEAD_FUNNEL = ['new', 'contacted', 'demo_booked', 'demo_attended', 'fee_followup', 'admitted'];
const funnelIdx = (stage) => LEAD_FUNNEL.indexOf(stage);
const isStaffUser = (u) => u && !/inactive|disabled|suspended/i.test(u.status || '') && dashboardOf(u) !== 'student';
const dashboardOf = (u) => mapRoleOrDeptToDashboard(u?.role, u?.department).department;

// Master data is inserted once (tracked in AppSetting) — after that Admin owns
// it, so a branch Admin deletes is not re-created on the next request.
async function seedOnce(key, fn) {
  const done = await AppSetting.findOne({ key }).lean();
  if (done) return;
  await fn();
  await AppSetting.updateOne({ key }, { $set: { value: true } }, { upsert: true });
}

let branchCache = { at: 0, list: [] };
async function branchList() {
  if (Date.now() - branchCache.at < 30000 && branchCache.list.length) return branchCache.list;
  await seedOnce('seed_branch_master', async () => {
    const have = new Set((await Branch.find().select('name').lean()).map((b) => b.name.toLowerCase()));
    const missing = BRANCH_MASTER.filter((b) => !have.has(b.name.toLowerCase()));
    if (missing.length) await Branch.insertMany(missing, { ordered: false });
  });
  const list = await Branch.find().sort({ name: 1 }).lean();
  branchCache = { at: Date.now(), list };
  return list;
}
const invalidateBranches = () => { branchCache = { at: 0, list: [] }; };

// Which branch a free-text branch / location value refers to (null if none).
// Records spell branches many ways: "Saravanampatti (CBE)", "SVM", "Kolhapur".
const wordRx = (w) => new RegExp(`(^|[^a-z0-9])${escapeRegex(String(w).toLowerCase())}([^a-z0-9]|$)`);
function matchBranch(value, list) {
  const v = String(value || '').toLowerCase();
  if (!v.trim()) return null;
  return list.find((b) => [b.name, b.code, ...(b.aliases || [])].filter(Boolean).some((k) => wordRx(k).test(v))) || null;
}
const studentBranchText = (s) => s?.branch || s?.leadBranch || s?.location || '';

async function departmentList() {
  await seedOnce('seed_department_master', async () => {
    const have = new Set((await Department.find().select('code').lean()).map((d) => d.code));
    const missing = DEPARTMENT_MASTER.filter((d) => !have.has(d.code));
    if (missing.length) await Department.insertMany(missing, { ordered: false });
  });
  return Department.find().sort({ name: 1 }).lean();
}

// Head of a department = the staff account whose role says so
const HEAD_ROLE_RX = /dept head|head of|department head|operational head|management|founder|director/i;

router.get('/stats', async (req, res) => {
  try {
    const [deptCount, branchCount, students, leadCount, users] = await Promise.all([
      Department.countDocuments(),
      Branch.countDocuments(),
      Student.find().select('statusGroup placementStatus placementStage paidAmount receipts').lean(),
      StudentLead.countDocuments({ stage: { $nin: ['admitted', 'closed'] } }),
      User.find().select('role department status').lean()
    ]);
    const placedCount = students.filter((s) => s.statusGroup === 'placed' || /placed/i.test(s.placementStatus || '') || Number(s.placementStage) >= 7).length;
    const totalCollected = students.reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);
    const monthStart = monthStartIST();
    const mtdRevenue = students.reduce((sum, s) => sum + (s.receipts || [])
      .filter((r) => new Date(r.at || r.date) >= monthStart)
      .reduce((a, r) => a + (Number(r.amount) || 0), 0), 0);

    res.json({
      branchesCount: branchCount,
      teamsCount: deptCount,
      activeStudents: students.length,
      activeLeads: leadCount,
      placedStudents: placedCount,
      placementRate: students.length > 0 ? `${((placedCount / students.length) * 100).toFixed(1)}%` : '0.0%',
      activeStaff: users.filter(isStaffUser).length,
      // Fees actually collected (sum of receipts), all-time and this month
      grossRevenue: totalCollected,
      mtdRevenue
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Departments — public list for the landing page; staff counts and the head's
// name are added only for a signed-in caller.
router.get('/departments', async (req, res) => {
  try {
    const depts = await departmentList();
    if (!req.user) return res.json(depts.map(({ head, ...d }) => d));
    const staff = (await User.find().select('name role department status').lean()).filter(isStaffUser);
    res.json(depts.map((d) => {
      const members = staff.filter((u) => dashboardOf(u) === d.dashboard);
      const headUser = members.find((u) => HEAD_ROLE_RX.test(u.role || ''));
      return { ...d, memberCount: members.length, head: headUser?.name || d.head || '' };
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Branches with live student / lead / staff counts
router.get('/branches', async (req, res) => {
  try {
    const [list, students, leads, users] = await Promise.all([
      branchList(),
      Student.find().select('branch leadBranch location statusGroup createdAt').lean(),
      StudentLead.find().select('branch stage createdAt').lean(),
      User.find().select('name role department branch status').lean()
    ]);
    const monthStart = monthStartIST();
    const stats = new Map(list.map((b) => [String(b._id), {
      activeStudents: 0, admissionsThisMonth: 0, leadCount: 0, openLeads: 0, admittedLeads: 0, staffCount: 0, managers: []
    }]));
    for (const s of students) {
      const b = matchBranch(studentBranchText(s), list);
      if (!b) continue;
      const x = stats.get(String(b._id));
      if (s.statusGroup !== 'on_hold') x.activeStudents += 1;
      if (s.createdAt && new Date(s.createdAt) >= monthStart) x.admissionsThisMonth += 1;
    }
    for (const l of leads) {
      const b = matchBranch(l.branch, list);
      if (!b) continue;
      const x = stats.get(String(b._id));
      x.leadCount += 1;
      if (l.stage === 'admitted') x.admittedLeads += 1;
      else if (l.stage !== 'closed') x.openLeads += 1;
    }
    for (const u of users) {
      if (!isStaffUser(u)) continue;
      const b = matchBranch(u.branch, list);
      if (!b) continue;
      const x = stats.get(String(b._id));
      x.staffCount += 1;
      if (/branch manager/i.test(u.role || '')) x.managers.push(u.name);
    }
    res.json(list.map((b) => {
      const { managers, ...x } = stats.get(String(b._id));
      return {
        ...b,
        ...x,
        manager: managers[0] || b.manager || '',
        conversionPct: x.leadCount ? Math.round((x.admittedLeads / x.leadCount) * 100) : null
      };
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const BRANCH_FIELDS = ['name', 'code', 'city', 'state', 'aliases', 'manager', 'phone', 'image', 'capacity', 'status'];
const pickBranch = (body = {}) => Object.fromEntries(Object.entries(body).filter(([k]) => BRANCH_FIELDS.includes(k)));

router.post('/branches', async (req, res) => {
  try {
    const data = pickBranch(req.body);
    if (!data.name || !data.city) return res.status(400).json({ error: 'Branch name and city are required' });
    const created = await Branch.create(data);
    invalidateBranches();
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.code === 11000 ? 'A branch with this name already exists' : e.message });
  }
});

router.put('/branches/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Branch not found' });
    const updated = await Branch.findByIdAndUpdate(req.params.id, { $set: pickBranch(req.body) }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Branch not found' });
    invalidateBranches();
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/branches/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Branch not found' });
    await Branch.findByIdAndDelete(req.params.id);
    invalidateBranches();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// LEADERSHIP HUB — Approvals, Escalations, Team & Attendance
// ==========================================
const OPEN_ESCALATION = { status: { $nin: ['resolved', 'closed'] } };

router.get('/leadership/summary', async (req, res) => {
  try {
    const [pendingApprovals, openEscalations] = await Promise.all([
      Approval.countDocuments({ status: 'pending' }),
      Escalation.countDocuments(OPEN_ESCALATION)
    ]);
    res.json({ pendingApprovals, openEscalations });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// HR's approvals were saved under 'DEP-HR-001' and, in older records, 'HR' or no code
const deptCodeQuery = (code) => {
  const upper = String(code || '').toUpperCase();
  if (upper === 'DEP-HR-001' || upper === 'HR') {
    return { $or: [{ departmentCode: { $regex: /^(DEP-HR-001|HR)$/i } }, { departmentCode: { $in: ['', null] } }] };
  }
  return { departmentCode: new RegExp(`^${escapeRegex(code)}$`, 'i') };
};

router.get('/leadership/approvals', async (req, res) => {
  try {
    const { departmentCode, branchName, status, requestedBy } = req.query;
    const query = departmentCode ? deptCodeQuery(departmentCode) : {};
    if (branchName) query.branchName = new RegExp(`^${escapeRegex(branchName)}$`, 'i');
    if (status) query.status = String(status).toLowerCase();
    if (requestedBy) query.requestedBy = exactNameRx(requestedBy);
    res.json(await Approval.find(query).sort({ createdAt: -1 }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/leadership/approvals', async (req, res) => {
  try {
    const payload = { ...req.body, status: 'pending' };
    delete payload._id;
    if (!payload.departmentCode) {
      payload.departmentCode = DEPT_CODE_BY_DASHBOARD[req.user?.department] || 'ADM';
    }
    if (!payload.requestedBy) payload.requestedBy = req.user?.name || '';
    const created = await Approval.create(payload);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Write an approval decision back to the record it is about
const CREATIVE_STATUS_BY_DECISION = { approved: 'Approved', rejected: 'Needs Correction', pending: 'Submitted', forwarded: 'Submitted' };
async function applyApprovalDecision(approval) {
  if (approval.refType === 'creative' && approval.refId && mongoose.isValidObjectId(approval.refId)) {
    await MarketingCreative.findByIdAndUpdate(approval.refId, { status: CREATIVE_STATUS_BY_DECISION[approval.status] || 'Submitted' });
  }
  // Tell an HR requester (leave, discount, shift change …) the outcome
  if (approval.requestedBy && approval.status !== 'pending' && /^(DEP-HR-001|HR)$/i.test(approval.departmentCode || '')) {
    await pushNotification({
      audience: 'hr', recipientName: approval.requestedBy, type: 'approval',
      title: `${approval.title} — ${approval.status}`,
      message: `${approval.decidedBy ? `Decided by ${approval.decidedBy}` : 'Decision recorded'}${approval.description ? ` · ${String(approval.description).slice(0, 140)}` : ''}`,
      createdBy: approval.decidedBy || ''
    });
  }
}

router.patch('/leadership/approvals/:id/decision', async (req, res) => {
  try {
    const { action } = req.body || {};
    if (!['pending', 'approved', 'rejected', 'forwarded'].includes(action)) {
      return res.status(400).json({ error: 'Decision must be approved, rejected, forwarded or pending' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Approval not found' });
    const decidedBy = req.user?.name || req.body?.decidedBy || '';
    const update = action === 'pending'
      ? { status: 'pending', decidedBy: '', decidedAt: null }
      : { status: action, decidedBy, decidedAt: new Date() };
    const updated = await Approval.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Approval not found' });
    await applyApprovalDecision(updated);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Escalations
router.get('/leadership/escalations', async (req, res) => {
  try {
    const { departmentCode, branchName, status } = req.query;
    const query = departmentCode ? deptCodeQuery(departmentCode) : {};
    if (branchName) query.branchName = branchName;
    if (status) query.status = status;
    // HR desk: student tickets of one counsellor (hrName) or all student tickets (studentsOnly=1)
    if (req.query.hrName) query.hrName = new RegExp(`^${escapeRegex(String(req.query.hrName).trim())}$`, 'i');
    if (req.query.studentsOnly || req.query.hrName) query.studentId = { $nin: ['', null] };
    if (req.query.studentId) query.studentId = req.query.studentId;
    const escalations = await Escalation.find(query).sort({ createdAt: -1 });
    res.json(escalations);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/leadership/escalations', async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.departmentCode) {
      payload.departmentCode = (payload.category?.toLowerCase().includes('fee') || payload.type?.toLowerCase().includes('fee'))
        ? 'FIN'
        : (payload.category?.toLowerCase().includes('class') || payload.type?.toLowerCase().includes('acad'))
        ? 'ACAD'
        : 'ADM';
    }
    if (!payload.raisedBy && req.user?.name) payload.raisedBy = req.user.name;
    // Student ticket → also routed to the student's HR counsellor
    if (req.user?.department === 'student' && req.user.studentId) {
      const st = await findStudentByAnyId(req.user.studentId);
      payload.studentId = req.user.studentId;
      if (st) {
        payload.hrName = st.hrName || '';
        payload.branchName = payload.branchName || st.location || '';
      }
    }
    const created = await Escalation.create(payload);
    if (created.studentId) {
      await pushNotification({
        audience: 'hr', recipientName: created.hrName || '', type: 'ticket',
        title: `Support ticket: ${created.title}`,
        message: `${created.raisedBy || 'Student'} · ${created.type || ''}${created.description ? ` — ${String(created.description).slice(0, 160)}` : ''}`,
        studentId: created.studentId, createdBy: created.raisedBy || ''
      });
    }
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/leadership/escalations/:id/status', async (req, res) => {
  try {
    const { action, response, respondedBy } = req.body || {}; // action: 'open' | 'in-progress' | 'resolved' | 'closed'
    if (!['open', 'in-progress', 'resolved', 'closed'].includes(action)) {
      return res.status(400).json({ error: 'Status must be open, in-progress, resolved or closed' });
    }
    const update = { status: action };
    if (action === 'resolved' || action === 'closed') update.resolvedAt = new Date();
    if (typeof response === 'string' && response.trim()) update.response = response.trim();
    if (respondedBy || req.user?.name) update.respondedBy = respondedBy || req.user?.name || '';
    const updated = await Escalation.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Escalation not found' });
    if (updated.studentId) {
      await notifyStudent(updated.studentId, {
        type: 'ticket', title: `Ticket ${action}: ${updated.title}`,
        message: updated.response || `Updated by ${updated.respondedBy || 'the branch team'}.`,
        createdBy: updated.respondedBy || ''
      });
    }
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Team / Roster — one TeamMember per active staff account (User collection).
// The TeamMember row only keeps what Leadership edits (shift, weekly roster,
// availability); department, role and branch always follow the User record.
let teamSyncAt = 0;
async function syncTeamFromUsers(force = false) {
  if (!force && Date.now() - teamSyncAt < 30000) return;
  teamSyncAt = Date.now();
  const [users, members, branches] = await Promise.all([
    User.find().select('name role department branch status').lean(),
    TeamMember.find().lean(),
    branchList()
  ]);
  const staff = users.filter(isStaffUser);
  const byName = new Map(members.map((m) => [normName(m.name), m]));
  const keep = new Set();
  for (const u of staff) {
    const key = normName(u.name);
    if (!key || keep.has(key)) continue;
    keep.add(key);
    const departmentCode = DEPT_CODE_BY_DASHBOARD[dashboardOf(u)] || 'ADM';
    const branchName = matchBranch(u.branch, branches)?.name || u.branch || 'Unassigned';
    const role = u.role || 'Staff';
    const m = byName.get(key);
    if (!m) {
      await TeamMember.create({ name: u.name, role, departmentCode, branchName });
    } else if (m.role !== role || m.departmentCode !== departmentCode || m.branchName !== branchName) {
      await TeamMember.updateOne({ _id: m._id }, { $set: { role, departmentCode, branchName } });
    }
  }
  // Rows with no staff account behind them (deleted users, old placeholder rows)
  const orphanIds = members.filter((m) => !keep.has(normName(m.name))).map((m) => m._id);
  if (orphanIds.length) await TeamMember.deleteMany({ _id: { $in: orphanIds } });
}

// Live workload & quality for each team member:
//  HR        — assigned leads, admissions, follow-ups due; quality = % of
//              assigned leads actually worked (called or moved past "new")
//  Training  — assigned students, syllabus completed, unanswered doubts;
//              quality = average student rating (1–5) as a percentage
async function teamMetrics(members) {
  const today = todayStr();
  const [leads, students, doubts, feedback] = await Promise.all([
    StudentLead.find().select('counselorAssigned allocatedTo stage followUpDate callCount').lean(),
    Student.find().select('trainerName syllabusCompleted').lean(),
    TrainerDoubt.find({ status: { $ne: 'Replied' } }).select('trainerName').lean(),
    ClassFeedback.aggregate([{ $group: { _id: { $toLower: '$trainerName' }, avg: { $avg: '$rating' }, count: { $sum: 1 } } }])
  ]);
  const rating = new Map(feedback.map((f) => [normName(f._id), f]));
  return members.map((m) => {
    const name = normName(m.name);
    const base = typeof m.toObject === 'function' ? m.toObject() : m;
    if (m.departmentCode === 'ACAD') {
      const mine = students.filter((s) => normName(s.trainerName) === name);
      const fb = rating.get(name);
      return {
        ...base,
        assigned: mine.length,
        completed: mine.filter((s) => s.syllabusCompleted).length,
        pending: doubts.filter((d) => normName(d.trainerName) === name).length,
        quality: fb ? Math.round((fb.avg / 5) * 100) : null,
        qualityBasis: fb ? `Avg student rating ${fb.avg.toFixed(1)}/5 (${fb.count})` : 'No student ratings yet',
        workLabel: { assigned: 'students', completed: 'syllabus done', pending: 'open doubts' }
      };
    }
    const mine = leads.filter((l) => normName(leadOwner(l)) === name);
    const open = mine.filter((l) => !['admitted', 'closed'].includes(l.stage));
    const worked = mine.filter((l) => l.stage !== 'new' || (l.callCount || 0) > 0).length;
    return {
      ...base,
      assigned: mine.length,
      completed: mine.filter((l) => l.stage === 'admitted').length,
      pending: open.filter((l) => l.followUpDate && l.followUpDate <= today).length,
      quality: mine.length ? Math.round((worked / mine.length) * 100) : null,
      qualityBasis: mine.length ? `${worked} of ${mine.length} leads worked` : 'No leads assigned yet',
      workLabel: { assigned: 'leads', completed: 'admitted', pending: 'follow-ups due' }
    };
  });
}

router.get('/leadership/team', async (req, res) => {
  try {
    await syncTeamFromUsers();
    const { departmentCode, branchName } = req.query;
    const query = departmentCode ? deptCodeQuery(departmentCode) : {};
    if (branchName) query.branchName = branchName;
    const team = await TeamMember.find(query).sort({ name: 1 });
    const withMetrics = await teamMetrics(team);
    withMetrics.sort((a, b) => (b.quality ?? -1) - (a.quality ?? -1));
    res.json(withMetrics);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/leadership/team/:id/shift', async (req, res) => {
  try {
    const { shift, weeklySchedule, available, name } = req.body || {};
    const updateData = {};
    if (shift !== undefined) updateData.shift = shift;
    if (weeklySchedule !== undefined) updateData.weeklySchedule = weeklySchedule;
    if (available !== undefined) updateData.available = available;

    let updated = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      updated = await TeamMember.findByIdAndUpdate(req.params.id, updateData, { new: true });
    }
    if (!updated && name) {
      updated = await TeamMember.findOneAndUpdate({ name: exactNameRx(name) }, updateData, { new: true });
    }
    if (!updated) return res.status(404).json({ error: 'Team member not found — staff appear here once Admin creates their account.' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Daily team tasks (Head of HR → counsellors). The assignee is notified.
router.get('/leadership/tasks', async (req, res) => {
  try {
    const query = { date: req.query.date || todayStr() };
    if (req.query.departmentCode) Object.assign(query, deptCodeQuery(req.query.departmentCode));
    if (req.query.assignedTo) query.assignedTo = exactNameRx(req.query.assignedTo);
    res.json(await TeamTask.find(query).sort({ createdAt: -1 }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/leadership/tasks', async (req, res) => {
  try {
    const { title, assignedTo, dueTime = '', priority = 'medium', departmentCode = 'DEP-HR-001' } = req.body || {};
    if (!String(title || '').trim() || !String(assignedTo || '').trim()) return res.status(400).json({ error: 'Task title and owner are required' });
    const task = await TeamTask.create({
      title: String(title).trim(), assignedTo: String(assignedTo).trim(), dueTime, priority, departmentCode,
      date: todayStr(), createdBy: req.user?.name || ''
    });
    const audience = AUDIENCE_BY_DEPT_CODE[departmentCode];
    if (audience) {
      await pushNotification({
        audience, recipientName: task.assignedTo, type: 'task',
        title: `New task: ${task.title}`,
        message: [task.dueTime, `${task.priority} priority`, task.createdBy && `from ${task.createdBy}`].filter(Boolean).join(' · '),
        createdBy: task.createdBy
      });
    }
    res.status(201).json(task);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/leadership/tasks/:id', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['not-started', 'in-progress', 'completed', 'delayed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const updated = await TeamTask.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/leadership/tasks/:id', async (req, res) => {
  try {
    await TeamTask.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Attendance
// Academy runs on IST: a UTC date would roll back to "yesterday" before 5:30 AM IST
function todayStr() {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}

router.get('/leadership/attendance/branch/:branchName', async (req, res) => {
  try {
    const branchName = req.params.branchName;
    const date = todayStr();
    const team = await TeamMember.find({ branchName });
    const existing = await Attendance.find({ branchName, date });
    const byName = {};
    existing.forEach((r) => { byName[r.employeeName] = r; });
    const rows = team.map((m) => byName[m.name] || { branchName, employeeName: m.name, date, status: 'absent', checkIn: null, checkOut: null, hoursWorked: 0 });
    res.json({
      date,
      total: rows.length,
      present: rows.filter((r) => r.status === 'in' || r.status === 'break').length,
      rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/leadership/attendance/org-summary', async (req, res) => {
  try {
    const date = todayStr();
    const team = await TeamMember.find();
    const existing = await Attendance.find({ date });
    const byKey = {};
    existing.forEach((r) => { byKey[`${r.branchName}::${r.employeeName}`] = r; });
    let present = 0;
    let absent = 0;
    team.forEach((m) => {
      const rec = byKey[`${m.branchName}::${m.name}`];
      if (rec && (rec.status === 'in' || rec.status === 'break')) present += 1;
      else absent += 1;
    });
    res.json({ date, total: team.length, present, absent, attendanceRate: team.length ? Math.round((present / team.length) * 100) : 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/leadership/attendance/by-branch', async (req, res) => {
  try {
    const date = todayStr();
    const [team, existing] = await Promise.all([TeamMember.find(), Attendance.find({ date })]);
    const byKey = {};
    existing.forEach((r) => { byKey[`${r.branchName}::${r.employeeName}`] = r; });
    const byBranch = {};
    team.forEach((m) => {
      const key = m.branchName || 'Unassigned';
      if (!byBranch[key]) byBranch[key] = { branchName: key, total: 0, present: 0, absent: 0 };
      byBranch[key].total += 1;
      const rec = byKey[`${m.branchName}::${m.name}`];
      if (rec && (rec.status === 'in' || rec.status === 'break')) byBranch[key].present += 1;
      else byBranch[key].absent += 1;
    });
    const rows = Object.values(byBranch).map((r) => ({ ...r, rate: r.total ? Math.round((r.present / r.total) * 100) : 0 }));
    res.json({ date, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/leadership/attendance/clock-in', async (req, res) => {
  try {
    const { branchName, employeeName } = req.body;
    const date = todayStr();
    const checkIn = new Date().toTimeString().slice(0, 5);
    const updated = await Attendance.findOneAndUpdate(
      { branchName, employeeName, date },
      { branchName, employeeName, date, checkIn, status: 'in' },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/leadership/attendance/clock-out', async (req, res) => {
  try {
    const { branchName, employeeName } = req.body;
    const date = todayStr();
    const record = await Attendance.findOne({ branchName, employeeName, date });
    const checkOut = new Date().toTimeString().slice(0, 5);
    let hoursWorked = 0;
    if (record && record.checkIn) {
      const [inH, inM] = record.checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);
      hoursWorked = Math.max(0, Math.round((outH * 60 + outM - (inH * 60 + inM)) / 6) / 10);
    }
    const updated = await Attendance.findOneAndUpdate(
      { branchName, employeeName, date },
      { branchName, employeeName, date, checkOut, status: 'out', hoursWorked },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/leadership/attendance/break', async (req, res) => {
  try {
    const { branchName, employeeName, onBreak } = req.body;
    const date = todayStr();
    const updated = await Attendance.findOneAndUpdate(
      { branchName, employeeName, date },
      { branchName, employeeName, date, status: onBreak ? 'break' : 'in' },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- Counsellor call log (daily call counts for the HR dashboard & closure) ----
router.post('/calls/log', async (req, res) => {
  try {
    const { leadId = '', leadName = '', outcome = '', durationSeconds = 0, callSid = '' } = req.body || {};
    const counselorName = String(req.user?.name || req.body?.counselorName || '').trim();
    if (!counselorName) return res.status(400).json({ error: 'No counsellor on this login' });
    const doc = await CallLog.create({
      counselorName, date: todayStr(), leadId: String(leadId), leadName, outcome,
      durationSeconds: Number(durationSeconds) || 0, connected: Boolean(outcome) && outcome !== 'Not Reachable', callSid
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/calls/log', async (req, res) => {
  try {
    const date = req.query.date || todayStr();
    const isLead = ['admin', 'leadership'].includes(req.user?.department);
    const name = isLead && req.query.counselorName ? String(req.query.counselorName) : String(req.user?.name || '');
    const query = { date };
    if (!(isLead && req.query.counselorName === 'all')) query.counselorName = new RegExp(`^${escapeRegex(name.trim())}$`, 'i');
    const list = await CallLog.find(query).sort({ createdAt: -1 }).limit(500);
    res.json({ date, calls: list.length, connected: list.filter((c) => c.connected).length, list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Self attendance for the signed-in staff member (HR dashboard clock-in / break /
// end-of-day). Writes the same Attendance rows Leadership's branch view reads.
async function selfAttendanceKey(req) {
  const employeeName = String(req.user?.name || '').trim();
  const member = employeeName ? await TeamMember.findOne({ name: new RegExp(`^${escapeRegex(employeeName)}$`, 'i') }).select('name branchName') : null;
  return {
    employeeName: member?.name || employeeName,
    branchName: member?.branchName || String(req.body?.branchName || req.query?.branchName || '').trim() || 'Unassigned'
  };
}
const attendanceView = (r) => {
  if (!r) return null;
  const o = r.toObject();
  const running = o.breakStartedAt ? Math.max(0, Math.round((Date.now() - new Date(o.breakStartedAt).getTime()) / 60000)) : 0;
  return { ...o, breakMinutesTotal: (o.breakMinutes || 0) + running };
};

router.get('/attendance/me', async (req, res) => {
  try {
    const { employeeName, branchName } = await selfAttendanceKey(req);
    if (!employeeName) return res.status(400).json({ error: 'No staff name on this login' });
    const rec = await Attendance.findOne({ employeeName, branchName, date: todayStr() });
    res.json(attendanceView(rec) || { employeeName, branchName, date: todayStr(), status: 'absent', breakMinutes: 0, breakMinutesTotal: 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/attendance/me', async (req, res) => {
  try {
    const { action } = req.body || {}; // 'in' | 'break' | 'resume' | 'out'
    if (!['in', 'break', 'resume', 'out'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
    const { employeeName, branchName } = await selfAttendanceKey(req);
    if (!employeeName) return res.status(400).json({ error: 'No staff name on this login' });
    const date = todayStr();
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    let rec = await Attendance.findOne({ employeeName, branchName, date });
    if (!rec) rec = new Attendance({ employeeName, branchName, date, department: req.user?.department || '' });
    if (!rec.checkIn) rec.checkIn = hhmm;
    const closeBreak = () => {
      if (rec.breakStartedAt) {
        rec.breakMinutes = (rec.breakMinutes || 0) + Math.max(0, Math.round((now - new Date(rec.breakStartedAt)) / 60000));
        rec.breakStartedAt = null;
      }
    };
    if (action === 'in') {
      if (rec.status !== 'break') rec.status = 'in';
    } else if (action === 'break') {
      if (!rec.breakStartedAt) rec.breakStartedAt = now;
      rec.status = 'break';
    } else if (action === 'resume') {
      closeBreak();
      rec.status = 'in';
    } else if (action === 'out') {
      closeBreak();
      rec.checkOut = hhmm;
      rec.status = 'out';
      const [inH, inM] = rec.checkIn.split(':').map(Number);
      const [outH, outM] = hhmm.split(':').map(Number);
      const worked = outH * 60 + outM - (inH * 60 + inM) - (rec.breakMinutes || 0);
      rec.hoursWorked = Math.max(0, Math.round(worked / 6) / 10);
    }
    await rec.save();
    res.json(attendanceView(rec));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- HR record ownership ----
// A counsellor (department 'hr') only sees and changes their own leads and
// students; Admin / Leadership see everyone's. Names are compared whole
// (case / spacing ignored) so "Ram" never matches "Ramesh".
const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
const exactNameRx = (v) => new RegExp(`^\\s*${escapeRegex(String(v || '').trim()).replace(/\s+/g, '\\s+')}\\s*$`, 'i');
const isScopedHr = (req) => req.user?.department === 'hr';
const leadOwner = (l) => l?.counselorAssigned || l?.allocatedTo || '';
const leadOwnerQuery = (name) => ({
  $or: [
    { counselorAssigned: exactNameRx(name) },
    { counselorAssigned: { $in: ['', null] }, allocatedTo: exactNameRx(name) }
  ]
});
const ownsLead = (req, lead) => !isScopedHr(req) || normName(leadOwner(lead)) === normName(req.user?.name);
const branchShort = (v) => String(v || '').replace(/\s*(branch|\(.*\)|hq)\b/gi, '').trim();
const bClean = (v) => String(v || '').toLowerCase().replace(/\s*(branch|\(.*\)|hq)\b/gi, '').replace(/[^a-z0-9]/g, '');

const ownsStudent = (req, st) => {
  if (!isScopedHr(req)) return true;
  if (normName(st?.hrName) === normName(req.user?.name)) return true;
  const userBranch = branchShort(req.user?.branch || req.query?.branch);
  if (userBranch) {
    const ub = bClean(userBranch);
    if (ub && (bClean(st?.branch).includes(ub) || bClean(st?.location).includes(ub) || bClean(st?.leadBranch).includes(ub))) {
      return true;
    }
  }
  return false;
};

const ownsDemo = (req, demo) => {
  if (!isScopedHr(req)) return true;
  const counselor = req.user?.name;
  if (counselor && (normName(demo?.bookedBy) === normName(counselor) || normName(demo?.counselor) === normName(counselor))) {
    return true;
  }
  const userBranch = branchShort(req.user?.branch || req.query?.branch);
  if (userBranch) {
    const ub = bClean(userBranch);
    if (ub && (bClean(demo?.location).includes(ub) || bClean(demo?.branch).includes(ub))) {
      return true;
    }
  }
  return false;
};
const NOT_YOURS = { error: 'This record belongs to another counsellor.' };

// The lead a new admission / demo belongs to: explicit leadId first, then
// the same email or the same last-10-digit phone.
const phoneDigits = (p) => String(p || '').replace(/\D/g, '').slice(-10);
async function findLeadByContact({ leadId, email, phone }, stageFilter) {
  if (leadId && mongoose.isValidObjectId(leadId)) {
    const byId = await StudentLead.findById(leadId);
    if (byId) return byId;
  }
  const base = stageFilter ? { stage: stageFilter } : {};
  const mail = String(email || '').trim().toLowerCase();
  if (mail) {
    const byMail = await StudentLead.findOne({ ...base, email: exactNameRx(mail) }).sort({ createdAt: -1 });
    if (byMail) return byMail;
  }
  const digits = phoneDigits(phone);
  if (digits.length === 10) {
    // Cheap pre-filter on the last 4 digits, exact match on all 10
    const candidates = await StudentLead.find({ ...base, phone: new RegExp(`${digits.slice(-4).split('').join('\\D*')}\\D*$`) }).sort({ createdAt: -1 });
    return candidates.find((l) => phoneDigits(l.phone) === digits) || null;
  }
  return null;
}
const findLeadForAdmission = (p) => findLeadByContact({ leadId: p.leadId, email: p.email, phone: p.phone || p.whatsappNumber });

// ==========================================
// REAL ADMITTED STUDENTS API
// ==========================================
router.get('/students', async (req, res) => {
  try {
    const { statusGroup, search, trainerId, handoverStatus } = req.query;
    const hrName = isScopedHr(req) ? req.user?.name : req.query.hrName;
    const userBranch = branchShort(req.user?.branch || req.query.branch);

    const andConditions = [];
    if (trainerId) andConditions.push({ trainerId });
    if (handoverStatus) andConditions.push({ handoverStatus });
    if (statusGroup && statusGroup !== 'all') {
      andConditions.push({ statusGroup });
    }

    if (isScopedHr(req)) {
      const counselor = req.user?.name;
      const hrOr = [];
      if (counselor) hrOr.push({ hrName: exactNameRx(counselor) });
      if (userBranch) {
        const bRx = new RegExp(escapeRegex(userBranch), 'i');
        hrOr.push({ branch: bRx }, { location: bRx }, { leadBranch: bRx });
      }
      if (hrOr.length > 0) andConditions.push({ $or: hrOr });
    } else if (hrName && hrName !== 'all') {
      const hrOr = [{ hrName: exactNameRx(hrName) }];
      if (userBranch) {
        const bRx = new RegExp(escapeRegex(userBranch), 'i');
        hrOr.push({ branch: bRx }, { location: bRx }, { leadBranch: bRx });
      }
      andConditions.push({ $or: hrOr });
    }

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { studentId: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { course: { $regex: search, $options: 'i' } },
          { hrName: { $regex: search, $options: 'i' } },
          { branch: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};
    const students = await Student.find(query).sort({ createdAt: -1 });
    // Trainers get full records only for their own students (and handed-over,
    // not-yet-allocated ones they may pick up). Everyone else: just enough to
    // match demo conversions — no fees, documents or contact history.
    if (req.user?.department === 'training') {
      const me = req.user.trainerId || '';
      const FIN = ['feeStatus', 'feeAmount', 'courseFee', 'paidAmount', 'pendingBalance', 'paymentPlan', 'nextDueDate', 'examFee', 'paymentMethod', 'receipts', 'rewardPoints', 'documents'];
      return res.json(students.map((s) => {
        const o = s.toObject();
        const mine = (me && o.trainerId === me) || (!o.trainerId && o.handoverStatus === 'Sent to Training');
        if (mine) { FIN.forEach((k) => delete o[k]); return o; }
        return { _id: o._id, studentId: o.studentId, name: o.name, phone: o.phone, email: o.email, course: o.course, createdAt: o.createdAt };
      }));
    }
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/students/:id', async (req, res) => {
  try {
    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const student = await Student.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { studentId: req.params.id },
        { email: req.params.id }
      ]
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!ownsStudent(req, student)) return res.status(403).json(NOT_YOURS);
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TF + 6 unambiguous chars, e.g. TFK7M3QX
function generateStudentPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'TF';
  for (let i = 0; i < 6; i++) out += chars[crypto.randomInt(chars.length)];
  return out;
}

// Standard ThoughtFlows Student ID Generator: TF + Branch + Course + Type + Month + Year + Serial
async function generateStandardStudentId({ branch, course, mode, date }) {
  const branchMap = {
    'S': 'Saravanampatti', 'H': 'Hopes', 'G': 'Gandhipuram', 'C': 'Trichy',
    'M': 'Salem', 'K': 'Kochi', 'V': 'Trivandrum', 'T': 'Tirupati',
    'D': 'Hyderabad Dilsukhnagar', 'R': 'Hyderabad Ameerpet', 'Z': 'Vizag',
    'P': 'Pune', 'L': 'Kollapur', 'N': 'Theni'
  };
  const monthCodes = ['A', 'B', 'C', 'D', 'Y', 'J', 'L', 'G', 'S', 'T', 'N', 'E'];

  // Branch code
  let b = 'S';
  const bStr = String(branch || '').toLowerCase();
  if (branchMap[String(branch || '').toUpperCase()]) b = String(branch).toUpperCase();
  else if (bStr.includes('hopes')) b = 'H';
  else if (bStr.includes('gandhi') || bStr.includes('gpm')) b = 'G';
  else if (bStr.includes('trichy')) b = 'C';
  else if (bStr.includes('salem')) b = 'M';
  else if (bStr.includes('kochi') || bStr.includes('cochin')) b = 'K';
  else if (bStr.includes('trivandrum')) b = 'V';
  else if (bStr.includes('tirupati')) b = 'T';
  else if (bStr.includes('dilsukh')) b = 'D';
  else if (bStr.includes('ameerpet') || bStr.includes('hyderabad')) b = 'R';
  else if (bStr.includes('vizag')) b = 'Z';
  else if (bStr.includes('pune')) b = 'P';
  else if (bStr.includes('kollapur') || bStr.includes('kolhapur')) b = 'L';
  else if (bStr.includes('theni')) b = 'N';

  // Course code
  let c = 'C';
  const cStr = String(course || '').toUpperCase();
  if (cStr.includes('CRASH')) c = 'F';
  else if (cStr.includes('AMCT BEGINNER')) c = 'AB';
  else if (cStr.includes('AMCT INTERMEDIATE')) c = 'AI';
  else if (cStr.includes('AMCT ADVANCED')) c = 'AA';
  else if (cStr.includes('AMCT') || cStr.includes('MCT')) c = 'A';
  else if (cStr.includes('CPMA')) c = 'P';
  else if (cStr.includes('COC')) c = 'B';
  else if (cStr.includes('CRC')) c = 'R';
  else if (cStr.includes('CPB')) c = 'PB';
  else if (cStr.includes('CEDC')) c = 'EDC';
  else if (cStr.includes('CEMC')) c = 'CN';
  else if (cStr.includes('CDEO')) c = 'CDO';
  else if (cStr.includes('CDEI')) c = 'CDEI';
  else if (cStr.includes('CPPM')) c = 'PPM';
  else if (cStr.includes('CIC')) c = 'E';
  else if (cStr.includes('SURGERY')) c = 'Y';
  else if (cStr.includes('EMERGENCY') || cStr.includes('ED -') || cStr.includes('ED (')) c = 'D';
  else if (cStr.includes('EVALUATION') || cStr.includes('EM -') || cStr.includes('E/M')) c = 'N';
  else if (cStr.includes('RADIOLOGY')) c = 'RD';
  else if (cStr.includes('ANESTHESIA')) c = 'AN';
  else if (cStr.includes('IP DRG') || cStr.includes('IPDRG')) c = 'I';
  else if (cStr.includes('HCC')) c = 'H';
  else if (cStr.includes('IVR')) c = 'IVR';
  else if (cStr.includes('CDI')) c = 'CDI';
  else if (cStr.includes('CCS-P')) c = 'CSP';
  else if (cStr.includes('CCS')) c = 'S';
  else if (cStr.includes('RHIA')) c = 'RIA';
  else if (cStr.includes('RHIT')) c = 'RIT';
  else if (cStr.includes('CCC')) c = 'CCC';
  else if (cStr.includes('HIM')) c = 'HIM';
  else if (cStr.includes('CPT')) c = 'T';
  else if (cStr.includes('ICD')) c = 'Z';
  else if (cStr.includes('ANATOMY')) c = 'O';
  else if (cStr.includes('CPC')) c = 'C';

  // Mode code (O = Online, C = Classroom, H = Hybrid)
  let t = 'O';
  const mStr = String(mode || '').toLowerCase();
  if (mStr.includes('class') || mStr.includes('off')) t = 'C';
  else if (mStr.includes('hyb')) t = 'H';

  // Month & Year codes
  const d = date ? new Date(date) : new Date();
  const m = monthCodes[!isNaN(d.getTime()) ? d.getMonth() : new Date().getMonth()] || 'Y';
  const y = String(!isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear()).slice(-1);

  const prefix = `TF${b}${c}${t}${m}${y}`.toUpperCase();

  const existing = await Student.find({ studentId: new RegExp(`^${prefix}`, 'i') }).select('studentId').lean();
  let maxSerial = 0;
  for (const st of existing) {
    const suf = String(st.studentId || '').slice(prefix.length);
    const num = parseInt(suf, 10);
    if (!isNaN(num) && num > maxSerial) maxSerial = num;
  }
  const serial = String(maxSerial + 1).padStart(3, '0');
  return `${prefix}${serial}`;
}

router.post('/students', async (req, res) => {
  try {
    let payload = { ...req.body };
    if (payload.studentId && await Student.exists({ studentId: payload.studentId })) {
      return res.status(409).json({ error: `Student ID ${payload.studentId} is already in use` });
    }
    if (!payload.studentId) {
      payload.studentId = await generateStandardStudentId({
        branch: payload.branch || payload.leadBranch || payload.location,
        course: payload.course,
        mode: payload.mode,
        date: payload.batchDate || payload.registeredAt || new Date()
      });
    }
    if (payload.mode && !['Online', 'Classroom'].includes(payload.mode)) {
      payload.mode = (payload.mode.toLowerCase().includes('class') || payload.mode.toLowerCase().includes('off')) ? 'Classroom' : 'Online';
    }
    if (!payload.onboardStatus) payload.onboardStatus = '7/7 ✓';
    if (!payload.syllabusModule) payload.syllabusModule = 'Module 1';
    if (!payload.statusGroup || !['all', 'in_course', 'placed', 'on_hold'].includes(payload.statusGroup)) {
      payload.statusGroup = payload.placementStatus?.toLowerCase().includes('place') ? 'placed' : 'in_course';
    }
    // A counsellor always admits under their own name
    if (isScopedHr(req) || !payload.hrName) payload.hrName = req.user?.name || payload.hrName || '';

    // Link the admission to its lead (explicit leadId, else same phone / email)
    let lead = await findLeadForAdmission(payload);
    if (lead?.admittedStudentId) {
      // Admitting the same lead twice is a mistake; a matching phone on an old,
      // already-admitted lead is just a returning student taking another course.
      if (payload.leadId) return res.status(409).json({ error: `${lead.fullName || 'This lead'} is already admitted as ${lead.admittedStudentId}` });
      lead = null;
    }
    if (lead) {
      payload.leadId = String(lead._id);
      if (!payload.leadBranch && lead.branch) payload.leadBranch = lead.branch;
      if (!payload.branch && lead.branch) payload.branch = lead.branch;
    }
    if (!payload.branch && payload.location) payload.branch = payload.location;
    if (!payload.location && payload.branch) payload.location = payload.branch;

    // No fee given → take it from the course rate card
    if (!(Number(payload.courseFee) > 0) && payload.course) {
      const code = String(payload.course).split(/\s+[-–]\s+|\s*·\s*/)[0].trim();
      const rate = await CourseFeeRate.findOne({ $or: [{ code: exactNameRx(code) }, { name: exactNameRx(payload.course) }] });
      if (rate?.courseFee > 0) payload.courseFee = rate.courseFee;
    }
    if (Number(payload.courseFee) > 0) applyFeeTotals(payload);

    // Handover readiness is earned through the checklist, never assumed
    payload.checklist = { ...(payload.checklist || {}), paymentStatus: Number(payload.paidAmount) > 0 };
    payload.handoverStatus = 'Pending Handover';
    // First payment taken at admission → opening receipt, so the ledger adds up
    if (Number(payload.paidAmount) > 0 && !(payload.receipts || []).length) {
      const receiptNo = `RC-${payload.studentId}-01`;
      payload.receipts = [{
        id: receiptNo,
        receiptNo,
        label: 'Admission payment',
        amount: Number(payload.paidAmount),
        mode: payload.paymentMethod || '',
        reference: String(payload.paymentReference || payload.transactionId || ''),
        date: todayStr(),
        recordedBy: req.user?.name || '',
        at: new Date()
      }];
    }

    const newStudent = new Student(payload);
    await newStudent.save();

    if (lead) {
      lead.stage = 'admitted';
      lead.status = 'completed';
      lead.admittedStudentId = newStudent.studentId;
      await lead.save();
      await creditReferralReward(lead);
    }

    // Create student login user email + password in User collection upon student admission/registration
    let studentLogin = null;
    const email = String(payload.email || '').trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const existing = await User.findOne({ email });
      if (existing) {
        studentLogin = { email, existing: true };
      } else {
        const password = generateStudentPassword();
        const name = payload.name || payload.fullName || 'Student Scholar';
        await User.create({
          name,
          email,
          password: await hashPassword(password),
          role: 'Student Scholar',
          department: 'Student Scholar',
          branch: payload.branch || 'Saravanampatti (CBE)',
          status: 'Active',
          lastLogin: 'Never',
          initials: name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
          avatarBg: 'bg-teal-600',
          createdFrom: 'admitted_student'
        });
        studentLogin = { email, password, created: true };
      }
    }

    res.status(201).json({ ...newStudent.toObject(), studentLogin });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Issue / reset a student's portal login. The new password is returned once
// so HR can hand it to the student — it is stored only as a hash.
router.post('/students/:id/reset-login', async (req, res) => {
  try {
    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const st = await Student.findOne({ $or: [...(isObjectId ? [{ _id: req.params.id }] : []), { studentId: req.params.id }] });
    if (!st) return res.status(404).json({ error: 'Student not found' });
    if (!ownsStudent(req, st)) return res.status(403).json(NOT_YOURS);
    const email = String(st.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /^student\.\d+@thoughtflows\.in$/.test(email)) {
      return res.status(400).json({ error: "Add the student's real email address first — it is their login ID." });
    }
    const password = generateStudentPassword();
    const hashed = await hashPassword(password);
    let user = await User.findOne({ email });
    if (user) {
      user.password = hashed;
      user.status = 'Active';
      await user.save();
    } else {
      user = await User.create({
        name: st.name,
        email,
        password: hashed,
        role: 'Student Scholar',
        department: 'Student Scholar',
        branch: st.location || '',
        status: 'Active',
        lastLogin: 'Never',
        initials: String(st.name || 'S').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
        avatarBg: 'bg-teal-600',
        createdFrom: 'admitted_student'
      });
    }
    res.json({ email, password, studentId: st.studentId, name: st.name });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Fee status / balance always derived from course fee and what was paid
function applyFeeTotals(st) {
  const fee = Number(st.courseFee) || 0;
  const paid = Number(st.paidAmount) || 0;
  st.pendingBalance = Math.max(0, fee - paid);
  st.feeStatus = fee > 0 && st.pendingBalance === 0 ? 'Fully Paid' : paid > 0 ? 'Part Paid' : 'Pending';
  st.feeAmount = st.pendingBalance === 0 && fee > 0
    ? `₹${fee.toLocaleString('en-IN')}`
    : `₹${paid.toLocaleString('en-IN')} / ₹${fee.toLocaleString('en-IN')}`;
}

// HR records an instalment → receipt on the student record, balance recomputed
router.post('/students/:id/payments', async (req, res) => {
  try {
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    if (!ownsStudent(req, st)) return res.status(403).json(NOT_YOURS);
    const { amount, mode = '', date = '', reference = '', note = '', nextDueDate } = req.body || {};
    const amt = Math.round(Number(amount));
    if (!(amt > 0)) return res.status(400).json({ error: 'Enter a payment amount greater than 0' });
    const balance = Math.max(0, (Number(st.courseFee) || 0) - (Number(st.paidAmount) || 0));
    if (Number(st.courseFee) > 0 && amt > balance) {
      return res.status(400).json({ error: `Amount is more than the pending balance of ₹${balance.toLocaleString('en-IN')}` });
    }
    const receiptNo = `RC-${st.studentId}-${String((st.receipts || []).length + 1).padStart(2, '0')}`;
    st.receipts = [...(st.receipts || []), {
      id: receiptNo,
      receiptNo,
      label: note ? String(note).slice(0, 120) : `Fee instalment ${(st.receipts || []).length + 1}`,
      amount: amt,
      mode: String(mode || st.paymentMethod || ''),
      reference: String(reference || ''),
      date: date || todayStr(),
      recordedBy: req.user?.name || '',
      at: new Date()
    }];
    st.paidAmount = (Number(st.paidAmount) || 0) + amt;
    if (st.checklist) st.checklist.paymentStatus = true;
    if (mode) st.paymentMethod = String(mode);
    applyFeeTotals(st);
    if (nextDueDate !== undefined) st.nextDueDate = st.pendingBalance === 0 ? '' : String(nextDueDate || '');
    else if (st.pendingBalance === 0) st.nextDueDate = '';
    await st.save();
    await notifyStudent(st.studentId, {
      type: 'payment', title: `Payment received: ₹${amt.toLocaleString('en-IN')}`,
      message: st.pendingBalance === 0
        ? `Receipt ${receiptNo}. Your course fee is fully paid.`
        : `Receipt ${receiptNo}. Pending balance ₹${st.pendingBalance.toLocaleString('en-IN')}${st.nextDueDate ? ` · next due ${st.nextDueDate}` : ''}.`,
      createdBy: req.user?.name || ''
    });
    res.status(201).json(st);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/students/:id', async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.mode && !['Online', 'Classroom'].includes(payload.mode)) {
      payload.mode = (payload.mode.toLowerCase().includes('class') || payload.mode.toLowerCase().includes('off')) ? 'Classroom' : 'Online';
    }
    if (payload.statusGroup && !['all', 'in_course', 'placed', 'on_hold'].includes(payload.statusGroup)) {
      payload.statusGroup = payload.placementStatus?.toLowerCase().includes('place') ? 'placed' : 'in_course';
    }
    const existing = await findStudentByAnyId(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Student not found' });
    if (!ownsStudent(req, existing)) return res.status(403).json(NOT_YOURS);
    // Money only moves through POST /students/:id/payments (receipt ledger);
    // Admin / Leadership may still correct the totals directly.
    const elevated = ['admin', 'leadership'].includes(req.user?.department);
    if (!elevated) {
      ['paidAmount', 'receipts', 'pendingBalance', 'feeStatus', 'feeAmount', 'leadId'].forEach((k) => delete payload[k]);
      if (isScopedHr(req)) delete payload.hrName;
    }
    // Handover to training happens only through POST /students/:id/handover,
    // and a checklist edit never pulls a handed-over student back
    if (payload.handoverStatus === 'Sent to Training' || existing.handoverStatus === 'Sent to Training') delete payload.handoverStatus;
    // Placement pipeline: status / group always follow the stage (set by the model)
    delete payload.placementStatus;
    if (payload.statusGroup === 'placed') delete payload.statusGroup;
    const touchesPlacement = 'placementStage' in payload || 'interviews' in payload;
    if (touchesPlacement) {
      if (!PLACEMENT_EDITORS.includes(req.user?.department)) {
        return res.status(403).json({ error: 'Only HR, CCCP (placement) or Admin can update the placement pipeline.' });
      }
      const merged = { ...existing.toObject(), ...payload };
      if ('interviews' in payload) {
        if (effectiveStage(existing) < 3) {
          return res.status(400).json({ error: `${blockReason(existing, 4)} Interviews can be logged only after Stage 3.` });
        }
        const c = stageChecks(merged);
        const floor = c.hasOffer ? 6 : c.hasInterview ? 5 : 0;
        const current = effectiveStage(existing);
        if (!('placementStage' in payload) && floor > current) payload.placementStage = floor;
      }
      if ('placementStage' in payload) {
        const target = Number(payload.placementStage) || 0;
        if (target <= 3) {
          payload.placementStage = 0; // back to automatic stages
        } else {
          const current = effectiveStage(existing);
          // Moves triggered by logging an interview may jump straight to 5 / 6
          const viaInterview = 'interviews' in payload && target <= 6;
          const reason = viaInterview ? '' : (target === current ? '' : target < current ? '' : blockReason(merged, target));
          if (reason) return res.status(400).json({ error: reason });
          payload.placementStage = target;
        }
      }
    }
    const updated = await Student.findByIdAndUpdate(existing._id, { $set: payload }, { new: true });
    // Fee edits keep balance / status in step with the ledger
    if ('courseFee' in payload || 'paidAmount' in payload) {
      applyFeeTotals(updated);
      await updated.save();
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    const isObjectId = mongoose.isValidObjectId(req.params.id);
    if (isObjectId) {
      await Student.findByIdAndDelete(req.params.id);
    } else {
      await Student.findOneAndDelete({ studentId: req.params.id });
    }
    res.json({ message: 'Student removed successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// REAL CRM LEADS & PIPELINE API
// ==========================================
router.get('/leads', async (req, res) => {
  try {
    const { search, stage, branch } = req.query;
    // Counsellors are always pinned to their own leads
    const counselor = isScopedHr(req) ? req.user?.name : req.query.counselor;
    let query = {};
    if (counselor && counselor !== 'all') {
      query.$or = leadOwnerQuery(counselor).$or;
    }
    if (stage && stage !== 'all') {
      query.stage = stage;
    }
    if (branch && branch !== 'all') {
      query.branch = { $regex: new RegExp(branch.trim(), 'i') };
    }
    if (search) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      const searchOr = [
        { fullName: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { location: searchRegex },
        { course: searchRegex }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }
    const leads = await StudentLead.find(query).sort({ createdAt: -1 });
    
    // Group into pipeline counts
    const stages = [
      { key: 'new', label: '1. New Leads', count: 0, color: '#0f172a' },
      { key: 'contacted', label: '2. Contacted / Follow-up', count: 0, color: '#0284c7' },
      { key: 'demo_booked', label: '3. Demo Booked', count: 0, color: '#7c3aed' },
      { key: 'demo_attended', label: '4. Demo Attended', count: 0, color: '#059669' },
      { key: 'fee_followup', label: '5. Fee Discussion', count: 0, color: '#ea580c' },
      { key: 'admitted', label: '6. Admitted & Enrolled', count: 0, color: '#10b981' }
    ];

    leads.forEach(l => {
      const match = stages.find(s => s.key === l.stage);
      if (match) match.count++;
    });

    res.json({
      leads,
      stages,
      totalCount: leads.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/leads', async (req, res) => {
  try {
    const payload = { ...req.body };
    delete payload.createStudentLogin;
    if (!payload.fullName && payload.name) {
      payload.fullName = payload.name;
    }
    if (!payload.sourceName && payload.source) {
      payload.sourceName = payload.source;
    }
    if (!payload.stage) {
      payload.stage = 'new';
    }

    // A counsellor adding a lead without naming an owner keeps it
    if (isScopedHr(req) && !payload.counselorAssigned && !payload.allocatedTo) payload.counselorAssigned = req.user?.name || "";
    delete payload.admittedStudentId;
    const owner = leadOwner(payload);
    const gate = await lmsGate(owner, payload.course);
    if (gate?.blocked) return res.status(403).json({ error: gate.message, code: 'LMS_NOT_CERTIFIED' });

    const newLead = new StudentLead(payload);
    await newLead.save();

    res.status(201).json(gate ? { ...newLead.toObject(), lmsWarning: gate.message } : newLead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/leads/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Lead not found' });
    const current = await StudentLead.findById(req.params.id).select('allocatedTo counselorAssigned course');
    if (!current) return res.status(404).json({ error: 'Lead not found' });
    if (!ownsLead(req, current)) return res.status(403).json(NOT_YOURS);
    const body = { ...(req.body || {}) };
    delete body.admittedStudentId; // set only when the student record is created
    // Re-allocation to another counsellor → LMS certification check
    let gate = null;
    const newOwner = body.allocatedTo || body.counselorAssigned;
    if (newOwner && normName(newOwner) !== normName(leadOwner(current))) {
      gate = await lmsGate(newOwner, body.course || current.course);
      if (gate?.blocked) return res.status(403).json({ error: gate.message, code: 'LMS_NOT_CERTIFIED' });
      // counselorAssigned wins over allocatedTo, so keep the two in step
      body.counselorAssigned = newOwner;
      body.allocatedTo = newOwner;
    }
    const updated = await StudentLead.findByIdAndUpdate(current._id, { $set: body }, { new: true });
    await creditReferralReward(updated);
    res.json(gate ? { ...updated.toObject(), lmsWarning: gate.message } : updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    const lead = mongoose.isValidObjectId(req.params.id) ? await StudentLead.findById(req.params.id) : null;
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!ownsLead(req, lead)) return res.status(403).json(NOT_YOURS);
    await lead.deleteOne();
    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET WhatsApp conversation history for a lead
router.get('/leads/:id/whatsapp', async (req, res) => {
  try {
    const lead = await StudentLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!ownsLead(req, lead)) return res.status(403).json(NOT_YOURS);

    // If first time, initialize with authentic initial student inquiry
    if (!lead.whatsappMessages || lead.whatsappMessages.length === 0) {
      const course = lead.course || 'CPC - Certified Professional Coder';
      const initialMsgs = [
        {
          id: `wa-init-${Date.now()}`,
          sender: 'student',
          senderName: lead.fullName || 'Student',
          text: `Hi ThoughtFlows Academy, I am interested in joining the ${course} course. Can you please share the syllabus, fees, and next batch timings?`,
          time: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read',
          createdAt: new Date(Date.now() - 3600000)
        }
      ];
      lead.whatsappMessages = initialMsgs;
      await lead.save();
    }

    res.json({ messages: lead.whatsappMessages, student: lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST send WhatsApp message in modal & get intelligent student reply
router.post('/leads/:id/whatsapp', async (req, res) => {
  try {
    const lead = await StudentLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!ownsLead(req, lead)) return res.status(403).json(NOT_YOURS);

    const { text, mediaUrl, mediaType, mediaName, sender = 'counselor', senderName = 'Counselor' } = req.body;
    if (!text && !mediaUrl) {
      return res.status(400).json({ error: 'Message text or media is required' });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: `wa-${Date.now()}`,
      sender,
      senderName,
      text: text || '',
      time: timeStr,
      status: 'sent',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || '',
      mediaName: mediaName || '',
      createdAt: now
    };

    if (!lead.whatsappMessages) lead.whatsappMessages = [];
    lead.whatsappMessages.push(newMsg);

    await lead.save();

    res.json({
      success: true,
      sentMessage: newMsg,
      messages: lead.whatsappMessages
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy pipeline route for backwards compatibility
router.get('/leads/pipeline', async (req, res) => {
  try {
    // First call → placement, counted from the real lead and student records
    const [openLeads, students] = await Promise.all([
      StudentLead.countDocuments({ stage: { $nin: ['admitted', 'closed'] } }),
      Student.find().select('handoverStatus syllabusCompleted certified statusGroup placementStatus placementStage').lean()
    ]);
    const certified = (s) => /certified/i.test(s.certified || '') && !/non/i.test(s.certified || '');
    const placed = (s) => s.statusGroup === 'placed' || /placed/i.test(s.placementStatus || '') || Number(s.placementStage) >= 7;
    const stages = [
      { key: 'first_call', label: '1. First Call & Counseling', count: openLeads, color: '#14b8a6' },
      { key: 'enrolled', label: '2. Enrolled & Onboarded', count: students.length, color: '#06b6d4' },
      { key: 'in_training', label: '3. In Training', count: students.filter((s) => s.handoverStatus === 'Sent to Training' && !s.syllabusCompleted).length, color: '#3b82f6' },
      { key: 'cpc_exam_passed', label: '4. Certified', count: students.filter(certified).length, color: '#10b981' },
      { key: 'placed', label: '5. Placed & Joined', count: students.filter(placed).length, color: '#8b5cf6' }
    ];
    res.json({ stages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to convert time string like "6:00 AM", "17:00", "2:30 PM" to minutes from midnight
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const s = timeStr.trim().toLowerCase();

  // 12-hour format with AM/PM (e.g., "6:00 AM", "2:30 PM", "9 AM")
  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const mins = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const period = ampmMatch[3];
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  // 24-hour format (e.g., "17:00", "09:30")
  const h24Match = s.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hours = parseInt(h24Match[1], 10);
    const mins = parseInt(h24Match[2], 10);
    return hours * 60 + mins;
  }

  // Embedded time substring (e.g., "Today 11:00 AM", "17:00")
  const embeddedMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (embeddedMatch) {
    let hours = parseInt(embeddedMatch[1], 10);
    const mins = embeddedMatch[2] ? parseInt(embeddedMatch[2], 10) : 0;
    const period = embeddedMatch[3];
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  return null;
}

// Helper to extract { startMin, endMin } from slot string like "6:00–8:00 AM", "4:00–6:00 PM"
function parseSlotToRange(slotStr) {
  if (!slotStr) return null;
  const s = slotStr.replace(/[–—]/g, '-').trim();
  const parts = s.split('-');
  if (parts.length === 2) {
    let startPart = parts[0].trim();
    let endPart = parts[1].trim();

    const endHasAmPm = /am|pm/i.test(endPart);
    if (endHasAmPm && !/am|pm/i.test(startPart)) {
      const period = endPart.toLowerCase().includes('pm') ? 'PM' : 'AM';
      const startHour = parseInt(startPart, 10);
      const endHour = parseInt(endPart, 10);
      if (period === 'PM' && startHour > endHour && startHour !== 12) {
        startPart = `${startPart} AM`;
      } else {
        startPart = `${startPart} ${period}`;
      }
    }

    const startMin = parseTimeToMinutes(startPart);
    const endMin = parseTimeToMinutes(endPart);
    if (startMin !== null && endMin !== null) {
      return { startMin, endMin };
    }
  }

  const singleMin = parseTimeToMinutes(slotStr);
  if (singleMin !== null) {
    return { startMin: singleMin, endMin: singleMin + 60 };
  }

  return null;
}

// ==========================================
// DEMO TRAINER ROSTER — persisted in Mongo (Trainer model), not in-memory.
// Each trainer carries the fields the demo-booking notification rule needs:
// languages taught, home branchName, the "Experienced in Demo" / "Demo
// Trainer" flag, and an active/eligible switch. Admins manage these through
// GET/PUT /api/trainer/settings.
// ==========================================
// Do two slot ranges (e.g. "10:00–11:30 AM" and "11:00 AM–1:00 PM") overlap?
function slotsOverlap(slotA, slotB) {
  const a = parseSlotToRange(slotA);
  const b = parseSlotToRange(slotB);
  if (!a || !b) return slotA === slotB; // fall back to exact string match
  return Math.max(a.startMin, b.startMin) < Math.min(a.endMin, b.endMin);
}

const norm = (s = '') => String(s).trim().toLowerCase();

/**
 * Demo Booking Notification Requirement — a trainer is eligible ONLY when
 * ALL of the following hold:
 *   1. Same Language   — trainer teaches in the student's selected language
 *   2. Same Location   — trainer's branch matches the student's selected branch
 *   3. Free at the Time — demo slot is inside the trainer's shift, does not
 *                          overlap one of their scheduled classes, and does not
 *                          overlap another booked/confirmed demo
 * (Only inactive trainers are skipped. Course is a ranking preference only.)
 * Returns { eligible: Trainer[], reason } where `reason` explains a zero
 * match (used to populate Demo.noEligibleTrainerReason).
 */
// Does a class with days like "Mon,Wed,Fri" run on this YYYY-MM-DD? (no days / no date = yes)
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function classRunsOn(days, date) {
  const list = String(days || '').split(',').map((d) => d.trim().slice(0, 3)).filter(Boolean);
  if (!list.length || !/^\d{4}-\d{2}-\d{2}/.test(String(date || ''))) return true;
  const wd = WEEKDAYS[new Date(`${String(date).slice(0, 10)}T12:00:00Z`).getUTCDay()];
  return list.includes(wd);
}

// Trainer marked this date (YYYY-MM-DD) as leave / unavailable
function trainerOnLeave(t, date) {
  const d = String(date || '').slice(0, 10);
  if (!d) return false;
  return (t.leaves || []).some((l) => l.from && d >= l.from && d <= (l.to || l.from));
}

export const DEMO_GROUP_CAPACITY = 6; // Up to 6 demo students conducted together in one group session

async function findEligibleTrainers({ language, location, preferredDate, timeSlot, excludeDemoId }) {
  const langNorm = norm(language);
  const locNorm = norm(location);

  const roster = await Trainer.find({ active: { $ne: false } });

  const languageLocationMatched = roster.filter((t) => {
    const languageOk = !langNorm || (t.languages || []).some((l) => norm(l) === langNorm);
    const locationOk = !locNorm || norm(t.branchName) === locNorm;
    return languageOk && locationOk;
  });

  if (languageLocationMatched.length === 0) {
    return {
      eligible: [],
      reason: `No trainer found for language "${language}" at "${location}".`
    };
  }

  // Condition 3a: free by schedule — slot inside shift and not during one of their classes
  const slot = parseSlotToRange(timeSlot);
  const freeBySchedule = languageLocationMatched.filter((t) => {
    if (trainerOnLeave(t, preferredDate)) return false; // on leave that day
    if (!slot) return true; // unparseable slot → can't judge, don't exclude
    const shiftStart = Number.isFinite(t.shiftStartMin) ? t.shiftStartMin : 0;
    const shiftEnd = Number.isFinite(t.shiftEndMin) ? t.shiftEndMin : 1440;
    const inShift = shiftEnd > shiftStart
      ? slot.startMin >= shiftStart && slot.endMin <= shiftEnd
      : slot.startMin >= shiftStart || slot.endMin <= shiftEnd; // overnight shift
    if (!inShift) return false;
    const inClass = (t.scheduledClasses || []).some((c) => {
      if (!classRunsOn(c.days, preferredDate)) return false; // class not held that weekday
      const r = Number.isFinite(c.startMin) && Number.isFinite(c.endMin)
        ? { startMin: c.startMin, endMin: c.endMin }
        : parseSlotToRange(c.timeSlot);
      return r && Math.max(r.startMin, slot.startMin) < Math.min(r.endMin, slot.endMin);
    });
    return !inClass;
  });

  if (freeBySchedule.length === 0) {
    return {
      eligible: [],
      reason: `Trainer(s) matching language "${language}" and location "${location}" are off-shift or in class at ${timeSlot}.`
    };
  }

  // Condition 3b: free at the exact demo date + time.
  // Group demo sessions support up to DEMO_GROUP_CAPACITY (6) candidates simultaneously.
  // Exclude trainers who have already reached capacity for this overlapping slot.
  const busyQuery = {
    preferredDate,
    trainerId: { $in: freeBySchedule.map((t) => t.trainerId) },
    status: { $in: ['booked', 'confirmed'] }
  };
  if (excludeDemoId) busyQuery._id = { $ne: excludeDemoId };
  const sameDayDemos = await Demo.find(busyQuery).select('trainerId timeSlot');

  const trainerSlotCounts = {};
  sameDayDemos.forEach((d) => {
    if (slotsOverlap(d.timeSlot, timeSlot)) {
      trainerSlotCounts[d.trainerId] = (trainerSlotCounts[d.trainerId] || 0) + 1;
    }
  });

  const busyTrainerIds = new Set(
    Object.keys(trainerSlotCounts).filter((tId) => trainerSlotCounts[tId] >= DEMO_GROUP_CAPACITY)
  );

  const eligible = freeBySchedule.filter((t) => !busyTrainerIds.has(t.trainerId));

  if (eligible.length === 0) {
    return {
      eligible: [],
      reason: `Trainer(s) matching language "${language}" and location "${location}" have reached maximum group capacity (${DEMO_GROUP_CAPACITY} students) at ${timeSlot} on ${preferredDate}.`
    };
  }

  return { eligible, reason: '' };
}

// Trainer Settings Endpoints — the admin-editable demo trainer roster
router.get('/trainer/settings', async (req, res) => {
  try {
    const trainers = await Trainer.find().sort({ trainerName: 1 });
    res.json(trainers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/trainer/settings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Trainer.findOneAndUpdate(
      { trainerId: id },
      { $set: { trainerId: id, ...req.body } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Trainer leave / unavailable days (trainer edits their own; admin & leadership any)
const canEditTrainer = (req, trainerId) => ['admin', 'leadership'].includes(req.user?.department)
  || (req.user?.department === 'training' && (!req.user?.trainerId || req.user.trainerId === trainerId));

router.post('/trainer/settings/:id/leaves', async (req, res) => {
  try {
    const { id } = req.params;
    if (!canEditTrainer(req, id)) return res.status(403).json({ error: 'You can only change your own leave.' });
    const { from, to = '', reason = '' } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(from || ''))) return res.status(400).json({ error: 'Pick a start date' });
    const end = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : from;
    if (end < from) return res.status(400).json({ error: 'End date is before start date' });
    const trainer = await Trainer.findOne({ trainerId: id });
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
    // Clash check: accepted demos inside the leave window
    const clashes = await Demo.find({ trainerId: id, preferredDate: { $gte: from, $lte: end }, status: { $in: ['booked', 'confirmed', 'Booked', 'Confirmed'] } })
      .select('candidateName preferredDate timeSlot bookedBy');
    trainer.leaves.push({ from, to: end, reason: String(reason).slice(0, 200) });
    await trainer.save();
    for (const d of clashes) {
      await pushNotification({
        audience: 'hr', recipientName: d.bookedBy || '', type: 'demo',
        title: `Trainer on leave: reschedule ${d.candidateName}`,
        message: `${trainer.trainerName} is on leave ${from}${end !== from ? ` → ${end}` : ''}. The demo on ${d.preferredDate} ${d.timeSlot} needs a new trainer or slot.`,
        demoId: String(d._id), createdBy: trainer.trainerName
      });
    }
    res.status(201).json({ trainer, clashes: clashes.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/trainer/settings/:id/leaves/:leaveId', async (req, res) => {
  try {
    const { id, leaveId } = req.params;
    if (!canEditTrainer(req, id)) return res.status(403).json({ error: 'You can only change your own leave.' });
    const trainer = await Trainer.findOneAndUpdate({ trainerId: id }, { $pull: { leaves: { _id: leaveId } } }, { new: true });
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
    res.json({ trainer });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Live preview for the booking form: which trainers would be notified for a
// given language + location + date + time (and, optionally, course)?
router.get('/demos/eligible-trainers', async (req, res) => {
  try {
    const { language, location, preferredDate, timeSlot, course } = req.query;
    const { eligible, reason } = await findEligibleTrainers({
      language,
      location,
      preferredDate: preferredDate || todayStr(),
      timeSlot: timeSlot || ''
    });
    const courseNorm = norm(course);
    const ranked = courseNorm
      ? [...eligible].sort((a, b) => (norm(b.courseKey) === courseNorm) - (norm(a.courseKey) === courseNorm))
      : eligible;
    res.json({
      count: ranked.length,
      reason,
      trainers: ranked.map((t) => ({
        trainerId: t.trainerId,
        trainerName: t.trainerName,
        specialization: t.specialization,
        courseKey: t.courseKey,
        branchName: t.branchName,
        languages: t.languages
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// REAL DEMOS API WITH EXPERT TRAINER ROUTING & NOTIFICATION RULES
// ==========================================
router.get('/demos', async (req, res) => {
  try {
    const { status, counselor: qCounselor, branch: qBranch } = req.query;
    const andConditions = [];
    if (status && status !== 'all') {
      andConditions.push({ status });
    }

    if (isScopedHr(req)) {
      const counselor = req.user?.name;
      const userBranch = branchShort(req.user?.branch || req.query.branch);
      const orConditions = [];
      if (counselor) {
        orConditions.push(
          { bookedBy: exactNameRx(counselor) },
          { counselor: exactNameRx(counselor) }
        );
      }
      if (userBranch) {
        const bRx = new RegExp(escapeRegex(userBranch), 'i');
        orConditions.push({ location: bRx }, { branch: bRx });
      }
      if (orConditions.length > 0) andConditions.push({ $or: orConditions });
    } else if (qCounselor && qCounselor !== 'all') {
      const userBranch = branchShort(qBranch);
      const orConditions = [
        { bookedBy: exactNameRx(qCounselor) },
        { counselor: exactNameRx(qCounselor) }
      ];
      if (userBranch) {
        const bRx = new RegExp(escapeRegex(userBranch), 'i');
        orConditions.push({ location: bRx }, { branch: bRx });
      }
      andConditions.push({ $or: orConditions });
    } else if (qBranch && qBranch !== 'all') {
      const userBranch = branchShort(qBranch);
      if (userBranch) {
        const bRx = new RegExp(escapeRegex(userBranch), 'i');
        andConditions.push({ $or: [{ location: bRx }, { branch: bRx }] });
      }
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};
    let demos = await Demo.find(query).sort({ createdAt: -1 });
    res.json(demos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stub dispatcher — swap this for a real email/SMS/push provider. It is the
// one place a notification actually goes out to a trainer.
function notifyTrainer(trainer, demo) {
  pushNotification({
    audience: 'trainer', recipientId: trainer.trainerId, recipientName: trainer.trainerName, type: 'demo',
    title: `New demo booked: ${demo.candidateName}`,
    message: `${demo.course || ''} · ${demo.language} · ${demo.location} · ${demo.preferredDate} ${demo.timeSlot}`,
    createdBy: demo.bookedBy || ''
  });
  console.log(
    `[DEMO NOTIFICATION] -> ${trainer.trainerName} (${trainer.trainerId}) : ` +
    `New demo booked by ${demo.candidateName} · ${demo.language} · ${demo.location} · ` +
    `${demo.preferredDate} ${demo.timeSlot}`
  );
}

router.post('/demos', async (req, res) => {
  try {
    const rawData = req.body || {};
    const course = rawData.course || rawData.subject || 'CPC';
    const language = rawData.language || 'Tamil';
    const location = rawData.location || rawData.branchName || '';
    const preferredDate = rawData.preferredDate || todayStr();
    const demoSlot = rawData.timeSlot || rawData.time || '10:00–11:30 AM';

    // Demo Booking Notification Requirement: find every trainer who is
    // simultaneously (1) fluent in the student's language, (2) at the
    // student's location, and (3) free at this exact date + time.
    const { eligible, reason: noEligibleTrainerReason } = await findEligibleTrainers({
      language,
      location,
      preferredDate,
      timeSlot: demoSlot
    });

    // Among the eligible pool, prefer a trainer whose subject matches the
    // course being demoed (this is a ranking preference, not a hard filter —
    // the 5 conditions above are the only hard requirements).
    const courseNorm = norm(course);
    const ranked = [...eligible].sort(
      (a, b) => (norm(b.courseKey) === courseNorm) - (norm(a.courseKey) === courseNorm)
    );
    const primary = ranked[0] || null;

    ranked.forEach((t) => notifyTrainer(t, { candidateName: rawData.candidateName || rawData.studentName || rawData.name, course, language, location, preferredDate, timeSlot: demoSlot, bookedBy: rawData.bookedBy }));

    console.log(
      `[DEMO NOTIFICATION EVALUATION] Course: ${course} | Language: ${language} | Location: ${location} | ` +
      `Slot: ${preferredDate} ${demoSlot} | Eligible trainers: ${ranked.length ? ranked.map((t) => t.trainerId).join(', ') : 'none'}`
    );

    const bookedByName = rawData.bookedBy || rawData.counselor || req.user?.name || '';
    const demoBranch = rawData.branch || location || '';

    const enrichedPayload = {
      ...rawData,
      candidateName: rawData.candidateName || rawData.studentName || rawData.name || 'Prospective Student',
      phone: rawData.phone || rawData.mobile || '',
      course,
      language,
      location,
      branch: demoBranch,
      counselor: bookedByName,
      bookedBy: bookedByName,
      preferredDate,
      timeSlot: demoSlot,
      trainer: primary?.trainerName || '',
      trainerId: primary?.trainerId || '',
      trainerRole: primary?.specialization || '',
      expertCourse: primary?.expertCourse || '',
      isExpertMatched: Boolean(primary),

      // Strict Notification Decision Fields
      isExperienced: primary?.isExperienced ?? false,
      shiftTiming: primary?.shift || '',
      notificationSent: ranked.length > 0,
      notifiedTrainerIds: ranked.map((t) => t.trainerId),
      notifiedTrainerNames: ranked.map((t) => t.trainerName),
      notificationSentTo: primary?.trainerId || null,
      notificationSentToName: primary?.trainerName || null,
      notificationSentAt: ranked.length ? new Date() : null,
      notificationRead: false,
      notificationBlockReason: ranked.length ? '' : noEligibleTrainerReason,
      noEligibleTrainerReason: ranked.length ? '' : noEligibleTrainerReason,
      hasConflict: false,
      conflictReason: '',
      priority: ranked.length ? 'Urgent - Subject Matter Expert First' : 'Standard - No Alert Dispatched',

      trainerMapping: ranked.length
        ? `★ Notification sent to ${ranked.length} matching trainer${ranked.length > 1 ? 's' : ''}: ${ranked.map((t) => t.trainerName).join(', ')}`
        : `🔕 Notification Not Sent: ${noEligibleTrainerReason}`,
      status: String(rawData.status || 'booked').toLowerCase()
    };
    if (!enrichedPayload.phone) return res.status(400).json({ error: 'Candidate phone number is required' });

    // Group demo session: if another student already has an active meeting in this trainer's slot, share it!
    if (primary?.trainerId && preferredDate && demoSlot) {
      try {
        const existingSession = await Demo.findOne({
          trainerId: primary.trainerId,
          preferredDate,
          timeSlot: demoSlot,
          zoomMeetingId: { $exists: true, $ne: '' }
        }).select('zoomMeetingId link zoomHostEmail');
        if (existingSession?.zoomMeetingId) {
          enrichedPayload.zoomMeetingId = existingSession.zoomMeetingId;
          enrichedPayload.link = existingSession.link;
          enrichedPayload.zoomHostEmail = existingSession.zoomHostEmail;
        }
      } catch (_) {}
    }

    const newDemo = new Demo(enrichedPayload);
    await newDemo.save();

    // Booking a demo moves the candidate's lead to "Demo Booked"
    try {
      const lead = await findLeadByContact({ leadId: rawData.leadId, email: newDemo.email, phone: newDemo.phone }, { $in: ['new', 'contacted'] });
      if (lead) {
        if (!newDemo.bookedBy && (lead.counselorAssigned || lead.allocatedTo)) {
          newDemo.bookedBy = lead.counselorAssigned || lead.allocatedTo;
          newDemo.counselor = newDemo.bookedBy;
        }
        if (!newDemo.branch && lead.branch) {
          newDemo.branch = lead.branch;
        }
        if (['new', 'contacted'].includes(lead.stage)) {
          lead.stage = 'demo_booked';
          lead.demoBookedDate = newDemo.preferredDate || '';
          await lead.save();
        }
        await newDemo.save();
      }
    } catch (e) { console.warn('demo → lead stage sync failed:', e.message); }

    res.status(201).json(newDemo);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: `That trainer has reached maximum group capacity (${DEMO_GROUP_CAPACITY} students) at this date and time slot.` });
    }
    res.status(400).json({ error: err.message });
  }
});

// When a demo is marked Attended, move the matching lead to the "Demo Attended" pipeline stage
async function advanceLeadAfterDemo(demo) {
  const email = String(demo.email || '').trim().toLowerCase();
  const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);
  const early = { $in: ['new', 'contacted', 'demo_booked'] };
  let lead = email ? await StudentLead.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), stage: early }) : null;
  if (!lead && digits(demo.phone).length === 10) {
    const candidates = await StudentLead.find({ stage: early });
    lead = candidates.find(l => digits(l.phone) === digits(demo.phone)) || null;
  }
  if (lead) {
    lead.stage = 'demo_attended';
    await lead.save();
  }
  return lead;
}

// Before a demo is CONFIRMED, make sure its trainer hasn't exceeded the group
// demo capacity (up to DEMO_GROUP_CAPACITY students taken together at the same time).
async function assertTrainerFreeToConfirm({ trainerId, preferredDate, timeSlot, excludeId }) {
  if (!trainerId || !preferredDate || !timeSlot) return;
  const clashQuery = { trainerId, preferredDate, status: 'confirmed' };
  if (excludeId) clashQuery._id = { $ne: excludeId };
  const sameDay = await Demo.find(clashQuery).select('timeSlot candidateName');
  const overlapping = sameDay.filter((d) => slotsOverlap(d.timeSlot, timeSlot));
  if (overlapping.length >= DEMO_GROUP_CAPACITY) {
    const err = new Error(`Trainer already has ${overlapping.length} confirmed demo students (maximum group capacity of ${DEMO_GROUP_CAPACITY}) at ${timeSlot} on ${preferredDate}.`);
    err.statusCode = 409;
    throw err;
  }
}

// Tell the HR who booked the demo what the trainer did with it
async function notifyHrOfDemo(demo, what) {
  const labels = {
    confirmed: 'accepted the demo slot',
    attended: 'completed the demo — lead moved to Demo Attended',
    missed: 'marked the candidate as a no-show — please reschedule'
  };
  if (!labels[what]) return;
  await pushNotification({
    audience: 'hr', recipientName: demo.bookedBy || '', type: 'demo',
    title: `Demo ${what}: ${demo.candidateName}`,
    message: `${demo.trainer || 'Trainer'} ${labels[what]} (${demo.course} · ${demo.preferredDate} ${demo.timeSlot}).`,
    demoId: String(demo._id), createdBy: demo.trainer || ''
  });
}

router.put('/demos/:id', async (req, res) => {
  try {
    const existing = await Demo.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Demo not found' });
    if (!ownsDemo(req, existing)) return res.status(403).json(NOT_YOURS);

    if (req.body && req.body.status) req.body.status = String(req.body.status).toLowerCase();
    const { updatedBy, ...demoUpdate } = req.body || {};
    req.body = demoUpdate;
    const willConfirm = String(req.body?.status || '').toLowerCase() === 'confirmed';
    if (willConfirm) {
      await assertTrainerFreeToConfirm({
        trainerId: req.body.trainerId || existing.trainerId,
        preferredDate: req.body.preferredDate || existing.preferredDate,
        timeSlot: req.body.timeSlot || existing.timeSlot,
        excludeId: existing._id
      });
    }

    const updated = await Demo.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Demo not found' });
    if (String(updated.status || '').toLowerCase() === 'attended') {
      try { await advanceLeadAfterDemo(updated); } catch (e) { console.warn('advanceLeadAfterDemo failed:', e.message); }
    }
    // Only outcomes set from the trainer desk notify HR (HR's own clicks don't notify themselves)
    if (updatedBy === 'trainer' && req.body.status) await notifyHrOfDemo(updated, req.body.status);
    res.json(updated);
  } catch (err) {
    if (err.code === 11000 || err.statusCode === 409) {
      return res.status(409).json({ error: err.message || 'That trainer is already confirmed for another demo at this exact slot.' });
    }
    res.status(400).json({ error: err.message });
  }
});

router.put('/demos/:id/acknowledge', async (req, res) => {
  try {
    const existing = await Demo.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Demo not found' });
    await assertTrainerFreeToConfirm({
      trainerId: req.body?.trainerId || existing.trainerId,
      preferredDate: existing.preferredDate,
      timeSlot: existing.timeSlot,
      excludeId: existing._id
    });

    const updated = await Demo.findByIdAndUpdate(
      req.params.id,
      { $set: { notificationRead: true, status: 'confirmed', acknowledgedAt: new Date(), ...(req.body?.trainerId ? { trainerId: req.body.trainerId, trainer: req.body.trainerName || existing.trainer } : {}) } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Demo not found' });
    await notifyHrOfDemo(updated, 'confirmed');
    res.json(updated);
  } catch (err) {
    if (err.code === 11000 || err.statusCode === 409) {
      return res.status(409).json({ error: err.message || 'That trainer is already confirmed for another demo at this exact slot.' });
    }
    res.status(400).json({ error: err.message });
  }
});

router.delete('/demos/:id', async (req, res) => {
  try {
    await Demo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Demo deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// REAL FEES & COURSE RATES API
// ==========================================
router.get('/fees/rates', async (req, res) => {
  try {
    let rates = await CourseFeeRate.find().sort({ createdAt: 1 });
    if (!rates || rates.length === 0) {
      await CourseFeeRate.insertMany(DEFAULT_COURSE_FEE_RATES);
      rates = await CourseFeeRate.find().sort({ createdAt: 1 });
    } else {
      const existingCodes = new Set(rates.map(r => (r.code || '').toUpperCase()));
      const missing = DEFAULT_COURSE_FEE_RATES.filter(r => !existingCodes.has(r.code.toUpperCase()));
      if (missing.length > 0) {
        await CourseFeeRate.insertMany(missing);
      }
      // Ensure existing rates have up-to-date master fee sheet values
      for (const def of DEFAULT_COURSE_FEE_RATES) {
        const existing = rates.find(r => (r.code || '').toUpperCase() === def.code.toUpperCase());
        if (existing) {
          await CourseFeeRate.updateOne(
            { _id: existing._id },
            { 
              $set: { 
                category: def.category || existing.category,
                oldFee: def.oldFee || existing.oldFee || 0,
                newFeeNoDiscount: def.newFeeNoDiscount || existing.newFeeNoDiscount || 0,
                examFeeText: def.examFeeText,
                examFee: def.examFee || 0,
                duration: def.duration || existing.duration,
                courseFee: def.courseFee || existing.courseFee,
                standardFee: def.standardFee || existing.standardFee,
                originalFee: def.originalFee || existing.originalFee,
                totalPayable: def.totalPayable || existing.totalPayable
              } 
            }
          );
        }
      }
      rates = await CourseFeeRate.find().sort({ createdAt: 1 });
    }
    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/fees/rates', async (req, res) => {
  try {
    const { code } = req.body;
    const existing = await CourseFeeRate.findOne({ code: code.toUpperCase() });
    if (existing) {
      const updated = await CourseFeeRate.findOneAndUpdate(
        { code: code.toUpperCase() },
        { $set: req.body },
        { new: true }
      );
      return res.json(updated);
    }
    const newRate = new CourseFeeRate({
      ...req.body,
      code: code.toUpperCase()
    });
    await newRate.save();
    res.status(201).json(newRate);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Department Portals Authentication
const DEPARTMENT_PORTALS = {
  hr: {
    id: 'hr',
    code: 'HR',
    name: 'HR & Talent Acquisition',
    title: 'HR Department Portal',
    defaultEmail: 'hr@thoughtflows.in',
    role: 'HR & Academic Counselling Lead',
    userName: 'HR Department Desk',
    branch: '',
    color: '#ef4444',
    description: 'Academic counsellors, lead capture, calls, follow-ups & admissions'
  },
  training: {
    id: 'training',
    code: 'ACAD',
    name: 'Training & Faculty Department',
    title: 'Training Department Portal',
    defaultEmail: 'training@thoughtflows.in',
    role: 'Faculty Lead & Chief Trainer',
    userName: 'Training Department Desk',
    branch: '',
    color: '#0284c7',
    description: '12-branch trainer coordination, batches, daily attendance & mastery tracking'
  },
  cccp: {
    id: 'cccp',
    code: 'CCCP',
    name: 'Corporate Career & Placement Cell (CCCP)',
    title: 'CCCP 3-Cell Portal',
    defaultEmail: 'cccp@thoughtflows.in',
    role: 'Placements & Corporate Relations Head',
    userName: 'CCCP Desk',
    branch: '',
    color: '#059669',
    description: 'Placement Cell · Examination Cell · College & Company Cell'
  },
  marketing: {
    id: 'marketing',
    code: 'MKT',
    name: 'Growth & Digital Marketing',
    title: 'Marketing Department Portal',
    defaultEmail: 'marketing@thoughtflows.in',
    role: 'Head of Growth & Lead Generation',
    userName: 'Marketing Department Desk',
    branch: '',
    color: '#9333ea',
    description: 'Digital campaigns, Meta/Google ads, outdoor billboards & lead conversion'
  },
  leadership: {
    id: 'leadership',
    code: 'LEAD',
    name: 'Leadership & Regional Operations Hub',
    title: 'Leadership Hub Portal',
    defaultEmail: 'leadership@thoughtflows.in',
    role: 'Regional Operations & Branch Director',
    userName: 'Leadership Desk',
    branch: '',
    color: '#ea580c',
    description: 'Operational, Department, Regional & Branch heads oversight'
  },
  student: {
    id: 'student',
    code: 'STU',
    name: 'Student Learning & Exam Portal',
    title: 'Student Portal Login',
    defaultEmail: 'student@thoughtflows.in',
    role: 'AAPC CPC Scholar (Student)',
    userName: 'Student Portal',
    branch: '',
    color: '#0d9488',
    description: 'Syllabus, attendance tracking, mock exam bookings & campus placements'
  },
  admin: {
    id: 'admin',
    code: 'ADM',
    name: 'Admin & Executive Management',
    title: 'Admin Command Bridge',
    defaultEmail: 'admin@thoughtflows.in',
    role: 'Executive Managing Director (Founder)',
    userName: 'Admin Desk',
    branch: '',
    color: '#4338ca',
    description: 'Founders command bridge, back-office operations, strategy & administration'
  }
};

// Registered Academy Trainer Account (Srithar S)
const TRAINER_ACCOUNTS = {
  'srithar.brandforge@gmail.com': {
    id: 'TR-CBG-001',
    trainerId: 'TR-CBG-001',
    name: 'Srithar S',
    userName: 'Srithar S',
    email: 'srithar.brandforge@gmail.com',
    department: 'training',
    departmentCode: 'ACAD',
    departmentName: 'Training & Faculty Department',
    role: 'Trainer',
    courseKey: 'CPC',
    course: 'CPC — Certified Professional Coder',
    expertCourse: 'CPC — Certified Professional Coder',
    specialization: 'Medical Coding Faculty',
    branch: 'Gandhipuram',
    shift: '6:00 AM – 2:00 PM',
    shiftStartMin: 360,
    shiftEndMin: 840,
    color: '#00897b'
  }
};

// ==========================================
// DEVELOPMENT ONLY — quick login for developers.


// Short-lived token for file links (downloads, audio, previews)
router.post('/auth/file-token', (req, res) => {
  res.json({ token: signFileToken(req.user), expiresInSeconds: 15 * 60 });
});

router.get('/auth/departments', (req, res) => {
  res.json(DEPARTMENT_PORTALS);
});

router.get('/auth/trainers', (req, res) => {
  res.json(Object.values(TRAINER_ACCOUNTS));
});

const mapRoleOrDeptToDashboard = (role = '', department = '') => {
  const r = (role || '').toLowerCase();
  const d = (department || '').toLowerCase();

  if (r.includes('trainer') || r.includes('faculty') || d.includes('faculty') || d.includes('training')) {
    return {
      department: 'training',
      departmentCode: 'ACAD',
      departmentName: 'Training & Faculty Department',
      color: '#0284c7'
    };
  }
  if (r.includes('admin') || d.includes('admin')) {
    return {
      department: 'admin',
      departmentCode: 'ADM',
      departmentName: 'Admin & Management',
      color: '#4338ca'
    };
  }
  if (r.includes('counsel') || r.includes('advisor') || d.includes('counsel') || d.includes('admission') || d === 'hr') {
    return {
      department: 'hr',
      departmentCode: 'HR',
      departmentName: 'HR & Counseling',
      color: '#ea580c'
    };
  }
  if (r.includes('placement') || d.includes('placement') || d.includes('cccp')) {
    return {
      department: 'cccp',
      departmentCode: 'CCCP',
      departmentName: 'Corporate Career & Placement Cell (CCCP)',
      color: '#059669'
    };
  }
  if (r.includes('growth') || r.includes('marketing') || d.includes('marketing')) {
    return {
      department: 'marketing',
      departmentCode: 'MKT',
      departmentName: 'Growth & Digital Marketing',
      color: '#9333ea'
    };
  }
  if (r.includes('regional') || r.includes('operations') || r.includes('leadership') || d.includes('leadership')) {
    return {
      department: 'leadership',
      departmentCode: 'LEAD',
      departmentName: 'Leadership & Regional Operations Hub',
      color: '#ea580c'
    };
  }
  if (r.includes('student') || r.includes('scholar') || d.includes('student')) {
    return {
      department: 'student',
      departmentCode: 'STU',
      departmentName: 'Student Learning & Exam Portal',
      color: '#0d9488'
    };
  }
  return {
    department: 'training',
    departmentCode: 'ACAD',
    departmentName: 'Training Department',
    color: '#0284c7'
  };
};

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const deny = (message = 'Invalid email or password.') => res.status(401).json({ success: false, message });
  const grant = (user, message) => res.json({ success: true, message, user: { ...user, token: signToken(user) } });

  // Attach the signed-in trainer's roster record (Trainer collection) so the
  // trainer dashboard runs on real shift / course / branch data
  const trainerRosterFields = async (emailStr, nameStr, idStr) => {
    try {
      const or = [{ email: emailStr }, { zoomEmail: emailStr }];
      if (idStr) or.push({ trainerId: idStr });
      if (nameStr) or.push({ trainerName: new RegExp(`^${String(nameStr).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      const t = await Trainer.findOne({ $or: or });
      if (!t) return {};
      return {
        id: t.trainerId,
        trainerId: t.trainerId,
        courseKey: t.courseKey || undefined,
        expertCourse: t.expertCourse || undefined,
        specialization: t.specialization || undefined,
        branch: t.branchName || undefined,
        shift: t.shift || undefined,
        shiftStartMin: t.shiftStartMin,
        shiftEndMin: t.shiftEndMin
      };
    } catch (_) {
      return {};
    }
  };
  const dropUndefined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

  try {
    // 0. Built-in trainer accounts — password comes from the server environment
    const trainerUser = TRAINER_ACCOUNTS[normalizedEmail];
    const trainerEnvKey = trainerUser ? `TRAINER_${String(trainerUser.trainerId).replace(/\W/g, '_').toUpperCase()}_PASSWORD` : '';
    if (trainerUser && process.env[trainerEnvKey]) {
      if (!(await checkPassword(password, process.env[trainerEnvKey])).ok) return deny();
      const roster = dropUndefined(await trainerRosterFields(normalizedEmail, trainerUser.name, trainerUser.trainerId));
      return grant({ ...trainerUser, ...roster, department: 'training' }, `Welcome ${trainerUser.name}`);
    }

    // 1. Accounts created by Admin / at admission (User collection)
    const dbUser = await User.findOne({ email: normalizedEmail });
    if (dbUser) {
      if (dbUser.status && /inactive|disabled|suspended/i.test(dbUser.status)) return deny('This account is disabled. Contact your admin.');
      const { ok } = await checkPassword(password, dbUser.password);
      if (!ok) return deny();
      dbUser.lastLogin = new Date().toLocaleString('en-IN');
      await dbUser.save().catch(() => {});

      const mapping = mapRoleOrDeptToDashboard(dbUser.role, dbUser.department);
      const rosterFields = mapping.department === 'training' ? dropUndefined(await trainerRosterFields(normalizedEmail, dbUser.name)) : {};
      let studentId;
      if (mapping.department === 'student') {
        const st = await Student.findOne({ email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i') }).select('studentId');
        studentId = st?.studentId;
      }
      return grant({
        id: dbUser._id.toString(),
        name: dbUser.name,
        userName: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone || '',
        role: dbUser.role,
        branch: dbUser.branch || '',
        status: dbUser.status || 'Active',
        department: mapping.department,
        departmentCode: mapping.departmentCode,
        departmentName: mapping.departmentName,
        color: mapping.color,
        ...rosterFields,
        ...(studentId ? { studentId } : {})
      }, `Welcome ${dbUser.name}`);
    }

    // 2. Built-in department portal accounts (incl. Admin) — enabled only when
    //    their password is set in the server environment
    const deptKey = normalizedEmail === 'admin'
      ? 'admin'
      : Object.keys(DEPARTMENT_PORTALS).find((k) => DEPARTMENT_PORTALS[k].defaultEmail.toLowerCase() === normalizedEmail);
    if (deptKey && deptKey !== 'student') {
      const dept = DEPARTMENT_PORTALS[deptKey];
      const envKey = deptKey === 'admin' ? 'ADMIN_PASSWORD' : `${deptKey.toUpperCase()}_PORTAL_PASSWORD`;
      if (!process.env[envKey]) return deny(`This built-in account is disabled. Ask the administrator to set ${envKey}.`);
      if (!(await checkPassword(password, process.env[envKey])).ok) return deny();
      return grant({
        id: `usr_${dept.id}`,
        name: dept.userName,
        userName: dept.userName,
        email: dept.defaultEmail,
        department: dept.id,
        departmentCode: dept.code,
        departmentName: dept.name,
        role: deptKey === 'admin' ? 'Super Admin' : dept.role,
        branch: dept.branch,
        color: dept.color
      }, `Welcome ${dept.userName}`);
    }
  } catch (e) {
    console.error('Login error:', e.message);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }

  return deny('Access denied. This account is not registered in ThoughtFlows ERP.');
});

// ==========================================
// REAL ADMIN & MANAGEMENT API
// ==========================================
router.get('/admin/slabs', async (req, res) => {
  try {
    let slabs = await IncentiveSlab.find().sort({ min: 1 });
    res.json(slabs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/admin/slabs', async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      for (const item of req.body) {
        if (item._id || item.slab) {
          await IncentiveSlab.findOneAndUpdate(
            item._id ? { _id: item._id } : { slab: item.slab },
            { $set: item },
            { upsert: true, new: true }
          );
        }
      }
    }
    const updatedSlabs = await IncentiveSlab.find().sort({ min: 1 });
    res.json({ success: true, slabs: updatedSlabs });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/admin/audit-logs', async (req, res) => {
  try {
    let logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/audit-logs', async (req, res) => {
  try {
    // Who and where come from the request itself, never from the browser
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const { id, _id, timestamp, ip, ...body } = req.body || {};
    const log = new AuditLog({
      ...body,
      user: req.user?.name || body.user || 'Unknown',
      ip: forwarded || req.ip || ''
    });
    await log.save();
    res.status(201).json(log);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/admin/users', async (req, res) => {
  try {
    let users = await User.find().sort({ createdAt: -1 });
    const formatted = users.map(u => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      password: u.password || '',
      phone: u.phone || '',
      hasPassword: Boolean(u.password),
      role: u.role,
      department: u.department,
      branch: u.branch,
      status: u.status || 'Active',
      lastLogin: u.lastLogin || 'Never',
      avatarBg: u.avatarBg || 'bg-indigo-600'
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/users', async (req, res) => {
  try {
    const { name, email, phone, password, role, department, branch, status, avatarBg } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || String(password).trim().length === 0) {
      return res.status(400).json({ error: 'Password is required' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    const user = new User({
      name: name || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: phone || '',
      password: String(password).trim(),
      role: role || 'Staff',
      department: department || 'Medical Coding Faculty',
      branch: branch || '',
      status: status || 'Active',
      lastLogin: 'Never',
      avatarBg: avatarBg || 'bg-indigo-600'
    });
    await user.save();
    res.status(201).json({
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone || '',
      role: user.role,
      department: user.department,
      branch: user.branch,
      status: user.status,
      lastLogin: user.lastLogin,
      avatarBg: user.avatarBg
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };
    delete update._id;
    if ('password' in update) {
      if (!update.password || String(update.password).trim().length === 0) return res.status(400).json({ error: 'Password cannot be empty' });
      update.password = String(update.password).trim();
    }
    let user;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findByIdAndUpdate(id, update, { new: true });
    } else {
      user = await User.findOneAndUpdate({ email: req.body.email }, update, { new: true });
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone || '',
      role: user.role,
      department: user.department,
      branch: user.branch,
      status: user.status,
      lastLogin: user.lastLogin,
      avatarBg: user.avatarBg
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await User.findByIdAndDelete(id);
    } else if (req.query.email) {
      await User.findOneAndDelete({ email: req.query.email });
    }
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// REAL TRAINER & FACULTY API (MONGODB BACKED)
// ==========================================
const studentKeyOf = (s) => (s?.studentId ? String(s.studentId) : String(s?._id || ''));
const escapeRegex = (v = '') => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findStudentByAnyId = async (id) => {
  const isObjectId = mongoose.isValidObjectId(id);
  return Student.findOne({ $or: [...(isObjectId ? [{ _id: id }] : []), { studentId: id }] });
};

// Single place every cross-department notification is written from
async function pushNotification(payload) {
  try {
    return await Notification.create(payload);
  } catch (e) {
    console.warn('pushNotification failed:', e.message);
    return null;
  }
}

// Student Portal bell: one student (by studentId) or every student of a batch
async function notifyStudent(studentId, payload) {
  if (!studentId) return null;
  return pushNotification({ audience: 'student', ...payload, recipientId: String(studentId), studentId: String(studentId) });
}
async function notifyBatch(batch, payload) {
  if (!batch) return null;
  return pushNotification({ audience: 'student', ...payload, recipientId: '', recipientName: '', batch: String(batch) });
}

// Readiness = average of test, mock and technical scores — only once all three
// exist, so one early test can't make a student look placement-ready
function computeReadiness(st) {
  const parts = [st.mockScore, st.technicalScore, st.assessmentScore];
  if (!parts.every((v) => typeof v === 'number')) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

// Doubt SLA: 24h normal. Unreplied past SLA → Overdue.
const DOUBT_SLA_HOURS = 24;
function formatDoubt(d) {
  const created = d.createdAt ? new Date(d.createdAt) : new Date();
  const ageH = (Date.now() - created.getTime()) / 36e5;
  let status = d.status || 'New';
  if (status !== 'Replied' && ageH > DOUBT_SLA_HOURS) status = 'Overdue';
  const left = Math.max(0, Math.round(DOUBT_SLA_HOURS - ageH));
  const timeText = ageH < 1 ? `${Math.max(1, Math.round(ageH * 60))} min ago` : ageH < 48 ? `${Math.round(ageH)}h ago` : `${Math.round(ageH / 24)}d ago`;
  return {
    id: d._id.toString(),
    _id: d._id.toString(),
    student: d.student,
    studentName: d.student,
    studentId: d.studentId,
    topic: d.topic,
    course: d.course,
    question: d.question,
    batch: d.batch,
    trainerId: d.trainerId,
    trainerName: d.trainerName,
    status,
    reply: d.reply,
    repliedAt: d.repliedAt,
    createdAt: d.createdAt,
    timeText,
    slaBadge: status === 'Replied' ? 'Resolved' : status === 'Overdue' ? `SLA breached · ${DOUBT_SLA_HOURS}h` : `SLA · ${left}h left`
  };
}

// Trainer profile — the Trainer roster record attached to the signed-in user
router.get('/trainer/me', async (req, res) => {
  try {
    const { trainerId, email, name } = req.query;
    const or = [];
    if (trainerId) or.push({ trainerId });
    if (email) {
      const e = String(email).trim().toLowerCase();
      or.push({ email: e }, { zoomEmail: e });
    }
    if (name) or.push({ trainerName: new RegExp(`^${escapeRegex(String(name).trim())}$`, 'i') });
    if (!or.length) return res.status(400).json({ error: 'trainerId, email or name is required' });
    const trainer = await Trainer.findOne({ $or: or });
    if (!trainer) return res.status(404).json({ error: 'No trainer roster record found for this account' });
    res.json(trainer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET Doubts (optionally only the ones routed to one trainer)
router.get('/trainer/doubts', async (req, res) => {
  try {
    const { trainerId, studentId } = req.query;
    const query = {};
    if (trainerId) query.trainerId = trainerId;
    if (studentId) query.studentId = studentId;
    const doubts = await TrainerDoubt.find(query).sort({ createdAt: -1 });
    res.json(doubts.map(formatDoubt));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST New Doubt — accepts the student portal's field names and routes the
// doubt to the student's allocated trainer (set by HR at handover)
router.post('/trainer/doubts', async (req, res) => {
  try {
    const b = req.body || {};
    const student = b.studentId ? await findStudentByAnyId(b.studentId) : null;
    let trainerId = b.trainerId || student?.trainerId || '';
    let trainerName = b.trainerName || student?.trainerName || '';
    if (!trainerId && b.trainer) {
      const t = await Trainer.findOne({ trainerName: new RegExp(`^${escapeRegex(b.trainer)}$`, 'i') });
      if (t) { trainerId = t.trainerId; trainerName = t.trainerName; }
    }
    const newDoubt = await TrainerDoubt.create({
      student: b.student || b.studentName || student?.name || 'Student',
      studentId: b.studentId || student?.studentId || '',
      topic: b.topic || b.chapter || b.subject || 'General',
      course: b.course || b.subject || student?.course || '',
      question: b.question,
      batch: b.batch || student?.batchName || student?.course || '',
      trainerId,
      trainerName,
      status: 'New',
      reply: ''
    });
    if (trainerId) {
      await pushNotification({
        audience: 'trainer', recipientId: trainerId, recipientName: trainerName, type: 'doubt',
        title: `New doubt from ${newDoubt.student}`, message: newDoubt.question, studentId: newDoubt.studentId
      });
    }
    res.status(201).json(formatDoubt(newDoubt));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT Reply to Doubt
router.put('/trainer/doubts/:id/reply', async (req, res) => {
  try {
    const { reply, trainerId, trainerName } = req.body || {};
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid doubt id' });
    const setFields = { reply, status: 'Replied', repliedAt: new Date() };
    const tId = trainerId || req.user?.trainerId || req.user?.id;
    const tName = trainerName || req.user?.name;
    if (tId) setFields.trainerId = tId;
    if (tName) setFields.trainerName = tName;
    const updated = await TrainerDoubt.findByIdAndUpdate(
      req.params.id,
      { $set: setFields },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Doubt not found' });
    await notifyStudent(updated.studentId, {
      type: 'doubt', title: `${updated.trainerName || 'Your trainer'} replied to your doubt`,
      message: `${updated.topic ? `${updated.topic}: ` : ''}${String(reply || '').slice(0, 200)}`, createdBy: updated.trainerName || ''
    });
    res.json(formatDoubt(updated));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const formatAssessment = (t) => {
  const obj = t.toObject();
  return {
    ...obj,
    id: t._id.toString(),
    _id: t._id.toString(),
    scores: obj.scores instanceof Map ? Object.fromEntries(obj.scores) : (obj.scores || {})
  };
};

// Each student's assessmentScore = average % across every test they were scored in
async function recomputeAssessmentScores(studentKeys) {
  const keys = [...new Set(studentKeys.filter(Boolean))];
  if (!keys.length) return;
  const tests = await TrainerAssessment.find({ $or: keys.map((k) => ({ [`scores.${k}`]: { $exists: true } })) });
  for (const key of keys) {
    const pcts = [];
    tests.forEach((t) => {
      const v = t.scores?.get ? t.scores.get(key) : t.scores?.[key];
      if (typeof v === 'number' && t.totalMarks > 0) pcts.push((v / t.totalMarks) * 100);
    });
    if (!pcts.length) continue;
    const st = await findStudentByAnyId(key);
    if (!st) continue;
    st.assessmentScore = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    st.readinessScore = computeReadiness(st);
    await st.save();
  }
}

// GET Assessments
router.get('/trainer/assessments', async (req, res) => {
  try {
    const query = req.query.trainerId ? { trainerId: req.query.trainerId } : {};
    const list = await TrainerAssessment.find(query).sort({ createdAt: -1 });
    res.json(list.map(formatAssessment));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST Create Assessment
router.post('/trainer/assessments', async (req, res) => {
  try {
    const { id, _id, ...body } = req.body || {};
    const newTest = await TrainerAssessment.create({ status: 'Active', scores: {}, ...body });
    await notifyBatch(newTest.batch, {
      type: 'assessment', title: `New ${newTest.type || 'test'}: ${newTest.name}`,
      message: [newTest.topic, newTest.date && `on ${newTest.date}`, newTest.totalMarks && `${newTest.totalMarks} marks`].filter(Boolean).join(' · '),
      createdBy: newTest.trainerName || ''
    });
    res.status(201).json(formatAssessment(newTest));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT Update Assessment Scores → also refreshes each student's assessment average & readiness
router.put('/trainer/assessments/:id/scores', async (req, res) => {
  try {
    const item = await TrainerAssessment.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Assessment not found' });
    const currentScores = item.scores instanceof Map ? Object.fromEntries(item.scores) : (item.scores || {});
    const incoming = {};
    Object.entries(req.body.scores || {}).forEach(([k, v]) => {
      const n = Number(v);
      if (Number.isFinite(n)) incoming[k] = n;
    });
    item.scores = { ...currentScores, ...incoming };
    if (item.status === 'Active' && Object.keys(item.scores instanceof Map ? Object.fromEntries(item.scores) : item.scores).length) item.status = 'Scored';
    await item.save();
    await recomputeAssessmentScores(Object.keys(incoming));
    for (const key of Object.keys(incoming)) {
      const st = await findStudentByAnyId(key);
      if (st) {
        await notifyStudent(st.studentId, {
          type: 'score', title: `Score published: ${item.name}`,
          message: `You scored ${incoming[key]}/${item.totalMarks || '—'}.`, createdBy: item.trainerName || ''
        });
      }
    }
    res.json(formatAssessment(item));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT Update Assessment Rationale
router.put('/trainer/assessments/:id/rationale', async (req, res) => {
  try {
    const item = await TrainerAssessment.findByIdAndUpdate(
      req.params.id,
      { $set: { rationale: req.body.rationale } },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Assessment not found' });
    res.json(formatAssessment(item));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Recompute Student.attendancePct from every recorded class; notify HR when a
// student falls below 75% for the first time
const ATTENDANCE_RISK_PCT = 75;
async function recomputeAttendance(studentKeys) {
  for (const key of [...new Set(studentKeys.filter(Boolean))]) {
    const sessions = await ClassAttendance.find({ [`records.${key}`]: { $exists: true } }).select('records');
    if (!sessions.length) continue;
    let attended = 0;
    sessions.forEach((sess) => {
      const v = sess.records?.get ? sess.records.get(key) : sess.records?.[key];
      if (v === 'Present' || v === 'Late') attended += 1;
    });
    const pct = Math.round((attended / sessions.length) * 100);
    const st = await findStudentByAnyId(key);
    if (!st) continue;
    const prev = st.attendancePct;
    st.attendancePct = pct;
    await st.save();
    if (pct < ATTENDANCE_RISK_PCT && (typeof prev !== 'number' || prev >= ATTENDANCE_RISK_PCT)) {
      await pushNotification({
        audience: 'hr', recipientName: st.hrName || '', type: 'attendance',
        title: `Attendance alert: ${st.name}`,
        message: `${st.name} (${st.studentId}) dropped to ${pct}% attendance in ${st.trainerName || 'training'}'s class. Please follow up.`,
        studentId: st.studentId, createdBy: st.trainerName || ''
      });
      await notifyStudent(st.studentId, {
        type: 'attendance', title: `Your attendance is ${pct}%`,
        message: `Attendance below ${ATTENDANCE_RISK_PCT}% can hold back your certification and placement. Please attend the upcoming classes.`,
        createdBy: st.trainerName || ''
      });
    }
  }
}

// GET Attendance — filter by trainer / batch / date
router.get('/trainer/attendance', async (req, res) => {
  try {
    const { trainerId, batch, date, from } = req.query;
    const query = {};
    if (trainerId) query.trainerId = trainerId;
    if (batch) query.batch = batch;
    if (date) query.date = date;
    if (from) query.date = { $gte: from };
    const list = await ClassAttendance.find(query).sort({ date: -1 });
    res.json(list.map((a) => ({ ...a.toObject(), id: a._id.toString(), records: Object.fromEntries(a.records || []) })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST Record Attendance — merges marks into that day's class record
router.post('/trainer/attendance', async (req, res) => {
  try {
    const { trainerId = '', trainerName = '', batch, date, topic, records = {} } = req.body || {};
    if (!batch) return res.status(400).json({ error: 'batch is required' });
    const day = date || todayStr();
    const set = { trainerName };
    if (topic) set.topic = topic;
    Object.entries(records).forEach(([k, v]) => { set[`records.${k}`] = v; });
    const doc = await ClassAttendance.findOneAndUpdate(
      { trainerId, batch, date: day },
      { $set: set },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await recomputeAttendance(Object.keys(records));
    res.json({ success: true, data: { ...doc.toObject(), records: Object.fromEntries(doc.records || []) } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// HR → TRAINING HANDOVER  and  TRAINING → HR PROGRESS
// ==========================================
// Batches are keyed by their exact name everywhere (materials, tests, live
// classes, notifications), so "CPC · 7PM" and "cpc - 7 pm" must resolve to one.
const batchMatchKey = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
const tidyBatchName = (name = '') => String(name).replace(/\s+/g, ' ').trim();

async function canonicalBatchName(name, trainerId) {
  const clean = tidyBatchName(name);
  if (!clean) return '';
  const key = batchMatchKey(clean);
  const existing = await Student.distinct('batchName', trainerId ? { trainerId } : {});
  return existing.find((b) => b && batchMatchKey(b) === key) || clean;
}

// Existing batches (optionally one trainer's) with their student counts — the handover pick-list
router.get('/batches', async (req, res) => {
  try {
    const match = { batchName: { $nin: ['', null] } };
    if (req.query.trainerId) match.trainerId = String(req.query.trainerId);
    const rows = await Student.aggregate([
      { $match: match },
      { $group: { _id: { batch: '$batchName', trainerId: '$trainerId' }, trainerName: { $first: '$trainerName' }, course: { $first: '$course' }, students: { $sum: 1 } } },
      { $project: { _id: 0, batch: '$_id.batch', trainerId: '$_id.trainerId', trainerName: 1, course: 1, students: 1 } },
      { $sort: { batch: 1 } }
    ]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/students/:id/handover', async (req, res) => {
  try {
    const { trainerId, batchName = '', trainerNote = '', handedOverBy = '' } = req.body || {};
    if (!trainerId) return res.status(400).json({ error: 'Select a trainer to hand the student over to' });
    const trainer = await Trainer.findOne({ trainerId });
    if (!trainer) return res.status(404).json({ error: 'Trainer not found in the roster' });
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    if (!ownsStudent(req, st)) return res.status(403).json(NOT_YOURS);
    // First handover needs a complete checklist (a trainer note given here counts);
    // moving an already-handed-over student to another trainer does not.
    if (st.handoverStatus !== 'Sent to Training') {
      const cl = { ...(st.checklist?.toObject?.() || st.checklist || {}) };
      if (trainerNote) cl.trainerNote = true;
      const missing = Object.entries(cl).filter(([, v]) => v !== true).map(([k]) => k);
      if (missing.length) return res.status(400).json({ error: `Complete the handover checklist first — missing: ${missing.join(', ')}` });
    }
    const previousBatch = st.handedOverAt ? studentBatchOf(st) : '';
    st.trainerId = trainer.trainerId;
    st.trainerName = trainer.trainerName;
    st.batchName = await canonicalBatchName(batchName || st.batchName || `${st.course}${st.batchTiming ? ` · ${st.batchTiming}` : ''}`, trainer.trainerId);
    st.trainerNote = trainerNote;
    st.handoverStatus = 'Sent to Training';
    st.handedOverBy = handedOverBy;
    st.handedOverAt = new Date();
    if (st.checklist) st.checklist.trainerNote = Boolean(trainerNote) || st.checklist.trainerNote;
    await st.save();

    // Re-link any existing doubts, submissions or requests that had no trainer assigned
    await Promise.all([
      StudentSubmission.updateMany(
        { studentId: st.studentId, $or: [{ trainerId: '' }, { trainerId: { $exists: false } }] },
        { $set: { trainerId: trainer.trainerId, trainerName: trainer.trainerName } }
      ).catch(() => {}),
      TrainerDoubt.updateMany(
        { studentId: st.studentId, $or: [{ trainerId: '' }, { trainerId: { $exists: false } }] },
        { $set: { trainerId: trainer.trainerId, trainerName: trainer.trainerName } }
      ).catch(() => {}),
      StudentRequest.updateMany(
        { studentId: st.studentId, $or: [{ trainerId: '' }, { trainerId: { $exists: false } }] },
        { $set: { trainerId: trainer.trainerId, trainerName: trainer.trainerName } }
      ).catch(() => {})
    ]);

    await pushNotification({
      audience: 'trainer', recipientId: trainer.trainerId, recipientName: trainer.trainerName, type: 'handover',
      title: `New student allocated: ${st.name}`,
      message: `${handedOverBy || 'HR'} handed over ${st.name} (${st.studentId}) · ${st.course} · batch ${st.batchName}.${previousBatch && previousBatch !== st.batchName ? ` Moved from "${previousBatch}" — re-assign any materials they still need.` : ''}${trainerNote ? ` Note: ${trainerNote}` : ''}`,
      studentId: st.studentId, createdBy: handedOverBy
    });
    await notifyStudent(st.studentId, {
      type: 'handover', title: `Your trainer is ${trainer.trainerName}`,
      message: `You've been allocated to ${trainer.trainerName} · batch ${st.batchName}. Your classes, materials and tests will appear here.`,
      createdBy: handedOverBy
    });
    res.json(st);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/students/:id/syllabus-complete', async (req, res) => {
  try {
    const { trainerName = '' } = req.body || {};
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    st.syllabusCompleted = true;
    st.syllabusCompletedAt = new Date();
    st.placementStatus = 'Referred to CCCP';
    await st.save();
    await pushNotification({
      audience: 'hr', recipientName: st.hrName || '', type: 'syllabus',
      title: `Syllabus complete: ${st.name}`,
      message: `${trainerName || st.trainerName || 'Trainer'} marked the full syllabus complete for ${st.name} (${st.studentId}). Sent to CCCP for placement.`,
      studentId: st.studentId, createdBy: trainerName
    });
    await pushNotification({
      audience: 'cccp', type: 'syllabus',
      title: `New for placement: ${st.name}`,
      message: `${trainerName || st.trainerName || 'Trainer'} completed the syllabus for ${st.name} (${st.studentId}) · ${st.course}${typeof st.readinessScore === 'number' ? ` · readiness ${st.readinessScore}%` : ''}${st.trainerRecommendation ? ` · ${st.trainerRecommendation}` : ''}.`,
      studentId: st.studentId, createdBy: trainerName
    });
    await notifyStudent(st.studentId, {
      type: 'syllabus', title: 'Syllabus completed 🎉',
      message: 'Your trainer marked your syllabus complete. The placement (CCCP) team will contact you next.',
      createdBy: trainerName
    });
    res.json(st);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/students/:id/recommendation', async (req, res) => {
  try {
    const { status, trainerName = '', mockScore, technicalScore } = req.body || {};
    if (!['Ready', 'Needs Revision', 'Not Ready'].includes(status)) return res.status(400).json({ error: 'Invalid recommendation' });
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    if (mockScore !== undefined && mockScore !== '') st.mockScore = Number(mockScore);
    if (technicalScore !== undefined && technicalScore !== '') st.technicalScore = Number(technicalScore);
    st.readinessScore = computeReadiness(st);
    st.trainerRecommendation = status;
    st.trainerRecommendationAt = new Date();
    if (status === 'Ready') st.placementStatus = 'Referred to CCCP';
    await st.save();
    await pushNotification({
      audience: 'hr', recipientName: st.hrName || '', type: 'recommendation',
      title: `Trainer recommendation: ${st.name} → ${status}`,
      message: `${trainerName || st.trainerName || 'Trainer'} set ${st.name} as "${status}"${typeof st.readinessScore === 'number' ? ` · readiness ${st.readinessScore}%` : ''}.`,
      studentId: st.studentId, createdBy: trainerName
    });
    if (status === 'Ready') {
      await pushNotification({
        audience: 'cccp', type: 'recommendation',
        title: `Placement-ready: ${st.name}`,
        message: `${trainerName || st.trainerName || 'Trainer'} recommended ${st.name} (${st.studentId}) as Ready${typeof st.readinessScore === 'number' ? ` · readiness ${st.readinessScore}%` : ''}.`,
        studentId: st.studentId, createdBy: trainerName
      });
    }
    res.json(st);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/students/:id/remedial', async (req, res) => {
  try {
    const { action, note = '', trainerName = '' } = req.body || {};
    if (!action) return res.status(400).json({ error: 'action is required' });
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    st.remedialActions.push({ action, note, by: trainerName, at: new Date() });
    await st.save();
    // Every remedial step is visible to the student's HR; escalations are flagged
    await pushNotification({
      audience: 'hr', recipientName: st.hrName || '', type: action === 'escalate' ? 'escalation' : 'remedial',
      title: action === 'escalate' ? `Counselling needed: ${st.name}` : `Remedial plan started: ${st.name}`,
      message: `${trainerName || 'Trainer'}: ${note || action}`,
      studentId: st.studentId, createdBy: trainerName
    });
    res.json(st);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// NOTIFICATIONS (HR ⇄ TRAINING)
// ==========================================
// Shared notifications (no single recipient) track read state per reader
const readerKey = (req) => String(req.user?.sub || req.user?.email || req.user?.name || '').toLowerCase();
const isSharedNotification = (n) => !n.recipientId && !n.recipientName;
const withReadState = (n, key) => {
  const o = n.toObject ? n.toObject() : { ...n };
  if (isSharedNotification(o)) o.read = (o.readBy || []).includes(key);
  delete o.readBy;
  return o;
};

router.get('/notifications', async (req, res) => {
  try {
    const isStudent = req.user?.department === 'student';
    const { recipientId, recipientName, limit = 50 } = req.query;
    const audience = isStudent ? 'student' : req.query.audience;
    if (!audience) return res.status(400).json({ error: 'audience is required' });
    let who;
    if (audience === 'student') {
      let sid = isStudent ? (req.user?.studentId || '') : String(recipientId || '');
      if (!sid && isStudent) {
        sid = String(recipientId || '');
        if (!sid && req.user?.email) {
          const found = await Student.findOne({ email: new RegExp(`^${escapeRegex(String(req.user.email).trim())}$`, 'i') }).select('studentId');
          if (found?.studentId) sid = found.studentId;
        }
      }
      if (!sid) return res.status(400).json({ error: 'recipientId (studentId) is required' });
      const st = await findStudentByAnyId(sid);
      const batch = studentBatchOf(st);
      who = [{ recipientId: st?.studentId || sid }];
      if (batch) who.push({ recipientId: '', batch });
    } else {
      who = [{ recipientId: '', recipientName: '' }];
      if (recipientId) who.push({ recipientId });
      if (recipientName) who.push({ recipientName: new RegExp(`^${escapeRegex(String(recipientName).trim())}$`, 'i') });
    }
    const key = readerKey(req);
    const list = await Notification.find({ audience, $or: who }).sort({ createdAt: -1 }).limit(Number(limit) || 50);
    res.json(list.map((n) => withReadState(n, key)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function markNotificationsRead(ids, req) {
  const key = readerKey(req);
  const isStudent = req.user?.department === 'student';
  const docs = await Notification.find({ _id: { $in: ids } });
  const out = [];
  for (const d of docs) {
    if (isStudent && (d.audience !== 'student' || (d.recipientId && d.recipientId !== req.user.studentId))) continue;
    if (isSharedNotification(d)) {
      if (!d.readBy.includes(key)) d.readBy.push(key);
    } else {
      d.read = true;
    }
    await d.save();
    out.push(d);
  }
  return out;
}

// Leadership / Admin → a staff member's notification bell (Team Performance "Remind")
const AUDIENCE_BY_DEPT_CODE = { 'DEP-HR-001': 'hr', ACAD: 'trainer', CCCP: 'cccp' };
router.post('/notifications/remind', async (req, res) => {
  try {
    const { name, departmentCode, message } = req.body || {};
    const audience = AUDIENCE_BY_DEPT_CODE[departmentCode];
    if (!name || !String(message || '').trim()) return res.status(400).json({ error: 'Recipient and message are required' });
    if (!audience) return res.status(400).json({ error: 'This department has no notification inbox yet' });
    const created = await pushNotification({
      audience, recipientName: name, type: 'reminder',
      title: `Reminder from ${req.user?.name || 'Leadership'}`,
      message: String(message).trim().slice(0, 500),
      createdBy: req.user?.name || ''
    });
    if (!created) return res.status(500).json({ error: 'Could not send the reminder' });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/notifications/read-all', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((i) => mongoose.isValidObjectId(i)) : [];
    const updated = ids.length ? await markNotificationsRead(ids, req) : [];
    res.json({ success: true, updated: updated.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const [n] = await markNotificationsRead([req.params.id], req);
    if (!n) return res.status(404).json({ error: 'Notification not found' });
    res.json(withReadState(n, readerKey(req)));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// TRAINING LIBRARY & MATERIALS
// ==========================================
const MAX_MATERIAL_BYTES = 12 * 1024 * 1024;

router.get('/training/materials', async (req, res) => {
  try {
    const { batch } = req.query;
    const query = batch ? { 'assignments.batch': batch } : {};
    const list = await TrainingMaterial.find(query).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/training/materials', async (req, res) => {
  try {
    const { title, description, category, fileName, mimeType, data, uploadedBy, uploaderId, branch } = req.body || {};
    if (!data || !fileName) return res.status(400).json({ error: 'A file is required' });
    const base64 = String(data).includes(',') ? String(data).split(',').pop() : String(data);
    const size = Math.floor((base64.length * 3) / 4);
    if (size > MAX_MATERIAL_BYTES) return res.status(413).json({ error: 'File is larger than 12 MB' });
    const doc = await TrainingMaterial.create({
      title: title || fileName,
      description: description || '',
      category: category || 'General',
      fileName,
      fileFormat: (fileName.split('.').pop() || '').toUpperCase(),
      mimeType: mimeType || 'application/octet-stream',
      fileSize: size,
      data: base64,
      uploadedBy: uploadedBy || '',
      uploaderId: uploaderId || '',
      branch: branch || ''
    });
    const obj = doc.toObject();
    delete obj.data;
    res.status(201).json(obj);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/training/materials/:id/file', async (req, res) => {
  try {
    const doc = await TrainingMaterial.findById(req.params.id).select('+data');
    if (!doc || !doc.data) return res.status(404).json({ error: 'File not found' });
    // Students may only open material assigned to their own batch
    if (req.user?.department === 'student') {
      const st = await findStudentByAnyId(req.user.studentId || '');
      const batch = studentBatchOf(st);
      if (!batch || !(doc.assignments || []).some((a) => a.batch === batch)) return res.status(403).json({ error: 'This material is not assigned to your batch' });
    }
    const buf = Buffer.from(doc.data, 'base64');
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.fileName || 'file')}"`);
    res.send(buf);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/training/materials/:id/pin', async (req, res) => {
  try {
    const { trainerId, pinned } = req.body || {};
    if (!trainerId) return res.status(400).json({ error: 'trainerId is required' });
    const doc = await TrainingMaterial.findByIdAndUpdate(
      req.params.id,
      pinned ? { $addToSet: { pinnedBy: trainerId } } : { $pull: { pinnedBy: trainerId } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Material not found' });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/training/materials/:id/assign', async (req, res) => {
  try {
    const { batches = [], module = '', note = '', by = '' } = req.body || {};
    if (!batches.length) return res.status(400).json({ error: 'Select at least one batch' });
    const doc = await TrainingMaterial.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Material not found' });
    batches.forEach((batch) => {
      doc.assignments = doc.assignments.filter((a) => a.batch !== batch);
      doc.assignments.push({ batch, module, note, by, at: new Date() });
    });
    await doc.save();
    for (const batch of batches) {
      await notifyBatch(batch, {
        type: 'material', title: `New material: ${doc.title}`,
        message: [module && `Module: ${module}`, note].filter(Boolean).join(' · ') || 'Open My LMS to view it.',
        createdBy: by
      });
    }
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/training/materials/:id', async (req, res) => {
  try {
    await TrainingMaterial.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// REAL CCCP (CAMPUS, CORPORATE, PLACEMENT, BILLING, FOLLOW-UPS) API
// ==========================================
// 1. Colleges
router.get('/cccp/colleges', async (req, res) => {
  try {
    let colleges = await CollegePartner.find().sort({ createdAt: -1 });
    res.json(colleges.map(c => ({ id: c._id.toString(), _id: c._id.toString(), ...c.toObject() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/cccp/colleges', async (req, res) => {
  try {
    const college = new CollegePartner(req.body);
    await college.save();
    res.status(201).json({ id: college._id.toString(), _id: college._id.toString(), ...college.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/cccp/colleges/:id', async (req, res) => {
  try {
    const updated = await CollegePartner.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'College not found' });
    res.json({ id: updated._id.toString(), _id: updated._id.toString(), ...updated.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/cccp/colleges/:id', async (req, res) => {
  try {
    await CollegePartner.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'College removed' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 2. Corporate Companies
router.get('/cccp/companies', async (req, res) => {
  try {
    let companies = await CorporatePartner.find().sort({ createdAt: -1 });
    res.json(companies.map(c => ({ id: c._id.toString(), _id: c._id.toString(), ...c.toObject() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/cccp/companies', async (req, res) => {
  try {
    const company = new CorporatePartner(req.body);
    await company.save();
    res.status(201).json({ id: company._id.toString(), _id: company._id.toString(), ...company.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/cccp/companies/:id', async (req, res) => {
  try {
    const updated = await CorporatePartner.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Corporate partner not found' });
    res.json({ id: updated._id.toString(), _id: updated._id.toString(), ...updated.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/cccp/companies/:id', async (req, res) => {
  try {
    await CorporatePartner.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Company removed' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 3. Placements
// CCCP placement record status → student pipeline stage (same gates as the
// Student 360 popup). Returns a note when the student can't move yet.
const RECORD_STAGE = [[/join|placed/i, 7], [/select|offer/i, 6], [/interview/i, 5], [/mapped|company/i, 4]];
async function syncStageFromRecord(studentId, status) {
  const st = await findStudentByAnyId(studentId);
  if (!st) return '';
  const hit = RECORD_STAGE.find(([re]) => re.test(status || ''));
  if (!hit) return '';
  const target = hit[1];
  const current = effectiveStage(st);
  if (target <= current) return '';
  // A CCCP record carries the company / interview / offer itself, so the
  // steps in between are implied — only the Talentera gate applies here
  if (autoStage(st) < 3 && current < 4) return `Student stage not moved. ${blockReason(st, 4)}`;
  st.placementStage = target;
  await st.save();
  return '';
}

router.get('/cccp/placements', async (req, res) => {
  try {
    let placements = await PlacementRecord.find().sort({ createdAt: -1 });
    res.json(placements.map(p => ({ id: p._id.toString(), _id: p._id.toString(), ...p.toObject() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/cccp/placements', async (req, res) => {
  try {
    const record = new PlacementRecord(req.body);
    await record.save();
    const stageNote = req.body.studentId ? await syncStageFromRecord(req.body.studentId, record.status || 'Company Mapped') : '';
    res.status(201).json({ id: record._id.toString(), _id: record._id.toString(), ...record.toObject(), stageNote });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/cccp/placements/:id', async (req, res) => {
  try {
    const updated = await PlacementRecord.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Placement record not found' });
    const stageNote = updated.studentId ? await syncStageFromRecord(updated.studentId, updated.status || 'Interview Scheduled') : '';
    res.json({ id: updated._id.toString(), _id: updated._id.toString(), ...updated.toObject(), stageNote });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/cccp/placements/:id', async (req, res) => {
  try {
    await PlacementRecord.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 4. Billing Deals
router.get('/cccp/billing', async (req, res) => {
  try {
    let billing = await BillingDeal.find().sort({ createdAt: -1 });
    res.json(billing.map(b => ({ id: b._id.toString(), _id: b._id.toString(), ...b.toObject() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/cccp/billing', async (req, res) => {
  try {
    const deal = new BillingDeal(req.body);
    await deal.save();
    res.status(201).json({ id: deal._id.toString(), _id: deal._id.toString(), ...deal.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/cccp/billing/:id', async (req, res) => {
  try {
    const updated = await BillingDeal.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Billing deal not found' });
    res.json({ id: updated._id.toString(), _id: updated._id.toString(), ...updated.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/cccp/billing/:id', async (req, res) => {
  try {
    await BillingDeal.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 5. Follow-ups
router.get('/cccp/followups', async (req, res) => {
  try {
    let followups = await CccpFollowUp.find().sort({ date: 1 });
    res.json(followups.map(f => ({ id: f._id.toString(), _id: f._id.toString(), ...f.toObject() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/cccp/followups', async (req, res) => {
  try {
    const fu = new CccpFollowUp(req.body);
    await fu.save();
    res.status(201).json({ id: fu._id.toString(), _id: fu._id.toString(), ...fu.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// REAL MARKETING (CAMPAIGNS, CREATIVES, SOURCES) API
// ==========================================
// ==========================================
// MARKETING — campaigns, creatives, content calendar, branch lead demand
// and lead-source tracking. Lead / admission / revenue figures are always
// counted from StudentLead and Student; only spend & budget are typed in.
// ==========================================
const campaignView = (c, leads, revenueByLead) => {
  const o = typeof c.toObject === 'function' ? c.toObject() : c;
  const mine = leads.filter((l) => (l.campaignCode && l.campaignCode === o.code) || (!l.campaignCode && l.sourceName && l.sourceName === o.name));
  const admitted = mine.filter((l) => l.stage === 'admitted');
  const revenue = admitted.reduce((s, l) => s + (revenueByLead.get(String(l._id)) || 0), 0);
  const spent = Number(o.spent) || 0;
  const cpl = mine.length && spent ? Math.round(spent / mine.length) : null;
  return {
    id: String(o._id),
    _id: String(o._id),
    ...o,
    leads: mine.length,
    admissions: admitted.length,
    revenue,
    cpl,
    costPerAdmission: admitted.length && spent ? Math.round(spent / admitted.length) : null,
    roi: spent ? `${Math.round(((revenue - spent) / spent) * 100)}%` : null,
    overTargetCpl: Boolean(cpl && o.targetCpl && cpl > o.targetCpl)
  };
};

// Fees collected from each admitted lead (Student.leadId → paidAmount)
async function revenueByLeadId() {
  const students = await Student.find({ leadId: { $nin: ['', null] } }).select('leadId paidAmount').lean();
  return new Map(students.map((s) => [String(s.leadId), Number(s.paidAmount) || 0]));
}
const LEAD_FIELDS_FOR_MARKETING = 'campaignCode sourceName source stage phone branch course callCount createdAt';

router.get('/marketing/campaigns', async (req, res) => {
  try {
    const [campaigns, leads, revenue] = await Promise.all([
      MarketingCampaign.find().sort({ createdAt: -1 }),
      StudentLead.find().select(LEAD_FIELDS_FOR_MARKETING).lean(),
      revenueByLeadId()
    ]);
    res.json(campaigns.map((c) => campaignView(c, leads, revenue)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Only planning inputs are editable — results are computed
const CAMPAIGN_FIELDS = ['code', 'name', 'status', 'channel', 'branch', 'course', 'dailyBudget', 'spent', 'budget', 'targetCpl', 'ctr'];
const pickCampaign = (body = {}) => Object.fromEntries(Object.entries(body).filter(([k]) => CAMPAIGN_FIELDS.includes(k)));

router.post('/marketing/campaigns', async (req, res) => {
  try {
    const data = pickCampaign(req.body);
    if (!data.name) return res.status(400).json({ error: 'Campaign name is required' });
    if (!data.code) data.code = `CAM-TF-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    const campaign = await MarketingCampaign.create(data);
    res.status(201).json(campaignView(campaign, [], new Map()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/marketing/campaigns/:id', async (req, res) => {
  try {
    const updated = await MarketingCampaign.findByIdAndUpdate(req.params.id, { $set: pickCampaign(req.body) }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Campaign not found' });
    const [leads, revenue] = await Promise.all([StudentLead.find().select(LEAD_FIELDS_FOR_MARKETING).lean(), revenueByLeadId()]);
    res.json(campaignView(updated, leads, revenue));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/marketing/campaigns/:id', async (req, res) => {
  try {
    await MarketingCampaign.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/marketing/creatives', async (req, res) => {
  try {
    let creatives = await MarketingCreative.find().sort({ createdAt: -1 });
    res.json(creatives.map(c => ({ id: c._id.toString(), _id: c._id.toString(), ...c.toObject() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// A submitted creative goes to Leadership's Marketing approvals; the decision
// there updates the creative (see applyApprovalDecision)
router.post('/marketing/creatives', async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.code) payload.code = `CR-TF-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    if (!payload.author) payload.author = req.user?.name || '';
    payload.status = 'Submitted';
    const creative = new MarketingCreative(payload);
    await creative.save();
    try {
      await Approval.create({
        title: `${creative.format}: ${creative.title}`,
        description: [creative.campaignCode && `Campaign ${creative.campaignCode}`, creative.branch, creative.specs].filter(Boolean).join(' · '),
        kind: 'Creative Release',
        priority: ['low', 'medium', 'high'].includes(creative.priority) ? creative.priority : 'medium',
        departmentCode: 'MKT',
        branchName: creative.branch || 'All Branches',
        requestedBy: creative.author || 'Marketing Team',
        refType: 'creative',
        refId: String(creative._id)
      });
    } catch (appErr) {
      console.warn('Could not create leadership approval for creative:', appErr.message);
    }
    res.status(201).json({ id: creative._id.toString(), _id: creative._id.toString(), ...creative.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Marketing's own decision on a creative closes the matching Leadership approval
const APPROVAL_BY_CREATIVE_STATUS = { Approved: 'approved', 'Needs Correction': 'rejected', Submitted: 'pending' };
router.put('/marketing/creatives/:id', async (req, res) => {
  try {
    const updated = await MarketingCreative.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Creative not found' });
    const decision = APPROVAL_BY_CREATIVE_STATUS[updated.status];
    if (decision && req.body?.status) {
      await Approval.updateMany(
        { refType: 'creative', refId: String(updated._id) },
        decision === 'pending'
          ? { status: 'pending', decidedBy: '', decidedAt: null }
          : { status: decision, decidedBy: req.user?.name || '', decidedAt: new Date() }
      );
    }
    res.json({ id: updated._id.toString(), _id: updated._id.toString(), ...updated.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/marketing/creatives/:id', async (req, res) => {
  try {
    await MarketingCreative.findByIdAndDelete(req.params.id);
    await Approval.deleteMany({ refType: 'creative', refId: req.params.id, status: 'pending' });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Content calendar
const CONTENT_FIELDS = ['title', 'channel', 'category', 'dueDate', 'author', 'status', 'description', 'format', 'targetBranch', 'caption'];
const pickContent = (body = {}) => Object.fromEntries(Object.entries(body).filter(([k]) => CONTENT_FIELDS.includes(k)));

router.get('/marketing/content', async (req, res) => {
  try {
    res.json(await ContentPiece.find().sort({ dueDate: 1, createdAt: -1 }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/marketing/content', async (req, res) => {
  try {
    const data = pickContent(req.body);
    if (!data.title) return res.status(400).json({ error: 'Title is required' });
    const created = await ContentPiece.create({
      ...data,
      code: `CNT-TF-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
      author: data.author || req.user?.name || '',
      createdBy: req.user?.name || ''
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/marketing/content/:id', async (req, res) => {
  try {
    const updated = await ContentPiece.findByIdAndUpdate(req.params.id, { $set: pickContent(req.body) }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Content item not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/marketing/content/:id', async (req, res) => {
  try {
    await ContentPiece.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Branch lead demand — delivered = leads for that branch & course created
// since the request was raised
const DEMAND_FIELDS = ['branch', 'course', 'targetLeads', 'priority', 'requester', 'language', 'deadline', 'status', 'campaignCode', 'notes'];
const pickDemand = (body = {}) => Object.fromEntries(Object.entries(body).filter(([k]) => DEMAND_FIELDS.includes(k)));
const courseKeyOf = (v) => String(v || '').toLowerCase().split(/[\s—–-]/)[0];

async function demandViews(demands) {
  const [leads, branches] = await Promise.all([StudentLead.find().select('branch course createdAt campaignCode').lean(), branchList()]);
  return demands.map((d) => {
    const o = typeof d.toObject === 'function' ? d.toObject() : d;
    const target = matchBranch(o.branch, branches);
    const since = new Date(o.createdAt || 0);
    const delivered = leads.filter((l) => {
      if (new Date(l.createdAt) < since) return false;
      if (o.campaignCode && l.campaignCode === o.campaignCode) return true;
      const lb = matchBranch(l.branch, branches);
      const sameBranch = target ? lb && String(lb._id) === String(target._id) : String(l.branch || '').toLowerCase().includes(String(o.branch || '').toLowerCase());
      return sameBranch && (!o.course || courseKeyOf(l.course) === courseKeyOf(o.course));
    }).length;
    return { ...o, id: String(o._id), deliveredLeads: delivered, gap: Math.max(0, (o.targetLeads || 0) - delivered) };
  });
}

router.get('/marketing/demands', async (req, res) => {
  try {
    res.json(await demandViews(await BranchLeadDemand.find().sort({ createdAt: -1 })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/marketing/demands', async (req, res) => {
  try {
    const data = pickDemand(req.body);
    if (!data.branch || !(Number(data.targetLeads) > 0)) return res.status(400).json({ error: 'Branch and a target above 0 are required' });
    const created = await BranchLeadDemand.create({ ...data, requester: data.requester || req.user?.name || '' });
    res.status(201).json((await demandViews([created]))[0]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/marketing/demands/:id', async (req, res) => {
  try {
    const updated = await BranchLeadDemand.findByIdAndUpdate(req.params.id, { $set: pickDemand(req.body) }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Demand not found' });
    res.json((await demandViews([updated]))[0]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/marketing/demands/:id', async (req, res) => {
  try {
    await BranchLeadDemand.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Lead sources: volume, duplicates and funnel per source, from StudentLead.
// CPL is shown only where a campaign with recorded spend owns the leads.
router.get('/marketing/sources', async (req, res) => {
  try {
    const [leads, campaigns] = await Promise.all([
      StudentLead.find().select(LEAD_FIELDS_FOR_MARKETING).lean(),
      MarketingCampaign.find().select('code name spent').lean()
    ]);
    const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-10);
    const phoneCount = new Map();
    leads.forEach((l) => { const k = phoneKey(l.phone); if (k) phoneCount.set(k, (phoneCount.get(k) || 0) + 1); });

    const map = new Map();
    for (const l of leads) {
      const src = l.sourceName || l.source || 'Unspecified';
      if (!map.has(src)) map.set(src, { source: src, leads: 0, dup: 0, connected: 0, demos: 0, adm: 0, campaignCodes: new Set() });
      const row = map.get(src);
      row.leads += 1;
      if ((phoneCount.get(phoneKey(l.phone)) || 0) > 1) row.dup += 1;
      if (l.stage !== 'new' || (l.callCount || 0) > 0) row.connected += 1;
      if (funnelIdx(l.stage) >= funnelIdx('demo_booked')) row.demos += 1;
      if (l.stage === 'admitted') row.adm += 1;
      if (l.campaignCode) row.campaignCodes.add(l.campaignCode);
    }

    const rows = [...map.values()].map(({ campaignCodes, ...r }) => {
      const spend = campaigns
        .filter((c) => campaignCodes.has(c.code) || c.name === r.source)
        .reduce((s, c) => s + (Number(c.spent) || 0), 0);
      const admRate = r.leads ? r.adm / r.leads : 0;
      const demoRate = r.leads ? r.demos / r.leads : 0;
      const quality = r.leads < 5 ? 'Too few leads'
        : admRate >= 0.05 || demoRate >= 0.25 ? 'High Quality'
        : r.connected / r.leads >= 0.5 ? 'Medium Quality' : 'Low Quality';
      return {
        ...r,
        valid: r.leads - r.dup,
        dupHighlight: r.leads > 0 && r.dup / r.leads > 0.1,
        spend,
        cpl: spend && r.leads ? `₹${Math.round(spend / r.leads).toLocaleString('en-IN')}` : '—',
        quality,
        qualityClass: quality === 'High Quality' ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
          : quality === 'Medium Quality' ? 'bg-[#fffbeb] text-[#b45309] border border-[#fef3c7]'
          : quality === 'Low Quality' ? 'bg-[#fef2f2] text-[#dc2626] border border-[#fee2e2]'
          : 'bg-slate-100 text-slate-500 border border-slate-200'
      };
    }).sort((a, b) => b.leads - a.leads);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SHARED SETTINGS & SOP HUB
// ==========================================
// Org-wide settings read by several dashboards (e.g. Admin's incentive policy
// drives HR's target banner)
const SETTING_KEYS = ['incentive_policy'];
router.get('/settings/:key', async (req, res) => {
  try {
    if (!SETTING_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'Unknown setting' });
    const doc = await AppSetting.findOne({ key: req.params.key }).lean();
    res.json({ key: req.params.key, value: doc?.value ?? null, updatedBy: doc?.updatedBy || '', updatedAt: doc?.updatedAt || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/settings/:key', async (req, res) => {
  try {
    if (!SETTING_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'Unknown setting' });
    const doc = await AppSetting.findOneAndUpdate(
      { key: req.params.key },
      { $set: { value: req.body?.value ?? null, updatedBy: req.user?.name || '' } },
      { upsert: true, new: true }
    );
    res.json({ key: doc.key, value: doc.value, updatedBy: doc.updatedBy, updatedAt: doc.updatedAt });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const SOP_FIELDS = ['department', 'title', 'subtitle', 'category', 'content'];
const pickSop = (body = {}) => Object.fromEntries(Object.entries(body).filter(([k]) => SOP_FIELDS.includes(k)));

router.get('/sops', async (req, res) => {
  try {
    const query = req.query.department ? { department: new RegExp(`^${escapeRegex(req.query.department)}$`, 'i') } : {};
    res.json(await SopDocument.find(query).sort({ category: 1, title: 1 }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sops', async (req, res) => {
  try {
    const data = pickSop(req.body);
    if (!data.title) return res.status(400).json({ error: 'Title is required' });
    res.status(201).json(await SopDocument.create({ ...data, version: 1, updatedBy: req.user?.name || '' }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Every edit bumps the version
router.put('/sops/:id', async (req, res) => {
  try {
    const updated = await SopDocument.findByIdAndUpdate(
      req.params.id,
      { $set: { ...pickSop(req.body), updatedBy: req.user?.name || '' }, $inc: { version: 1 } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'SOP not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/sops/:id', async (req, res) => {
  try {
    await SopDocument.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Send an SOP to every staff member of its department (their notification bell)
router.post('/sops/:id/assign', async (req, res) => {
  try {
    const sop = await SopDocument.findById(req.params.id);
    if (!sop) return res.status(404).json({ error: 'SOP not found' });
    const audience = AUDIENCE_BY_DEPT_CODE[sop.department];
    if (!audience) return res.status(400).json({ error: 'This department has no notification inbox yet' });
    await pushNotification({
      audience, type: 'sop',
      title: `SOP: ${sop.title} (v${sop.version})`,
      message: `${sop.subtitle ? `${sop.subtitle} — ` : ''}${String(sop.content || '').replace(/\s+/g, ' ').slice(0, 400)}`,
      createdBy: req.user?.name || ''
    });
    res.json({ success: true, audience });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------------- Zoom (Meeting SDK signature + per-demo meetings) ----------------
function signZoom(meetingNumber, role = 0) {
  const { ZOOM_SDK_KEY, ZOOM_SDK_SECRET } = process.env;
  if (!ZOOM_SDK_KEY || !ZOOM_SDK_SECRET) throw new Error('ZOOM_SDK_KEY / ZOOM_SDK_SECRET not set on server');
  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const cleanMn = String(meetingNumber || '').replace(/\D/g, '');
  const mnVal = Number(cleanMn) || cleanMn;
  const signature = jwt.sign(
    { 
      appKey: ZOOM_SDK_KEY, 
      sdkKey: ZOOM_SDK_KEY, 
      mn: mnVal, 
      role: Number(role) || 0, 
      iat, 
      exp, 
      tokenExp: exp 
    },
    ZOOM_SDK_SECRET,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  );
  return { signature, appKey: ZOOM_SDK_KEY, sdkKey: ZOOM_SDK_KEY };
}

// Server-to-Server OAuth token (needed to create meetings / fetch host ZAK) — cached ~55 min
let zoomTokenCache = { token: '', exp: 0 };
async function zoomApiToken() {
  const { ZOOM_ACCOUNT_ID, ZOOM_S2S_CLIENT_ID, ZOOM_S2S_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_S2S_CLIENT_ID || !ZOOM_S2S_CLIENT_SECRET) {
    const err = new Error('Zoom API not configured: set ZOOM_ACCOUNT_ID, ZOOM_S2S_CLIENT_ID, ZOOM_S2S_CLIENT_SECRET in server/.env');
    err.status = 501;
    throw err;
  }
  if (zoomTokenCache.token && Date.now() < zoomTokenCache.exp) return zoomTokenCache.token;
  const basic = Buffer.from(`${ZOOM_S2S_CLIENT_ID}:${ZOOM_S2S_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}` }
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.reason || d.message || 'Zoom auth failed');
  zoomTokenCache = { token: d.access_token, exp: Date.now() + Math.max(60, (d.expires_in || 3600) - 300) * 1000 };
  return d.access_token;
}

async function zoomApi(path, { method = 'GET', body } = {}) {
  const token = await zoomApiToken();
  const r = await fetch(`https://api.zoom.us/v2${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = r.status === 204 ? {} : await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

const sharedZoomHost = () => String(process.env.ZOOM_HOST_EMAIL || '').trim().toLowerCase();

// Each trainer hosts on their OWN Zoom user (Trainer.zoomEmail). Zoom lets one
// user host only one live meeting at a time — a single shared host is what
// causes "Already has other meetings in progress" when two demos overlap.
async function trainerZoomHost(demo) {
  let t = null;
  if (demo.trainerId) t = await Trainer.findOne({ trainerId: demo.trainerId }).lean();
  if (!t?.zoomEmail && demo.trainer) t = await Trainer.findOne({ trainerName: demo.trainer }).lean();
  const host = String(t?.zoomEmail || sharedZoomHost()).trim().toLowerCase();
  if (!host) {
    const err = new Error('No Zoom host: set this trainer\'s Zoom email (Trainer.zoomEmail) or ZOOM_HOST_EMAIL in server/.env');
    err.status = 501;
    throw err;
  }
  return host;
}

// Create a fresh Zoom meeting for the demo under the given host user
async function createDemoZoomMeeting(demo, host) {
  const hosts = [];
  if (host) hosts.push(host);
  const shared = sharedZoomHost();
  if (shared && !hosts.includes(shared)) hosts.push(shared);
  if (!hosts.includes('me')) hosts.push('me');

  const body = {
    topic: `Demo Class – ${demo.course} – ${demo.candidateName}`,
    type: 2,
    duration: 45,
    timezone: 'Asia/Kolkata',
    settings: {
      join_before_host: true,
      jbh_time: 0,
      waiting_room: false,
      meeting_authentication: false,
      host_video: true,
      participant_video: true
    }
  };
  const start = demoStartTime(demo);
  if (start) body.start_time = start;

  let lastError = null;
  for (const h of hosts) {
    const r = await zoomApi(`/users/${encodeURIComponent(h)}/meetings`, { method: 'POST', body });
    if (r.ok && r.data?.id) {
      demo.link = r.data.join_url;
      demo.zoomMeetingId = String(r.data.id);
      demo.zoomHostEmail = h;
      await demo.save();
      return demo;
    }
    const msg = r.data?.message || `Zoom meeting creation failed for ${h}`;
    lastError = new Error(msg);
    if (r.data?.code === 1001 || msg.toLowerCase().includes('user does not exist')) {
      console.warn(`[zoom-demo] Host '${h}' does not exist in Zoom Account, trying fallback candidate host...`);
      continue;
    }
  }

  const err = new Error(lastError?.message || `Zoom meeting creation failed for ${host}`);
  err.status = 502;
  throw err;
}

// Per-demo lock: concurrent join requests share one creation instead of each making a meeting
const zoomCreateLocks = new Map();
async function createOnce(demo, host) {
  const key = String(demo._id);
  if (!zoomCreateLocks.has(key)) {
    zoomCreateLocks.set(key, (async () => {
      const fresh = await Demo.findById(demo._id);
      if (fresh?.zoomMeetingId && String(fresh.zoomHostEmail || '').toLowerCase() === host && fresh.zoomMeetingId !== demo.zoomMeetingId) return fresh;
      return createDemoZoomMeeting(fresh || demo, host);
    })().finally(() => setTimeout(() => zoomCreateLocks.delete(key), 5000)));
  }
  const d = await zoomCreateLocks.get(key);
  Object.assign(demo, { link: d.link, zoomMeetingId: d.zoomMeetingId, zoomHostEmail: d.zoomHostEmail });
  return demo;
}

// Meetings currently LIVE on this host → { ids, error }
async function liveMeetings(host) {
  try {
    const r = await zoomApi(`/users/${encodeURIComponent(host)}/meetings?type=live&page_size=30`);
    if (!r.ok) return { ids: [], error: `${r.status} ${r.data.message || 'live list failed'}` };
    return { ids: (r.data.meetings || []).map(m => String(m.id)), error: '' };
  } catch (e) { return { ids: [], error: e.message }; }
}

async function endZoomMeeting(meetingId) {
  try { await zoomApi(`/meetings/${meetingId}/status`, { method: 'PUT', body: { action: 'end' } }); } catch (_) {}
}

// Parse "Today 17:00" / "4:00 PM" + preferredDate into a Zoom start_time (IST). Returns undefined if unclear/past.
function demoStartTime(demo) {
  const m = String(demo.time || demo.timeSlot || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m || !demo.preferredDate) return undefined;
  let h = parseInt(m[1], 10);
  const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  const local = `${demo.preferredDate}T${String(h).padStart(2, '0')}:${m[2]}:00`;
  const t = new Date(`${local}+05:30`);
  return isNaN(t) || t < new Date() ? undefined : local;
}

router.post('/zoom-signature', (req, res) => {
  const { meetingNumber, role = 0 } = req.body || {};
  if (!meetingNumber) return res.status(400).json({ error: 'meetingNumber required' });
  try { res.json(signZoom(meetingNumber, role)); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create or reuse a shared Zoom meeting for a group demo session (hosted by that demo's trainer)
router.post('/demos/:id/zoom-meeting', async (req, res) => {
  try {
    const demo = await Demo.findById(req.params.id);
    if (!demo) return res.status(404).json({ error: 'Demo not found' });
    if (demo.zoomMeetingId) return res.json(demo);

    // Group session reuse: if another candidate in the same trainer's demo slot already has a Zoom meeting, share it!
    if (demo.trainerId && demo.preferredDate && demo.timeSlot) {
      const sibling = await Demo.findOne({
        _id: { $ne: demo._id },
        trainerId: demo.trainerId,
        preferredDate: demo.preferredDate,
        timeSlot: demo.timeSlot,
        zoomMeetingId: { $exists: true, $ne: '' }
      });
      if (sibling && sibling.zoomMeetingId) {
        demo.zoomMeetingId = sibling.zoomMeetingId;
        demo.link = sibling.link;
        demo.zoomHostEmail = sibling.zoomHostEmail;
        await demo.save();
        return res.json(demo);
      }
    }

    await createOnce(demo, await trainerZoomHost(demo));

    // Propagate the shared session Zoom link to all other candidates booked for this group session
    if (demo.trainerId && demo.preferredDate && demo.timeSlot && demo.zoomMeetingId) {
      await Demo.updateMany(
        {
          trainerId: demo.trainerId,
          preferredDate: demo.preferredDate,
          timeSlot: demo.timeSlot,
          _id: { $ne: demo._id }
        },
        {
          $set: {
            zoomMeetingId: demo.zoomMeetingId,
            link: demo.link,
            zoomHostEmail: demo.zoomHostEmail
          }
        }
      ).catch(() => {});
    }

    res.json(demo);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// End the demo's Zoom meeting so the trainer's Zoom user is free for the next one
router.post('/demos/:id/zoom-end', async (req, res) => {
  try {
    const demo = await Demo.findById(req.params.id);
    if (!demo) return res.status(404).json({ error: 'Demo not found' });
    if (demo.zoomMeetingId) await endZoomMeeting(demo.zoomMeetingId);
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Bulk outcome update for group demo session candidates (e.g. marking all attended or no-show at once)
router.post('/demos/bulk-outcome', async (req, res) => {
  try {
    const { ids = [], status = 'attended', updatedBy = 'trainer' } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array is required' });
    const s = String(status).toLowerCase();
    const updatedList = [];
    for (const id of ids) {
      if (!mongoose.isValidObjectId(id)) continue;
      const updated = await Demo.findByIdAndUpdate(id, { $set: { status: s } }, { new: true });
      if (updated) {
        if (s === 'attended') {
          try { await advanceLeadAfterDemo(updated); } catch (e) { console.warn(e.message); }
        }
        if (updatedBy === 'trainer') {
          await notifyHrOfDemo(updated, s);
        }
        updatedList.push(updated);
      }
    }
    res.json({ success: true, count: updatedList.length, demos: updatedList });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Demos booked for a student (shown as notifications on the student dashboard)
router.get('/demos/mine', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) return res.json([]);
    const demos = await Demo.find({ email }).sort({ createdAt: -1 }).limit(10);
    res.json(demos.map(d => ({
      _id: d._id,
      candidateName: d.candidateName,
      course: d.course,
      trainer: d.trainer,
      time: d.time,
      timeSlot: d.timeSlot,
      mode: d.mode,
      status: d.status,
      hasMeeting: !!d.zoomMeetingId,
      createdAt: d.createdAt
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Email the demo's Zoom join link to the student (Brevo transactional email API)
router.post('/demos/:id/send-link', async (req, res) => {
  try {
    const demo = await Demo.findById(req.params.id);
    if (!demo) return res.status(404).json({ error: 'Demo not found' });
    if (!demo.email) return res.status(400).json({ error: 'No student email on this demo' });
    if (!demo.zoomMeetingId) return res.status(400).json({ error: 'Create the Zoom meeting first' });

    const { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } = process.env;
    if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
      return res.status(501).json({ error: 'Email not configured: set BREVO_API_KEY and BREVO_SENDER_EMAIL in server/.env' });
    }

    const esc = (t) => String(t || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const when = demo.time || demo.timeSlot || 'the booked time';
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: BREVO_SENDER_NAME || 'Thoughtflows Academy', email: BREVO_SENDER_EMAIL },
        to: [{ email: demo.email, name: demo.candidateName }],
        subject: `Your ${demo.course} demo class link – Thoughtflows Academy`,
        textContent: `Hi ${demo.candidateName},\n\nYour ${demo.course} demo class with ${demo.trainer} is scheduled for ${when}.\n\nJoin on Zoom: ${demo.link}\n\nPlease join 5 minutes early.\n\nThoughtflows Medical Coding Academy`,
        htmlContent: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
          <h2 style="color:#00897b;margin-bottom:4px">Your demo class is booked</h2>
          <p>Hi ${esc(demo.candidateName)},</p>
          <p>Your <b>${esc(demo.course)}</b> demo class with <b>${esc(demo.trainer)}</b> is scheduled for <b>${esc(when)}</b>.</p>
          <p style="margin:24px 0"><a href="${esc(demo.link)}" style="background:#009688;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Join Zoom Demo</a></p>
          <p style="font-size:12px;color:#64748b">Or open: ${esc(demo.link)}<br>Please join 5 minutes early.</p>
          <p style="font-size:12px;color:#64748b">Thoughtflows Medical Coding Academy</p></div>`
      })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: d.message || 'Brevo could not send the email' });
    res.json({ ok: true, sentTo: demo.email, messageId: d.messageId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Everything the embedded client needs to join. Trainer joins as HOST of their
// own meeting (ZAK); stale live meetings on that trainer's Zoom user are ended
// first so the SDK never hits "Already has other meetings in progress".
router.get('/demos/:id/zoom-join', async (req, res) => {
  try {
    const demo = await Demo.findById(req.params.id);
    if (!demo) return res.status(404).json({ error: 'Demo not found' });
    const asStudent = req.query.as === 'student';
    if (asStudent) {
      const email = String(req.query.email || '').trim().toLowerCase();
      if (!email || email !== String(demo.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'This demo is not booked for your account' });
      }
      if (!demo.zoomMeetingId) return res.status(409).json({ error: 'Your trainer has not started the demo yet' });
    }

    let zak;
    const debug = {};
    if (!asStudent) {
      const reset = req.query.reset === '1';
      const host = await trainerZoomHost(demo);
      const dedicated = host !== sharedZoomHost();
      Object.assign(debug, { host, dedicated });
      const currentHost = String(demo.zoomHostEmail || sharedZoomHost()).toLowerCase();

      const live = await liveMeetings(host);
      debug.liveBefore = live.ids;
      if (live.error) debug.liveError = live.error;

      // Close other stuck meetings on the trainer's own Zoom user (never on the shared account)
      const own = String(demo.zoomMeetingId || '');
      const toEnd = dedicated ? live.ids.filter(id => id !== own) : [];
      if (toEnd.length) {
        await Promise.all(toEnd.map(endZoomMeeting));
        await new Promise(r => setTimeout(r, 2000));
        debug.ended = toEnd;
      }
      // Exactly ONE meeting per demo. Only recreate when Zoom says the saved one is truly gone (404 / 3001).
      let needNew = !demo.zoomMeetingId || currentHost !== host;
      if (!needNew) {
        const m = await zoomApi(`/meetings/${demo.zoomMeetingId}`);
        if (m.status === 404 || m.data.code === 3001) { needNew = true; debug.staleMeeting = demo.zoomMeetingId; }
        else if (!m.ok) debug.meetingCheckError = `${m.status} ${m.data.message || ''}`;
      }
      if (needNew) await createOnce(demo, host);
      debug.meetingId = demo.zoomMeetingId;

      const stillBusy = !dedicated && live.ids.some(id => id !== own);
      if (!stillBusy) {
        try {
          const z = await zoomApi(`/users/${encodeURIComponent(host)}/token?type=zak`);
          if (z.ok) zak = z.data.token; else debug.zakError = `${z.status} ${z.data.message || ''}`;
        } catch (e) { debug.zakError = e.message; }
      } else debug.joinedAsParticipant = true;
      console.log('[zoom-join]', demo._id.toString(), JSON.stringify(debug));
    }

    const meetingNumber = demo.zoomMeetingId || (demo.link.match(/\/j\/(\d+)/) || [])[1];
    if (!meetingNumber) return res.status(400).json({ error: 'No Zoom meeting for this demo yet' });
    const password = (demo.link.match(/[?&]pwd=([^&]+)/) || [])[1] || '';

    const { signature, sdkKey } = signZoom(meetingNumber, zak ? 1 : 0);
    res.json({ signature, sdkKey, meetingNumber: String(meetingNumber), password: decodeURIComponent(password), zak, host: !!zak, hostEmail: demo.zoomHostEmail || '', debug });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});


// ==========================================
// STUDENT PORTAL ⇄ TRAINER DATA FLOW
// Everything the Student Portal shows comes from here — no mock data.
//   Trainer → Student : live class, attendance, assessment scores, materials,
//                       doubt replies, submission reviews, request responses
//   Student → Trainer : doubts, assignment / resume / video submissions,
//                       mock-interview & consultation requests
//   Student → HR      : referrals (leads), fee / payment / profile requests
// ==========================================
const LIVE_CLASS_MAX_HOURS = 6;
const REFERRAL_REWARD_POINTS = 1500;
const MAX_SUBMISSION_BYTES = 12 * 1024 * 1024;

// A student's batch key is the same one the trainer dashboard groups by
const studentBatchOf = (st) => st?.batchName || st?.course || '';
const plainMap = (m) => (m instanceof Map ? Object.fromEntries(m) : (m || {}));

const isSessionLive = (sess) => Boolean(
  sess?.isLive && sess.startedAt && (Date.now() - new Date(sess.startedAt).getTime()) < LIVE_CLASS_MAX_HOURS * 36e5
);

const publicTrainer = (t) => (t ? {
  trainerId: t.trainerId,
  trainerName: t.trainerName,
  role: t.role || '',
  specialization: t.specialization || '',
  expertCourse: t.expertCourse || '',
  branchName: t.branchName || '',
  shift: t.shift || '',
  workingDays: t.workingDays || '',
  languages: t.languages || [],
  certifications: t.certifications || [],
  experienceLevel: t.experienceLevel || '',
  email: t.email || ''
} : null);

// What a student sees about a live class (meeting credentials come only from /student-portal/live-class/join)
const liveSessionView = (sess) => (isSessionLive(sess) ? {
  isLive: true,
  sessionId: sess._id.toString(),
  trainerId: sess.trainerId,
  trainerName: sess.trainerName,
  batch: sess.batch,
  topic: sess.topic,
  startedAt: sess.startedAt,
  hasMeeting: Boolean(sess.zoomMeetingId)
} : null);

async function findPortalStudent({ studentId, email }) {
  if (studentId) {
    const st = await findStudentByAnyId(String(studentId));
    if (st) return st;
  }
  if (email) {
    const e = String(email).trim();
    if (e) return Student.findOne({ email: new RegExp(`^${escapeRegex(e)}$`, 'i') });
  }
  return null;
}

// Credit the referring student once, when a referred lead is admitted
async function creditReferralReward(lead) {
  try {
    if (!lead || lead.stage !== 'admitted' || !lead.referredByStudentId || lead.referralRewarded) return;
    const referrer = await findStudentByAnyId(lead.referredByStudentId);
    if (!referrer) return;
    referrer.rewardPoints = (referrer.rewardPoints || 0) + REFERRAL_REWARD_POINTS;
    await referrer.save();
    lead.referralRewarded = true;
    await lead.save();
    await pushNotification({
      audience: 'hr', recipientName: referrer.hrName || '', type: 'referral',
      title: `Referral reward credited: ${referrer.name}`,
      message: `${lead.fullName} was admitted. ${REFERRAL_REWARD_POINTS} points credited to ${referrer.name} (${referrer.studentId}).`,
      studentId: referrer.studentId
    });
    await notifyStudent(referrer.studentId, {
      type: 'referral',
      title: 'Referral reward credited! 🎉',
      message: `You earned ${REFERRAL_REWARD_POINTS} reward points because ${lead.fullName || 'your referral'} joined Thoughtflows.`,
      link: 'membership'
    });
  } catch (e) {
    console.warn('creditReferralReward failed:', e.message);
  }
}

// ---- Full portal payload for one student ----
router.get('/student-portal/me', async (req, res) => {
  try {
    const st = await findPortalStudent(req.query);
    if (!st) return res.status(404).json({ error: 'No admitted student record is linked to this login. Please contact your HR counsellor.' });

    const key = studentKeyOf(st);
    const batch = studentBatchOf(st);

    const [trainer, liveSessions, attendanceDocs, assessments, materials, doubts, submissions, requests, referrals, placements, tickets, partners] = await Promise.all([
      st.trainerId ? Trainer.findOne({ trainerId: st.trainerId }) : null,
      (batch || st.trainerId) ? LiveClassSession.find({
        $or: [
          ...(batch ? [{ batch }] : []),
          ...(st.trainerId ? [{ trainerId: st.trainerId }] : [])
        ],
        isLive: true
      }) : [],
      ClassAttendance.find({
        $or: [
          { [`records.${key}`]: { $exists: true } },
          { [`records.${st._id}`]: { $exists: true } },
          ...(batch ? [{ batch }] : [])
        ]
      }).sort({ date: -1 }).limit(120),
      TrainerAssessment.find({ $or: [...(batch ? [{ batch }] : []), { [`scores.${key}`]: { $exists: true } }] }).sort({ createdAt: -1 }),
      batch ? TrainingMaterial.find({ 'assignments.batch': batch }).sort({ createdAt: -1 }) : [],
      TrainerDoubt.find({ studentId: st.studentId }).sort({ createdAt: -1 }),
      StudentSubmission.find({ studentId: st.studentId }).sort({ createdAt: -1 }),
      StudentRequest.find({ studentId: st.studentId }).sort({ createdAt: -1 }),
      StudentLead.find({ referredByStudentId: st.studentId })
        .select('fullName phone course counselorAssigned stage status referralRewarded createdAt')
        .sort({ createdAt: -1 }),
      PlacementRecord.find({ $or: [{ studentId: st.studentId }, { tfId: st.studentId }] }).sort({ createdAt: -1 }),
      Escalation.find({ $or: [{ studentId: st.studentId }, { raisedBy: new RegExp(escapeRegex(st.studentId)) }] }).sort({ createdAt: -1 }).limit(20),
      CorporatePartner.find({ hiring: /hiring/i }).select('name city type activeVacancies').limit(8)
    ]);

    // Prefer the allocated trainer's live session, else any live one for the batch
    const live = liveSessions.find((s) => s.trainerId === st.trainerId && isSessionLive(s)) || liveSessions.find(isSessionLive) || null;

    const attendance = attendanceDocs.map((a) => {
      const rec = a.records;
      const val = (rec?.get ? rec.get(key) : rec?.[key])
        || (rec?.get ? rec.get(String(st._id)) : rec?.[String(st._id)])
        || (rec?.get ? rec.get(st.studentId) : rec?.[st.studentId]);
      return {
        id: a._id.toString(),
        date: a.date,
        topic: a.topic || '',
        batch: a.batch,
        trainerName: a.trainerName || '',
        status: val || 'Unmarked'
      };
    });

    const tests = assessments.map((t) => {
      const scores = plainMap(t.scores);
      const myScore = typeof scores[key] === 'number' ? scores[key] : null;
      const pct = myScore !== null && t.totalMarks > 0 ? Math.round((myScore / t.totalMarks) * 100) : null;
      return {
        id: t._id.toString(),
        name: t.name,
        type: t.type,
        topic: t.topic || '',
        date: t.date || '',
        course: t.course || '',
        timeLimit: t.timeLimit,
        totalMarks: t.totalMarks,
        passMark: t.passMark,
        trainerName: t.trainerName || '',
        status: t.status,
        rationale: myScore !== null ? (t.rationale || '') : '',
        myScore,
        pct,
        passed: myScore !== null ? myScore >= (t.passMark || 0) : null,
        createdAt: t.createdAt
      };
    });

    const materialList = materials.map((m) => {
      const assignment = (m.assignments || []).find((a) => a.batch === batch) || {};
      return {
        id: m._id.toString(),
        title: m.title,
        description: m.description,
        category: m.category,
        fileName: m.fileName,
        fileFormat: m.fileFormat,
        fileSize: m.fileSize,
        uploadedBy: m.uploadedBy,
        module: assignment.module || '',
        note: assignment.note || '',
        assignedBy: assignment.by || '',
        assignedAt: assignment.at || m.createdAt
      };
    });

    // Notes the trainer shared in recent classes of this batch
    const pastSessions = batch
      ? await LiveClassSession.find({ batch, isLive: false, 'notes.0': { $exists: true } }).sort({ startedAt: -1 }).limit(20).select('topic trainerName startedAt notes')
      : [];
    // Weekly timetable = allocated trainer's scheduled classes for this batch
    const timetable = (trainer?.scheduledClasses || [])
      .filter((c) => !c.batch || c.batch === batch)
      .map((c) => ({ name: c.name, timeSlot: c.timeSlot || '', startMin: c.startMin, endMin: c.endMin, days: c.days || trainer.workingDays || '' }))
      .sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0));

    // Recent ended classes the student can rate + feedback already given
    const [recentClasses, myFeedback] = await Promise.all([
      batch ? LiveClassSession.find({ batch, isLive: false }).sort({ startedAt: -1 }).limit(10).select('topic trainerId trainerName startedAt') : [],
      ClassFeedback.find({ studentId: st.studentId }).sort({ createdAt: -1 }).limit(50)
    ]);
    const rateableClasses = recentClasses.map((sess) => {
      const fb = myFeedback.find((f) => f.sessionId === sess._id.toString());
      return { id: sess._id.toString(), topic: sess.topic || '', trainerName: sess.trainerName || '', date: sess.startedAt, myRating: fb?.rating || null };
    });
    const trainerFeedback = myFeedback.find((f) => f.kind === 'trainer' && f.trainerId === st.trainerId) || null;

    const classNotes = pastSessions.map((sess) => ({
      id: sess._id.toString(),
      topic: sess.topic,
      trainerName: sess.trainerName,
      date: sess.startedAt,
      notes: (sess.notes || []).map((n) => ({ text: n.text, at: n.at }))
    }));

    res.json({
      student: st,
      batch,
      trainer: publicTrainer(trainer),
      liveSession: liveSessionView(live),
      classNotes,
      attendance,
      assessments: tests,
      materials: materialList,
      doubts: doubts.map(formatDoubt),
      submissions,
      requests,
      referrals,
      placements,
      tickets,
      hiringPartners: partners,
      timetable,
      rateableClasses,
      trainerFeedback
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Student feedback on classes / trainer → HR & Leadership trainer-quality score ----
router.post('/student-portal/:id/feedback', async (req, res) => {
  try {
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    const { kind = 'class', sessionId = '', rating, comment = '' } = req.body || {};
    const r = Math.round(Number(rating));
    if (!(r >= 1 && r <= 5)) return res.status(400).json({ error: 'Rating must be 1–5' });
    let trainerId = st.trainerId || '';
    let trainerName = st.trainerName || '';
    let topic = '';
    if (kind === 'class') {
      const sess = await LiveClassSession.findById(sessionId).select('batch trainerId trainerName topic joins');
      if (!sess) return res.status(404).json({ error: 'Class not found' });
      const myBatch = (studentBatchOf(st) || '').trim().toLowerCase();
      const sessBatch = (sess.batch || '').trim().toLowerCase();
      const batchMatches = Boolean(myBatch && sessBatch && (myBatch === sessBatch || myBatch.includes(sessBatch) || sessBatch.includes(myBatch)));
      const trainerMatches = Boolean(st.trainerId && sess.trainerId && st.trainerId === sess.trainerId);
      const isJoined = (sess.joins || []).some((j) => j.studentId === st.studentId);
      if (!batchMatches && !trainerMatches && !isJoined) return res.status(404).json({ error: 'Class not found for your batch' });
      trainerId = sess.trainerId; trainerName = sess.trainerName; topic = sess.topic || '';
    } else if (!trainerId) {
      return res.status(400).json({ error: 'No trainer allocated yet' });
    }
    const key = kind === 'class' ? { studentId: st.studentId, sessionId } : { studentId: st.studentId, kind: 'trainer', trainerId };
    const doc = await ClassFeedback.findOneAndUpdate(
      key,
      { $set: { ...key, kind, studentName: st.name, trainerId, trainerName, batch: studentBatchOf(st), topic, rating: r, comment: String(comment).slice(0, 500) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (r <= 2) {
      await pushNotification({
        audience: 'hr', recipientName: st.hrName || '', type: 'feedback',
        title: `Low rating (${r}★) from ${st.name}`,
        message: `${kind === 'class' ? `Class "${topic || 'session'}"` : 'Trainer'} · ${trainerName}${comment ? ` — ${String(comment).slice(0, 160)}` : ''}`,
        studentId: st.studentId, createdBy: st.name
      });
    }
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Trainer-quality roll-up (HR, Leadership, Admin, Training)
router.get('/feedback/summary', async (req, res) => {
  try {
    const match = {};
    if (req.query.trainerId) match.trainerId = req.query.trainerId;
    if (req.query.days) match.createdAt = { $gte: new Date(Date.now() - Number(req.query.days) * 864e5) };
    const rows = await ClassFeedback.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$trainerId',
          trainerName: { $first: '$trainerName' },
          avg: { $avg: '$rating' },
          count: { $sum: 1 },
          classAvg: { $avg: { $cond: [{ $eq: ['$kind', 'class'] }, '$rating', null] } },
          trainerAvg: { $avg: { $cond: [{ $eq: ['$kind', 'trainer'] }, '$rating', null] } },
          low: { $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] } },
          recent: { $push: { rating: '$rating', comment: '$comment', studentName: '$studentName', topic: '$topic', kind: '$kind', at: '$createdAt' } }
        }
      },
      { $project: { _id: 0, trainerId: '$_id', trainerName: 1, count: 1, low: 1, avg: { $round: ['$avg', 2] }, classAvg: { $round: ['$classAvg', 2] }, trainerAvg: { $round: ['$trainerAvg', 2] }, recent: { $slice: ['$recent', 5] } } },
      { $sort: { avg: -1 } }
    ]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// One timeline per student: HR, trainer and student actions in date order
router.get('/students/:id/timeline', async (req, res) => {
  try {
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    const sid = st.studentId;
    const [doubts, submissions, requests, tickets, feedback, placements] = await Promise.all([
      TrainerDoubt.find({ studentId: sid }).sort({ createdAt: -1 }).limit(50),
      StudentSubmission.find({ studentId: sid }).sort({ createdAt: -1 }).limit(50),
      StudentRequest.find({ studentId: sid }).sort({ createdAt: -1 }).limit(50),
      Escalation.find({ $or: [{ studentId: sid }, { raisedBy: new RegExp(escapeRegex(sid)) }] }).sort({ createdAt: -1 }).limit(30),
      ClassFeedback.find({ studentId: sid }).sort({ createdAt: -1 }).limit(30),
      PlacementRecord.find({ $or: [{ studentId: sid }, { tfId: sid }] }).sort({ createdAt: -1 }).limit(20)
    ]);
    const ev = [];
    const add = (at, kind, title, detail = '', by = '', status = '') => at && ev.push({ at, kind, title, detail, by, status });
    add(st.createdAt, 'admission', 'Admitted', `${st.course || ''}${st.batchDate ? ` · batch ${st.batchDate}` : ''}`, st.hrName || '');
    add(st.handedOverAt, 'handover', `Handed over to ${st.trainerName || 'trainer'}`, st.trainerNote || '', st.handedOverBy || '');
    (st.remedialActions || []).forEach((r) => add(r.at, 'remedial', `Remedial: ${r.action}`, r.note || '', r.by || ''));
    add(st.syllabusCompletedAt, 'syllabus', 'Syllabus completed', '', st.trainerName || '');
    add(st.trainerRecommendationAt, 'recommendation', `Trainer recommendation: ${st.trainerRecommendation}`, typeof st.readinessScore === 'number' ? `Readiness ${st.readinessScore}%` : '', st.trainerName || '');
    doubts.forEach((d) => {
      add(d.createdAt, 'doubt', `Doubt: ${d.topic}`, d.question, st.name, d.status);
      if (d.repliedAt) add(d.repliedAt, 'doubt', `Doubt answered: ${d.topic}`, d.reply, d.trainerName || '');
    });
    submissions.forEach((s) => {
      add(s.createdAt, 'submission', `Submitted: ${s.title}`, s.note || '', st.name, s.status);
      if (s.reviewedAt) add(s.reviewedAt, 'submission', `Reviewed: ${s.title} → ${s.status}`, [typeof s.score === 'number' && `Score ${s.score}`, s.feedback].filter(Boolean).join(' · '), s.reviewedBy || '');
    });
    requests.forEach((r) => {
      add(r.createdAt, 'request', `Request: ${r.subject || r.type.replace(/_/g, ' ')}`, r.message, st.name, r.status);
      if (r.respondedAt) add(r.respondedAt, 'request', `Request ${r.status}: ${r.subject || r.type.replace(/_/g, ' ')}`, r.response, r.respondedBy || '');
    });
    tickets.forEach((t) => {
      add(t.createdAt, 'ticket', `Ticket: ${t.title}`, t.description || '', t.raisedBy || '', t.status);
      if (t.resolvedAt) add(t.resolvedAt, 'ticket', `Ticket ${t.status}: ${t.title}`, t.response || '', t.respondedBy || '');
    });
    feedback.forEach((f) => add(f.updatedAt || f.createdAt, 'feedback', `Rated ${f.kind === 'class' ? `class "${f.topic || ''}"` : `trainer ${f.trainerName}`}: ${f.rating}★`, f.comment || '', st.name));
    placements.forEach((p) => add(p.createdAt, 'placement', `Placement: ${p.company || p.companyName || 'record'}`, [p.role, p.status || p.stage].filter(Boolean).join(' · ')));
    ev.sort((a, b) => new Date(b.at) - new Date(a.at));
    res.json({ studentId: sid, name: st.name, events: ev });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Student-editable profile fields (everything else is HR-verified) ----
router.put('/student-portal/:id/profile', async (req, res) => {
  try {
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    const { skills, certificates, preferredLocations } = req.body || {};
    const cleanList = (arr) => [...new Set((arr || []).map((v) => String(v || '').trim()).filter(Boolean))].slice(0, 30);
    if (Array.isArray(skills)) st.skills = cleanList(skills);
    if (Array.isArray(preferredLocations)) st.preferredLocations = cleanList(preferredLocations);
    if (Array.isArray(certificates)) {
      st.certificates = certificates
        .filter((c) => c && c.name)
        .slice(0, 30)
        .map((c) => ({
          id: String(c.id || new mongoose.Types.ObjectId()),
          name: String(c.name).trim(),
          issuer: String(c.issuer || '').trim(),
          year: String(c.year || '').trim()
        }));
    }
    await st.save();
    res.json(st);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- Referrals: student refers a friend → a real lead for their HR ----
router.post('/student-portal/:id/referrals', async (req, res) => {
  try {
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    const { name, phone, course = '', email = '' } = req.body || {};
    const cleanPhone = String(phone || '').replace(/[^\d+]/g, '');
    if (!name || cleanPhone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: "Your friend's name and a valid 10-digit mobile number are required" });
    }
    const existing = await StudentLead.findOne({ phone: new RegExp(`${escapeRegex(cleanPhone.slice(-10))}$`) });
    if (existing) return res.status(409).json({ error: 'This number is already registered with our admissions team' });
    const lead = await StudentLead.create({
      fullName: String(name).trim(),
      phone: cleanPhone,
      email: String(email || '').trim().toLowerCase(),
      course: course || st.course,
      branch: st.location || '',
      sourceName: 'Student Referral',
      counselorAssigned: st.hrName || '',
      stage: 'new',
      notes: `Referred by ${st.name} (${st.studentId})`,
      referredByStudentId: st.studentId,
      referredByName: st.name
    });
    await pushNotification({
      audience: 'hr', recipientName: st.hrName || '', type: 'referral',
      title: `New referral from ${st.name}`,
      message: `${lead.fullName} · ${lead.phone} · ${lead.course}. Referred by ${st.name} (${st.studentId}).`,
      studentId: st.studentId, createdBy: st.name
    });
    res.status(201).json(lead);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- Submissions: student → trainer ----
router.post('/student-portal/:id/submissions', async (req, res) => {
  try {
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    const { type, title, note = '', link = '', materialId = '', fileName = '', mimeType = '', data = '' } = req.body || {};
    if (!type) return res.status(400).json({ error: 'type is required' });
    if (!data && !link) return res.status(400).json({ error: 'Attach a file or share a link' });
    let base64 = '';
    let size = 0;
    if (data) {
      base64 = String(data).includes(',') ? String(data).split(',').pop() : String(data);
      size = Math.floor((base64.length * 3) / 4);
      if (size > MAX_SUBMISSION_BYTES) return res.status(413).json({ error: 'File is larger than 12 MB' });
    }
    const doc = await StudentSubmission.create({
      studentId: st.studentId,
      studentName: st.name,
      course: st.course,
      batch: studentBatchOf(st),
      trainerId: st.trainerId || '',
      trainerName: st.trainerName || '',
      type,
      title: title || fileName || type,
      note,
      link,
      materialId,
      fileName,
      mimeType: mimeType || (fileName ? 'application/octet-stream' : ''),
      fileSize: size,
      data: base64
    });
    if (type === 'resume' || type === 'video_intro') {
      if (type === 'resume') st.resumeStatus = 'Submitted';
      else st.videoIntroStatus = 'Submitted';
      await st.save();
    }
    if (st.trainerId) {
      await pushNotification({
        audience: 'trainer', recipientId: st.trainerId, recipientName: st.trainerName, type: 'submission',
        title: `New submission from ${st.name}`,
        message: `${doc.title}${note ? ` — ${note}` : ''}`,
        studentId: st.studentId, createdBy: st.name
      });
    }
    const obj = doc.toObject();
    delete obj.data;
    res.status(201).json(obj);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/student-portal/submissions', async (req, res) => {
  try {
    const { trainerId, studentId, status } = req.query;
    const query = {};
    if (studentId) query.studentId = studentId;
    if (status) query.status = status;
    if (trainerId) {
      const studentIds = (await Student.find({ trainerId }).select('studentId')).map((s) => s.studentId).filter(Boolean);
      query.$or = [{ trainerId }, { studentId: { $in: studentIds } }];
    }
    res.json(await StudentSubmission.find(query).sort({ createdAt: -1 }).limit(300));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/student-portal/submissions/:id/file', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const doc = await StudentSubmission.findById(req.params.id).select('+data');
    if (!doc || !doc.data) return res.status(404).json({ error: 'File not found' });
    // Students may only open their own submissions
    if (req.user?.department === 'student' && doc.studentId !== req.user.studentId) return res.status(403).json({ error: 'Not allowed' });
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.fileName || 'file')}"`);
    res.send(Buffer.from(doc.data, 'base64'));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Trainer reviews a submission. A resume / video intro review is also written
// to the student record (resumeStatus / videoIntroStatus) for HR & CCCP.
router.put('/student-portal/submissions/:id/review', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const { status, score, feedback = '', reviewedBy = '' } = req.body || {};
    if (!['Approved', 'Needs Revision'].includes(status)) return res.status(400).json({ error: 'Status must be Approved or Needs Revision' });
    const set = { status, feedback, reviewedBy, reviewedAt: new Date() };
    if (score !== undefined && score !== '' && score !== null) {
      const n = Number(score);
      if (!Number.isFinite(n) || n < 0 || n > 100) return res.status(400).json({ error: 'Score must be between 0 and 100' });
      set.score = n;
    }
    const doc = await StudentSubmission.findByIdAndUpdate(req.params.id, { $set: set }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Submission not found' });
    await notifyStudent(doc.studentId, {
      type: 'submission', title: `${doc.title || 'Submission'}: ${status}`,
      message: [typeof set.score === 'number' && `Score ${set.score}`, feedback].filter(Boolean).join(' · ') || `Reviewed by ${reviewedBy || 'your trainer'}.`,
      createdBy: reviewedBy
    });
    if (doc.type === 'resume' || doc.type === 'video_intro') {
      const owner = await findStudentByAnyId(doc.studentId);
      if (owner) {
        if (doc.type === 'resume') { owner.resumeStatus = status; owner.resumeReviewedAt = set.reviewedAt; }
        else { owner.videoIntroStatus = status; owner.videoIntroReviewedAt = set.reviewedAt; }
        await owner.save();
      }
      await pushNotification({
        audience: 'hr', recipientName: owner?.hrName || '', type: 'placement',
        title: `${doc.type === 'resume' ? 'Resume' : 'Video intro'} ${status.toLowerCase()}: ${doc.studentName}`,
        message: `${reviewedBy || 'Trainer'} reviewed ${doc.studentName}'s ${doc.type === 'resume' ? 'resume' : 'video introduction'}${feedback ? ` — ${feedback}` : ''}.`,
        studentId: doc.studentId, createdBy: reviewedBy
      });
    }
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- Requests: student → trainer (academic) or → HR (admin) ----
router.post('/student-portal/:id/requests', async (req, res) => {
  try {
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    const { type, subject = '', message = '', preferredDate = '', details = {} } = req.body || {};
    if (!type) return res.status(400).json({ error: 'type is required' });
    const audience = TRAINER_REQUEST_TYPES.includes(type) ? 'trainer' : 'hr';
    if (audience === 'trainer' && !st.trainerId) {
      return res.status(400).json({ error: 'No trainer has been allocated to you yet. Your HR counsellor will allocate one.' });
    }
    if (type === 'redeem_points') {
      const pts = Math.round(Number(details.points || 0));
      // Points already asked for in open / scheduled redemptions are on hold
      const pending = await StudentRequest.find({ studentId: st.studentId, type: 'redeem_points', status: { $in: ['Open', 'Scheduled'] } }).select('details');
      const held = pending.reduce((a, r) => a + (Number(r.details?.points) || 0), 0);
      const available = Math.max(0, (st.rewardPoints || 0) - held);
      if (!(pts > 0) || pts > available) {
        return res.status(400).json({ error: held ? `Only ${available} points available — ${held} are in a pending redemption` : 'Not enough reward points to redeem' });
      }
    }
    const doc = await StudentRequest.create({
      studentId: st.studentId,
      studentName: st.name,
      course: st.course,
      batch: studentBatchOf(st),
      type,
      audience,
      trainerId: audience === 'trainer' ? st.trainerId : '',
      trainerName: audience === 'trainer' ? st.trainerName : '',
      hrName: st.hrName || '',
      subject,
      message,
      preferredDate,
      details
    });
    await pushNotification({
      audience,
      recipientId: audience === 'trainer' ? st.trainerId : '',
      recipientName: audience === 'trainer' ? st.trainerName : (st.hrName || ''),
      type: `request_${type}`,
      title: `${st.name}: ${subject || type.replace(/_/g, ' ')}`,
      message: [message, preferredDate ? `Preferred: ${preferredDate}` : ''].filter(Boolean).join(' · '),
      studentId: st.studentId, createdBy: st.name
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/student-portal/requests', async (req, res) => {
  try {
    const { audience, trainerId, studentId, status } = req.query;
    const query = {};
    if (audience) query.audience = audience;
    if (studentId) query.studentId = studentId;
    if (status) query.status = status;
    if (trainerId) {
      const studentIds = (await Student.find({ trainerId }).select('studentId')).map((s) => s.studentId).filter(Boolean);
      query.$or = [{ trainerId }, { studentId: { $in: studentIds } }];
    }
    res.json(await StudentRequest.find(query).sort({ createdAt: -1 }).limit(300));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/student-portal/requests/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const { status, response = '', scheduledFor = '', respondedBy = '', mockScore } = req.body || {};
    if (!['Open', 'Scheduled', 'Resolved', 'Declined'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (mockScore !== undefined && mockScore !== '' && mockScore !== null) {
      const n = Number(mockScore);
      if (!Number.isFinite(n) || n < 0 || n > 100) return res.status(400).json({ error: 'Mock score must be between 0 and 100' });
    }
    const doc = await StudentRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Request not found' });
    const wasResolved = doc.status === 'Resolved';
    if (wasResolved && status !== 'Resolved' && doc.type === 'redeem_points') {
      return res.status(400).json({ error: 'This redemption is already approved and the points were deducted' });
    }
    if (doc.type === 'redeem_points' && status === 'Resolved' && !wasResolved) {
      const owner = await findStudentByAnyId(doc.studentId);
      const pts = Number(doc.details?.points || 0);
      if (owner && pts > (owner.rewardPoints || 0)) {
        return res.status(400).json({ error: `${owner.name} now has only ${owner.rewardPoints || 0} points — decline this request or ask for a smaller redemption` });
      }
    }
    doc.status = status;
    doc.response = response;
    doc.scheduledFor = scheduledFor || doc.scheduledFor;
    doc.respondedBy = respondedBy;
    doc.respondedAt = new Date();
    await doc.save();
    const st = await findStudentByAnyId(doc.studentId);
    if (st) {
      // Mock interview done → reflect on the student record HR & CCCP read
      if (doc.type === 'mock_interview') {
        st.mockInterview = status === 'Resolved' ? 'Completed' : status === 'Scheduled' ? 'Scheduled' : st.mockInterview;
        if (mockScore !== undefined && mockScore !== '' && mockScore !== null) {
          st.mockScore = Number(mockScore);
          st.readinessScore = computeReadiness(st);
          doc.details = { ...(doc.details || {}), mockScore: Number(mockScore) };
          await doc.save();
        }
        await st.save();
      }
      // Approved redemption → deduct the points once
      if (doc.type === 'redeem_points' && status === 'Resolved' && !wasResolved) {
        st.rewardPoints = Math.max(0, (st.rewardPoints || 0) - Number(doc.details?.points || 0));
        await st.save();
      }
    }
    await notifyStudent(doc.studentId, {
      type: 'request', title: `${doc.subject || doc.type.replace(/_/g, ' ')}: ${status}`,
      message: [doc.scheduledFor && `Scheduled for ${doc.scheduledFor}`, response].filter(Boolean).join(' · ') || `Updated by ${respondedBy || (doc.audience === 'hr' ? 'your HR' : 'your trainer')}.`,
      createdBy: respondedBy
    });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// LIVE CLASS — Class Session Room ⇄ Student Portal
//   1. Trainer starts: a fresh Zoom meeting is created on the trainer's own
//      Zoom user (Trainer.zoomEmail, else ZOOM_HOST_EMAIL). Falls back to the
//      trainer's fixed Class Zoom Link when the Zoom API is not configured.
//   2. Trainer joins as HOST (signature role 1 + ZAK) inside the dashboard.
//   3. Students of that batch join from their portal (role 0). Every join is
//      logged so the trainer can mark attendance from it.
//   4. Trainer ends: the Zoom meeting is closed for everyone, and the join
//      log is returned for one-click attendance.
// ==========================================
const LATE_AFTER_MIN = 15;

// The first version kept one row per trainer+batch (unique index). Drop that
// index once so every class session gets its own record.
let liveIndexesSynced = false;
async function ensureLiveIndexes() {
  if (liveIndexesSynced) return;
  liveIndexesSynced = true;
  try { await LiveClassSession.syncIndexes(); } catch (e) { console.warn('LiveClassSession index sync:', e.message); }
}

const sessionTrainerId = (req) => req.user?.trainerId || req.body?.trainerId || req.query?.trainerId || '';

// Trainer-facing view (includes the join log and notes)
const trainerSessionView = (sess) => sess && ({
  sessionId: sess._id.toString(),
  isLive: isSessionLive(sess),
  trainerId: sess.trainerId,
  trainerName: sess.trainerName,
  batch: sess.batch,
  topic: sess.topic,
  startedAt: sess.startedAt,
  endedAt: sess.endedAt,
  meetingSource: sess.meetingSource,
  zoomMeetingId: sess.zoomMeetingId,
  zoomJoinUrl: sess.zoomJoinUrl,
  joins: (sess.joins || []).map((j) => ({
    studentId: j.studentId,
    name: j.name,
    joinedAt: j.joinedAt,
    late: Boolean(sess.startedAt && j.joinedAt && (new Date(j.joinedAt) - new Date(sess.startedAt)) > LATE_AFTER_MIN * 60000)
  })),
  notes: sess.notes || [],
  attendanceSaved: sess.attendanceSaved
});

const zoomApiConfigured = () => Boolean(process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_S2S_CLIENT_ID && process.env.ZOOM_S2S_CLIENT_SECRET);

async function classZoomHosts(trainer) {
  const hosts = [];
  const primary = String(trainer?.zoomEmail || '').trim().toLowerCase();
  if (primary) hosts.push(primary);
  const shared = sharedZoomHost();
  if (shared && !hosts.includes(shared)) hosts.push(shared);
  if (!hosts.includes('me')) hosts.push('me');
  return hosts;
}

// Create the Zoom meeting for one class session under the trainer's Zoom user (with automatic fallbacks)
async function createClassZoomMeeting(sess, trainer) {
  const hosts = await classZoomHosts(trainer);
  let lastError = null;

  for (const host of hosts) {
    try {
      if (host !== sharedZoomHost() && host !== 'me') {
        const live = await liveMeetings(host);
        if (live.ids.length) {
          await Promise.all(live.ids.map(endZoomMeeting));
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      const r = await zoomApi(`/users/${encodeURIComponent(host)}/meetings`, {
        method: 'POST',
        body: {
          topic: `${sess.batch}${sess.topic ? ` – ${sess.topic}` : ''}`.slice(0, 190),
          type: 1, // instant meeting
          timezone: 'Asia/Kolkata',
          settings: {
            join_before_host: false, // students wait until the trainer is in
            waiting_room: false,
            meeting_authentication: false,
            host_video: true,
            participant_video: false,
            mute_upon_entry: true
          }
        }
      });
      if (r.ok && r.data?.id) {
        sess.zoomMeetingId = String(r.data.id);
        sess.zoomHostEmail = host;
        sess.zoomJoinUrl = r.data.join_url || '';
        sess.zoomPassword = r.data.password || (r.data.join_url?.match(/[?&]pwd=([^&]+)/) || [])[1] || '';
        sess.meetingSource = 'zoom_api';
        return;
      }
      const msg = r.data?.message || `Zoom HTTP ${r.status}`;
      lastError = new Error(msg);
      if (r.data?.code === 1001 || msg.toLowerCase().includes('user does not exist')) {
        console.warn(`[zoom-class] Host '${host}' does not exist in Zoom Account, trying fallback host...`);
        continue;
      }
      console.warn(`[zoom-class] Meeting creation failed for host '${host}':`, msg);
    } catch (err) {
      lastError = err;
    }
  }

  // If Zoom API fails for all candidate hosts, check if trainer has fixed classZoomLink
  if (trainer?.classZoomLink) {
    const m = trainer.classZoomLink.match(/\/j\/(\d+)/);
    sess.zoomMeetingId = m ? m[1] : '';
    sess.zoomPassword = decodeURIComponent((trainer.classZoomLink.match(/[?&]pwd=([^&]+)/) || [])[1] || '');
    sess.zoomJoinUrl = trainer.classZoomLink;
    sess.meetingSource = 'class_link';
    return;
  }

  const primaryHost = String(trainer?.zoomEmail || sharedZoomHost() || '').trim().toLowerCase();
  const errMsg = lastError?.message || `Zoom could not create the class meeting`;
  if (errMsg.toLowerCase().includes('user does not exist')) {
    const err = new Error(`Zoom user '${primaryHost}' does not exist in your company Zoom account. Add ${primaryHost} to your Zoom Account users in Zoom Admin Portal, or add a fixed Class Zoom Link on the trainer profile.`);
    err.status = 400;
    throw err;
  }
  const err = new Error(errMsg);
  err.status = 502;
  throw err;
}

// GET the trainer's live session (with join log)
router.get('/trainer/live-class', async (req, res) => {
  try {
    const trainerId = sessionTrainerId(req);
    const { batch } = req.query;
    if (!trainerId && !batch) return res.status(400).json({ error: 'trainerId or batch is required' });
    const query = { isLive: true };
    if (trainerId) query.trainerId = trainerId;
    if (batch) query.batch = batch;
    const list = await LiveClassSession.find(query).sort({ startedAt: -1 });
    res.json(list.filter(isSessionLive).map(trainerSessionView));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// START a class session
router.post('/trainer/live-class/start', async (req, res) => {
  try {
    await ensureLiveIndexes();
    const trainerId = sessionTrainerId(req);
    const { batch, topic = '' } = req.body || {};
    if (!trainerId || !batch) return res.status(400).json({ error: 'trainerId and batch are required' });
    const trainer = await Trainer.findOne({ trainerId });
    const trainerName = trainer?.trainerName || req.user?.name || req.body?.trainerName || '';

    // Already live for this batch → resume it (page reload / second device)
    const existing = await LiveClassSession.findOne({ trainerId, batch, isLive: true }).sort({ startedAt: -1 });
    if (existing && isSessionLive(existing)) return res.json(trainerSessionView(existing));

    // One live class per trainer: close anything else still open
    const stale = await LiveClassSession.find({ trainerId, isLive: true });
    for (const s of stale) {
      if (s.meetingSource === 'zoom_api' && s.zoomMeetingId) await endZoomMeeting(s.zoomMeetingId);
      s.isLive = false;
      s.endedAt = new Date();
      await s.save();
    }

    const sample = await Student.findOne({ trainerId, $or: [{ batchName: batch }, { course: batch }] }).select('course');
    const sess = new LiveClassSession({
      trainerId,
      trainerName,
      batch,
      course: sample?.course || '',
      topic: String(topic).trim(),
      isLive: true,
      startedAt: new Date()
    });

    if (zoomApiConfigured()) {
      try {
        await createClassZoomMeeting(sess, trainer);
      } catch (zoomErr) {
        if (trainer?.classZoomLink) {
          const m = trainer.classZoomLink.match(/\/j\/(\d+)/);
          sess.zoomMeetingId = m ? m[1] : '';
          sess.zoomPassword = decodeURIComponent((trainer.classZoomLink.match(/[?&]pwd=([^&]+)/) || [])[1] || '');
          sess.zoomJoinUrl = trainer.classZoomLink;
          sess.meetingSource = 'class_link';
        } else {
          throw zoomErr;
        }
      }
    } else if (trainer?.classZoomLink) {
      const m = trainer.classZoomLink.match(/\/j\/(\d+)/);
      sess.zoomMeetingId = m ? m[1] : '';
      sess.zoomPassword = decodeURIComponent((trainer.classZoomLink.match(/[?&]pwd=([^&]+)/) || [])[1] || '');
      sess.zoomJoinUrl = trainer.classZoomLink;
      sess.meetingSource = 'class_link';
    } else {
      return res.status(501).json({ error: 'Zoom is not set up: add the Zoom S2S keys in server/.env, or a Class Zoom Link on this trainer profile.' });
    }
    await sess.save();
    await notifyBatch(batch, {
      type: 'live', title: `${trainerName || 'Your trainer'} is live now`,
      message: `${sess.topic || 'Class'} has started — open Live Classes to join.`, createdBy: trainerName
    });
    res.json(trainerSessionView(sess));
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

// Trainer joins their own session as HOST
router.get('/trainer/live-class/:id/join', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid session' });
    const sess = await LiveClassSession.findById(req.params.id);
    if (!sess || !isSessionLive(sess)) return res.status(404).json({ error: 'This class is not live any more' });
    if (!sess.zoomMeetingId) return res.status(409).json({ error: 'No Zoom meeting for this class' });
    let zak = '';
    if (sess.meetingSource === 'zoom_api' && sess.zoomHostEmail) {
      try {
        let z = await zoomApi(`/users/${encodeURIComponent(sess.zoomHostEmail)}/token?type=zak`);
        if (!z.ok && sess.zoomHostEmail !== 'me') {
          z = await zoomApi(`/users/me/token?type=zak`);
        }
        if (z.ok) zak = z.data.token;
      } catch (_) {}
    }
    const { signature, sdkKey } = signZoom(sess.zoomMeetingId, zak ? 1 : 0);
    res.json({ signature, sdkKey, meetingNumber: sess.zoomMeetingId, password: sess.zoomPassword, zak, host: Boolean(zak) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Session notes (shared with the batch after class)
router.post('/trainer/live-class/:id/notes', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Note is empty' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid session' });
    const sess = await LiveClassSession.findByIdAndUpdate(req.params.id, { $push: { notes: { text: text.slice(0, 2000), at: new Date() } } }, { new: true });
    if (!sess) return res.status(404).json({ error: 'Session not found' });
    res.json(trainerSessionView(sess));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// END the session — closes Zoom for everyone and returns the join log
router.post('/trainer/live-class/end', async (req, res) => {
  try {
    const trainerId = sessionTrainerId(req);
    const { batch, sessionId } = req.body || {};
    if (!trainerId && !sessionId) return res.status(400).json({ error: 'trainerId is required' });
    const query = sessionId && mongoose.isValidObjectId(sessionId) ? { _id: sessionId } : { trainerId, isLive: true, ...(batch ? { batch } : {}) };
    const list = await LiveClassSession.find(query);
    for (const s of list) {
      if (s.meetingSource === 'zoom_api' && s.zoomMeetingId && s.isLive) await endZoomMeeting(s.zoomMeetingId);
      s.isLive = false;
      s.endedAt = s.endedAt || new Date();
      await s.save();
    }
    res.json({ success: true, sessions: list.map(trainerSessionView) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Mark the session's attendance as saved (after the trainer confirms it)
router.put('/trainer/live-class/:id/attendance-saved', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid session' });
    await LiveClassSession.findByIdAndUpdate(req.params.id, { $set: { attendanceSaved: true } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// STUDENT joins the live class of their own batch
router.post('/student-portal/live-class/join', async (req, res) => {
  try {
    const st = await findPortalStudent({
      studentId: req.user?.studentId || req.body?.studentId,
      email: req.user?.email || req.body?.email
    });
    if (!st) return res.status(404).json({ error: 'Student record not found' });
    const batch = studentBatchOf(st) || req.body?.batch;
    const sessions = await LiveClassSession.find({
      $or: [
        ...(batch ? [{ batch }] : []),
        ...(st.trainerId ? [{ trainerId: st.trainerId }] : [])
      ],
      isLive: true
    }).sort({ startedAt: -1 });
    const sess = sessions.find((s) => s.trainerId === st.trainerId && isSessionLive(s)) || sessions.find(isSessionLive);
    if (!sess) return res.status(409).json({ error: 'Your trainer has not started the class yet.' });
    if (!sess.zoomMeetingId) return res.status(409).json({ error: 'The class has no meeting link yet. Please tell your trainer.' });

    const now = new Date();
    const existing = (sess.joins || []).find((j) => j.studentId === st.studentId);
    if (existing) {
      await LiveClassSession.updateOne({ _id: sess._id, 'joins.studentId': st.studentId }, { $set: { 'joins.$.lastJoinAt': now }, $inc: { 'joins.$.count': 1 } });
    } else {
      await LiveClassSession.updateOne({ _id: sess._id }, { $push: { joins: { studentId: st.studentId, name: st.name, joinedAt: now, lastJoinAt: now, count: 1 } } });
    }

    const { signature, sdkKey } = signZoom(sess.zoomMeetingId, 0);
    res.json({ signature, sdkKey, meetingNumber: sess.zoomMeetingId, password: sess.zoomPassword, zak: '', topic: sess.topic, trainerName: sess.trainerName, joinUrl: sess.zoomJoinUrl });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ==========================================
// HR LMS — lesson progress, graded assessments, certification
// ==========================================
const lmsUserKey = (u) => String(u?.email || u?.name || '').trim().toLowerCase();
const lmsModuleOut = (m) => (m ? { completedItems: m.completedItems || [], passed: !!m.passed, bestScore: m.bestScore || 0, lastScore: m.lastScore ?? null, attempts: m.attempts || 0, passedAt: m.passedAt || null } : null);

async function lmsQuestionsFor(moduleKey) {
  if (moduleKey.startsWith('course:')) {
    const rates = await CourseFeeRate.find().lean().catch(() => []);
    return { questions: courseQuestions(moduleKey.slice(7), rates.length ? rates : DEFAULT_COURSE_FEE_RATES), passMark: COURSE_PASS_MARK };
  }
  const questions = QUESTION_BANK[moduleKey];
  return questions ? { questions, passMark: PASS_MARK[moduleKey] || 80 } : null;
}

function lmsSummary(doc) {
  const modules = {};
  (doc?.modules ? [...doc.modules.entries()] : []).forEach(([k, v]) => { modules[k] = lmsModuleOut(v); });
  const mandatoryPassed = MANDATORY_MODULES.filter((k) => modules[k]?.passed);
  const coursesPassed = Object.keys(modules).filter((k) => k.startsWith('course:') && modules[k].passed).map((k) => k.slice(7));
  return {
    userName: doc?.userName || '',
    email: doc?.email || '',
    modules,
    mandatory: MANDATORY_MODULES,
    mandatoryPassed,
    mandatoryComplete: mandatoryPassed.length === MANDATORY_MODULES.length,
    coursesPassed,
    moduleItems: MODULE_ITEMS
  };
}

async function lmsDocFor(req, create = false) {
  const key = lmsUserKey(req.user);
  if (!key) return null;
  let doc = await LmsProgress.findOne({ userKey: key });
  if (!doc && create) doc = new LmsProgress({ userKey: key, userName: req.user?.name || '', email: req.user?.email || '', department: req.user?.department || '' });
  return doc;
}

// Is this counsellor certified to take a lead for this course?
async function lmsCheckCounsellor(name, course) {
  const n = String(name || '').trim();
  if (!n) return { ok: true, missing: [] };
  const doc = await LmsProgress.findOne({ userName: new RegExp(`^${escapeRegex(n)}$`, 'i') });
  const s = lmsSummary(doc);
  const missing = MANDATORY_MODULES.filter((k) => !s.mandatoryPassed.includes(k));
  const mod = courseModuleFor(course);
  if (mod && !s.coursesPassed.includes(mod)) missing.push(`${mod} course module`);
  return { ok: missing.length === 0, missing };
}
// LMS_ENFORCEMENT: 'warn' (default) — allocation goes through with a warning;
// 'block' — allocation refused until certified; 'off' — no check.
const LMS_MODE = () => String(process.env.LMS_ENFORCEMENT || 'warn').toLowerCase();
async function lmsGate(counsellor, course) {
  if (LMS_MODE() === 'off') return null;
  const r = await lmsCheckCounsellor(counsellor, course);
  if (r.ok) return null;
  return { blocked: LMS_MODE() === 'block', message: `${counsellor} has not completed LMS certification: ${r.missing.join(', ')}` };
}

router.get('/hr/lms/progress', async (req, res) => {
  try {
    // Leadership / Admin may look up a counsellor; everyone else sees their own
    if (req.query.userName && ['admin', 'leadership'].includes(req.user?.department)) {
      const doc = await LmsProgress.findOne({ userName: new RegExp(`^${escapeRegex(String(req.query.userName).trim())}$`, 'i') });
      return res.json(lmsSummary(doc));
    }
    res.json(lmsSummary(await lmsDocFor(req)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Certification overview for every counsellor (Leadership / Admin / HR heads)
router.get('/hr/lms/certifications', async (req, res) => {
  try {
    const docs = await LmsProgress.find().sort({ userName: 1 });
    res.json(docs.map((d) => { const s = lmsSummary(d); delete s.modules; delete s.moduleItems; return s; }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/hr/lms/progress/item', async (req, res) => {
  try {
    const { moduleKey, itemId, done = true } = req.body || {};
    if (!moduleKey || !Number.isFinite(Number(itemId))) return res.status(400).json({ error: 'moduleKey and itemId are required' });
    const doc = await lmsDocFor(req, true);
    if (!doc) return res.status(400).json({ error: 'No user on this login' });
    const m = doc.modules.get(moduleKey) || {};
    const set = new Set(m.completedItems || []);
    if (done) set.add(Number(itemId)); else set.delete(Number(itemId));
    doc.modules.set(moduleKey, { ...(m.toObject ? m.toObject() : m), completedItems: [...set].sort((a, b) => a - b) });
    await doc.save();
    res.json(lmsSummary(doc));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Questions without answers
router.get('/hr/lms/assessment/:moduleKey', async (req, res) => {
  try {
    const bank = await lmsQuestionsFor(req.params.moduleKey);
    if (!bank) return res.status(404).json({ error: 'No assessment for this module' });
    res.json({ moduleKey: req.params.moduleKey, passMark: bank.passMark, questions: bank.questions.map((q, i) => ({ id: i, q: q.q, o: q.o })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Graded on the server; best score kept, pass is permanent
router.post('/hr/lms/assessment/:moduleKey', async (req, res) => {
  try {
    const moduleKey = req.params.moduleKey;
    const bank = await lmsQuestionsFor(moduleKey);
    if (!bank) return res.status(404).json({ error: 'No assessment for this module' });
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    if (answers.length !== bank.questions.length || answers.some((a) => a === null || a === undefined)) return res.status(400).json({ error: 'Answer every question before submitting' });
    const correct = bank.questions.map((q, i) => Number(answers[i]) === q.a);
    const score = Math.round((correct.filter(Boolean).length / bank.questions.length) * 100);
    const passed = score >= bank.passMark;
    const doc = await lmsDocFor(req, true);
    if (!doc) return res.status(400).json({ error: 'No user on this login' });
    const prev = doc.modules.get(moduleKey);
    const m = prev?.toObject ? prev.toObject() : (prev || {});
    const items = MODULE_ITEMS[moduleKey];
    doc.modules.set(moduleKey, {
      ...m,
      // Passing the test also completes the lesson list
      completedItems: passed && items ? Array.from({ length: items }, (_, i) => i + 1) : (m.completedItems || []),
      attempts: (m.attempts || 0) + 1,
      lastScore: score,
      bestScore: Math.max(m.bestScore || 0, score),
      passed: Boolean(m.passed) || passed,
      passedAt: m.passed ? m.passedAt : (passed ? new Date() : null),
      lastAttemptAt: new Date()
    });
    await doc.save();
    res.json({ score, passed, passMark: bank.passMark, correct, summary: lmsSummary(doc) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
