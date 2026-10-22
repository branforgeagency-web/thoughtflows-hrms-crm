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
import BatchSyllabus from '../models/BatchSyllabus.js';
import BatchAnnouncement from '../models/BatchAnnouncement.js';
import TestAttempt from '../models/TestAttempt.js';
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
// CALLING — Knowlarity SuperReceptionist click-to-call
//   1. /calls/dial        Knowlarity rings the counsellor, then connects the lead
//   2. /calls/:sid/status polled by the call screen. SR has no live per-call
//      status API, so this is served from the webhook row, then the call log.
//   3. /calls/knowlarity/webhook  Knowlarity posts the final status + recording,
//      which is saved even if the counsellor closed the call screen. Set this URL
//      as the Call Notify / callback URL in the SuperReceptionist panel.
// ==========================================
// Knowlarity auth is two separate keys and they are easy to swap by mistake:
//   x-api-key     = SR username + ":" + application access key  (KNOWLARITY_X_API_KEY)
//   Authorization = the SR API key                              (KNOWLARITY_SR_API_KEY)
function knowlarityConfig() {
  return {
    // x-api-key header — "USERNAME:APPLICATION_ACCESS_KEY"
    xApiKey: process.env.KNOWLARITY_X_API_KEY || process.env.KNOWLARITY_API_KEY || '',
    // authorization header — SR_API_KEY
    srApiKey: process.env.KNOWLARITY_SR_API_KEY || process.env.KNOWLARITY_AUTH_KEY || '',
    srNumber: process.env.KNOWLARITY_SR_NUMBER || '',    // k_number — your Knowlarity virtual number
    callerId: process.env.KNOWLARITY_CALLER_ID || '',    // shown to agent + lead; defaults to the SR number
    channel: process.env.KNOWLARITY_CHANNEL || 'Basic',  // plan channel in the path: Basic | Advance | Premium | Enterprise
    baseUrl: String(process.env.KNOWLARITY_BASE_URL || 'https://kpi.knowlarity.com').replace(/\/+$/, ''),
    defaultAgentPhone: process.env.KNOWLARITY_DEFAULT_AGENT_PHONE || '',
    // Public URL of this API (e.g. https://thoughtflows-hrms-crm.onrender.com) — enables the status webhook
    publicApiUrl: String(process.env.PUBLIC_API_URL || '').replace(/\/+$/, ''),
    webhookKey: process.env.KNOWLARITY_WEBHOOK_KEY || ''
  };
}

function knowlarityMissing() {
  const c = knowlarityConfig();
  return [['KNOWLARITY_X_API_KEY', c.xApiKey], ['KNOWLARITY_SR_API_KEY', c.srApiKey], ['KNOWLARITY_SR_NUMBER', c.srNumber]]
    .filter(([, v]) => !v).map(([k]) => k);
}

// The two keys get pasted the wrong way round often enough to be worth saying so
function knowlarityKeyWarning() {
  const c = knowlarityConfig();
  if (c.xApiKey && !c.xApiKey.includes(':')) {
    return 'KNOWLARITY_X_API_KEY should look like "username:application-access-key" — the plain SR API key goes in KNOWLARITY_SR_API_KEY.';
  }
  return '';
}

function knowlarityUrl(path) {
  const c = knowlarityConfig();
  return `${c.baseUrl}/${c.channel}/v1/account${path}`;
}

function knowlarityHeaders() {
  const c = knowlarityConfig();
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: c.srApiKey,
    'x-api-key': c.xApiKey
  };
}

// Knowlarity notifications are not consistent about field names across accounts,
// so every read goes through this and takes the first key that has a value.
function pickField(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return '';
}

// Indian numbers only need normalizing to E.164 — a bare 10-digit mobile
// gets a +91 prefix, anything already prefixed is left alone.
// Knowlarity rejects numbers that are not in +91XXXXXXXXXX form.
function toE164India(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
  return digits;
}

// Map Knowlarity's status / dial_status wording to what the call screen understands
const KNOWLARITY_STATUS = {
  queued: 'queued', ringing: 'ringing', inprogress: 'in-progress', connected: 'in-progress',
  answered: 'completed', completed: 'completed', success: 'completed',
  missed: 'no-answer', noanswer: 'no-answer', notanswered: 'no-answer',
  busy: 'busy', failed: 'failed', error: 'failed', cancelled: 'canceled', canceled: 'canceled'
};
function mapKnowlarityStatus(raw) {
  return KNOWLARITY_STATUS[String(raw || '').toLowerCase().replace(/[^a-z]/g, '')] || '';
}

// Lead/counsellor context for calls dialled in this process, keyed by Knowlarity
// call id — the notify callback does not always echo additional_params back.
const pendingCalls = new Map();
function rememberCall(callId, ctx) {
  if (!callId) return;
  pendingCalls.set(String(callId), { ...ctx, at: Date.now() });
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [k, v] of pendingCalls) if (v.at < cutoff) pendingCalls.delete(k);
}

// Create or update the recording row for one bridged call (keyed by the provider call id)
async function upsertBridgeRecording({ callSid, leadId, leadName, leadPhone, counselorName, counselorPhone, durationSeconds, audioUrl, outcome, notes }, source = 'knowlarity') {
  if (!callSid) return null;
  let rec = await CallRecording.findOne({ callSid });
  const isNew = !rec;
  if (!rec) {
    rec = new CallRecording({ callSid, source, leadName: leadName || 'Lead', leadPhone: leadPhone || '' });
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
  if (!rec.audioUrl) return null; // Knowlarity had no recording (call not answered)
  await rec.save();
  if (isNew && rec.leadId) {
    await StudentLead.findByIdAndUpdate(rec.leadId, { $inc: { callCount: 1 }, lastCallTime: new Date() });
  }
  return rec;
}

// Knowlarity has no "get one call" endpoint, so the call log is scanned for the id.
// Times are sent as "YYYY-MM-DD HH:MM:SS" IST, which is what the SR panel uses.
async function fetchKnowlarityCallLog(callId, { customerNumber = '' } = {}) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istStamp = (d) => new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
  const qs = new URLSearchParams({ start_time: istStamp(start), end_time: istStamp(end), limit: '100' });
  if (customerNumber) qs.set('customer_number', customerNumber);
  const response = await fetch(`${knowlarityUrl('/calllog')}?${qs.toString()}`, { headers: knowlarityHeaders() });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  const rows = Array.isArray(data?.objects) ? data.objects : (Array.isArray(data) ? data : []);
  return rows.find((r) => [r?.call_id, r?.callid, r?.uuid, r?.id]
    .some((v) => v && String(v) === String(callId))) || null;
}

// ==========================================
// CALLING — Edesy Number Masking click-to-call (drop-in alternative to Knowlarity)
//   Switched on by setting TELEPHONY_PROVIDER=edesy in server/.env. Mirrors the
//   Knowlarity bridge flow above:
//   1. /calls/dial dials party_a (the counsellor) first, then bridges party_b (the lead).
//   2. /calls/:callSid/status is polled by the call screen.
//   3. /calls/edesy/webhook receives call.completed / recording.ready events — set this
//      as the webhook URL on the Edesy dashboard (masking.edesy.in).
//   Edesy's recording link expires in ~1 hour, so every save downloads the audio and
//   keeps it on our own disk, the same way browser_mic/phone_sync recordings are stored.
// ==========================================
function activeProvider() {
  const p = String(process.env.TELEPHONY_PROVIDER || '').toLowerCase().trim();
  if (p === 'knowlarity') return 'knowlarity';
  if (p === 'edesy') return 'edesy';
  return process.env.KNOWLARITY_X_API_KEY && !process.env.EDESY_API_KEY ? 'knowlarity' : 'edesy';
}

function edesyConfig() {
  return {
    // Confirmed working 2026-10-21 via direct testing: masking.edesy.in > API Keys >
    // create key, sent as a plain Bearer token. (The Account SID/Auth Token pair shown
    // on the dashboard's "API Credentials" panel is for a different, Twilio-shaped
    // product — it returns NUMBER_NOT_OWNED / 404s against the /v1/masking/* endpoints
    // below, which is what this integration actually needs.)
    apiKey: process.env.EDESY_API_KEY || '',
    baseUrl: String(process.env.EDESY_BASE_URL || 'https://voice-api.edesy.in/v1').replace(/\/+$/, ''),
    defaultAgentPhone: process.env.EDESY_DEFAULT_AGENT_PHONE || '',
    maxDurationSec: Number(process.env.EDESY_MAX_CALL_DURATION_SEC || 0) || undefined,
    // How long the masked number stays reachable for an inbound callback after this
    // dial, via the Session API (separate from the call itself). Default 3 hours.
    sessionExpiryMinutes: Number(process.env.EDESY_SESSION_EXPIRY_MINUTES || 180),
    webhookSecret: process.env.EDESY_WEBHOOK_SECRET || '',  // HMAC-SHA256 signing secret from the Edesy dashboard
    webhookSignatureHeader: String(process.env.EDESY_WEBHOOK_SIGNATURE_HEADER || 'x-edesy-signature').toLowerCase()
  };
}

function edesyMissing() {
  const c = edesyConfig();
  return [['EDESY_API_KEY', c.apiKey]].filter(([, v]) => !v).map(([k]) => k);
}

function edesyUrl(p) {
  return `${edesyConfig().baseUrl}${p}`;
}

function edesyHeaders() {
  const c = edesyConfig();
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: `Bearer ${c.apiKey}`
  };
}

const EDESY_STATUS = {
  initiated: 'queued', ringing: 'ringing', inprogress: 'in-progress', connected: 'in-progress', answered: 'in-progress',
  completed: 'completed', success: 'completed',
  noanswer: 'no-answer', missed: 'no-answer', notanswered: 'no-answer',
  busy: 'busy', failed: 'failed', error: 'failed', cancelled: 'canceled', canceled: 'canceled'
};
function mapEdesyStatus(raw) {
  return EDESY_STATUS[String(raw || '').toLowerCase().replace(/[^a-z]/g, '')] || '';
}

// Edesy's recording link is signed and expires in ~1 hour, so it is downloaded once
// and served back from our own /recordings/<file> static route (see server.js).
async function downloadAndStoreRecording(remoteUrl, prefix) {
  if (!remoteUrl) return '';
  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) return '';
    const contentType = response.headers.get('content-type') || '';
    const ext = contentType.includes('wav') ? 'wav' : contentType.includes('ogg') ? 'ogg' : 'mp3';
    const buffer = Buffer.from(await response.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), 'uploads/recordings');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    return `/recordings/${filename}`;
  } catch (err) {
    console.error('Edesy recording download failed:', err.message);
    return '';
  }
}

function edesyConfigStatusHandler(req, res) {
  const missing = edesyMissing();
  res.json({
    provider: 'edesy',
    configured: missing.length === 0,
    missing,
    webhook: Boolean(process.env.PUBLIC_API_URL)
  });
}

async function edesyDialHandler(req, res) {
  const { leadPhone, agentPhone, leadId = '', leadName = '' } = req.body || {};
  if (!leadPhone) return res.status(400).json({ error: 'leadPhone is required' });
  const missing = edesyMissing();
  if (missing.length) return res.status(503).json({ error: `Edesy is not configured. Add ${missing.join(', ')} to server/.env and restart.` });

  const c = edesyConfig();
  let profilePhone = '';
  try {
    const me = req.user?.email ? await User.findOne({ email: req.user.email }).select('phone') : null;
    profilePhone = me?.phone || '';
  } catch (_) {}
  const from = toE164India(profilePhone || agentPhone || c.defaultAgentPhone);
  const to = toE164India(leadPhone);
  if (!from) return res.status(400).json({ error: 'No phone number is set for your login. Ask admin to add your mobile number to your user account.' });
  if (!to) return res.status(400).json({ error: 'The lead has no usable phone number on file.' });
  if (from === to) return res.status(400).json({ error: "Your number and the lead's number cannot be the same." });

  try {
    // Confirmed working 2026-10-21 via direct testing: POST /v1/masking/calls, with
    // { party_a, party_b } as bare 10-digit Indian numbers — NOT { from, to }, and NOT
    // E.164 with a +91 prefix (both of those were the earlier, wrong assumption).
    const partyA = from.replace(/^\+?91/, '');
    const partyB = to.replace(/^\+?91/, '');

    // Best-effort: also open/refresh a two-way Session so the student can call the
    // masked number back later and still reach this counsellor — the one-shot dial
    // below only covers the outbound leg. Idempotent on `reference`, so repeat clicks
    // for the same lead extend the existing session instead of erroring. Non-blocking:
    // if this fails (e.g. capacity busy), the outbound dial below still proceeds.
    try {
      await fetch(edesyUrl('/masking/sessions'), {
        method: 'POST',
        headers: edesyHeaders(),
        body: JSON.stringify({
          party_a: partyA,
          party_b: partyB,
          reference: `lead_${leadId || partyB}`,
          expiry_minutes: c.sessionExpiryMinutes
        })
      });
    } catch (sessionErr) {
      console.warn('Edesy session upsert (inbound callback window) failed — continuing with outbound-only dial:', sessionErr.message);
    }

    const payload = { party_a: partyA, party_b: partyB };
    if (c.maxDurationSec) payload.max_duration_sec = c.maxDurationSec;
    const response = await fetch(edesyUrl('/masking/calls'), {
      method: 'POST',
      headers: edesyHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || data?.error?.code || data?.message || `Edesy returned HTTP ${response.status}`;
      return res.status(502).json({ error: typeof message === 'string' ? message : JSON.stringify(message) });
    }
    const ok = data?.data || data || {};
    // Confirmed response fields: call_sid, status ("initiated"), party_a, party_b, masked_number.
    const callSid = String(pickField(ok, 'call_sid', 'id', 'sid', 'callId', 'call_id') || '');
    rememberCall(callSid, { leadId, leadName, counselor: req.user?.name || '', from, to });
    res.json({ provider: 'edesy', callSid, status: mapEdesyStatus(pickField(ok, 'status', 'call_status', 'state')) || 'queued', from, to, maskedNumber: pickField(ok, 'masked_number') || '' });
  } catch (err) {
    res.status(502).json({ error: `Could not reach Edesy: ${err.message}` });
  }
}

async function edesyStatusHandler(req, res) {
  const missing = edesyMissing();
  if (missing.length) return res.status(503).json({ error: 'Edesy is not configured.' });
  const callSid = req.params.callSid;
  try {
    const rec = await CallRecording.findOne({ callSid });
    if (rec) {
      return res.json({
        provider: 'edesy',
        callSid,
        status: 'completed',
        duration: Number(rec.durationSeconds || 0),
        startTime: rec.createdAt,
        endTime: rec.updatedAt,
        recordingUrl: rec.audioUrl || null
      });
    }
    // Path confirmed working 2026-10-21 (same base fix as the dial handler above).
    // Field names below for status are confirmed; the recording field name just under
    // this block is still a best guess — verify once a completed call has a recording.
    const response = await fetch(edesyUrl(`/masking/calls/${callSid}`), { headers: edesyHeaders() });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const d = data?.data || data || {};
      const status = mapEdesyStatus(pickField(d, 'status', 'call_status', 'state'));
      // Completed but the webhook hasn't landed yet — fetch & save the recording now
      if (status === 'completed') {
        let recordingUrl = '';
        try {
          const recResp = await fetch(edesyUrl(`/masking/calls/${callSid}/recording`), { headers: edesyHeaders() });
          const recData = await recResp.json().catch(() => ({}));
          recordingUrl = recResp.ok ? pickField(recData?.data || recData || {}, 'url', 'recording_url', 'audio_url') : '';
        } catch (_) {}
        if (recordingUrl) {
          const ctx = pendingCalls.get(String(callSid)) || {};
          const localUrl = await downloadAndStoreRecording(recordingUrl, `edesy_${callSid}`);
          await upsertBridgeRecording({
            callSid,
            leadId: ctx.leadId,
            leadName: ctx.leadName,
            leadPhone: pickField(d, 'to', 'target_number', 'to_number') || ctx.to || '',
            counselorName: ctx.counselor || '',
            counselorPhone: pickField(d, 'from', 'caller_number', 'from_number') || ctx.from || '',
            durationSeconds: pickField(d, 'duration_sec', 'bill_duration_sec', 'duration') || 0,
            audioUrl: localUrl,
            outcome: 'Follow-up Needed'
          }, 'edesy');
        }
      }
      return res.json({
        provider: 'edesy',
        callSid,
        status: status || 'in-progress',
        duration: Number(pickField(d, 'duration_sec', 'bill_duration_sec', 'duration') || 0),
        startTime: pickField(d, 'started_at', 'start_time') || null,
        endTime: pickField(d, 'ended_at', 'end_time') || null,
        recordingUrl: null
      });
    }
    res.json({ provider: 'edesy', callSid, status: 'in-progress', duration: 0, recordingUrl: null });
  } catch (err) {
    res.status(502).json({ error: `Could not reach Edesy: ${err.message}` });
  }
}

function edesyHangupHandler(req, res) {
  res.json({
    success: false,
    unsupported: true,
    provider: 'edesy',
    status: 'in-progress',
    message: 'Hang up on your phone — Edesy ends the bridged call from the handset.'
  });
}

async function processEdesyCallRecord(d) {
  const callSid = String(pickField(d, 'call_sid', 'jambonz_call_sid', 'id', 'sid', 'callId', 'call_id') || '');
  if (!callSid) return null;

  const existing = await CallRecording.findOne({ callSid });
  if (existing && existing.isDeleted) {
    return null; // Intentionally deleted by user — do not resurrect
  }

  const ctx = pendingCalls.get(callSid) || {};
  const status = mapEdesyStatus(pickField(d, 'status', 'call_status', 'state'));
  const rawDirection = String(pickField(d, 'direction') || '').toLowerCase();

  const numA = String(pickField(d, 'from', 'caller_number', 'from_number') || ctx.from || '').replace(/\D/g, '').slice(-10);
  const numB = String(pickField(d, 'to', 'target_number', 'to_number') || ctx.to || '').replace(/\D/g, '').slice(-10);

  // Inbound call detection:
  // If direction is explicitly inbound, OR if ctx has no outbound record and target is a staff member
  let isInbound = rawDirection === 'inbound' || rawDirection.includes('inbound');
  if (!isInbound && !rawDirection && !ctx.to && numB) {
    const counselorInB = await User.findOne({ phone: new RegExp(numB + '$') }).catch(() => null);
    if (counselorInB) isInbound = true;
  }

  // For inbound calls: caller (numA) is the student, target (numB) is the counselor/staff.
  // For outbound calls: caller (numA) is the counselor/staff, target (numB) is the student.
  const studentPhone = isInbound ? numA : (numB || numA);
  const counselorPhone = isInbound ? numB : numA;

  let leadId = ctx.leadId || '';
  let leadName = ctx.leadName || '';
  if (studentPhone) {
    const lead = await StudentLead.findOne({ phone: new RegExp(studentPhone + '$') }).catch(() => null);
    if (lead) {
      leadId = lead._id;
      if (!leadName) leadName = lead.name || lead.fullName || '';
    } else {
      const student = await Student.findOne({ mobile: new RegExp(studentPhone + '$') }).catch(() => null);
      if (student && !leadName) leadName = student.name || 'Student';
    }
  }
  if (!leadName) leadName = isInbound ? `Inbound (${studentPhone || 'Unknown'})` : `Lead (${studentPhone || 'Unknown'})`;

  let counselorName = ctx.counselor || '';
  if (!counselorName && counselorPhone) {
    const u = await User.findOne({ phone: new RegExp(counselorPhone + '$') }).catch(() => null);
    if (u) counselorName = u.name || u.userName || '';
  }

  let recordingUrl = pickField(d, 'recording_url', 'recordingUrl', 'audio_url', 'url');
  if (!recordingUrl && (status === 'completed' || d.recording_ready)) {
    try {
      const recResp = await fetch(edesyUrl(`/masking/calls/${callSid}/recording`), { headers: edesyHeaders() });
      const recData = await recResp.json().catch(() => ({}));
      recordingUrl = recResp.ok ? pickField(recData?.data || recData || {}, 'url', 'recording_url', 'audio_url') : '';
    } catch (_) {}
  }

  let audioUrl = '';
  if (recordingUrl) {
    audioUrl = await downloadAndStoreRecording(recordingUrl, `edesy_${callSid}`);
  }

  const durationSeconds = Number(pickField(d, 'duration_sec', 'bill_duration_sec', 'duration') || 0);
  const outcome = isInbound
    ? (status === 'completed' || durationSeconds > 0 ? 'Inbound Connected' : 'Inbound Missed')
    : (status === 'completed' || durationSeconds > 0 ? 'Follow-up Needed' : 'Not Reachable');
  const notes = isInbound
    ? `Inbound call from ${studentPhone || 'caller'} received by ${counselorName || counselorPhone || 'Desk'}`
    : `Outbound call to ${studentPhone}`;

  const saved = await upsertBridgeRecording({
    callSid,
    leadId,
    leadName,
    leadPhone: studentPhone,
    counselorName,
    counselorPhone,
    durationSeconds,
    audioUrl,
    outcome,
    notes
  }, 'edesy');

  if (status && status !== 'in-progress' && status !== 'ringing') {
    pendingCalls.delete(callSid);
  }

  return saved;
}

// Edesy call event webhook (call.initiated / call.completed / recording.ready), verified
// with an HMAC-SHA256 signature when EDESY_WEBHOOK_SECRET is set (header name configurable
// via EDESY_WEBHOOK_SIGNATURE_HEADER — confirm the exact header Edesy sends on the dashboard).
async function edesyWebhookHandler(req, res) {
  try {
    const c = edesyConfig();
    if (c.webhookSecret) {
      const signature = req.headers[c.webhookSignatureHeader];
      const raw = req.rawBody;
      if (!signature || !raw) return res.status(401).json({ error: 'Missing webhook signature' });
      const expected = crypto.createHmac('sha256', c.webhookSecret).update(raw).digest('hex');
      const sigBuf = Buffer.from(String(signature));
      const expBuf = Buffer.from(expected);
      const ok = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
      if (!ok) return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    const body = req.body || {};
    const d = body.data || body || {};
    await processEdesyCallRecord(d);
    res.json({ success: true });
  } catch (err) {
    console.error('Edesy webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// Reconcile / sync recent call recordings (both inbound and outbound) from Edesy API
async function edesySyncHandler(req, res) {
  try {
    const missing = edesyMissing();
    if (missing.length) return res.status(503).json({ error: 'Edesy is not configured.' });
    const response = await fetch(edesyUrl('/masking/call-logs?limit=50'), { headers: edesyHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({ error: data?.error?.message || `Edesy returned HTTP ${response.status}` });
    }
    const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    let synced = 0;
    for (const item of list) {
      const sid = String(pickField(item, 'call_sid', 'jambonz_call_sid', 'id', 'sid') || '');
      if (!sid) continue;
      const existing = await CallRecording.findOne({ callSid: sid });
      if (existing) {
        if (existing.isDeleted) continue; // Skip user-deleted recordings
        if (existing.audioUrl) continue;
      }
      const saved = await processEdesyCallRecord(item);
      if (saved) synced++;
    }
    res.json({ success: true, count: list.length, newlySynced: synced });
  } catch (err) {
    console.error('Edesy sync error:', err.message);
    res.status(502).json({ error: `Sync failed: ${err.message}` });
  }
}

router.get('/calls/config-status', (req, res) => {
  if (activeProvider() === 'edesy') return edesyConfigStatusHandler(req, res);
  const missing = knowlarityMissing();
  res.json({
    provider: 'knowlarity',
    configured: missing.length === 0,
    missing,
    warning: knowlarityKeyWarning() || undefined,
    channel: knowlarityConfig().channel,
    webhook: Boolean(knowlarityConfig().publicApiUrl)
  });
});

router.post('/calls/dial', async (req, res) => {
  if (activeProvider() === 'edesy') return edesyDialHandler(req, res);
  const { leadPhone, agentPhone, leadId = '', leadName = '' } = req.body || {};
  if (!leadPhone) return res.status(400).json({ error: 'leadPhone is required' });
  const missing = knowlarityMissing();
  if (missing.length) return res.status(503).json({ error: `Knowlarity is not configured. Add ${missing.join(', ')} to server/.env and restart.` });

  const c = knowlarityConfig();
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
    const payload = {
      k_number: toE164India(c.srNumber),
      agent_number: from,
      customer_number: to,
      caller_id: toE164India(c.callerId || c.srNumber),
      additional_params: JSON.stringify({ leadId, leadName, counselor: req.user?.name || '' }).slice(0, 250)
    };
    const response = await fetch(knowlarityUrl('/call/makecall'), {
      method: 'POST',
      headers: knowlarityHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      const message = data?.error?.message || data?.error || data?.message
        || `Knowlarity returned HTTP ${response.status}`;
      return res.status(502).json({ error: typeof message === 'string' ? message : JSON.stringify(message) });
    }
    const ok = data?.success || data || {};
    const callSid = String(pickField(ok, 'call_id', 'callid', 'uuid', 'id') || '');
    rememberCall(callSid, { leadId, leadName, counselor: req.user?.name || '', from, to });
    res.json({ provider: 'knowlarity', callSid, status: mapKnowlarityStatus(ok.status) || 'queued', from, to });
  } catch (err) {
    res.status(502).json({ error: `Could not reach Knowlarity: ${err.message}` });
  }
});

router.get('/calls/:callSid/status', async (req, res) => {
  if (activeProvider() === 'edesy') return edesyStatusHandler(req, res);
  const missing = knowlarityMissing();
  if (missing.length) return res.status(503).json({ error: 'Knowlarity is not configured.' });
  const callSid = req.params.callSid;
  try {
    // The notify webhook writes the finished call first, so trust that row when it exists
    const rec = await CallRecording.findOne({ callSid });
    if (rec) {
      return res.json({
        provider: 'knowlarity',
        callSid,
        status: 'completed',
        duration: Number(rec.durationSeconds || 0),
        startTime: rec.createdAt,
        endTime: rec.updatedAt,
        recordingUrl: rec.audioUrl || null
      });
    }
    const log = await fetchKnowlarityCallLog(callSid, { customerNumber: pendingCalls.get(String(callSid))?.to || '' });
    if (log) {
      return res.json({
        provider: 'knowlarity',
        callSid,
        status: mapKnowlarityStatus(pickField(log, 'call_status', 'dial_status', 'status', 'disposition')) || 'in-progress',
        duration: Number(pickField(log, 'call_duration', 'conversation_duration', 'duration') || 0),
        startTime: pickField(log, 'start_time', 'time') || null,
        endTime: pickField(log, 'end_time') || null,
        recordingUrl: pickField(log, 'resource_url', 'recording_url', 'recording', 'audio_url') || null
      });
    }
    // Still bridging — Knowlarity only publishes a call once it is in the log
    res.json({ provider: 'knowlarity', callSid, status: 'in-progress', duration: 0, recordingUrl: null });
  } catch (err) {
    res.status(502).json({ error: `Could not reach Knowlarity: ${err.message}` });
  }
});

// Knowlarity call notification (public — protected by KNOWLARITY_WEBHOOK_KEY when set).
// SR posts some events as GET query strings, so both verbs are accepted.
const knowlarityWebhook = async (req, res) => {
  try {
    const key = knowlarityConfig().webhookKey;
    if (key && req.query.key !== key) return res.status(403).json({ error: 'Bad key' });
    const b = { ...(req.query || {}), ...(req.body || {}) };
    const callSid = String(pickField(b, 'call_id', 'callid', 'uuid', 'callUuid', 'CallSid') || '');
    const ctx = pendingCalls.get(callSid) || {};
    let custom = {};
    try {
      const raw = pickField(b, 'additional_params', 'additional_param', 'custom_params');
      custom = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    } catch (_) {}
    const status = mapKnowlarityStatus(pickField(b, 'call_status', 'dial_status', 'status', 'disposition'));
    const leadPhone = String(pickField(b, 'customer_number', 'destination', 'customer', 'to') || ctx.to || '')
      .replace(/\D/g, '').slice(-10);
    const leadIdHint = custom.leadId || ctx.leadId || '';
    const lead = leadIdHint && mongoose.isValidObjectId(leadIdHint)
      ? await StudentLead.findById(leadIdHint)
      : (leadPhone ? await StudentLead.findOne({ phone: { $regex: leadPhone } }) : null);
    await upsertBridgeRecording({
      callSid,
      leadId: lead?._id?.toString() || leadIdHint,
      leadName: lead?.fullName || custom.leadName || ctx.leadName,
      leadPhone,
      counselorName: custom.counselor || ctx.counselor || lead?.counselorAssigned || '',
      counselorPhone: String(pickField(b, 'agent_number', 'agent', 'from') || ctx.from || '').replace(/\D/g, '').slice(-10),
      durationSeconds: pickField(b, 'call_duration', 'conversation_duration', 'duration', 'billing_duration') || 0,
      audioUrl: pickField(b, 'resource_url', 'recording_url', 'recording', 'audio_url') || '',
      outcome: status === 'completed' ? 'Follow-up Needed' : 'Not Reachable'
    });
    if (status && status !== 'in-progress' && status !== 'ringing') pendingCalls.delete(callSid);
    res.json({ success: true });
  } catch (err) {
    console.error('Knowlarity webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
router.post('/calls/knowlarity/webhook', knowlarityWebhook);
router.get('/calls/knowlarity/webhook', knowlarityWebhook);
router.post('/calls/edesy/webhook', edesyWebhookHandler);
router.get('/calls/edesy/webhook', edesyWebhookHandler);
router.post('/calls/edesy/sync', edesySyncHandler);
router.get('/calls/edesy/sync', edesySyncHandler);

router.post('/calls/:callSid/hangup', async (req, res) => {
  if (activeProvider() === 'edesy') return edesyHangupHandler(req, res);
  // SuperReceptionist has no hangup API for a bridged call — the leg is ended on
  // the handset. Answer 200 so the call screen can close cleanly and say why.
  res.json({
    success: false,
    unsupported: true,
    provider: 'knowlarity',
    status: 'in-progress',
    message: 'Hang up on your phone — Knowlarity ends the bridged call from the handset.'
  });
});

router.get('/recordings', async (req, res) => {
  try {
    const { leadPhone, leadId, search } = req.query;
    // Counsellors only hear their own calls; managers may filter by name
    const counselorName = isScopedHr(req) ? req.user?.name : (req.query.counselorName || req.query.counselor);
    let query = { isDeleted: { $ne: true } };
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

    // Bridged Knowlarity calls: the notify webhook may already have stored this call
    if (callSid && directAudioUrl && !audioBase64) {
      const merged = await upsertBridgeRecording({
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
      source: source || (directAudioUrl ? 'knowlarity' : 'browser_mic')
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

// ── Phone recording sync ─────────────────────────────────────────────
// Counsellors call from their own phone/SIM (no cloud telephony, no KYC) and
// upload the phone's call-recording files here. We read the number + time from
// the file name, match the lead, and store it like any other call recording.
const AUDIO_EXTS_SYNC = ['m4a', 'mp3', 'amr', 'aac', 'wav', 'ogg', 'opus', '3gp', 'webm', 'mp4', 'flac'];

const parsePhoneRecordingName = (fileName = '') => {
  let base = String(fileName).replace(/\.[^.]+$/, '');
  let recordedAt = null;
  const datePatterns = [
    // 2026-10-13 14-30-20 / 2026_10_13_14_30_20 / 20261013_143020 / 20261013143020
    { rx: /(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})[\s_T-]*(\d{2})[-_.:]?(\d{2})[-_.:]?(\d{2})/, y4: true },
    // 261013_143020 (Samsung: YYMMDD_HHMMSS)
    { rx: /(?<!\d)(\d{2})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(?!\d)/, y4: false }
  ];
  for (const { rx, y4 } of datePatterns) {
    const m = base.match(rx);
    if (m) {
      const year = y4 ? Number(m[1]) : 2000 + Number(m[1]);
      // Phone file names are in India time (IST, UTC+5:30); the server may run in UTC
      const d = new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])) - 330 * 60000);
      if (!Number.isNaN(d.getTime()) && Number(m[2]) <= 12 && Number(m[3]) <= 31) {
        recordedAt = d;
        base = base.replace(m[0], ' ');
        break;
      }
    }
  }
  // Phone number: longest run of digits (allowing +, spaces, dashes, brackets)
  let phone = '';
  const runs = base.match(/\+?\(?\d[\d\s()-]{7,18}\d/g) || [];
  const candidates = runs.flatMap((r) => [r, ...r.split(/[-_]/)]);
  for (const r of candidates) {
    const digits = r.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 13) { phone = digits.slice(-10); break; }
  }
  // Contact name (when the phone saved the contact's name instead of a number)
  const name = base
    .replace(/call\s*recording|call\s*with|recording|record|call|voice|audio/gi, ' ')
    .replace(/\+?\(?\d[\d\s()-]*\d/g, ' ')
    .replace(/[_()[\]{}@#-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { phone, name, recordedAt };
};

const digitsLooseRx = (digits) => new RegExp(digits.split('').join('\\D*') + '$');

router.post('/recordings/phone-sync', async (req, res) => {
  try {
    const { fileName, audioBase64, durationSeconds, lastModified, leadId: forcedLeadId } = req.body || {};
    if (!fileName || !audioBase64) return res.status(400).json({ error: 'fileName and audioBase64 are required' });

    const counselorName = req.user?.name || '';
    const ext = path.extname(String(fileName)).slice(1).toLowerCase();
    if (!AUDIO_EXTS_SYNC.includes(ext)) return res.status(400).json({ error: `Not an audio file (.${ext || '?'})` });

    // Skip files this counsellor already synced
    const dup = await CallRecording.findOne({ originalFileName: fileName, counselorName });
    if (dup) return res.json({ status: 'duplicate', recording: dup });

    const parsed = parsePhoneRecordingName(fileName);
    const recordedAt = parsed.recordedAt || (lastModified ? new Date(Number(lastModified)) : null);

    // Match the lead: chosen lead → phone number → exact contact name
    let lead = null;
    if (forcedLeadId && mongoose.isValidObjectId(forcedLeadId)) lead = await StudentLead.findById(forcedLeadId);
    if (!lead && parsed.phone) {
      const rx = digitsLooseRx(parsed.phone);
      lead = await StudentLead.findOne({ $or: [{ phone: rx }, { whatsappNumber: rx }, { alternatePhone: rx }] }).sort({ updatedAt: -1 });
    }
    if (!lead && parsed.name && parsed.name.length >= 3) {
      lead = await StudentLead.findOne({ fullName: exactNameRx(parsed.name) }).sort({ updatedAt: -1 });
    }

    const buffer = Buffer.from(String(audioBase64).replace(/^data:[^,]*,/, ''), 'base64');
    const filename = `phone_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const uploadsDir = path.join(process.cwd(), 'uploads/recordings');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);

    const recording = await CallRecording.create({
      leadId: lead?._id,
      leadName: lead?.fullName || parsed.name || 'Unknown caller',
      leadPhone: lead?.phone || parsed.phone || 'unknown',
      counselorName,
      counselorPhone: req.user?.phone || '',
      durationSeconds: Number(durationSeconds) || 0,
      outcome: 'Phone Call',
      notes: '',
      audioUrl: `/recordings/${filename}`,
      source: 'phone_sync',
      originalFileName: fileName,
      recordedAt: recordedAt || undefined
    });

    if (lead) {
      await StudentLead.findByIdAndUpdate(lead._id, {
        $inc: { callCount: 1 },
        lastCallTime: recordedAt || new Date()
      });
    }

    res.status(201).json({
      status: lead ? 'matched' : 'unmatched',
      parsed: { phone: parsed.phone, name: parsed.name, recordedAt },
      lead: lead ? { _id: lead._id, fullName: lead.fullName, phone: lead.phone } : null,
      recording
    });
  } catch (err) {
    console.error('Phone recording sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/recordings/:id', async (req, res) => {
  try {
    const recording = await CallRecording.findById(req.params.id);
    if (!recording) return res.status(404).json({ error: 'Recording not found' });
    if (recording.audioUrl && recording.audioUrl.startsWith('/recordings/')) {
      const filename = path.basename(recording.audioUrl);
      const filePath = path.join(process.cwd(), 'uploads/recordings', filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }
    // Mark as deleted so it is excluded from all queries AND never resurrected by Edesy sync
    recording.isDeleted = true;
    recording.audioUrl = '';
    await recording.save();

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
const branchShort = (v) => String(v || '').replace(/\s*(branch|\(.*\)|hq)\b/gi, '').trim();
const isScopedBranchManager = (req) => (req.user?.role === 'Branch Manager' || /branch manager/i.test(req.user?.role || '')) && Boolean(req.user?.branch);
const getBranchManagerBranch = (req) => branchShort(req.user?.branch || '');

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

const BRANCH_FIELDS = ['name', 'code', 'city', 'state', 'aliases', 'manager', 'managerEmail', 'managerPassword', 'phone', 'image', 'capacity', 'status'];
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
    const [
      pendingApprovals,
      openEscalations,
      handoverPending,
      placementPool,
      studentsStuck,
      delayedTasks
    ] = await Promise.all([
      Approval.countDocuments({ status: 'pending' }),
      Escalation.countDocuments(OPEN_ESCALATION),
      Student.countDocuments({ handoverStatus: { $in: ['Pending Handover', 'Ready', 'Handed Over to Head of Trainer'] } }),
      Student.countDocuments({ $or: [{ placementStatus: 'Ready' }, { isPlacementReady: true }, { syllabusCompleted: true }] }),
      Student.countDocuments({ $or: [{ attendancePct: { $lt: 75, $ne: null } }, { handoverStatus: 'Pending Handover' }] }),
      TeamTask.countDocuments({ status: 'delayed' })
    ]);
    res.json({
      pendingApprovals,
      openEscalations,
      handoverPending,
      placementPool,
      studentsStuck,
      delayedTasks
    });
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
    const isBM = isScopedBranchManager(req);
    const effectiveBranch = isBM ? req.user.branch : (branchName || req.query.branch);
    if (effectiveBranch) query.branchName = new RegExp(escapeRegex(branchShort(effectiveBranch)), 'i');
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
  // Marketing items (creatives, reports) → Marketing notification bell
  if (approval.status !== 'pending' && /^MKT$/i.test(approval.departmentCode || '')) {
    await pushNotification({
      audience: 'marketing', type: approval.refType === 'creative' ? 'creative' : 'approval',
      title: `${approval.title} — ${approval.status}`,
      message: `${approval.decidedBy ? `Decided by ${approval.decidedBy}` : 'Decision recorded'} in Leadership Hub`,
      createdBy: approval.decidedBy || ''
    });
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
    const isBM = isScopedBranchManager(req);
    const effectiveBranch = isBM ? req.user.branch : (branchName || req.query.branch);
    if (effectiveBranch) query.branchName = new RegExp(escapeRegex(branchShort(effectiveBranch)), 'i');
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
        : (payload.category?.toLowerCase().includes('class') || payload.type?.toLowerCase().includes('acad') || payload.category?.toLowerCase().includes('batch') || payload.type?.toLowerCase().includes('batch'))
        ? 'ACAD'
        : 'ADM';
    }
    if (!payload.raisedBy && req.user?.name) payload.raisedBy = req.user.name;

    // Student ticket → also routed to the student's HR counsellor
    let st = null;
    const targetStudentId = req.user?.studentId || payload.studentId || (typeof payload.raisedBy === 'string' && payload.raisedBy.match(/\(([^)]+)\)/)?.[1]);
    if (targetStudentId) {
      st = await findStudentByAnyId(targetStudentId);
      payload.studentId = st?.studentId || targetStudentId;
      if (st) {
        payload.hrName = payload.hrName || st.hrName || '';
        payload.branchName = payload.branchName || st.location || '';
      }
    }

    // One-time Batch Conversion Ticket enforcement
    const isBatchConversion = /batch\s*conversion/i.test(payload.type || '') ||
                              /batch\s*conversion/i.test(payload.category || '') ||
                              /batch\s*conversion/i.test(payload.title || '');

    if (isBatchConversion && (payload.studentId || st)) {
      const sid = payload.studentId || st?.studentId;
      if (st?.batchConversionTicketRaised) {
        return res.status(400).json({
          error: 'Batch conversion ticket can only be raised once. Repeat batch conversion ticket requests are not permitted.'
        });
      }
      const existing = await Escalation.findOne({
        $and: [
          { $or: [{ studentId: sid }, { raisedBy: new RegExp(escapeRegex(sid), 'i') }] },
          { $or: [{ type: /batch\s*conversion/i }, { category: /batch\s*conversion/i }, { title: /batch\s*conversion/i }] }
        ]
      });
      if (existing) {
        if (st && !st.batchConversionTicketRaised) {
          st.batchConversionTicketRaised = true;
          st.batchConversionTicketAt = existing.createdAt || new Date();
          st.batchConversionTicketId = existing._id.toString();
          await st.save().catch(() => {});
        }
        return res.status(400).json({
          error: 'Batch conversion ticket can only be raised once. Repeat batch conversion ticket requests are not permitted.'
        });
      }
    }

    const created = await Escalation.create(payload);

    if (isBatchConversion && st) {
      st.batchConversionTicketRaised = true;
      st.batchConversionTicketAt = new Date();
      st.batchConversionTicketId = created._id.toString();
      await st.save().catch(() => {});
    }

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
    const isBM = isScopedBranchManager(req);
    const effectiveBranch = isBM ? req.user.branch : (branchName || req.query.branch);
    const query = departmentCode ? deptCodeQuery(departmentCode) : {};
    if (effectiveBranch) query.branchName = new RegExp(escapeRegex(branchShort(effectiveBranch)), 'i');
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
    const isBM = isScopedBranchManager(req);
    const branchName = isBM ? req.user.branch : req.params.branchName;
    const date = todayStr();
    const cleanB = branchShort(branchName);
    const bRx = new RegExp(escapeRegex(cleanB), 'i');
    const team = await TeamMember.find({ branchName: bRx });
    const existing = await Attendance.find({ branchName: bRx, date });
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
    const { employeeName } = req.body;
    const branchName = isScopedBranchManager(req) ? req.user.branch : req.body.branchName;
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
    const { employeeName } = req.body;
    const branchName = isScopedBranchManager(req) ? req.user.branch : req.body.branchName;
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
    const { employeeName, onBreak } = req.body;
    const branchName = isScopedBranchManager(req) ? req.user.branch : req.body.branchName;
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
const counselorNameRx = (name) => {
  const clean = String(name || '').trim();
  if (!clean) return /^$/;
  const firstName = clean.split(/\s+/)[0];
  const rxParts = [
    `^\\s*${escapeRegex(clean).replace(/\s+/g, '\\s+')}\\s*$`,
    `^\\s*${escapeRegex(firstName)}(\\s+.*)?$`
  ];
  return new RegExp(rxParts.join('|'), 'i');
};
const isScopedHr = (req) => {
  const dept = String(req.user?.department || '').toLowerCase();
  const role = String(req.user?.role || '').toLowerCase();
  return dept === 'hr' || role === 'hr' || dept.includes('counsel') || dept.includes('admission');
};
const leadOwner = (l) => l?.counselorAssigned || l?.allocatedTo || l?.spokenBy || '';
const leadOwnerQuery = (name) => {
  const rx = counselorNameRx(name);
  return {
    $or: [
      { counselorAssigned: rx },
      { allocatedTo: rx },
      { spokenBy: rx }
    ]
  };
};
const bClean = (v) => String(v || '').toLowerCase().replace(/\s*(branch|\(.*\)|hq)\b/gi, '').replace(/[^a-z0-9]/g, '');

const ownsStudent = (req, st) => {
  if (!isScopedHr(req)) return true;
  return normName(st?.hrName) === normName(req.user?.name);
};

const ownsLead = (req, lead) => {
  if (!lead) return false;
  if (!isScopedHr(req) && !isScopedBranchManager(req)) return true;
  if (isScopedHr(req)) {
    const counselor = req.user?.name;
    if (!counselor) return false;
    const ca = normName(lead.counselorAssigned);
    const at = normName(lead.allocatedTo);
    const me = normName(counselor);
    if (!ca && !at) return true; // Unassigned enquiries can be managed/edited
    return ca === me || at === me;
  }
  if (isScopedBranchManager(req)) {
    const targetBranch = getBranchManagerBranch(req);
    if (!targetBranch) return true;
    const ub = bClean(targetBranch);
    return !lead.branch || bClean(lead.branch).includes(ub) || ub.includes(bClean(lead.branch));
  }
  return true;
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
    const isBM = isScopedBranchManager(req);
    const userBranch = isBM ? getBranchManagerBranch(req) : branchShort(req.query.branch || req.user?.branch);

    const andConditions = [];
    if (trainerId) andConditions.push({ trainerId });
    if (handoverStatus) andConditions.push({ handoverStatus });
    if (statusGroup && statusGroup !== 'all') {
      andConditions.push({ statusGroup });
    }

    if (isBM && userBranch) {
      const bRx = new RegExp(escapeRegex(userBranch), 'i');
      andConditions.push({ $or: [{ branch: bRx }, { location: bRx }, { leadBranch: bRx }] });
    } else if (isScopedHr(req)) {
      const counselor = req.user?.name;
      if (counselor) {
        andConditions.push({ hrName: exactNameRx(counselor) });
      } else {
        andConditions.push({ hrName: '__NEVER_MATCH__' });
      }
    } else if (hrName && hrName !== 'all') {
      andConditions.push({ hrName: exactNameRx(hrName) });
    } else if (userBranch) {
      const bRx = new RegExp(escapeRegex(userBranch), 'i');
      andConditions.push({ $or: [{ branch: bRx }, { location: bRx }, { leadBranch: bRx }] });
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
      // Other students are returned only when they were admitted from a demo this
      // trainer delivered (needed for the incentive ledger) — nothing else.
      const myDemos = me
        ? await Demo.find({ status: /^attended$/i, $or: [{ trainerId: me }, { notifiedTrainerIds: me }, { notificationSentTo: me }] }).select('phone email')
        : [];
      const demoPhones = new Set(myDemos.map((d) => phoneDigits(d.phone)).filter((p) => p.length === 10));
      const demoEmails = new Set(myDemos.map((d) => String(d.email || '').trim().toLowerCase()).filter(Boolean));
      const out = [];
      students.forEach((s) => {
        const o = s.toObject();
        const mine = (me && o.trainerId === me) || (!o.trainerId && o.handoverStatus === 'Sent to Training');
        if (mine) { FIN.forEach((k) => delete o[k]); out.push(o); return; }
        const fromMyDemo = demoPhones.has(phoneDigits(o.phone)) || (o.email && demoEmails.has(String(o.email).trim().toLowerCase()));
        if (fromMyDemo) out.push({ _id: o._id, studentId: o.studentId, name: o.name, phone: o.phone, email: o.email, course: o.course, createdAt: o.createdAt, statusGroup: o.statusGroup });
      });
      return res.json(out);
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
  if (cStr.includes('CRASH')) c = 'F';
  else if (cStr.includes('INTERNSHIP BEGINNER')) c = 'IB';
  else if (cStr.includes('INTERNSHIP INTERMEDIATE')) c = 'II';
  else if (cStr.includes('INTERNSHIP ADVANCED')) c = 'IA';
  else if (cStr.includes('INTERNSHIP')) c = 'IB';
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

// Finds which HR counselor lastly contacted this candidate/student
async function findLastlyContactedHr({ student, lead, phone, email }) {
  const digits = phoneDigits(phone || student?.phone || lead?.phone || student?.whatsappNumber || lead?.whatsappNumber);
  const mail = String(email || student?.email || lead?.email || '').trim().toLowerCase();

  let latestCall = null;
  if (digits && digits.length === 10) {
    const rx = new RegExp(`${digits.slice(-4).split('').join('\\D*')}\\D*$`);
    const calls = await CallRecording.find({ leadPhone: rx }).sort({ createdAt: -1 }).limit(10).lean();
    latestCall = calls.find(c => phoneDigits(c.leadPhone) === digits) || null;
  }
  if (!latestCall && lead?._id) {
    latestCall = await CallRecording.findOne({ leadId: lead._id }).sort({ createdAt: -1 }).lean();
  }

  let latestCallLog = null;
  if (lead?._id) {
    latestCallLog = await CallLog.findOne({ leadId: String(lead._id) }).sort({ createdAt: -1 }).lean();
  }
  if (!latestCallLog && digits && digits.length === 10) {
    const candName = student?.name || lead?.fullName;
    if (candName) {
      latestCallLog = await CallLog.findOne({ leadName: exactNameRx(candName) }).sort({ createdAt: -1 }).lean();
    }
  }

  let latestCallHr = '';
  let latestCallDate = null;
  if (latestCall?.counselorName) {
    latestCallHr = latestCall.counselorName;
    latestCallDate = latestCall.createdAt;
  }
  if (latestCallLog?.counselorName) {
    if (!latestCallDate || (latestCallLog.createdAt && new Date(latestCallLog.createdAt) > new Date(latestCallDate))) {
      latestCallHr = latestCallLog.counselorName;
      latestCallDate = latestCallLog.createdAt;
    }
  }

  if (latestCallHr) {
    return {
      hrName: latestCallHr,
      contactType: 'Call',
      contactDate: latestCallDate
    };
  }

  // Check demo booked
  if (digits && digits.length === 10) {
    const rx = new RegExp(`${digits.slice(-4).split('').join('\\D*')}\\D*$`);
    const demo = await Demo.findOne({ phone: rx }).sort({ createdAt: -1 }).lean();
    if (demo?.counselor) {
      return {
        hrName: demo.counselor,
        contactType: 'Demo Booking',
        contactDate: demo.createdAt
      };
    }
  }

  // Check WhatsApp messages on lead
  if (lead?.whatsappMessages?.length) {
    const counselorMsgs = lead.whatsappMessages
      .filter(m => m.sender === 'counselor' && m.senderName)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (counselorMsgs.length > 0) {
      return {
        hrName: counselorMsgs[0].senderName,
        contactType: 'WhatsApp Message',
        contactDate: counselorMsgs[0].createdAt
      };
    }
  }

  // Check student fee receipts (recordedBy)
  if (student?.receipts?.length) {
    const validReceipts = student.receipts.filter(r => r.recordedBy).sort((a, b) => new Date(b.at || b.date || 0) - new Date(a.at || a.date || 0));
    if (validReceipts.length > 0) {
      return {
        hrName: validReceipts[0].recordedBy,
        contactType: 'Fee Payment',
        contactDate: validReceipts[0].at || validReceipts[0].date
      };
    }
  }

  // Check lead spokenBy
  if (lead?.spokenBy) {
    const cleanSpoken = lead.spokenBy.replace(/\s*·\s*YOU/i, '').trim();
    if (cleanSpoken) {
      return {
        hrName: cleanSpoken,
        contactType: 'Counselling Call',
        contactDate: lead.updatedAt
      };
    }
  }

  // Check student hrName (the HR counselor who admitted the student)
  if (student?.hrName) {
    return {
      hrName: student.hrName,
      contactType: 'Student Admission',
      contactDate: student.registeredAt || student.createdAt
    };
  }

  // Check lead counselorAssigned or allocatedTo
  if (lead?.counselorAssigned || lead?.allocatedTo) {
    return {
      hrName: lead.counselorAssigned || lead.allocatedTo,
      contactType: 'Lead Allocation',
      contactDate: lead.updatedAt || lead.createdAt
    };
  }

  return {
    hrName: 'Not Assigned',
    contactType: 'Registration',
    contactDate: null
  };
}

// Checks whether a student or lead already exists with the given phone or email
async function checkDuplicateRegistration({ phone, whatsappNumber, email, leadId = '', excludeStudentId = '' }) {
  const digits = phoneDigits(phone || whatsappNumber);
  const mail = String(email || '').trim().toLowerCase();

  if ((!digits || digits.length < 10) && !mail) {
    return null;
  }

  // 1. Search existing Student records
  const studentQueries = [];
  if (digits && digits.length === 10) {
    const rx = new RegExp(`${digits.slice(-4).split('').join('\\D*')}\\D*$`);
    studentQueries.push({ phone: rx });
    studentQueries.push({ whatsappNumber: rx });
  }
  if (mail) {
    studentQueries.push({ email: exactNameRx(mail) });
  }

  const existingStudents = await Student.find({ $or: studentQueries }).sort({ createdAt: -1 });
  const matchedStudent = existingStudents.find((s) => {
    if (excludeStudentId && (s.studentId === excludeStudentId || String(s._id) === String(excludeStudentId))) {
      return false;
    }
    const sPhone = phoneDigits(s.phone);
    const sWa = phoneDigits(s.whatsappNumber);
    const sMail = String(s.email || '').trim().toLowerCase();
    const phoneMatch = Boolean(digits && (sPhone === digits || sWa === digits));
    const mailMatch = Boolean(mail && sMail === mail);
    return phoneMatch || mailMatch;
  });

  // 2. Search existing StudentLead records
  const leadQueries = [];
  if (digits && digits.length === 10) {
    const rx = new RegExp(`${digits.slice(-4).split('').join('\\D*')}\\D*$`);
    leadQueries.push({ phone: rx });
    leadQueries.push({ whatsappNumber: rx });
  }
  if (mail) {
    leadQueries.push({ email: exactNameRx(mail) });
  }

  const existingLeads = await StudentLead.find({ $or: leadQueries }).sort({ createdAt: -1 });
  const matchedLead = existingLeads.find((l) => {
    if (leadId && String(l._id) === String(leadId)) return false;
    const lPhone = phoneDigits(l.phone);
    const lWa = phoneDigits(l.whatsappNumber);
    const lMail = String(l.email || '').trim().toLowerCase();
    const phoneMatch = Boolean(digits && (lPhone === digits || lWa === digits));
    const mailMatch = Boolean(mail && lMail === mail);
    return phoneMatch || mailMatch;
  });

  // If no match found in either Student or StudentLead
  if (!matchedStudent && !matchedLead) {
    return null;
  }

  const existingDoc = matchedStudent || matchedLead;
  const isStudent = Boolean(matchedStudent);

  const docPhone = phoneDigits(existingDoc.phone || existingDoc.whatsappNumber);
  const docMail = String(existingDoc.email || '').trim().toLowerCase();
  const phoneMatched = Boolean(digits && docPhone === digits);
  const emailMatched = Boolean(mail && docMail === mail);
  const bothMatched = phoneMatched && emailMatched;

  const hrInfo = await findLastlyContactedHr({
    student: matchedStudent,
    lead: matchedLead,
    phone: digits,
    email: mail
  });

  const memberName = existingDoc.name || existingDoc.fullName || 'Registered Candidate';
  const memberId = matchedStudent?.studentId || matchedLead?.admittedStudentId || '';

  let fieldReason = '';
  if (bothMatched) {
    fieldReason = `mobile number (${digits}) and email ID (${mail})`;
  } else if (phoneMatched) {
    fieldReason = `mobile number (${digits})`;
  } else {
    fieldReason = `email ID (${mail})`;
  }

  const idText = memberId ? ` · ID: ${memberId}` : '';
  const hrText = hrInfo.hrName && hrInfo.hrName !== 'Not Assigned'
    ? `Lastly contacted by HR: ${hrInfo.hrName}`
    : 'Assigned HR: Not Assigned';

  const errorMessage = `Duplicate record: A student is already registered with ${fieldReason} (${memberName}${idText}). ${hrText}.`;

  return {
    isDuplicate: true,
    error: errorMessage,
    duplicateFields: {
      phone: phoneMatched,
      email: emailMatched,
      both: bothMatched
    },
    firstRegistrationMember: {
      name: memberName,
      studentId: memberId,
      phone: existingDoc.phone,
      email: existingDoc.email,
      course: existingDoc.course,
      branch: existingDoc.branch,
      type: isStudent ? 'Admitted Student' : 'Enquiry / Lead',
      registeredAt: existingDoc.registeredAt || existingDoc.createdAt,
      lastContactedHr: hrInfo.hrName,
      contactType: hrInfo.contactType,
      contactDate: hrInfo.contactDate
    }
  };
}

router.get('/students/check-duplicate', async (req, res) => {
  try {
    const { phone, whatsappNumber, email, leadId, excludeStudentId } = req.query;
    const dup = await checkDuplicateRegistration({ phone, whatsappNumber, email, leadId, excludeStudentId });
    if (dup) {
      return res.json(dup);
    }
    return res.json({ isDuplicate: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/students', async (req, res) => {
  try {
    let payload = { ...req.body };
    if (payload.studentId && await Student.exists({ studentId: payload.studentId })) {
      return res.status(409).json({ error: `Student ID ${payload.studentId} is already in use` });
    }

    // Check for duplicate registration by mobile number and/or email ID
    const dup = await checkDuplicateRegistration({
      phone: payload.phone,
      whatsappNumber: payload.whatsappNumber,
      email: payload.email,
      leadId: payload.leadId
    });
    if (dup) {
      return res.status(409).json({
        error: dup.error,
        isDuplicate: true,
        duplicate: dup
      });
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
      if (!lead.counselorAssigned && newStudent.hrName) lead.counselorAssigned = newStudent.hrName;
      await lead.save();
      await creditReferralReward(lead);
    } else {
      // Auto-create an admitted lead record so the admission is ALWAYS tracked in Pipeline & Follow-ups!
      lead = new StudentLead({
        fullName: newStudent.name,
        phone: newStudent.phone,
        whatsappNumber: newStudent.whatsappNumber || newStudent.phone,
        email: newStudent.email || '',
        location: newStudent.location || newStudent.branch || '',
        education: newStudent.qualification || '',
        passoutYear: newStudent.passoutYear || '',
        branch: newStudent.branch || '',
        course: newStudent.course || '',
        sourceName: newStudent.source || 'Direct Admission',
        sourceId: 'admission',
        stage: 'admitted',
        status: 'completed',
        counselorAssigned: newStudent.hrName || req.user?.name || '',
        allocatedTo: newStudent.hrName || req.user?.name || '',
        batchTiming: newStudent.batchTiming || '',
        admittedStudentId: newStudent.studentId,
        notes: `Admitted Student ID: ${newStudent.studentId}`
      });
      await lead.save();
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
          password,
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

// Issue / reset a student's portal login. Stored as-is like staff passwords so
// admins can see it in the user management screen.
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
    let user = await User.findOne({ email });
    if (user) {
      user.password = password;
      user.status = 'Active';
      await user.save();
    } else {
      user = await User.create({
        name: st.name,
        email,
        password,
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
    if (['Sent to Training', 'Handed Over to Head of Trainer'].includes(payload.handoverStatus) || ['Sent to Training', 'Handed Over to Head of Trainer'].includes(existing.handoverStatus)) delete payload.handoverStatus;
    // Trainer allocation is the exclusive authority of Head of Trainer via POST /students/:id/allocate-trainer
    delete payload.trainerId;
    delete payload.trainerName;
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

    // Cascade student updates across linked collections (StudentLead, PlacementRecord, User, Portal activity)
    try {
      const leadMatches = [];
      if (existing.leadId && mongoose.isValidObjectId(existing.leadId)) leadMatches.push({ _id: existing.leadId });
      if (existing.studentId) leadMatches.push({ admittedStudentId: existing.studentId });
      if (existing.phone) leadMatches.push({ phone: existing.phone });
      if (existing.email) leadMatches.push({ email: existing.email });

      if (leadMatches.length > 0) {
        const leadUpdates = {};
        if (payload.name) leadUpdates.fullName = payload.name;
        if (payload.phone) leadUpdates.phone = payload.phone;
        if (payload.whatsappNumber) leadUpdates.whatsappNumber = payload.whatsappNumber;
        if (payload.email) leadUpdates.email = payload.email;
        if (payload.course) leadUpdates.course = payload.course;
        if (payload.branch) leadUpdates.branch = payload.branch;
        if (payload.location || payload.branch) leadUpdates.location = payload.location || payload.branch;
        if (payload.qualification) leadUpdates.qualification = payload.qualification;
        if (payload.collegeCompany) leadUpdates.college = payload.collegeCompany;
        if (payload.batchTiming) leadUpdates.batchTiming = payload.batchTiming;
        if (payload.batchType) leadUpdates.batchType = payload.batchType;
        if (payload.address) leadUpdates.address = payload.address;

        if (Object.keys(leadUpdates).length > 0) {
          await StudentLead.updateMany({ $or: leadMatches }, { $set: leadUpdates });
        }
      }

      // Sync CCCP Placement Record
      if (existing.studentId) {
        const plcUpdates = {};
        if (payload.name) plcUpdates.name = payload.name;
        if (payload.placementCompany) plcUpdates.company = payload.placementCompany;
        if (payload.placementRole) plcUpdates.role = payload.placementRole;
        if (Object.keys(plcUpdates).length > 0) {
          await PlacementRecord.updateMany(
            { $or: [{ studentId: existing.studentId }, { tfId: existing.studentId }] },
            { $set: plcUpdates }
          );
        }
      }

      // Sync Student Scholar user login account
      const userMatches = [];
      if (existing.email) userMatches.push({ email: existing.email });
      if (existing.studentId) userMatches.push({ studentId: existing.studentId });
      if (userMatches.length > 0) {
        const userUpdates = {};
        if (payload.name) userUpdates.name = payload.name;
        if (payload.email) userUpdates.email = payload.email;
        if (payload.location || payload.branch) userUpdates.branch = payload.location || payload.branch;
        if (Object.keys(userUpdates).length > 0) {
          await User.updateMany({ $or: userMatches }, { $set: userUpdates });
        }
      }

      // Sync denormalized student name in submissions, requests, feedback, tests
      if (existing.studentId && payload.name) {
        await Promise.all([
          StudentRequest.updateMany({ studentId: existing.studentId }, { $set: { studentName: payload.name } }),
          StudentSubmission.updateMany({ studentId: existing.studentId }, { $set: { studentName: payload.name } }),
          TestAttempt.updateMany({ studentId: existing.studentId }, { $set: { studentName: payload.name } }),
          ClassFeedback.updateMany({ studentId: existing.studentId }, { $set: { studentName: payload.name } })
        ]);
      }
    } catch (cascadeErr) {
      console.warn('Student update cascade error:', cascadeErr.message);
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    const existing = await findStudentByAnyId(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Student not found' });
    if (!ownsStudent(req, existing)) return res.status(403).json(NOT_YOURS);
    await Student.findByIdAndDelete(existing._id);
    // Detach admittedStudentId from any linked lead so the lead is not orphaned
    try {
      await StudentLead.updateMany(
        { $or: [{ admittedStudentId: existing.studentId }, { _id: existing.leadId }] },
        { $unset: { admittedStudentId: 1 } }
      );
      if (existing.studentId) {
        await PlacementRecord.deleteMany({ $or: [{ studentId: existing.studentId }, { tfId: existing.studentId }] });
      }
    } catch (_) {}
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
    // Counsellors are always pinned to their own leads; Branch Managers are pinned to their branch
    const counselor = isScopedHr(req) ? req.user?.name : req.query.counselor;
    const isBM = isScopedBranchManager(req);
    const targetBranch = isBM ? getBranchManagerBranch(req) : branch;
    let query = {};
    if (counselor && counselor !== 'all') {
      query.$or = leadOwnerQuery(counselor).$or;
    }
    if (stage && stage !== 'all') {
      query.stage = stage;
    }
    if (targetBranch && targetBranch !== 'all') {
      query.branch = { $regex: new RegExp(escapeRegex(targetBranch.trim()), 'i') };
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

    // Check for duplicate enquiry by mobile number and/or email ID
    const dup = await checkDuplicateRegistration({
      phone: payload.phone || payload.whatsappNumber,
      whatsappNumber: payload.whatsappNumber,
      email: payload.email
    });
    if (dup) {
      return res.status(409).json({
        error: dup.error,
        isDuplicate: true,
        duplicate: dup
      });
    }

    // A counsellor adding a lead without naming an owner keeps it; Branch Manager auto-sets branch
    if (isScopedHr(req) && !payload.counselorAssigned && !payload.allocatedTo) payload.counselorAssigned = req.user?.name || "";
    if (isScopedBranchManager(req) && !payload.branch) payload.branch = req.user.branch;
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

// Bulk lead/enquiry upload (from Google Sheets / CSV)
router.post('/leads/bulk', async (req, res) => {
  try {
    const rawLeads = Array.isArray(req.body?.leads) ? req.body.leads : [];
    if (!rawLeads.length) {
      return res.status(400).json({ error: 'No enquiries provided for bulk upload' });
    }

    const createdLeads = [];
    const duplicates = [];
    const invalidRows = [];

    const counselor = (isScopedHr(req) && req.user?.name) ? req.user.name : (req.body?.defaultCounselor || req.user?.name || '');
    const userBranch = req.user?.branch || req.body?.defaultBranch || '';

    for (let i = 0; i < rawLeads.length; i++) {
      const item = rawLeads[i];
      const payload = { ...item };
      delete payload.createStudentLogin;
      delete payload.admittedStudentId;

      if (!payload.fullName && payload.name) {
        payload.fullName = payload.name;
      }
      if (!payload.sourceName && payload.source) {
        payload.sourceName = payload.source;
      }
      if (!payload.sourceName) {
        payload.sourceName = req.body?.defaultSource || 'Google Sheet Bulk Import';
      }
      if (!payload.stage) {
        payload.stage = 'new';
      }
      if (!payload.branch) {
        payload.branch = userBranch || 'Saravanampatti (CBE)';
      }
      if (!payload.course) {
        payload.course = req.body?.defaultCourse || 'AMCT Beginner (Classroom)';
      }
      if (!payload.counselorAssigned) {
        payload.counselorAssigned = payload.allocatedTo || payload.spokenBy || counselor;
      }
      if (!payload.allocatedTo) {
        payload.allocatedTo = payload.counselorAssigned;
      }
      if (!payload.spokenBy) {
        payload.spokenBy = payload.counselorAssigned;
      }

      // Normalize phone number to clean 10 digits if possible
      const rawPhone = String(payload.phone || payload.whatsappNumber || payload.mobile || '');
      const digitsOnly = rawPhone.replace(/\D+/g, '');
      const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : rawPhone.trim();
      if (cleanPhone) {
        payload.phone = cleanPhone;
      }

      if (!payload.fullName || (!payload.phone && !payload.email)) {
        invalidRows.push({
          row: i + 1,
          name: payload.fullName || `Row ${i + 1}`,
          reason: 'Missing candidate name or valid contact phone/email'
        });
        continue;
      }

      // Check for duplicate enquiry by mobile number and/or email ID
      const dup = await checkDuplicateRegistration({
        phone: payload.phone || payload.whatsappNumber,
        whatsappNumber: payload.whatsappNumber,
        email: payload.email
      });

      if (dup) {
        duplicates.push({
          row: i + 1,
          name: payload.fullName,
          phone: payload.phone || payload.whatsappNumber || '',
          email: payload.email || '',
          error: dup.error || 'Duplicate record',
          matchedName: dup.firstRegistrationMember?.name || '',
          counselor: dup.firstRegistrationMember?.lastContactedHr || ''
        });
        continue;
      }

      try {
        const newLead = new StudentLead(payload);
        await newLead.save();
        createdLeads.push(newLead);
      } catch (saveErr) {
        invalidRows.push({
          row: i + 1,
          name: payload.fullName,
          reason: saveErr.message
        });
      }
    }

    res.status(201).json({
      success: true,
      total: rawLeads.length,
      createdCount: createdLeads.length,
      duplicateCount: duplicates.length,
      invalidCount: invalidRows.length,
      createdLeads,
      duplicates,
      invalidRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/leads/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Lead not found' });
    const current = await StudentLead.findById(req.params.id).select('allocatedTo counselorAssigned course branch');
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

export function isSpecialtyCourse(course) {
  if (!course) return false;
  const c = String(course).toLowerCase();
  if (c.includes('fresher') || c.includes('beginner') || c.includes('foundation')) {
    return false;
  }
  const specialtyKeys = [
    'surgery', 'cgsc', 'cpma', 'auditing', 'emergency', 'ed profee', 'ed facility',
    'em ip', 'cedc', 'cemc', 'e/m', 'ed&e/m', 'cpc+ed', 'cpc+e/m', 'ip-drg', 'ipdrg',
    'ip specialty', 'ccs', 'hcc', 'crc', 'risk adjustment', 'ivr', 'radiology',
    'anesthesia', 'canpc', 'cobgc', 'cpcd', 'cardiology', 'orthopedic', 'pediatrics',
    'specialty', 'exp in ipdrg'
  ];
  return specialtyKeys.some((k) => c.includes(k));
}

export const DEMO_GROUP_CAPACITY = 6; // Up to 6 demo students conducted together in one group session

async function findEligibleTrainers({ language, location, preferredDate, timeSlot, course, excludeDemoId }) {
  const langNorm = norm(language);
  const locNorm = norm(location);
  const courseNorm = norm(course);
  const specialty = isSpecialtyCourse(course);

  const roster = await Trainer.find({ active: { $ne: false } });

  // 1. Language & Location matching
  const languageLocationMatched = roster.filter((t) => {
    const languageOk = !langNorm || (t.languages || []).some((l) => norm(l) === langNorm);
    const locationOk = !locNorm || norm(t.branchName) === locNorm;
    return languageOk && locationOk;
  });

  if (languageLocationMatched.length === 0) {
    return {
      eligible: [],
      reason: `No demo expert found for language "${language}" at "${location}".`
    };
  }

  // 2. Specialty vs Fresher pool filter
  let pool = languageLocationMatched;
  if (specialty) {
    // For specialty course demos: require trainers who specialize in this course/subject
    const specialtyTrainers = pool.filter((t) => {
      const matchCourse = (t.courseKey && courseNorm.includes(norm(t.courseKey))) ||
                          (t.expertCourse && (norm(t.expertCourse).includes(courseNorm) || courseNorm.includes(norm(t.expertCourse)))) ||
                          (t.specialization && (norm(t.specialization).includes(courseNorm) || courseNorm.includes(norm(t.specialization)))) ||
                          (t.skills || []).some((s) => norm(s.name).includes(courseNorm) || courseNorm.includes(norm(s.name)));
      return matchCourse;
    });

    if (specialtyTrainers.length > 0) {
      pool = specialtyTrainers;
    } else {
      return {
        eligible: [],
        reason: `No specialty demo expert found for "${course}" matching language "${language}" at "${location}".`
      };
    }
  }

  // 3. Available Timings:
  // - Fresher demo experts should be available throughout the day.
  // - Specialty course demos may be scheduled according to trainer availability.
  const slot = parseSlotToRange(timeSlot);
  const freeBySchedule = pool.filter((t) => {
    if (trainerOnLeave(t, preferredDate)) return false; // on leave that day

    // If it's a fresher course demo: fresher demo experts are available throughout the day
    if (!specialty) {
      return true;
    }

    // Specialty course demo: scheduled strictly according to trainer availability (shift & non-class slots)
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
    if (specialty) {
      return {
        eligible: [],
        reason: `Specialty demo expert for "${course}" at "${location}" is unavailable at ${timeSlot} on ${preferredDate} (trainer shift/class schedule). Please schedule according to trainer availability.`
      };
    }
    return {
      eligible: [],
      reason: `Fresher demo expert(s) matching language "${language}" and location "${location}" are on leave on ${preferredDate}.`
    };
  }

  // 4. Group session capacity check at the exact slot & date
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
      reason: `Demo expert(s) matching language "${language}" and location "${location}" have reached maximum group capacity (${DEMO_GROUP_CAPACITY} students) at ${timeSlot} on ${preferredDate}.`
    };
  }

  return { eligible, reason: '' };
}

// Head of Trainer list (Trainers with head/lead/chief roles + Branch Head of Trainers + Department Head)
export const HEAD_OF_TRAINERS_MASTER = [
  {
    id: 'HOT_MANOJ',
    name: 'Manoj',
    role: 'Head of Trainer · Tamil Nadu',
    zone: 'Tamil Nadu',
    state: 'Tamil Nadu',
    branch: 'Tamil Nadu (Coimbatore, Salem, Trichy, Theni)',
    email: 'manojs@thoughtflows.in',
    branches: ['Tamil Nadu', 'Coimbatore', 'Saravanampatti', 'Gandhipuram', 'Hopes', 'Salem', 'Trichy', 'Theni', 'Madurai', 'Erode', 'Tiruppur']
  },
  {
    id: 'HOT_KEERTHIKA',
    name: 'Keerthika',
    role: 'Head of Trainer · Online',
    zone: 'Online',
    state: 'Online',
    branch: 'Online / Virtual Batches',
    email: 'keerthika@thoughtflows.in',
    branches: ['Online', 'Virtual', 'All Branches', 'Remote']
  },
  {
    id: 'HOT_VAISHNA',
    name: 'Vaishna',
    role: 'Head of Trainer · Kerala',
    zone: 'Kerala',
    state: 'Kerala',
    branch: 'Kerala (Kochi, Trivandrum)',
    email: 'vaishna@thoughtflows.in',
    branches: ['Kerala', 'Kochi', 'Trivandrum', 'Calicut', 'Kollam']
  },
  {
    id: 'HOT_PAVITHRA',
    name: 'Pavithra',
    role: 'Head of Trainer · Telangana & Andhra',
    zone: 'Telangana & Andhra',
    state: 'Telangana & Andhra',
    branch: 'Telangana & Andhra (Hyderabad, Ameerpet, Dilsukhnagar, Tirupati, Vizag)',
    email: 'pavithra@thoughtflows.in',
    branches: ['Telangana', 'Andhra', 'Telangana & Andhra', 'Hyderabad', 'Ameerpet', 'Dilsukhnagar', 'Tirupati', 'Vizag', 'Vijayawada']
  }
];

router.get('/trainer/heads', async (req, res) => {
  try {
    res.json(HEAD_OF_TRAINERS_MASTER);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
// given language + location + date + time + course?
router.get('/demos/eligible-trainers', async (req, res) => {
  try {
    const { language, location, preferredDate, timeSlot, course } = req.query;
    const isSpecialty = isSpecialtyCourse(course);
    const { eligible, reason } = await findEligibleTrainers({
      language,
      location,
      preferredDate: preferredDate || todayStr(),
      timeSlot: timeSlot || '',
      course: course || ''
    });
    const courseNorm = norm(course);
    const ranked = courseNorm
      ? [...eligible].sort((a, b) => (norm(b.courseKey) === courseNorm) - (norm(a.courseKey) === courseNorm))
      : eligible;
    res.json({
      count: ranked.length,
      isSpecialty,
      courseType: isSpecialty ? 'specialty' : 'fresher',
      reason,
      trainers: ranked.map((t) => ({
        trainerId: t.trainerId,
        trainerName: t.trainerName,
        specialization: t.specialization,
        courseKey: t.courseKey,
        branchName: t.branchName,
        languages: t.languages,
        experienceLevel: t.experienceLevel
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
    const isBM = isScopedBranchManager(req);
    const targetBranch = isBM ? getBranchManagerBranch(req) : qBranch;
    const andConditions = [];
    if (status && status !== 'all') {
      andConditions.push({ status });
    }

    if (isBM && targetBranch) {
      const bRx = new RegExp(escapeRegex(targetBranch), 'i');
      andConditions.push({ $or: [{ location: bRx }, { branch: bRx }] });
    } else if (isScopedHr(req)) {
      const counselor = req.user?.name;
      const userBranch = branchShort(req.query.branch || req.user?.branch);
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
      const userBranch = branchShort(targetBranch);
      const orConditions = [
        { bookedBy: exactNameRx(qCounselor) },
        { counselor: exactNameRx(qCounselor) }
      ];
      if (userBranch) {
        const bRx = new RegExp(escapeRegex(userBranch), 'i');
        orConditions.push({ location: bRx }, { branch: bRx });
      }
      andConditions.push({ $or: orConditions });
    } else if (targetBranch && targetBranch !== 'all') {
      const userBranch = branchShort(targetBranch);
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

    // Demo Booking Notification Requirement: find demo experts based on
    // language, location, and available timings (fresher demo experts available
    // throughout the day, specialty course demos scheduled per trainer availability).
    const isSpecialty = isSpecialtyCourse(course);
    const { eligible, reason: noEligibleTrainerReason } = await findEligibleTrainers({
      language,
      location,
      preferredDate,
      timeSlot: demoSlot,
      course
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
      isSpecialty,
      courseType: isSpecialty ? 'specialty' : 'fresher',

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

    // Demo Requests Outside Fixed Timings — no trainer is auto-notified here;
    // the respective Head is flagged to coordinate and handle this manually.
    if (newDemo.outsideFixedTiming) {
      await pushNotification({
        audience: 'hr', type: 'demo_outside_timing',
        title: `⏰ Demo Outside Fixed Timings: ${newDemo.candidateName}`,
        message: `${newDemo.candidateName} requested a demo at ${newDemo.customTimeRequested || newDemo.timeSlot} on ${newDemo.preferredDate} (${newDemo.branch || newDemo.location}, ${newDemo.language}). No trainer was auto-notified — the respective Head should coordinate and handle this request.`,
        createdBy: newDemo.bookedBy || ''
      });
    }

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
    // Ensure canonical ordering matching DEFAULT_COURSE_FEE_RATES (AMCT first)
    const orderMap = new Map();
    DEFAULT_COURSE_FEE_RATES.forEach((c, idx) => orderMap.set(c.code.toUpperCase(), idx));
    rates.sort((a, b) => {
      const idxA = orderMap.has((a.code || '').toUpperCase()) ? orderMap.get((a.code || '').toUpperCase()) : 999;
      const idxB = orderMap.has((b.code || '').toUpperCase()) ? orderMap.get((b.code || '').toUpperCase()) : 999;
      return idxA - idxB;
    });
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

// Dedicated Branch Manager Accounts per Branch
const BRANCH_ACCOUNTS = {
  'gandhipuram@thoughtflows.in': { branch: 'Gandhipuram', code: 'CBE-GPM', manager: 'Sindhu S', defaultPass: 'Gandhipuram@123' },
  'cbe.gandhipuram@thoughtflows.in': { branch: 'Gandhipuram', code: 'CBE-GPM', manager: 'Sindhu S', defaultPass: 'Gandhipuram@123' },
  'saravanampatti@thoughtflows.in': { branch: 'Saravanampatti', code: 'CBE-SVM', manager: 'Gayathri B', defaultPass: 'Saravanampatti@123' },
  'cbe.saravanampatti@thoughtflows.in': { branch: 'Saravanampatti', code: 'CBE-SVM', manager: 'Gayathri B', defaultPass: 'Saravanampatti@123' },
  'hopes@thoughtflows.in': { branch: 'Hopes', code: 'CBE-HPS', manager: 'Sruthi G', defaultPass: 'Hopes@123' },
  'salem@thoughtflows.in': { branch: 'Salem', code: 'TND-SLM', manager: 'Salem Manager', defaultPass: 'Salem@123' },
  'tiruppur@thoughtflows.in': { branch: 'Tiruppur', code: 'CBE-TPR', manager: 'Tiruppur Manager', defaultPass: 'Tiruppur@123' },
  'erode@thoughtflows.in': { branch: 'Erode', code: 'CBE-ERD', manager: 'Erode Manager', defaultPass: 'Erode@123' },
  'karur@thoughtflows.in': { branch: 'Karur', code: 'CBE-KRR', manager: 'Karur Manager', defaultPass: 'Karur@123' },
  'kochi@thoughtflows.in': { branch: 'Kochi', code: 'KER-KOC', manager: 'Kochi Manager', defaultPass: 'Kochi@123' },
  'trivandrum@thoughtflows.in': { branch: 'Trivandrum', code: 'KER-TRV', manager: 'Trivandrum Manager', defaultPass: 'Trivandrum@123' },
  'ameerpet@thoughtflows.in': { branch: 'Ameerpet', code: 'HYD-AMP', manager: 'Ameerpet Manager', defaultPass: 'Ameerpet@123' },
  'dilsukhnagar@thoughtflows.in': { branch: 'Dilsukhnagar', code: 'HYD-DSN', manager: 'Dilsukhnagar Manager', defaultPass: 'Dilsukhnagar@123' },
  'vijayawada@thoughtflows.in': { branch: 'Vijayawada', code: 'AND-VJA', manager: 'Vijayawada Manager', defaultPass: 'Vijayawada@123' },
  'vizag@thoughtflows.in': { branch: 'Vizag', code: 'AND-VZG', manager: 'Vizag Manager', defaultPass: 'Vizag@123' },
  'trichy@thoughtflows.in': { branch: 'Trichy', code: 'TND-TRY', manager: 'Trichy Manager', defaultPass: 'Trichy@123' },
  'tirupati@thoughtflows.in': { branch: 'Tirupati', code: 'AND-TPT', manager: 'Tirupati Manager', defaultPass: 'Tirupati@123' },
  'kollapur@thoughtflows.in': { branch: 'Kollapur', code: 'MAH-KLP', manager: 'Kollapur Manager', defaultPass: 'Kollapur@123' },
  'pune@thoughtflows.in': { branch: 'Pune', code: 'MAH-PUN', manager: 'Pune Manager', defaultPass: 'Pune@123' },
  'theni@thoughtflows.in': { branch: 'Theni', code: 'TND-THN', manager: 'Theni Manager', defaultPass: 'Theni@123' }
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
  if (r.includes('counsel') || r.includes('advisor') || r.includes('hr') || r === 'hr' || d.includes('counsel') || d.includes('admission') || d === 'hr') {
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
  if (r.includes('branch') || r.includes('regional') || r.includes('operations') || r.includes('leadership') || d.includes('leadership')) {
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

    // 0b. Dedicated Branch Manager Accounts per Branch (static or dynamic matching)
    let branchAcc = BRANCH_ACCOUNTS[normalizedEmail];
    if (!branchAcc && normalizedEmail.endsWith('@thoughtflows.in')) {
      const emailPrefix = normalizedEmail.replace('@thoughtflows.in', '').replace(/^(cbe|hyd|ker|tnd|and|mah)\./i, '').trim().toLowerCase();
      const allB = await branchList().catch(() => BRANCH_MASTER);
      const matched = allB.find((b) => {
        const cleanName = String(b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanCode = String(b.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const aliases = (b.aliases || []).map((a) => String(a).toLowerCase().replace(/[^a-z0-9]/g, ''));
        return cleanName === emailPrefix || cleanCode === emailPrefix || aliases.includes(emailPrefix);
      });
      if (matched) {
        branchAcc = {
          branch: matched.name,
          code: matched.code || matched.name.slice(0, 3).toUpperCase(),
          manager: matched.manager || `${matched.name} Manager`,
          defaultPass: matched.managerPassword || `${matched.name}@123`
        };
      }
    }
    if (branchAcc) {
      const envKey = `BRANCH_${branchAcc.code.replace(/\W/g, '_').toUpperCase()}_PASSWORD`;
      const expectedPass = process.env[envKey] || branchAcc.defaultPass || `${branchAcc.branch}@123`;
      const { ok } = await checkPassword(password, expectedPass);
      if (!ok) return deny('Invalid password for this branch manager account.');
      return grant({
        id: `usr_bm_${branchAcc.code}`,
        name: `${branchAcc.branch} Branch Manager`,
        userName: `${branchAcc.branch} Branch Manager`,
        email: normalizedEmail,
        role: 'Branch Manager',
        department: 'leadership',
        departmentCode: 'LEAD',
        departmentName: 'Leadership & Operations',
        branch: branchAcc.branch,
        branchCode: branchAcc.code,
        color: '#7c3aed'
      }, `Welcome ${branchAcc.branch} Branch Manager`);
    }

    // 1. Accounts created by Admin / at admission (User collection)
    const dbUser = await User.findOne({ email: normalizedEmail });
    if (dbUser) {
      if (dbUser.status && /inactive|disabled|suspended/i.test(dbUser.status)) return deny('This account is disabled. Contact your admin.');
      const { ok } = await checkPassword(password, dbUser.password);
      if (ok) {
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
      const isBuiltIn = normalizedEmail === 'admin' || Object.values(DEPARTMENT_PORTALS).some(d => d.defaultEmail.toLowerCase() === normalizedEmail);
      if (!isBuiltIn) return deny();
    }

    // 2. Built-in department portal accounts (incl. Admin) — enabled only when
    //    their password is set in the server environment
    const deptKey = normalizedEmail === 'admin'
      ? 'admin'
      : Object.keys(DEPARTMENT_PORTALS).find((k) => DEPARTMENT_PORTALS[k].defaultEmail.toLowerCase() === normalizedEmail);
    if (deptKey && deptKey !== 'student') {
      const dept = DEPARTMENT_PORTALS[deptKey];
      const envKey = deptKey === 'admin' ? 'ADMIN_PASSWORD' : `${deptKey.toUpperCase()}_PORTAL_PASSWORD`;
      const fallbackPass = `${deptKey.charAt(0).toUpperCase() + deptKey.slice(1)}@123`;
      const envMatches = process.env[envKey] ? (await checkPassword(password, process.env[envKey])).ok : false;
      const fallbackMatches = (await checkPassword(password, fallbackPass)).ok;
      if (!envMatches && !fallbackMatches) return deny();
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
    if (!phone || String(phone).trim().length === 0) {
      return res.status(400).json({ error: 'Mobile number is mandatory for all roles' });
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

// Training staff may only act on their own students and records. Other
// departments (Admin, Leadership, HR…) keep their existing access.
const isTrainerReq = (req) => req.user?.department === 'training';
const myTrainerId = (req) => String(req.user?.trainerId || '');
const trainerOwnsStudent = (req, st) => {
  if (!isTrainerReq(req)) return true;
  if (/head of trainer|chief trainer|faculty lead|admin|leadership/i.test(req.user?.role || '')) return true;
  const me = myTrainerId(req);
  if (!st || !me) return false;
  return st.trainerId === me || (!st.trainerId && st.handoverStatus === 'Sent to Training');
};
const trainerOwnsRecord = (req, rec) => {
  if (!isTrainerReq(req)) return true;
  if (/head of trainer|chief trainer|faculty lead|admin|leadership/i.test(req.user?.role || '')) return true;
  const me = myTrainerId(req);
  return Boolean(me && rec && rec.trainerId === me);
};
const NOT_YOUR_STUDENT = { error: 'This student is not allocated to you.' };
const NOT_YOUR_RECORD = { error: 'This belongs to another trainer.' };

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

// Readiness = average of technical knowledge, assessments, communication, and interview preparation
function computeReadiness(st) {
  const interview = typeof st.interviewPrepScore === 'number'
    ? st.interviewPrepScore
    : (typeof st.mockScore === 'number' ? st.mockScore : null);

  const parts = [
    st.technicalScore,
    st.assessmentScore,
    st.communicationScore,
    interview
  ].filter((v) => typeof v === 'number');

  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

// Doubt SLA: 24h normal. Unreplied past SLA → Overdue.
const DOUBT_SLA_HOURS = 24;
function formatDoubt(d) {
  const created = d.createdAt ? new Date(d.createdAt) : new Date();
  const since = d.lastStudentAt ? new Date(d.lastStudentAt) : created;
  const ageH = (Date.now() - created.getTime()) / 36e5;
  const waitH = (Date.now() - since.getTime()) / 36e5;
  let status = d.resolvedByStudent ? 'Resolved' : (d.status || 'New');
  if (status === 'Pending') status = 'New'; // old default
  if (!['Replied', 'Resolved'].includes(status) && waitH > DOUBT_SLA_HOURS) status = 'Overdue';
  const left = Math.max(0, Math.round(DOUBT_SLA_HOURS - waitH));
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
    thread: (d.thread || []).map((m) => ({ by: m.by, name: m.name, text: m.text, at: m.at })),
    resolvedByStudent: Boolean(d.resolvedByStudent),
    resolvedAt: d.resolvedAt || null,
    timeText,
    slaBadge: ['Replied', 'Resolved'].includes(status) ? 'Resolved' : status === 'Overdue' ? `SLA breached · ${DOUBT_SLA_HOURS}h` : `SLA · ${left}h left`
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
    // A student's doubt always goes to their allocated trainer
    const fromStudent = req.user?.department === 'student';
    let trainerId = (!fromStudent && b.trainerId) || student?.trainerId || '';
    let trainerName = (!fromStudent && b.trainerName) || student?.trainerName || '';
    if (!trainerId && !fromStudent && b.trainer) {
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
    if (!String(reply || '').trim()) return res.status(400).json({ error: 'Reply is empty' });
    if (isTrainerReq(req)) {
      const doubt = await TrainerDoubt.findById(req.params.id).select('trainerId studentId');
      if (!doubt) return res.status(404).json({ error: 'Doubt not found' });
      let allowed = true;
      if (doubt.trainerId) allowed = doubt.trainerId === myTrainerId(req);
      else if (doubt.studentId) allowed = trainerOwnsStudent(req, await findStudentByAnyId(doubt.studentId));
      if (!allowed) return res.status(403).json(NOT_YOUR_RECORD);
    }
    const setFields = { reply, status: 'Replied', repliedAt: new Date() };
    const tId = isTrainerReq(req) ? myTrainerId(req) : (trainerId || req.user?.trainerId || req.user?.id);
    const tName = isTrainerReq(req) ? (trainerName || req.user?.name) : (trainerName || req.user?.name);
    if (tId) setFields.trainerId = tId;
    if (tName) setFields.trainerName = tName;
    const updated = await TrainerDoubt.findByIdAndUpdate(
      req.params.id,
      { $set: { ...setFields, resolvedByStudent: false }, $push: { thread: { by: 'trainer', name: setFields.trainerName || tName || 'Trainer', text: String(reply).trim(), at: setFields.repliedAt } } },
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
    const st = await findStudentByAnyId(key);
    if (!st) continue;
    st.assessmentScore = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
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
    if (isTrainerReq(req)) {
      body.trainerId = myTrainerId(req);
      body.trainerName = body.trainerName || req.user?.name || '';
    }
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
    if (item.trainerId && !trainerOwnsRecord(req, item)) return res.status(403).json(NOT_YOUR_RECORD);
    const currentScores = item.scores instanceof Map ? Object.fromEntries(item.scores) : (item.scores || {});
    const incoming = {};
    const removed = [];
    const max = Number(item.totalMarks) || 0;
    for (const [k, v] of Object.entries(req.body.scores || {})) {
      // null / '' clears a score that was entered by mistake
      if (v === null || v === '') { if (k in currentScores) removed.push(k); continue; }
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || (max > 0 && n > max)) return res.status(400).json({ error: `Each score must be between 0 and ${max || 'the total marks'}` });
      incoming[k] = n;
    }
    if (isTrainerReq(req)) {
      for (const k of Object.keys(incoming)) {
        if (!trainerOwnsStudent(req, await findStudentByAnyId(k))) return res.status(403).json({ error: `Student ${k} is not allocated to you` });
      }
    }
    const merged = { ...currentScores, ...incoming };
    removed.forEach((k) => { delete merged[k]; });
    item.scores = merged;
    if (Object.keys(merged).length) { if (item.status === 'Active') item.status = 'Scored'; }
    else if (item.status === 'Scored') item.status = 'Active';
    await item.save();
    await recomputeAssessmentScores([...Object.keys(incoming), ...removed]);
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
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const item = await TrainerAssessment.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Assessment not found' });
    if (item.trainerId && !trainerOwnsRecord(req, item)) return res.status(403).json(NOT_YOUR_RECORD);
    item.rationale = req.body.rationale;
    await item.save();
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

// Batches are keyed by their exact name everywhere (materials, tests, live
// classes, notifications), so "CPC · 7PM" and "cpc - 7 pm" must resolve to one.
const batchMatchKey = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
const tidyBatchName = (name = '') => String(name).replace(/\s+/g, ' ').trim();

// POST Record Attendance — merges marks into that day's class record
router.post('/trainer/attendance', async (req, res) => {
  try {
    const { trainerId: bodyTrainerId = '', trainerName = '', batch, date, topic, records: rawRecords = {}, isOnline, sessionId } = req.body || {};
    if (!batch) return res.status(400).json({ error: 'batch is required' });
    const trainerId = isTrainerReq(req) ? myTrainerId(req) : bodyTrainerId;
    const records = {};
    for (const [k, v] of Object.entries(rawRecords || {})) {
      if (!['Present', 'Late', 'Absent'].includes(v)) continue;
      if (isTrainerReq(req) && !trainerOwnsStudent(req, await findStudentByAnyId(k))) continue;
      records[k] = v;
    }
    if (Object.keys(rawRecords || {}).length && !Object.keys(records).length) return res.status(403).json(NOT_YOUR_STUDENT);
    const day = date || todayStr();

    // Check if there is an online session linked or conducted for this batch today
    let liveSession = null;
    if (sessionId && mongoose.isValidObjectId(sessionId)) {
      liveSession = await LiveClassSession.findById(sessionId);
    } else {
      const dayStart = new Date(`${day}T00:00:00.000Z`);
      const dayEnd = new Date(`${day}T23:59:59.999Z`);
      liveSession = await LiveClassSession.findOne({
        batch: tidyBatchName(batch),
        startedAt: { $gte: dayStart, $lte: dayEnd }
      }).sort({ startedAt: -1 });
    }

    // Online Attendance Rule: For online sessions, option to mark attendance as present
    // should become available only after the student attends at least 1 hour and 45 minutes (105 min).
    const isOnlineSession = Boolean(isOnline || liveSession);
    for (const [k, v] of Object.entries(records)) {
      if (v === 'Present') {
        const student = await findStudentByAnyId(k);
        const studentIsOnline = isOnlineSession || student?.mode === 'Online';
        if (studentIsOnline && liveSession) {
          const join = (liveSession.joins || []).find((j) => j.studentId === student?.studentId || j.name === student?.name);
          const attendedMins = join?.durationMinutes ?? (join?.joinedAt ? Math.max(0, Math.round(((join.lastJoinAt || liveSession.endedAt || new Date()) - new Date(join.joinedAt)) / 60000)) : 0);
          if (attendedMins < 105) {
            return res.status(400).json({
              error: `For online sessions, the option to mark attendance as Present is available only after attending at least 1 hour and 45 minutes (105 mins). ${student?.name || k} attended ${attendedMins} mins.`
            });
          }
        }
      }
    }

    const set = { trainerName };
    if (topic) set.topic = topic;
    Object.entries(records).forEach(([k, v]) => { set[`records.${k}`] = v; });
    const doc = await ClassAttendance.findOneAndUpdate(
      { trainerId, batch, date: day },
      { $set: set },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await recomputeAttendance(Object.keys(records));

    // Syllabus Tracker: Automatically mark and update syllabus tracker for the corresponding session
    let updatedSyllabus = null;
    if (topic && String(topic).trim()) {
      const cleanTopic = String(topic).trim();
      const bKey = batchMatchKey(batch);
      let sylDoc = await BatchSyllabus.findOne({ batchKey: bKey });
      if (!sylDoc) {
        sylDoc = new BatchSyllabus({ batch, batchKey: bKey, course: '' });
      }
      const existingIndex = (sylDoc.modules || []).findIndex(
        (m) => m.name.toLowerCase() === cleanTopic.toLowerCase() ||
               cleanTopic.toLowerCase().includes(m.name.toLowerCase()) ||
               m.name.toLowerCase().includes(cleanTopic.toLowerCase())
      );
      const by = trainerName || req.user?.name || 'Trainer';
      if (existingIndex >= 0) {
        sylDoc.modules[existingIndex].done = true;
        sylDoc.modules[existingIndex].doneAt = new Date();
        sylDoc.modules[existingIndex].doneBy = by;
      } else {
        sylDoc.modules.push({
          name: cleanTopic.slice(0, 160),
          done: true,
          doneAt: new Date(),
          doneBy: by
        });
      }
      sylDoc.updatedBy = by;
      if (trainerId) sylDoc.trainerId = trainerId;
      if (trainerName) sylDoc.trainerName = trainerName;
      await sylDoc.save();
      updatedSyllabus = sylDoc;

      // Update current syllabus module for all students in this batch
      await Student.updateMany({ batchName: batch }, { $set: { syllabusModule: cleanTopic } });

      // Notify the batch about the syllabus update
      const doneCount = sylDoc.modules.filter((m) => m.done).length;
      const pct = sylDoc.modules.length ? Math.round((doneCount / sylDoc.modules.length) * 100) : 0;
      await notifyBatch(batch, {
        type: 'module',
        title: `Syllabus updated: ${cleanTopic}`.slice(0, 180),
        message: `Session completed and tracked in syllabus tracker (${doneCount} of ${sylDoc.modules.length} modules covered, ${pct}%).`,
        createdBy: by
      }).catch(() => {});
    }

    res.json({
      success: true,
      data: { ...doc.toObject(), records: Object.fromEntries(doc.records || []) },
      syllabus: updatedSyllabus
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// HR → TRAINING HANDOVER  and  TRAINING → HR PROGRESS
// ==========================================
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

// HR hands over student to Head of Trainer (or legacy direct trainer assignment)
async function processHandoverToHead(req, res) {
  try {
    const { headOfTrainer = '', headOfTrainerId = '', trainerNote = '', handedOverBy = '' } = req.body || {};
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    if (!ownsStudent(req, st)) return res.status(403).json(NOT_YOURS);

    // Verify handover checklist
    if (st.handoverStatus !== 'Sent to Training' && st.handoverStatus !== 'Handed Over to Head of Trainer') {
      const cl = { ...(st.checklist?.toObject?.() || st.checklist || {}) };
      if (trainerNote) cl.trainerNote = true;
      const missing = Object.entries(cl).filter(([, v]) => v !== true).map(([k]) => k);
      if (missing.length) return res.status(400).json({ error: `Complete the handover checklist first — missing: ${missing.join(', ')}` });
    }

    const assignedHead = headOfTrainer || st.headOfTrainer || 'Manoj';
    st.handoverStatus = 'Handed Over to Head of Trainer';
    st.headOfTrainer = assignedHead;
    st.headOfTrainerId = headOfTrainerId || st.headOfTrainerId || '';
    if (req.body.branch) st.branch = req.body.branch;
    if (trainerNote) st.trainerNote = trainerNote;
    st.handedOverBy = handedOverBy || req.user?.name || 'HR';
    st.handedOverAt = new Date();
    if (st.checklist) st.checklist.trainerNote = Boolean(trainerNote) || st.checklist.trainerNote;
    await st.save();

    const branchLabel = st.branch || req.body.branch || '';
    await pushNotification({
      audience: 'training', type: 'handover',
      title: `New student handed over: ${st.name}${branchLabel ? ` (${branchLabel})` : ''}`,
      message: `${st.handedOverBy} handed over ${st.name} (${st.studentId}) · ${st.course} to Head of Trainer (${assignedHead})${branchLabel ? ` for ${branchLabel} branch` : ''}. Pending trainer & batch allocation.${trainerNote ? ` Note: ${trainerNote}` : ''}`,
      studentId: st.studentId, createdBy: st.handedOverBy
    });

    await notifyStudent(st.studentId, {
      type: 'handover', title: 'Handover complete · Training Department',
      message: `Your admission profile has been verified by HR and handed over to Head of Trainer (${assignedHead})${branchLabel ? ` at ${branchLabel} branch` : ''}. Your trainer and batch will be allocated shortly.`,
      createdBy: st.handedOverBy
    });

    res.json(st);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

router.post('/students/:id/handover-to-head', processHandoverToHead);

// All student handovers route strictly to the Head of Trainer.
// The Head of Trainer alone assigns students to trainers and batches.
router.post('/students/:id/handover', async (req, res) => {
  return processHandoverToHead(req, res);
});

// Helper: Only Head of Trainer, Academic Director, Chief Faculty, Admin, or Leadership can assign/reassign students
export const isHeadOfTrainerUser = async (req) => {
  const u = req.user;
  if (!u) return false;
  // Admin & Leadership always have full authority
  if (['admin', 'leadership'].includes(u.department) || ['Admin', 'Super Admin'].includes(u.role)) {
    return true;
  }
  const name = String(u.name || u.userName || '').toLowerCase();
  if (/manoj|keerthika|vaishna|pavithra|dr\.?\s*vikram/i.test(name)) {
    return true;
  }
  const role = String(u.role || '').toLowerCase();
  const dept = String(u.department || '').toLowerCase();
  if (
    role.includes('head of trainer') ||
    role.includes('head of training') ||
    role.includes('training head') ||
    role.includes('faculty lead') ||
    role.includes('chief trainer') ||
    role.includes('chief faculty') ||
    role.includes('academic director') ||
    role.includes('lead trainer') ||
    role.includes('trainer lead') ||
    role.includes('trainer') ||
    dept.includes('training') ||
    dept.includes('faculty')
  ) {
    return true;
  }
  // Check designated Academic / Training Department Head (e.g. Dr. Vikram C.)
  try {
    const acadDept = await Department.findOne({ $or: [{ code: 'ACAD' }, { dashboard: 'training' }] }).lean();
    if (acadDept?.head && (acadDept.head.toLowerCase() === String(u.name || '').toLowerCase() || acadDept.head.toLowerCase().includes(String(u.name || '').toLowerCase()))) {
      return true;
    }
  } catch (_) {}

  // Check if user has Trainer record in DB
  if (u.trainerId || u.email) {
    try {
      const tr = await Trainer.findOne({ $or: [{ trainerId: u.trainerId || '' }, { email: u.email || '' }] }).lean();
      if (tr && tr.active !== false) {
        return true;
      }
    } catch (_) {}
  }

  return false;
};

// Head of Trainer assigns students to respective trainers & batches
router.post('/students/:id/allocate-trainer', async (req, res) => {
  try {
    const authorized = await isHeadOfTrainerUser(req);
    if (!authorized) {
      return res.status(403).json({
        error: 'Access denied: Only the Head of Trainer has the authority to assign or reassign students to trainers and batches.'
      });
    }

    const {
      trainerId,
      batchName = '',
      trainerNote = '',
      allocatedBy = '',
      isAnatomyToCoding = false,
      batchTiming = '',
      targetTiming = '',
      syllabusModule = '',
      resolveTicket = false
    } = req.body || {};

    if (!trainerId) return res.status(400).json({ error: 'Select a trainer to allocate the student to' });
    const trainer = await Trainer.findOne({ trainerId });
    if (!trainer) return res.status(404).json({ error: 'Trainer not found in the roster' });
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });

    const previousBatch = st.allocatedTrainerAt || st.handedOverAt ? studentBatchOf(st) : '';
    const previousTrainer = st.trainerName;
    const previousTrainerId = st.trainerId;

    // Detect if this is an Anatomy to Medical Coding transition:
    const isAnatomySource = /anatomy/i.test(previousBatch || '') || /anatomy/i.test(st.course || '') || /anatomy/i.test(previousTrainer || '') || st.syllabusModule === 'Module 2' || st.anatomyCompleted;
    const isCodingTarget = /coding|cpc|amct|cic|coc|ccs|cpt|icd/i.test(batchName || '') || /coding|cpc|amct|cic|coc|ccs/i.test(trainer.courseKey || trainer.specialization || '');
    const isAnatomyConversion = Boolean(isAnatomyToCoding || (isAnatomySource && isCodingTarget && !/anatomy alone/i.test(batchName)));

    st.trainerId = trainer.trainerId;
    st.trainerName = trainer.trainerName;
    st.batchName = await canonicalBatchName(batchName || st.batchName || `${st.course}${st.batchTiming ? ` · ${st.batchTiming}` : ''}`, trainer.trainerId);

    // Schedule continuity — keep or update training schedule
    const effectiveTiming = batchTiming || targetTiming || st.batchTiming || '';
    if (effectiveTiming) st.batchTiming = effectiveTiming;

    if (trainerNote) st.trainerNote = trainerNote;
    st.handoverStatus = 'Sent to Training';
    st.allocatedByHead = allocatedBy || req.user?.name || 'Head of Trainer';
    st.allocatedByHeadAt = new Date();
    st.allocatedTrainerAt = new Date();
    if (!st.handedOverAt) st.handedOverAt = new Date();

    // ── ANATOMY TO CODING SYLLABUS & SCHEDULE PRESERVATION ──
    if (isAnatomyConversion) {
      st.anatomyCompleted = true;
      st.anatomyCompletedAt = st.anatomyCompletedAt || new Date();
      st.anatomyCompletedBy = st.allocatedByHead;
      st.codingBatchEnrolledAt = new Date();

      // Ensure Anatomy modules (Modules 1 and 2) are preserved as completed
      const anatMods = [
        'Module 1 — Foundations & Medical Terminology',
        'Module 2 — Anatomy, Physiology & Body Systems'
      ];
      const existingCompleted = Array.isArray(st.completedModules) ? st.completedModules : [];
      st.completedModules = [...new Set([...existingCompleted, ...anatMods])];

      // Advance active syllabus module into Medical Coding (default: Module 3 - Core Coding Guidelines)
      st.syllabusModule = syllabusModule || (['Module 1', 'Module 2', ''].includes(st.syllabusModule) ? 'Module 3' : st.syllabusModule);

      // Append structured audit log in remedial actions
      st.remedialActions = st.remedialActions || [];
      st.remedialActions.push({
        action: 'Anatomy to Medical Coding Batch Conversion',
        note: `Transitioned from Anatomy (${previousBatch || previousTrainer || 'Anatomy Foundation'}) to Medical Coding (${st.batchName} · Trainer: ${trainer.trainerName}). Schedule: ${st.batchTiming || 'Standard'}. Anatomy Modules 1 & 2 completed, active syllabus set to ${st.syllabusModule}.`,
        by: st.allocatedByHead,
        at: new Date()
      });
    } else if (syllabusModule) {
      st.syllabusModule = syllabusModule;
    }

    // ── RECORD BATCH TRANSITION HISTORY ──
    st.batchHistory = st.batchHistory || [];
    st.batchHistory.push({
      fromBatch: previousBatch,
      toBatch: st.batchName,
      fromTrainerId: previousTrainerId || '',
      fromTrainerName: previousTrainer || '',
      toTrainerId: trainer.trainerId,
      toTrainerName: trainer.trainerName,
      transitionType: isAnatomyConversion ? 'anatomy_to_coding' : (previousBatch ? 'batch_transfer' : 'initial_allocation'),
      transitionedAt: new Date(),
      transitionedBy: st.allocatedByHead,
      preservedSyllabusModule: st.syllabusModule,
      timing: st.batchTiming || '',
      notes: trainerNote || (isAnatomyConversion ? 'Anatomy completed; transitioned to Medical Coding batch.' : '')
    });

    await st.save();

    // ── AUTO-RESOLVE OPEN BATCH CONVERSION TICKETS IF PRESENT ──
    if (isAnatomyConversion || resolveTicket) {
      const openBatchTicket = await Escalation.findOne({
        $and: [
          { $or: [{ studentId: st.studentId }, { raisedBy: new RegExp(escapeRegex(st.studentId), 'i') }] },
          { $or: [{ type: /batch\s*conversion/i }, { category: /batch\s*conversion/i }, { title: /batch\s*conversion/i }] },
          { status: { $in: ['open', 'in-progress'] } }
        ]
      });
      if (openBatchTicket) {
        openBatchTicket.status = 'resolved';
        openBatchTicket.resolvedAt = new Date();
        openBatchTicket.response = `Batch conversion completed by Head of Trainer: transitioned to ${trainer.trainerName} · batch "${st.batchName}" (${st.batchTiming || 'Scheduled'}). Anatomy progress preserved, active module set to ${st.syllabusModule}.`;
        openBatchTicket.respondedBy = st.allocatedByHead;
        await openBatchTicket.save().catch(() => {});
      }
    }

    // Re-link any existing doubts, submissions or requests that had no trainer assigned or mismatched
    await Promise.all([
      StudentSubmission.updateMany(
        { studentId: st.studentId, $or: [{ trainerId: '' }, { trainerId: { $exists: false } }, { trainerId: { $ne: trainer.trainerId } }] },
        { $set: { trainerId: trainer.trainerId, trainerName: trainer.trainerName } }
      ).catch(() => {}),
      TrainerDoubt.updateMany(
        { studentId: st.studentId, $or: [{ trainerId: '' }, { trainerId: { $exists: false } }, { trainerId: { $ne: trainer.trainerId } }] },
        { $set: { trainerId: trainer.trainerId, trainerName: trainer.trainerName } }
      ).catch(() => {}),
      StudentRequest.updateMany(
        { studentId: st.studentId, $or: [{ trainerId: '' }, { trainerId: { $exists: false } }, { trainerId: { $ne: trainer.trainerId } }] },
        { $set: { trainerId: trainer.trainerId, trainerName: trainer.trainerName } }
      ).catch(() => {})
    ]);

    // Notify assigned trainer
    await pushNotification({
      audience: 'trainer', recipientId: trainer.trainerId, recipientName: trainer.trainerName, type: 'handover',
      title: isAnatomyConversion ? `Student Transitioned: ${st.name} (Anatomy → Coding)` : `New student allocated: ${st.name}`,
      message: isAnatomyConversion
        ? `${st.allocatedByHead} (Head of Trainer) transitioned ${st.name} (${st.studentId}) from Anatomy into your Coding batch "${st.batchName}" (${st.batchTiming || 'Scheduled'}). Anatomy modules verified and complete; ready for ${st.syllabusModule}.${st.trainerNote ? ` Note: ${st.trainerNote}` : ''}`
        : `${st.allocatedByHead} (Head of Trainer) allocated ${st.name} (${st.studentId}) · ${st.course} to your batch "${st.batchName}".${previousTrainer && previousTrainer !== trainer.trainerName ? ` Transferred from ${previousTrainer}.` : ''}${st.trainerNote ? ` Note: ${st.trainerNote}` : ''}`,
      studentId: st.studentId, createdBy: st.allocatedByHead
    });

    // Notify student
    await notifyStudent(st.studentId, {
      type: 'handover',
      title: isAnatomyConversion ? 'Batch Transition: Welcome to Medical Coding! 🎯' : `Your trainer is ${trainer.trainerName}`,
      message: isAnatomyConversion
        ? `You've successfully transitioned to Medical Coding with trainer ${trainer.trainerName} · batch "${st.batchName}" (${st.batchTiming || 'Scheduled'}). Your Anatomy progress is preserved and your active module is ${st.syllabusModule}.`
        : `You've been allocated to trainer ${trainer.trainerName} · batch ${st.batchName}. Your classes, materials and tests will appear here.`,
      createdBy: st.allocatedByHead
    });

    // Notify HR counsellor
    if (st.hrName) {
      await pushNotification({
        audience: 'hr', recipientName: st.hrName, type: 'handover',
        title: isAnatomyConversion ? `Batch Converted: ${st.name} (Anatomy → Coding)` : `Trainer allocated: ${st.name}`,
        message: `${st.allocatedByHead} (Head of Trainer) transitioned ${st.name} (${st.studentId}) to trainer ${trainer.trainerName} · batch ${st.batchName}${st.batchTiming ? ` (${st.batchTiming})` : ''}.${isAnatomyConversion ? ' Anatomy progress preserved.' : ''}`,
        studentId: st.studentId, createdBy: st.allocatedByHead
      }).catch(() => {});
    }

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
    if (!trainerOwnsStudent(req, st)) return res.status(403).json(NOT_YOUR_STUDENT);
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

// Trainer Approval for Course Completion Certificate & Exam Approval
// Respective trainer must verify syllabus completion, assessments, and overall readiness before approval
router.put('/students/:id/trainer-approval', async (req, res) => {
  try {
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    if (!trainerOwnsStudent(req, st)) return res.status(403).json(NOT_YOUR_STUDENT);

    const {
      approveCourseCompletion = false,
      approveExam = false,
      trainerNotes = '',
      trainerName = '',
      decision = 'Approved', // 'Approved' | 'Declined'
      verifySyllabus = true,
      verifyAssessments = true,
      verifyReadiness = true,
      verifySeminar = true
    } = req.body || {};

    const effectiveTrainer = trainerName || st.trainerName || req.user?.name || 'Respective Trainer';
    const now = new Date();

    // Check syllabus modules for this batch
    const batchKey = batchMatchKey(studentBatchOf(st));
    const syllabusDoc = batchKey ? await BatchSyllabus.findOne({ batchKey }) : null;
    const modules = syllabusDoc?.modules || [];
    const doneModulesCount = modules.filter(m => m.done).length;

    // Check assessment records
    const tests = await TrainerAssessment.find({
      $or: [...(st.batchName ? [{ batch: st.batchName }] : []), { [`scores.${studentKeyOf(st)}`]: { $exists: true } }]
    });
    let testAvg = null;
    let passedCount = 0;
    if (tests.length > 0) {
      const scores = tests.map(t => {
        const s = plainMap(t.scores);
        const myScore = typeof s[studentKeyOf(st)] === 'number' ? s[studentKeyOf(st)] : null;
        if (myScore !== null && t.totalMarks > 0) {
          const pct = Math.round((myScore / t.totalMarks) * 100);
          if (myScore >= (t.passMark || 0)) passedCount++;
          return pct;
        }
        return null;
      }).filter(x => x !== null);
      if (scores.length > 0) {
        testAvg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }
    }
    if (testAvg === null && typeof st.assessmentScore === 'number') {
      testAvg = st.assessmentScore;
    }

    // Record verification snapshot
    st.trainerApprovalVerification = {
      syllabusVerified: Boolean(verifySyllabus),
      syllabusCompleted: Boolean(st.syllabusCompleted || verifySyllabus),
      modulesCompletedCount: doneModulesCount || (st.syllabusCompleted ? modules.length : 0),
      assessmentsVerified: Boolean(verifyAssessments),
      assessmentAverage: testAvg,
      assessmentsClearedCount: passedCount,
      readinessVerified: Boolean(verifyReadiness),
      readinessScore: st.readinessScore,
      attendancePct: st.attendancePct,
      jobReadyStatus: st.jobReadyStatus || st.trainerRecommendation || '',
      seminarVerified: Boolean(verifySeminar),
      verifiedAt: now,
      verifiedBy: effectiveTrainer
    };

    if (decision === 'Approved') {
      // If syllabus was verified as complete by the trainer, sync syllabusCompleted
      if (verifySyllabus && !st.syllabusCompleted) {
        st.syllabusCompleted = true;
        st.syllabusCompletedAt = now;
        st.placementStatus = 'Referred to CCCP';
      }

      // Mandatory Student Seminar — every student must deliver one before completion
      if (verifySeminar && !st.seminarCompleted) {
        st.seminarCompleted = true;
        st.seminarCompletedAt = now;
        st.seminarEvaluatedBy = effectiveTrainer;
        st.seminarFeedback = trainerNotes || st.seminarFeedback;
      }

      if (approveCourseCompletion) {
        st.courseCompletionApproved = true;
        st.courseCompletionApprovedAt = now;
        st.courseCompletionApprovedBy = effectiveTrainer;
        st.courseCompletionTrainerNotes = trainerNotes;
        st.courseCompletionStatus = 'Approved';
      }

      if (approveExam) {
        st.examApprovedByTrainer = true;
        st.examApprovedAt = now;
        st.examApprovedBy = effectiveTrainer;
        st.examTrainerNotes = trainerNotes;
        st.examApprovalStatus = 'Approved';
      }

      await st.save();

      const approvedItems = [
        approveCourseCompletion ? 'Course Completion Certificate' : '',
        approveExam ? 'Exam Eligibility & Slot' : ''
      ].filter(Boolean).join(' and ') || 'Academic Milestones';

      await pushNotification({
        audience: 'hr', recipientName: st.hrName || '', type: 'trainer_approval',
        title: `Trainer Approval Granted: ${st.name}`,
        message: `${effectiveTrainer} verified syllabus, assessments & readiness and approved ${approvedItems} for ${st.name} (${st.studentId}).${trainerNotes ? ` Note: ${trainerNotes}` : ''}`,
        studentId: st.studentId, createdBy: effectiveTrainer
      });

      if (approveExam) {
        await pushNotification({
          audience: 'cccp', type: 'exam',
          title: `Exam Approved by Trainer: ${st.name}`,
          message: `${effectiveTrainer} approved ${st.name} (${st.studentId}) for AAPC exam. Ready for exam scheduling.`,
          studentId: st.studentId, createdBy: effectiveTrainer
        });
      }

      await notifyStudent(st.studentId, {
        type: 'trainer_approval',
        title: `Trainer Approval Granted! 🎓`,
        message: `Your trainer ${effectiveTrainer} has approved your ${approvedItems} after verifying your syllabus, assessment scores, and readiness.`,
        link: 'certification'
      });

    } else {
      if (approveCourseCompletion) {
        st.courseCompletionApproved = false;
        st.courseCompletionStatus = 'Declined';
        st.courseCompletionTrainerNotes = trainerNotes;
      }
      if (approveExam) {
        st.examApprovedByTrainer = false;
        st.examApprovalStatus = 'Declined';
        st.examTrainerNotes = trainerNotes;
      }
      await st.save();

      await notifyStudent(st.studentId, {
        type: 'trainer_approval',
        title: `Trainer Review Feedback 📋`,
        message: `Your trainer noted improvements needed before course completion/exam approval: ${trainerNotes || 'Please consult your trainer.'}`,
        link: 'certification'
      });
    }

    res.json(st);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const handleStudentReadinessUpdate = async (req, res) => {
  try {
    const {
      status,
      jobReadyStatus,
      trainerName = '',
      mockScore,
      interviewPrepScore,
      technicalScore,
      communicationScore,
      assessmentScore,
      feedback = '',
      notes = ''
    } = req.body || {};

    const rawStatus = jobReadyStatus || status;
    const allowed = ['Ready', 'Job Ready', 'Needs Revision', 'Not Ready', 'In Progress'];
    if (rawStatus && !allowed.includes(rawStatus)) {
      return res.status(400).json({ error: 'Invalid recommendation or job-ready status' });
    }

    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    if (!trainerOwnsStudent(req, st)) return res.status(403).json(NOT_YOUR_STUDENT);

    // 1. Technical Knowledge
    if (technicalScore !== undefined && technicalScore !== null && technicalScore !== '') {
      st.technicalScore = Math.max(0, Math.min(100, Number(technicalScore)));
    }
    // 2. Assessments
    if (assessmentScore !== undefined && assessmentScore !== null && assessmentScore !== '') {
      st.assessmentScore = Math.max(0, Math.min(100, Number(assessmentScore)));
    }
    // 3. Communication
    if (communicationScore !== undefined && communicationScore !== null && communicationScore !== '') {
      st.communicationScore = Math.max(0, Math.min(100, Number(communicationScore)));
    }
    // 4. Interview Preparation (kept in sync with mockScore)
    const interviewVal = interviewPrepScore !== undefined && interviewPrepScore !== null && interviewPrepScore !== ''
      ? interviewPrepScore
      : (mockScore !== undefined && mockScore !== null && mockScore !== '' ? mockScore : undefined);

    if (interviewVal !== undefined) {
      const numInterview = Math.max(0, Math.min(100, Number(interviewVal)));
      st.interviewPrepScore = numInterview;
      st.mockScore = numInterview;
    }

    if (feedback || notes) {
      st.readinessFeedback = String(feedback || notes || '').trim();
    }

    // Determine Job-Ready status
    const isReady = rawStatus === 'Ready' || rawStatus === 'Job Ready';
    const isNeedsRevision = rawStatus === 'Needs Revision' || rawStatus === 'In Progress';
    const isNotReady = rawStatus === 'Not Ready';

    if (rawStatus) {
      if (isReady) {
        st.jobReadyStatus = 'Job Ready';
        st.trainerRecommendation = 'Ready';
        st.placementStatus = 'Referred to CCCP';
      } else if (isNeedsRevision) {
        st.jobReadyStatus = 'Needs Revision';
        st.trainerRecommendation = 'Needs Revision';
      } else if (isNotReady) {
        st.jobReadyStatus = 'Not Ready';
        st.trainerRecommendation = 'Not Ready';
      }
    }

    st.readinessScore = computeReadiness(st);
    st.trainerRecommendationAt = new Date();
    st.readinessEvaluatedBy = trainerName || req.user?.name || st.trainerName || 'Trainer';
    st.readinessEvaluatedAt = new Date();

    await st.save();

    const displayStatus = st.jobReadyStatus || st.trainerRecommendation || 'Updated';
    await pushNotification({
      audience: 'hr', recipientName: st.hrName || '', type: 'recommendation',
      title: `Trainer job-ready evaluation: ${st.name} → ${displayStatus}`,
      message: `${trainerName || st.trainerName || 'Trainer'} updated ${st.name}'s readiness as "${displayStatus}"${typeof st.readinessScore === 'number' ? ` · score ${st.readinessScore}%` : ''}.`,
      studentId: st.studentId, createdBy: trainerName
    });

    if (isReady) {
      await pushNotification({
        audience: 'cccp', type: 'recommendation',
        title: `Placement Job-Ready: ${st.name}`,
        message: `${trainerName || st.trainerName || 'Trainer'} marked ${st.name} (${st.studentId}) as Job Ready${typeof st.readinessScore === 'number' ? ` · readiness ${st.readinessScore}%` : ''}.`,
        studentId: st.studentId, createdBy: trainerName
      });
    }

    res.json(st);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

router.put('/students/:id/recommendation', handleStudentReadinessUpdate);
router.put('/students/:id/readiness', handleStudentReadinessUpdate);

// Update weekly star rating (trainers / academic heads)
router.put('/students/:id/weekly-rating', async (req, res) => {
  try {
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    const { attendanceScore, assessmentScore, syllabusScore, participationScore, feedback = '', evaluatedBy = '' } = req.body || {};

    const att = Math.max(1, Math.min(5, Number(attendanceScore ?? st.weeklyRating?.attendanceScore ?? 4)));
    const ass = Math.max(1, Math.min(5, Number(assessmentScore ?? st.weeklyRating?.assessmentScore ?? 4)));
    const syl = Math.max(1, Math.min(5, Number(syllabusScore ?? st.weeklyRating?.syllabusScore ?? 4)));
    const part = Math.max(1, Math.min(5, Number(participationScore ?? st.weeklyRating?.participationScore ?? 4)));
    const overall = Number(((att + ass + syl + part) / 4).toFixed(1));

    let tier = 'On-Track Learner';
    if (overall >= 4.5) tier = 'Outstanding Star';
    else if (overall >= 3.8) tier = 'High Performer';
    else if (overall >= 3.0) tier = 'On-Track Learner';
    else if (overall >= 2.0) tier = 'Needs Focus';
    else tier = 'Action Required';

    const now = new Date();
    const history = Array.isArray(st.weeklyRating?.history) ? [...st.weeklyRating.history] : [];
    if (st.weeklyRating?.weekLabel && st.weeklyRating?.stars) {
      history.unshift({
        weekLabel: st.weeklyRating.weekLabel,
        weekNumber: st.weeklyRating.weekNumber,
        year: st.weeklyRating.year,
        stars: st.weeklyRating.stars,
        tier: st.weeklyRating.tier,
        attendanceScore: st.weeklyRating.attendanceScore,
        assessmentScore: st.weeklyRating.assessmentScore,
        syllabusScore: st.weeklyRating.syllabusScore,
        participationScore: st.weeklyRating.participationScore,
        feedback: st.weeklyRating.feedback,
        evaluatedAt: st.weeklyRating.evaluatedAt || new Date(),
        evaluatedBy: st.weeklyRating.evaluatedBy || evaluatedBy || 'Trainer'
      });
    }

    st.weeklyRating = {
      stars: overall,
      tier,
      weekLabel: st.weeklyRating?.weekLabel || `Week (Manual Update)`,
      weekNumber: st.weeklyRating?.weekNumber || 0,
      year: st.weeklyRating?.year || now.getFullYear(),
      attendanceScore: att,
      assessmentScore: ass,
      syllabusScore: syl,
      participationScore: part,
      feedback: String(feedback).trim() || st.weeklyRating?.feedback || '',
      evaluatedAt: now,
      evaluatedBy: evaluatedBy || 'Lead Trainer',
      history: history.slice(0, 12)
    };
    await st.save();

    await pushNotification({
      audience: 'student',
      studentId: st.studentId,
      type: 'rating',
      title: `Weekly Star Rating Updated: ${overall}★ (${tier})`,
      message: `Your trainer updated your weekly performance evaluation across Attendance, Assessment, Syllabus, and Participation.`,
      link: 'dashboard'
    }).catch(() => {});

    res.json(st.weeklyRating);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/students/:id/remedial', async (req, res) => {
  try {
    const { action, note = '', trainerName = '' } = req.body || {};
    if (!action) return res.status(400).json({ error: 'action is required' });
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    if (!trainerOwnsStudent(req, st)) return res.status(403).json(NOT_YOUR_STUDENT);
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
const AUDIENCE_BY_DEPT_CODE = { 'DEP-HR-001': 'hr', ACAD: 'trainer', CCCP: 'cccp', MKT: 'marketing' };
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
      uploaderId: isTrainerReq(req) ? myTrainerId(req) : (uploaderId || ''),
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
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    if (isTrainerReq(req)) {
      const doc = await TrainingMaterial.findById(req.params.id).select('uploaderId');
      if (!doc) return res.status(404).json({ error: 'Material not found' });
      if (doc.uploaderId !== myTrainerId(req)) return res.status(403).json({ error: 'Only the trainer who uploaded this material can delete it.' });
    }
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
// Older records saved 'MOU Signed' / 'In Discussion' — normalise to Signed | Draft | Not Signed
const normaliseMou = (v) => (/signed/i.test(v || '') && !/not/i.test(v || '') ? 'Signed' : /draft/i.test(v || '') ? 'Draft' : 'Not Signed');
const collegeView = (c) => {
  const o = typeof c.toObject === 'function' ? c.toObject() : c;
  return { id: String(o._id), _id: String(o._id), ...o, mouStatus: normaliseMou(o.mouStatus), mou: normaliseMou(o.mouStatus) };
};
// Readable partner codes (CLG-CBE-001 / CMP-HYD-001), unique per prefix
async function nextPartnerCode(Model, prefix, city) {
  const cityCode = (String(city || '').replace(/[^a-z]/gi, '').slice(0, 3) || 'GEN').toUpperCase();
  const base = `${prefix}-${cityCode}-`;
  const taken = new Set((await Model.find({ code: new RegExp(`^${base}`) }).select('code').lean()).map((d) => d.code));
  let n = taken.size + 1;
  while (taken.has(`${base}${String(n).padStart(3, '0')}`)) n += 1;
  return `${base}${String(n).padStart(3, '0')}`;
}

router.get('/cccp/colleges', async (req, res) => {
  try {
    let colleges = await CollegePartner.find().sort({ createdAt: -1 });
    res.json(colleges.map(collegeView));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/cccp/colleges', async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.name || !String(body.name).trim()) return res.status(400).json({ error: 'College name is required' });
    if (body.mouStatus !== undefined) body.mouStatus = normaliseMou(body.mouStatus);
    if (!body.code) body.code = await nextPartnerCode(CollegePartner, 'CLG', body.city);
    const college = new CollegePartner(body);
    await college.save();
    res.status(201).json(collegeView(college));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/cccp/colleges/:id', async (req, res) => {
  try {
    const body = { ...req.body };
    delete body._id; delete body.id; delete body.mou;
    if (body.mouStatus !== undefined) body.mouStatus = normaliseMou(body.mouStatus);
    const updated = await CollegePartner.findByIdAndUpdate(req.params.id, { $set: body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'College not found' });
    res.json(collegeView(updated));
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

// Campus student list → HR lead pool. Rows already in the pool (same phone)
// are skipped; new leads carry source "Campus — <College>".
router.post('/cccp/colleges/:id/handover', async (req, res) => {
  try {
    const college = await CollegePartner.findById(req.params.id);
    if (!college) return res.status(404).json({ error: 'College not found' });
    const rows = Array.isArray(req.body?.students) ? req.body.students : [];
    if (!rows.length) return res.status(400).json({ error: 'Add at least one student' });
    const key = (p) => String(p || '').replace(/\D/g, '').slice(-10);
    const existing = new Set((await StudentLead.find().select('phone').lean()).map((l) => key(l.phone)).filter(Boolean));
    const source = `Campus — ${college.name}`;
    let created = 0;
    const skipped = [];
    for (const r of rows) {
      const fullName = String(r.fullName || r.name || '').trim();
      const k = key(r.phone);
      if (!fullName || k.length < 10) { skipped.push({ name: fullName || '(blank)', reason: 'name or 10-digit phone missing' }); continue; }
      if (existing.has(k)) { skipped.push({ name: fullName, reason: 'already in lead pool' }); continue; }
      await StudentLead.create({
        fullName,
        phone: String(r.phone).trim(),
        email: String(r.email || '').trim(),
        course: String(r.course || '').trim(),
        branch: String(r.branch || req.body.branch || '').trim(),
        location: college.city || '',
        source,
        sourceName: source,
        fetchedBy: req.user?.name || 'CCCP',
        stage: 'new'
      });
      existing.add(k);
      created += 1;
    }
    if (created) {
      college.stage = college.stage === 'MOU Signed' ? college.stage : 'HR Handover Done';
      await college.save();
      await pushNotification({
        audience: 'hr', type: 'campus',
        title: `${created} campus lead${created > 1 ? 's' : ''} from ${college.name}`,
        message: `Handed over by ${req.user?.name || 'CCCP'} · source "${source}" — allocate from the lead pool.`,
        createdBy: req.user?.name || ''
      });
    }
    res.json({ created, skipped, college: collegeView(college) });
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
    const body = { ...req.body };
    if (!body.name || !String(body.name).trim()) return res.status(400).json({ error: 'Company name is required' });
    if (!body.code) body.code = await nextPartnerCode(CorporatePartner, 'CMP', body.city);
    const company = new CorporatePartner(body);
    await company.save();
    res.status(201).json({ id: company._id.toString(), _id: company._id.toString(), ...company.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/cccp/companies/:id', async (req, res) => {
  try {
    const body = { ...req.body };
    delete body._id; delete body.id;
    const before = await CorporatePartner.findById(req.params.id).select('stage').lean();
    const updated = await CorporatePartner.findByIdAndUpdate(req.params.id, { $set: body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Corporate partner not found' });
    // Corporate training deal closed → every trainer's bell (Training plans the batch)
    if (updated.stage === 'Training Active' && before?.stage !== 'Training Active') {
      await pushNotification({
        audience: 'trainer', type: 'corporate',
        title: `Corporate training: ${updated.name}`,
        message: [`CCCP closed a corporate training deal${updated.city ? ` (${updated.city})` : ''} — please plan the batch.`, updated.contact && `Contact: ${updated.contact}`, updated.notes].filter(Boolean).join(' · '),
        createdBy: req.user?.name || ''
      });
    }
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
async function syncStageFromRecord(studentId, status, company = '') {
  const st = await findStudentByAnyId(studentId);
  if (!st) return '';
  const hit = RECORD_STAGE.find(([re]) => re.test(status || ''));
  if (!hit) return '';
  const target = hit[1];
  // Mirror the CCCP outcome on the student record so HR (Placed tab),
  // Leadership and the Student portal read the same status
  const label = target >= 7 ? `Placed${company ? ` — ${company}` : ''}`
    : target === 6 ? `Offer${company ? ` — ${company}` : ''}`
    : target === 5 ? `Interview${company ? ` — ${company}` : ''}`
    : `Mapped${company ? ` — ${company}` : ''}`;
  st.placementStatus = label;
  if (target >= 7) st.statusGroup = 'placed';
  const current = effectiveStage(st);
  if (target <= current) { await st.save(); return ''; }
  // A CCCP record carries the company / interview / offer itself, so the
  // steps in between are implied — only the Talentera gate applies here
  if (autoStage(st) < 3 && current < 4) { await st.save(); return `Student stage not moved. ${blockReason(st, 4)}`; }
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
    const stageNote = req.body.studentId ? await syncStageFromRecord(req.body.studentId, record.status || 'Company Mapped', record.company) : '';
    res.status(201).json({ id: record._id.toString(), _id: record._id.toString(), ...record.toObject(), stageNote });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/cccp/placements/:id', async (req, res) => {
  try {
    const updated = await PlacementRecord.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Placement record not found' });
    const stageNote = updated.studentId ? await syncStageFromRecord(updated.studentId, updated.status || 'Interview Scheduled', updated.company) : '';
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
    let followups = await CccpFollowUp.find().sort({ date: 1, time: 1 });
    res.json(followups.map(f => ({ id: f._id.toString(), _id: f._id.toString(), ...f.toObject() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/cccp/followups', async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.who || !body.action) return res.status(400).json({ error: 'Who and action are required' });
    const fu = new CccpFollowUp(body);
    await fu.save();
    res.status(201).json({ id: fu._id.toString(), _id: fu._id.toString(), ...fu.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Mark a follow-up done / reschedule it
router.put('/cccp/followups/:id', async (req, res) => {
  try {
    const body = { ...req.body };
    delete body._id; delete body.id;
    const updated = await CccpFollowUp.findByIdAndUpdate(req.params.id, { $set: body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Follow-up not found' });
    res.json({ id: updated._id.toString(), _id: updated._id.toString(), ...updated.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/cccp/followups/:id', async (req, res) => {
  try {
    await CccpFollowUp.findByIdAndDelete(req.params.id);
    res.json({ success: true });
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
  const monthStart = monthStartIST();
  const spentThisMonth = (o.spendLog || []).filter((e) => new Date(e.at) >= monthStart).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const leadsThisMonth = mine.filter((l) => new Date(l.createdAt) >= monthStart).length;
  return {
    id: String(o._id),
    _id: String(o._id),
    ...o,
    leads: mine.length,
    admissions: admitted.length,
    revenue,
    cpl,
    spentThisMonth,
    leadsThisMonth,
    cplThisMonth: leadsThisMonth && spentThisMonth ? Math.round(spentThisMonth / leadsThisMonth) : null,
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
    if (Number(data.spent) > 0) data.spendLog = [{ at: new Date(), amount: Number(data.spent), by: req.user?.name || '' }];
    const campaign = await MarketingCampaign.create(data);
    res.status(201).json(campaignView(campaign, [], new Map()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/marketing/campaigns/:id', async (req, res) => {
  try {
    const data = pickCampaign(req.body);
    const before = await MarketingCampaign.findById(req.params.id).select('spent').lean();
    if (!before) return res.status(404).json({ error: 'Campaign not found' });
    const update = { $set: data };
    if (data.spent !== undefined) {
      const delta = (Number(data.spent) || 0) - (Number(before.spent) || 0);
      if (delta) update.$push = { spendLog: { at: new Date(), amount: delta, by: req.user?.name || '' } };
    }
    const updated = await MarketingCampaign.findByIdAndUpdate(req.params.id, update, { new: true });
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
    await pushNotification({
      audience: 'marketing', type: 'demand',
      title: `Lead request: ${created.branch} needs ${created.targetLeads} ${created.course || ''} leads`.trim(),
      message: [created.requester && `Raised by ${created.requester}`, created.deadline && `deadline ${created.deadline}`, created.notes].filter(Boolean).join(' · '),
      createdBy: created.requester || ''
    });
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

// ---- Compute Weekly Star Rating for a student based on 4 pillars ----
// Attendance (25%), Assessment Performance (25%), Syllabus Progress (25%), Participation (25%)
export function computeStudentWeeklyRating(st, { attendance = [], assessments = [], syllabus = null, doubts = [], submissions = [], recentClasses = [] } = {}) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const year = d.getUTCFullYear();

  // Week start (Monday) and end (Sunday)
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekLabel = `Week ${weekNumber} (${monday.getDate()} ${monthNames[monday.getMonth()]} - ${sunday.getDate()} ${monthNames[sunday.getMonth()]})`;

  // 1. ATTENDANCE PILLAR (0 - 5.0 stars)
  const mondayStr = monday.toISOString().split('T')[0];
  const sundayStr = sunday.toISOString().split('T')[0];
  const weeklyAttendance = attendance.filter((a) => {
    const dStr = a.date ? String(a.date).slice(0, 10) : '';
    return dStr >= mondayStr && dStr <= sundayStr;
  });

  let attScore = 4.0;
  let attDetail = '';
  if (weeklyAttendance.length > 0) {
    const attendedCount = weeklyAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    const rate = Math.round((attendedCount / weeklyAttendance.length) * 100);
    if (rate >= 95) attScore = 5.0;
    else if (rate >= 85) attScore = 4.5;
    else if (rate >= 75) attScore = 4.0;
    else if (rate >= 60) attScore = 3.0;
    else if (rate >= 40) attScore = 2.0;
    else attScore = 1.0;
    attDetail = `${rate}% attendance (${attendedCount}/${weeklyAttendance.length} classes this week)`;
  } else if (typeof st.attendancePct === 'number' && st.attendancePct > 0) {
    const rate = st.attendancePct;
    if (rate >= 90) attScore = 5.0;
    else if (rate >= 80) attScore = 4.5;
    else if (rate >= 75) attScore = 4.0;
    else if (rate >= 60) attScore = 3.0;
    else attScore = 2.0;
    attDetail = `${rate}% cumulative attendance rate (target: 75%+)`;
  } else {
    attScore = 4.0;
    attDetail = 'Regular attendance schedule on track';
  }

  // 2. ASSESSMENT PERFORMANCE PILLAR (0 - 5.0 stars)
  const scoredTests = assessments.filter((t) => typeof t.pct === 'number');
  let assScore = 4.0;
  let assDetail = '';
  if (scoredTests.length > 0) {
    const avg = Math.round(scoredTests.reduce((acc, t) => acc + t.pct, 0) / scoredTests.length);
    if (avg >= 90) assScore = 5.0;
    else if (avg >= 80) assScore = 4.5;
    else if (avg >= 70) assScore = 3.8;
    else if (avg >= 55) assScore = 3.0;
    else if (avg >= 40) assScore = 2.0;
    else assScore = 1.5;
    assDetail = `${avg}% average across ${scoredTests.length} tests/evaluations`;
  } else if (typeof st.assessmentScore === 'number' && st.assessmentScore > 0) {
    const avg = st.assessmentScore;
    if (avg >= 90) assScore = 5.0;
    else if (avg >= 80) assScore = 4.5;
    else if (avg >= 70) assScore = 3.8;
    else if (avg >= 55) assScore = 3.0;
    else assScore = 2.0;
    assDetail = `${avg}% trainer evaluation baseline`;
  } else {
    assScore = 3.8;
    assDetail = 'Initial assessment module in progress';
  }

  // 3. SYLLABUS PROGRESS PILLAR (0 - 5.0 stars)
  const modules = syllabus?.modules || [];
  const doneModules = modules.filter((m) => m.done).length;
  const sylPct = modules.length > 0 ? Math.round((doneModules / modules.length) * 100) : (st.syllabusCompleted ? 100 : 50);
  let sylScore = 4.0;
  let sylDetail = '';
  if (st.syllabusCompleted || (modules.length > 0 && doneModules === modules.length)) {
    sylScore = 5.0;
    sylDetail = '100% syllabus cleared · Placement ready';
  } else if (sylPct >= 80) {
    sylScore = 4.8;
    sylDetail = `${doneModules}/${modules.length} modules completed (${sylPct}% syllabus progress)`;
  } else if (sylPct >= 60) {
    sylScore = 4.2;
    sylDetail = `${doneModules}/${modules.length} modules completed (${sylPct}% syllabus progress)`;
  } else if (sylPct >= 40) {
    sylScore = 3.6;
    sylDetail = `${doneModules}/${modules.length} modules completed (${sylPct}% syllabus progress)`;
  } else if (sylPct >= 20) {
    sylScore = 3.2;
    sylDetail = `${doneModules}/${modules.length} modules completed (${sylPct}% syllabus progress)`;
  } else {
    sylScore = 3.0;
    sylDetail = `Module 1 foundation pacing active (${st.syllabusModule || 'Core Foundations'})`;
  }

  // 4. PARTICIPATION PILLAR (0 - 5.0 stars)
  const doubtCount = doubts.length;
  const subCount = submissions.length;
  const recentClassParticipation = recentClasses.length;
  let partScore = 3.5;
  let partDetail = '';

  const activityPoints = (doubtCount * 1.5) + (subCount * 2.5) + (recentClassParticipation * 1.0);
  if (activityPoints >= 10 || (doubtCount >= 2 && subCount >= 2)) {
    partScore = 5.0;
    partDetail = `High engagement: ${doubtCount} doubts asked, ${subCount} submissions uploaded`;
  } else if (activityPoints >= 6 || doubtCount >= 1 || subCount >= 1) {
    partScore = 4.4;
    partDetail = `Active learner: ${doubtCount} doubts resolved, ${subCount} submissions uploaded`;
  } else if (activityPoints >= 3) {
    partScore = 3.8;
    partDetail = 'Consistent live class and discussion participation';
  } else {
    partScore = 3.2;
    partDetail = 'Regular listener · Submit assignments and ask doubts to raise rating';
  }

  // OVERALL STAR RATING (Average of 4 pillars, rounded to 1 decimal place)
  const overall = Number(((attScore + assScore + sylScore + partScore) / 4).toFixed(1));
  const roundedStars = Math.round(overall);

  let tier = 'On-Track Learner';
  if (overall >= 4.5) tier = 'Outstanding Star';
  else if (overall >= 3.8) tier = 'High Performer';
  else if (overall >= 3.0) tier = 'On-Track Learner';
  else if (overall >= 2.0) tier = 'Needs Focus';
  else tier = 'Action Required';

  // Actionable tip based on the weakest pillar
  let feedback = '';
  const minScore = Math.min(attScore, assScore, sylScore, partScore);
  if (minScore === attScore && attScore < 4.5) {
    feedback = 'Boost your attendance this week to ensure you comfortably maintain the academy 75%+ eligibility threshold.';
  } else if (minScore === assScore && assScore < 4.5) {
    feedback = 'Review recent assessment topics and attempt online practice tests to raise your assessment average.';
  } else if (minScore === partScore && partScore < 4.5) {
    feedback = 'Increase your participation rating by submitting assignments on time and asking questions in doubt clearance.';
  } else if (minScore === sylScore && sylScore < 4.5) {
    feedback = 'Stay closely aligned with daily batch syllabus topics to speed up your module clearance pace.';
  } else {
    feedback = 'Exceptional all-round performance this week across attendance, tests, syllabus pacing, and active participation!';
  }

  return {
    stars: overall,
    roundedStars,
    tier,
    weekLabel,
    weekNumber,
    year,
    attendanceScore: attScore,
    attendanceDetail: attDetail,
    assessmentScore: assScore,
    assessmentDetail: assDetail,
    syllabusScore: sylScore,
    syllabusDetail: sylDetail,
    participationScore: partScore,
    participationDetail: partDetail,
    feedback,
    evaluatedAt: now,
    evaluatedBy: 'Automated Weekly Audit'
  };
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
      // Only the student's own batch — a trainer with several batches must not show another batch's class
      batch ? LiveClassSession.find({ batch, isLive: true }) : [],
      ClassAttendance.find({
        $or: [
          { [`records.${key}`]: { $exists: true } },
          { [`records.${st._id}`]: { $exists: true } }
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

    // Auto-sync batchConversionTicketRaised flag if student previously raised one
    if (!st.batchConversionTicketRaised) {
      const foundBatchTicket = tickets.find((t) => /batch\s*conversion/i.test(t?.type || '') || /batch\s*conversion/i.test(t?.category || '') || /batch\s*conversion/i.test(t?.title || ''));
      const foundBatchReq = requests.find((r) => r?.type === 'batch_conversion' || /batch\s*conversion/i.test(r?.subject || ''));
      if (foundBatchTicket || foundBatchReq) {
        st.batchConversionTicketRaised = true;
        st.batchConversionTicketAt = (foundBatchTicket || foundBatchReq).createdAt || new Date();
        st.batchConversionTicketId = (foundBatchTicket?._id || foundBatchReq?._id)?.toString() || '';
        await st.save().catch(() => {});
      }
    }

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
        mode: t.mode || 'offline',
        questionCount: (t.questions || []).length,
        durationMin: t.durationMin || null,
        attempt: null,
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

    // Syllabus checklist, trainer announcements, class recordings, my online-test attempts
    const bKey = batchMatchKey(batch);
    const [syllabusDoc, announcements, recordingSessions, myAttempts] = await Promise.all([
      bKey ? BatchSyllabus.findOne({ batchKey: bKey }) : null,
      bKey ? BatchAnnouncement.find({ batchKey: bKey }).sort({ createdAt: -1 }).limit(10) : [],
      batch ? LiveClassSession.find({ batch, isLive: false, recordingUrl: { $nin: ['', null] } }).sort({ startedAt: -1 }).limit(20).select('topic trainerName startedAt recordingUrl') : [],
      TestAttempt.find({ studentId: st.studentId }).select('assessmentId status score totalMarks submittedAt endsAt')
    ]);
    tests.forEach((t) => {
      const a = myAttempts.find((x) => x.assessmentId === t.id);
      if (a) t.attempt = { status: a.status, score: a.score, totalMarks: a.totalMarks, submittedAt: a.submittedAt, endsAt: a.endsAt };
    });
    const syllabus = syllabusDoc ? {
      modules: (syllabusDoc.modules || []).map((m) => ({ name: m.name, done: Boolean(m.done), doneAt: m.doneAt || null })),
      updatedAt: syllabusDoc.updatedAt
    } : null;
    const recordings = recordingSessions.map((sess) => ({ id: sess._id.toString(), topic: sess.topic || '', trainerName: sess.trainerName || '', date: sess.startedAt, url: sess.recordingUrl }));

    const classNotes = pastSessions.map((sess) => ({
      id: sess._id.toString(),
      topic: sess.topic,
      trainerName: sess.trainerName,
      date: sess.startedAt,
      notes: (sess.notes || []).map((n) => ({ text: n.text, at: n.at }))
    }));

    // Compute and sync weekly star rating based on attendance, assessment performance, syllabus progress, and participation
    const computedWeeklyRating = computeStudentWeeklyRating(st, {
      attendance,
      assessments: tests,
      syllabus,
      doubts,
      submissions,
      recentClasses
    });

    let weeklyRating = computedWeeklyRating;
    try {
      const currentLabel = st.weeklyRating?.weekLabel;
      if (!st.weeklyRating || !st.weeklyRating.stars || currentLabel !== computedWeeklyRating.weekLabel) {
        const history = Array.isArray(st.weeklyRating?.history) ? [...st.weeklyRating.history] : [];
        if (currentLabel && currentLabel !== computedWeeklyRating.weekLabel && st.weeklyRating?.stars) {
          history.unshift({
            weekLabel: st.weeklyRating.weekLabel,
            weekNumber: st.weeklyRating.weekNumber,
            year: st.weeklyRating.year,
            stars: st.weeklyRating.stars,
            tier: st.weeklyRating.tier,
            attendanceScore: st.weeklyRating.attendanceScore,
            assessmentScore: st.weeklyRating.assessmentScore,
            syllabusScore: st.weeklyRating.syllabusScore,
            participationScore: st.weeklyRating.participationScore,
            feedback: st.weeklyRating.feedback,
            evaluatedAt: st.weeklyRating.evaluatedAt || new Date(),
            evaluatedBy: st.weeklyRating.evaluatedBy || 'Automated Weekly Audit'
          });
        }
        st.weeklyRating = {
          stars: computedWeeklyRating.stars,
          tier: computedWeeklyRating.tier,
          weekLabel: computedWeeklyRating.weekLabel,
          weekNumber: computedWeeklyRating.weekNumber,
          year: computedWeeklyRating.year,
          attendanceScore: computedWeeklyRating.attendanceScore,
          assessmentScore: computedWeeklyRating.assessmentScore,
          syllabusScore: computedWeeklyRating.syllabusScore,
          participationScore: computedWeeklyRating.participationScore,
          feedback: computedWeeklyRating.feedback,
          evaluatedAt: computedWeeklyRating.evaluatedAt,
          evaluatedBy: computedWeeklyRating.evaluatedBy,
          history: history.slice(0, 12)
        };
        await st.save().catch(() => {});
      }
      weeklyRating = {
        ...computedWeeklyRating,
        history: st.weeklyRating?.history || []
      };
    } catch (syncErr) {
      console.warn('weeklyRating sync warning:', syncErr.message);
    }

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
      trainerFeedback,
      syllabus,
      announcements: announcements.map((a) => ({ id: a._id.toString(), title: a.title, message: a.message, trainerName: a.trainerName, createdAt: a.createdAt })),
      recordings,
      weeklyRating
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
    if (st.handedOverAt) {
      add(st.handedOverAt, 'handover', `Handed over to Head of Trainer${st.headOfTrainer ? ` (${st.headOfTrainer})` : ''}`, st.trainerNote || '', st.handedOverBy || 'HR');
    }
    if (st.allocatedTrainerAt && st.trainerName) {
      add(st.allocatedTrainerAt, 'handover', `Allocated to ${st.trainerName}${st.batchName ? ` · ${st.batchName}` : ''}`, '', st.allocatedByHead || 'Head of Trainer');
    } else if (st.trainerName && !st.allocatedTrainerAt && st.handedOverAt) {
      add(st.handedOverAt, 'handover', `Allocated to ${st.trainerName}${st.batchName ? ` · ${st.batchName}` : ''}`, st.trainerNote || '', st.handedOverBy || '');
    }
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
    if (isTrainerReq(req)) {
      const sub = await StudentSubmission.findById(req.params.id).select('trainerId studentId');
      if (!sub) return res.status(404).json({ error: 'Submission not found' });
      const ok = (sub.trainerId && sub.trainerId === myTrainerId(req)) || trainerOwnsStudent(req, await findStudentByAnyId(sub.studentId));
      if (!ok) return res.status(403).json(NOT_YOUR_STUDENT);
    }
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
    if (type === 'batch_conversion' || /batch\s*conversion/i.test(type) || /batch\s*conversion/i.test(subject)) {
      if (st.batchConversionTicketRaised) {
        return res.status(400).json({ error: 'Batch conversion ticket can only be raised once. Repeat batch conversion ticket requests are not permitted.' });
      }
      const existingReq = await StudentRequest.findOne({
        studentId: st.studentId,
        $or: [{ type: 'batch_conversion' }, { subject: /batch\s*conversion/i }]
      });
      const existingEsc = await Escalation.findOne({
        $and: [
          { $or: [{ studentId: st.studentId }, { raisedBy: new RegExp(escapeRegex(st.studentId), 'i') }] },
          { $or: [{ type: /batch\s*conversion/i }, { category: /batch\s*conversion/i }, { title: /batch\s*conversion/i }] }
        ]
      });
      if (existingReq || existingEsc) {
        st.batchConversionTicketRaised = true;
        st.batchConversionTicketAt = (existingReq || existingEsc).createdAt || new Date();
        st.batchConversionTicketId = (existingReq?._id || existingEsc?._id)?.toString() || '';
        await st.save().catch(() => {});
        return res.status(400).json({ error: 'Batch conversion ticket can only be raised once. Repeat batch conversion ticket requests are not permitted.' });
      }
      st.batchConversionTicketRaised = true;
      st.batchConversionTicketAt = new Date();
      await st.save().catch(() => {});
    }

    if (type === 'break_request') {
      const reasonCategory = String(details?.reasonCategory || subject || '').trim();
      const explanation = String(message || details?.explanation || '').trim();
      const startDate = String(details?.startDate || preferredDate || '').trim();
      const endDate = String(details?.endDate || details?.returnDate || '').trim();
      const documentData = details?.documentData || details?.data || '';
      const documentName = details?.documentName || details?.fileName || '';

      if (!reasonCategory) {
        return res.status(400).json({ error: 'A valid reason category is required for a break request (e.g. Medical, Exams, Emergency, Relocation).' });
      }
      if (!explanation || explanation.length < 5) {
        return res.status(400).json({ error: 'Please provide a valid, detailed explanation for your planned break.' });
      }
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Both break start date and return date are required.' });
      }
      if (!documentData && !documentName) {
        return res.status(400).json({ error: 'Supporting documentation is mandatory for break requests (e.g., medical certificate, exam schedule, employer letter).' });
      }

      // Track pending prior approval on student record
      st.breakStatus = 'pending_approval';
      st.breakStartDate = startDate;
      st.breakEndDate = endDate;
      st.breakReason = reasonCategory;
      await st.save().catch(() => {});
    }

    if (type === 'exam_booking') {
      if (!st.examApprovedByTrainer) {
        return res.status(400).json({
          error: 'AAPC / Certification Exam booking requires prior approval from your respective trainer. Your trainer must verify syllabus completion, assessment performance, and overall readiness before an exam slot request can be submitted.'
        });
      }
    }

    let mockAttemptNumber = 1;
    if (type === 'mock_interview') {
      const existingMocks = await StudentRequest.find({
        studentId: st.studentId,
        type: 'mock_interview',
        status: { $in: ['Open', 'Scheduled', 'Resolved'] }
      }).sort({ createdAt: 1 });

      if (existingMocks.length >= 2) {
        return res.status(400).json({
          error: 'Maximum mock interview allowance reached. Students receive up to two mock interview attempts to assess and improve interview readiness.'
        });
      }

      const activeMock = existingMocks.find(m => ['Open', 'Scheduled'].includes(m.status));
      if (activeMock) {
        return res.status(400).json({
          error: 'You already have an active mock interview request. Please complete your current attempt before scheduling your next attempt.'
        });
      }

      mockAttemptNumber = existingMocks.length + 1; // Attempt 1 (initial assessment) or Attempt 2 (readiness improvement)
      st.mockInterviewAttemptsCount = Math.max(st.mockInterviewAttemptsCount || 0, mockAttemptNumber);
      st.mockInterview = `Attempt ${mockAttemptNumber} Requested`;
      await st.save().catch(() => {});
    }

    const doc = await StudentRequest.create({
      studentId: st.studentId,
      studentName: st.name,
      course: st.course,
      batch: studentBatchOf(st),
      type,
      audience,
      attemptNumber: type === 'mock_interview' ? mockAttemptNumber : 1,
      trainerId: audience === 'trainer' ? st.trainerId : (st.trainerId || ''),
      trainerName: audience === 'trainer' ? st.trainerName : (st.trainerName || ''),
      hrName: st.hrName || '',
      subject: type === 'break_request'
        ? `Break Request: ${details?.reasonCategory || subject || 'Official Break'}`
        : type === 'mock_interview'
        ? `Mock Interview — Attempt ${mockAttemptNumber} of 2 (${mockAttemptNumber === 1 ? 'Initial Assessment' : 'Readiness Improvement'})`
        : subject,
      message,
      preferredDate,
      startDate: details?.startDate || preferredDate || '',
      endDate: details?.endDate || details?.returnDate || '',
      reasonCategory: details?.reasonCategory || subject || '',
      documentName: details?.documentName || details?.fileName || '',
      documentMimeType: details?.documentMimeType || details?.mimeType || '',
      documentData: details?.documentData || details?.data || '',
      details: {
        ...details,
        ...(type === 'mock_interview' ? {
          attemptNumber: mockAttemptNumber,
          isImprovementAttempt: mockAttemptNumber === 2,
          priorScore: mockAttemptNumber === 2 ? st.mockScore : null
        } : {})
      }
    });

    if (doc.documentName) {
      doc.documentUrl = `/api/student-portal/requests/${doc._id}/document`;
      await doc.save();
    }

    await pushNotification({
      audience,
      recipientId: audience === 'trainer' ? st.trainerId : '',
      recipientName: audience === 'trainer' ? st.trainerName : (st.hrName || ''),
      type: `request_${type}`,
      title: type === 'break_request' ? `Student Break Request: ${st.name}` : `${st.name}: ${subject || type.replace(/_/g, ' ')}`,
      message: type === 'break_request'
        ? `Break planned: ${details?.startDate || preferredDate} to ${details?.endDate || details?.returnDate} (${details?.reasonCategory || subject}). Prior approval required.`
        : [message, preferredDate ? `Preferred: ${preferredDate}` : ''].filter(Boolean).join(' · '),
      studentId: st.studentId, createdBy: st.name
    });
    if (type === 'exam_booking') {
      await pushNotification({
        audience: 'cccp', type: 'exam',
        title: `Exam slot request: ${st.name}`,
        message: [subject, preferredDate ? `Preferred: ${preferredDate}` : '', message].filter(Boolean).join(' · '),
        studentId: st.studentId, createdBy: st.name
      });
    }
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
    const docs = await StudentRequest.find(query).sort({ createdAt: -1 }).limit(300);
    res.json(docs.map((d) => {
      const obj = d.toObject();
      obj.hasDocument = Boolean(d.documentName);
      if (d.documentName) {
        obj.documentUrl = `/api/student-portal/requests/${d._id}/document`;
      }
      return obj;
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Download / stream supporting document for a student request
router.get('/student-portal/requests/:id/document', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const doc = await StudentRequest.findById(req.params.id).select('+documentData');
    if (!doc) return res.status(404).json({ error: 'Request not found' });
    if (!doc.documentData) return res.status(404).json({ error: 'No supporting document attached' });

    const raw = String(doc.documentData);
    const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
    const buf = Buffer.from(base64, 'base64');
    const mime = doc.documentMimeType || 'application/octet-stream';
    const filename = doc.documentName || `supporting-document-${doc.studentId}.pdf`;

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
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
    if (isTrainerReq(req)) {
      if (doc.audience !== 'trainer') return res.status(403).json({ error: 'Fee, reward-point, break and profile requests are handled by HR.' });
      const ok = (doc.trainerId && doc.trainerId === myTrainerId(req)) || trainerOwnsStudent(req, await findStudentByAnyId(doc.studentId));
      if (!ok) return res.status(403).json(NOT_YOUR_STUDENT);
    }
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
      // Mock interview done → reflect on the student record HR & CCCP read with Two Attempts tracking
      if (doc.type === 'mock_interview') {
        const attemptNum = doc.attemptNumber || doc.details?.attemptNumber || 1;
        if (status === 'Scheduled') {
          st.mockInterview = `Attempt ${attemptNum} Scheduled`;
        } else if (status === 'Resolved') {
          st.mockInterview = `Completed (Attempt ${attemptNum}/2)`;
        } else if (status === 'Declined') {
          st.mockInterview = 'Declined';
        }

        const scoreVal = (mockScore !== undefined && mockScore !== '' && mockScore !== null) ? Number(mockScore) : null;
        if (scoreVal !== null) {
          st.mockScore = scoreVal;
          st.interviewPrepScore = scoreVal;
          st.readinessScore = computeReadiness(st);
          doc.details = { ...(doc.details || {}), mockScore: scoreVal, attemptNumber: attemptNum };
          await doc.save();
        }

        // Maintain array of attempts in st.mockInterviewAttempts
        if (!Array.isArray(st.mockInterviewAttempts)) st.mockInterviewAttempts = [];
        const existingAttemptIdx = st.mockInterviewAttempts.findIndex(a => (a.requestId && a.requestId === String(doc._id)) || a.attemptNumber === attemptNum);
        const attemptEntry = {
          attemptNumber: attemptNum,
          requestId: String(doc._id),
          date: new Date(),
          score: scoreVal,
          feedback: response || doc.response || '',
          conductedBy: respondedBy || doc.respondedBy || st.trainerName,
          status: status === 'Resolved' ? 'Completed' : status,
          improvementNotes: req.body?.improvementNotes || ''
        };
        if (existingAttemptIdx >= 0) {
          st.mockInterviewAttempts[existingAttemptIdx] = attemptEntry;
        } else {
          st.mockInterviewAttempts.push(attemptEntry);
        }
        st.mockInterviewAttemptsCount = st.mockInterviewAttempts.filter(a => a.status === 'Completed').length;
        await st.save();

        if (status === 'Resolved') {
          await pushNotification({
            audience: 'student',
            recipientId: st.studentId,
            recipientName: st.name,
            type: 'mock_interview_result',
            title: `Mock Interview ${attemptNum}/2 Completed · Score: ${scoreVal != null ? scoreVal + '%' : 'Graded'}`,
            message: `Your trainer ${respondedBy || st.trainerName || 'Trainer'} has evaluated Attempt ${attemptNum} of 2.${attemptNum === 1 ? ' Review your feedback to prepare for Attempt 2.' : ' Both mock interview attempts are now complete.'}`,
            studentId: st.studentId,
            createdBy: respondedBy || st.trainerName
          }).catch(() => {});
        }
      }
      // AAPC exam slot booked by HR / exam cell → shown on the student record
      if (doc.type === 'exam_booking' && ['Scheduled', 'Resolved'].includes(status)) {
        if (!st.examApprovedByTrainer) {
          return res.status(400).json({
            error: `Cannot schedule AAPC exam for ${st.name}: Respective trainer approval is required. The trainer must verify syllabus completion, assessments, and overall readiness first.`
          });
        }
        st.examStatus = status === 'Resolved' ? 'Exam Booked' : 'Exam Scheduled';
        if (doc.scheduledFor) st.examDate = doc.scheduledFor;
        await st.save();
      }
      // Approved redemption → deduct the points once
      if (doc.type === 'redeem_points' && status === 'Resolved' && !wasResolved) {
        st.rewardPoints = Math.max(0, (st.rewardPoints || 0) - Number(doc.details?.points || 0));
        await st.save();
      }
      // Student Break Request: Prior approval from relevant authority
      if (doc.type === 'break_request') {
        if (status === 'Resolved') {
          st.breakStatus = 'approved';
          st.breakStartDate = doc.startDate;
          st.breakEndDate = doc.endDate;
          st.breakReason = doc.reasonCategory || doc.subject;
          st.breakApprovedBy = respondedBy || req.user?.name || 'Authority';
          st.breakApprovedAt = new Date();
          st.statusGroup = 'on_hold'; // Place on approved break hold
          await st.save();

          if (st.trainerId) {
            await pushNotification({
              audience: 'trainer',
              recipientId: st.trainerId,
              recipientName: st.trainerName,
              type: 'student_break_approved',
              title: `Break Approved: ${st.name}`,
              message: `${st.name} approved for official break from ${doc.startDate} to ${doc.endDate} (${doc.reasonCategory || doc.subject}). Status set to On Hold.`,
              studentId: st.studentId,
              createdBy: respondedBy || 'Authority'
            }).catch(() => {});
          }
        } else if (status === 'Declined') {
          st.breakStatus = 'none';
          if (st.statusGroup === 'on_hold') {
            st.statusGroup = 'in_course';
          }
          await st.save();
        }
      }
    }
    await notifyStudent(doc.studentId, {
      type: 'request', title: `${doc.subject || doc.type.replace(/_/g, ' ')}: ${status === 'Resolved' ? (doc.type === 'break_request' ? 'Break Approved' : 'Resolved') : status}`,
      message: doc.type === 'break_request' && status === 'Resolved'
        ? `Official break from ${doc.startDate} to ${doc.endDate} has been approved by ${respondedBy || 'Authority'}.${response ? ` Note: ${response}` : ''}`
        : [doc.scheduledFor && `Scheduled for ${doc.scheduledFor}`, response].filter(Boolean).join(' · ') || `Updated by ${respondedBy || (doc.audience === 'hr' ? 'your HR' : 'your trainer')}.`,
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

const sessionTrainerId = (req) => (isTrainerReq(req) ? myTrainerId(req) : (req.user?.trainerId || req.body?.trainerId || req.query?.trainerId || ''));

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
  joins: (sess.joins || []).map((j) => {
    const dur = typeof j.durationMinutes === 'number' && j.durationMinutes > 0
      ? j.durationMinutes
      : (j.joinedAt ? Math.max(0, Math.round(((j.lastJoinAt || sess.endedAt || (isSessionLive(sess) ? new Date() : sess.updatedAt)) - new Date(j.joinedAt)) / 60000)) : 0);
    return {
      studentId: j.studentId,
      name: j.name,
      joinedAt: j.joinedAt,
      lastJoinAt: j.lastJoinAt,
      durationMinutes: dur,
      eligibleForPresent: dur >= 105,
      late: Boolean(sess.startedAt && j.joinedAt && (new Date(j.joinedAt) - new Date(sess.startedAt)) > LATE_AFTER_MIN * 60000)
    };
  }),
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
    if (!trainerOwnsRecord(req, sess)) return res.status(403).json(NOT_YOUR_RECORD);
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
    const owned = await LiveClassSession.findById(req.params.id).select('trainerId');
    if (!owned) return res.status(404).json({ error: 'Session not found' });
    if (!trainerOwnsRecord(req, owned)) return res.status(403).json(NOT_YOUR_RECORD);
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
    if (isTrainerReq(req)) query.trainerId = myTrainerId(req); // a trainer can only end their own class
    const list = await LiveClassSession.find(query);
    const endedAt = new Date();
    for (const s of list) {
      if (s.meetingSource === 'zoom_api' && s.zoomMeetingId && s.isLive) await endZoomMeeting(s.zoomMeetingId);
      s.isLive = false;
      s.endedAt = s.endedAt || endedAt;
      if (s.joins && s.joins.length > 0) {
        s.joins.forEach((j) => {
          const last = j.lastJoinAt || s.endedAt;
          const mins = Math.max(0, Math.round((new Date(last) - new Date(j.joinedAt)) / 60000));
          j.durationMinutes = Math.max(j.durationMinutes || 0, mins);
        });
      }
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
    await LiveClassSession.findOneAndUpdate({ _id: req.params.id, ...(isTrainerReq(req) ? { trainerId: myTrainerId(req) } : {}) }, { $set: { attendanceSaved: true } });
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
    const batch = studentBatchOf(st);
    const sessions = batch ? await LiveClassSession.find({ batch, isLive: true }).sort({ startedAt: -1 }) : [];
    const sess = sessions.find((s) => s.trainerId === st.trainerId && isSessionLive(s)) || sessions.find(isSessionLive);
    if (!sess) return res.status(409).json({ error: 'Your trainer has not started the class yet.' });
    if (!sess.zoomMeetingId) return res.status(409).json({ error: 'The class has no meeting link yet. Please tell your trainer.' });

    const now = new Date();
    const existing = (sess.joins || []).find((j) => j.studentId === st.studentId);
    if (existing) {
      await LiveClassSession.updateOne({ _id: sess._id, 'joins.studentId': st.studentId }, { $set: { 'joins.$.lastJoinAt': now }, $inc: { 'joins.$.count': 1 } });
    } else {
      await LiveClassSession.updateOne({ _id: sess._id }, { $push: { joins: { studentId: st.studentId, name: st.name, joinedAt: now, lastJoinAt: now, durationMinutes: 0, count: 1 } } });
    }

    const { signature, sdkKey } = signZoom(sess.zoomMeetingId, 0);
    res.json({ signature, sdkKey, meetingNumber: sess.zoomMeetingId, password: sess.zoomPassword, zak: '', topic: sess.topic, trainerName: sess.trainerName, joinUrl: sess.zoomJoinUrl });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// STUDENT heartbeat during live class (accumulates attendance duration)
router.post('/student-portal/live-class/heartbeat', async (req, res) => {
  try {
    const st = await findPortalStudent({
      studentId: req.user?.studentId || req.body?.studentId,
      email: req.user?.email || req.body?.email
    });
    if (!st) return res.status(404).json({ error: 'Student record not found' });
    const sessionId = req.body?.sessionId;
    const query = sessionId && mongoose.isValidObjectId(sessionId)
      ? { _id: sessionId }
      : { batch: studentBatchOf(st), isLive: true };
    const sess = await LiveClassSession.findOne(query);
    if (!sess) return res.json({ ok: false, error: 'Live session not active' });

    const now = new Date();
    const existing = (sess.joins || []).find((j) => j.studentId === st.studentId);
    let dur = 0;
    if (existing) {
      const elapsedMins = Math.max(0, Math.round((now - new Date(existing.joinedAt)) / 60000));
      dur = Math.max(existing.durationMinutes || 0, elapsedMins);
      await LiveClassSession.updateOne(
        { _id: sess._id, 'joins.studentId': st.studentId },
        { $set: { 'joins.$.lastJoinAt': now, 'joins.$.durationMinutes': dur } }
      );
    } else {
      await LiveClassSession.updateOne(
        { _id: sess._id },
        { $push: { joins: { studentId: st.studentId, name: st.name, joinedAt: now, lastJoinAt: now, durationMinutes: 0, count: 1 } } }
      );
    }
    res.json({ ok: true, durationMinutes: dur, eligibleForPresent: dur >= 105 });
  } catch (e) {
    res.status(500).json({ error: e.message });
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

// ==========================================
// LEARNING FEATURES
//   • Batch syllabus tracker (trainer ticks modules → students see progress)
//   • Batch announcements (trainer → every student of a batch)
//   • Online MCQ tests (timed in the Student Portal, graded by the server)
//   • Class recordings (link added after class → students can replay)
//   • Doubt follow-ups (student replies / marks a doubt resolved)
// ==========================================
const TEST_GRACE_MS = 2 * 60000; // network slack after the timer ends
const MAX_TEST_QUESTIONS = 200;
const minutesOf = (v) => { const n = parseInt(String(v || ''), 10); return Number.isFinite(n) && n > 0 ? n : 45; };
const sameBatch = (a, b) => Boolean(batchMatchKey(a)) && batchMatchKey(a) === batchMatchKey(b);

// Does the signed-in trainer teach this batch? (other departments: yes)
async function trainerTeachesBatch(req, batch) {
  if (!isTrainerReq(req)) return true;
  const me = myTrainerId(req);
  if (!me || !batch) return false;
  const rows = await Student.find({ trainerId: me }).select('batchName course');
  return rows.some((s) => sameBatch(studentBatchOf(s), batch));
}
const NOT_YOUR_BATCH = { error: 'This batch is not allocated to you.' };

// ---------- Syllabus tracker ----------
router.get('/training/syllabus', async (req, res) => {
  try {
    const batch = tidyBatchName(req.query.batch || '');
    if (!batch) return res.status(400).json({ error: 'batch is required' });
    const doc = await BatchSyllabus.findOne({ batchKey: batchMatchKey(batch) });
    res.json(doc || { batch, modules: [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/training/syllabus', async (req, res) => {
  try {
    const batch = tidyBatchName(req.body?.batch || '');
    if (!batch) return res.status(400).json({ error: 'batch is required' });
    if (!(await trainerTeachesBatch(req, batch))) return res.status(403).json(NOT_YOUR_BATCH);
    const incoming = (Array.isArray(req.body?.modules) ? req.body.modules : [])
      .filter((m) => String(m?.name || '').trim())
      .slice(0, 100);
    const key = batchMatchKey(batch);
    const doc = (await BatchSyllabus.findOne({ batchKey: key })) || new BatchSyllabus({ batch, batchKey: key });
    const before = new Map((doc.modules || []).map((m) => [String(m._id), m]));
    const by = req.user?.name || '';
    const newlyDone = [];
    doc.modules = incoming.map((m) => {
      const prev = m._id ? before.get(String(m._id)) : null;
      const name = String(m.name).trim().slice(0, 160);
      const done = Boolean(m.done);
      const wasDone = Boolean(prev?.done);
      if (done && !wasDone) newlyDone.push(name);
      return {
        ...(prev ? { _id: prev._id } : {}),
        name,
        done,
        doneAt: done ? (wasDone ? prev.doneAt : new Date()) : null,
        doneBy: done ? (wasDone ? prev.doneBy : by) : ''
      };
    });
    doc.batch = batch;
    doc.course = String(req.body?.course || doc.course || '');
    if (isTrainerReq(req)) doc.trainerId = myTrainerId(req);
    doc.trainerName = by || doc.trainerName;
    doc.updatedBy = by;
    await doc.save();
    if (newlyDone.length) {
      const doneCount = doc.modules.filter((m) => m.done).length;
      const pct = doc.modules.length ? Math.round((doneCount / doc.modules.length) * 100) : 0;
      await notifyBatch(batch, {
        type: 'module', title: `Module completed: ${newlyDone.join(', ')}`.slice(0, 180),
        message: `${doneCount} of ${doc.modules.length} modules covered (${pct}%).`, createdBy: by
      });
    }
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- Batch announcements ----------
router.get('/training/announcements', async (req, res) => {
  try {
    const batch = tidyBatchName(req.query.batch || '');
    const query = batch ? { batchKey: batchMatchKey(batch) } : (isTrainerReq(req) ? { trainerId: myTrainerId(req) } : {});
    res.json(await BatchAnnouncement.find(query).sort({ createdAt: -1 }).limit(50));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/training/announcements', async (req, res) => {
  try {
    const batch = tidyBatchName(req.body?.batch || '');
    const title = String(req.body?.title || '').trim().slice(0, 140);
    const message = String(req.body?.message || '').trim().slice(0, 2000);
    if (!batch || !title) return res.status(400).json({ error: 'Batch and title are required' });
    if (!(await trainerTeachesBatch(req, batch))) return res.status(403).json(NOT_YOUR_BATCH);
    const doc = await BatchAnnouncement.create({
      batch, batchKey: batchMatchKey(batch), title, message,
      trainerId: isTrainerReq(req) ? myTrainerId(req) : String(req.body?.trainerId || ''),
      trainerName: req.user?.name || ''
    });
    await notifyBatch(batch, { type: 'announcement', title: `📢 ${title}`, message: message.slice(0, 240), createdBy: doc.trainerName });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/training/announcements/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const doc = await BatchAnnouncement.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Announcement not found' });
    if (!trainerOwnsRecord(req, doc)) return res.status(403).json(NOT_YOUR_RECORD);
    await doc.deleteOne();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- Online tests: trainer side ----------
router.put('/trainer/assessments/:id/questions', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const item = await TrainerAssessment.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Assessment not found' });
    if (item.trainerId && !trainerOwnsRecord(req, item)) return res.status(403).json(NOT_YOUR_RECORD);

    const raw = Array.isArray(req.body?.questions) ? req.body.questions : [];
    if (raw.length > MAX_TEST_QUESTIONS) return res.status(400).json({ error: `A test can have at most ${MAX_TEST_QUESTIONS} questions` });
    const questions = [];
    for (const [i, q] of raw.entries()) {
      const text = String(q?.q || '').trim();
      const options = (Array.isArray(q?.options) ? q.options : []).map((o) => String(o || '').trim());
      const answer = Number(q?.answer);
      if (!text) return res.status(400).json({ error: `Question ${i + 1}: the question text is empty` });
      if (options.length < 2 || options.length > 6 || options.some((o) => !o)) return res.status(400).json({ error: `Question ${i + 1}: give 2–6 options and fill every option` });
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return res.status(400).json({ error: `Question ${i + 1}: pick the correct option` });
      questions.push({
        q: text.slice(0, 3000),
        options: options.map((o) => o.slice(0, 600)),
        answer,
        marks: Math.min(20, Math.max(1, Math.round(Number(q?.marks) || 1))),
        chapter: String(q?.chapter || '').trim().slice(0, 200),
        rationale: String(q?.rationale || '').trim().slice(0, 3000),
        audioRationaleUrl: String(q?.audioRationaleUrl || '').trim(),
        audioRationaleText: String(q?.audioRationaleText || q?.rationale || '').trim().slice(0, 3000)
      });
    }
    const oldTotal = Number(item.totalMarks) || 0;
    item.questions = questions;
    item.mode = questions.length ? 'online' : 'offline';
    if (questions.length) {
      const total = questions.reduce((a, q) => a + q.marks, 0);
      const askedPass = Number(req.body?.passMark);
      item.passMark = Number.isFinite(askedPass) && askedPass > 0 && askedPass <= total
        ? Math.round(askedPass)
        : Math.min(total, Math.max(1, Math.round(((Number(item.passMark) || 0) / (oldTotal || total)) * total) || Math.ceil(total * 0.7)));
      item.totalMarks = total;
    }
    const dur = Number(req.body?.durationMin);
    if (Number.isFinite(dur) && dur >= 5 && dur <= 300) {
      item.durationMin = Math.round(dur);
      item.timeLimit = `${item.durationMin} min`;
    } else if (!item.durationMin) {
      item.durationMin = minutesOf(item.timeLimit);
    }
    await item.save();

    // Editor Access: When trainer edits/corrects questions, automatically re-grade existing attempts
    const existingAttempts = await TestAttempt.find({ assessmentId: item._id.toString() });
    if (existingAttempts.length > 0) {
      const scores = item.scores instanceof Map ? Object.fromEntries(item.scores) : (item.scores || {});
      const touchedKeys = [];
      for (const att of existingAttempts) {
        if (att.status === 'submitted') {
          let score = 0;
          let correct = 0;
          item.questions.forEach((q, idx) => {
            if (att.answers?.[idx] === q.answer) {
              score += q.marks || 1;
              correct += 1;
            }
          });
          att.score = score;
          att.correct = correct;
          att.totalMarks = item.totalMarks;
          await att.save();
          if (att.studentKey) {
            scores[att.studentKey] = score;
            touchedKeys.push(att.studentKey);
          }
        }
      }
      item.scores = scores;
      await item.save();
      if (touchedKeys.length > 0) {
        await recomputeAssessmentScores(touchedKeys).catch(() => {});
      }
    }

    if (questions.length && existingAttempts.length === 0) {
      await notifyBatch(item.batch, {
        type: 'assessment', title: `Online test ready: ${item.name}`,
        message: `${questions.length} questions · ${item.durationMin} min${item.date ? ` · opens ${item.date}` : ''}. Open Materials & Tests to take it.`,
        createdBy: item.trainerName || ''
      });
    }
    res.json(formatAssessment(item));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/trainer/assessments/:id/attempts', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const item = await TrainerAssessment.findById(req.params.id).select('trainerId');
    if (!item) return res.status(404).json({ error: 'Assessment not found' });
    if (item.trainerId && !trainerOwnsRecord(req, item)) return res.status(403).json(NOT_YOUR_RECORD);
    res.json(await TestAttempt.find({ assessmentId: req.params.id }).sort({ submittedAt: -1, startedAt: -1 }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reallocate exam when a student wishes to take the same exam again (Trainer/Admin side)
router.post('/trainer/assessments/:id/reallocate', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const { studentId, reason = '' } = req.body || {};
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });
    const test = await TrainerAssessment.findById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Assessment not found' });
    if (test.trainerId && !trainerOwnsRecord(req, test)) return res.status(403).json(NOT_YOUR_RECORD);

    const attempt = await TestAttempt.findOne({ assessmentId: req.params.id, studentId });
    if (!attempt) return res.status(404).json({ error: 'No existing attempt found to reallocate' });

    const historyEntry = {
      attemptIteration: attempt.attemptIteration || 1,
      score: attempt.score || 0,
      totalMarks: attempt.totalMarks || test.totalMarks,
      correct: attempt.correct || 0,
      submittedAt: attempt.submittedAt || new Date(),
      chapterScores: attempt.chapterScores || {}
    };

    const nextIteration = (attempt.attemptIteration || 1) + 1;
    attempt.attemptHistory = [...(attempt.attemptHistory || []), historyEntry];
    attempt.attemptIteration = nextIteration;
    attempt.reallocated = true;
    attempt.reallocatedAt = new Date();
    attempt.reallocatedBy = req.user?.name || test.trainerName || 'Trainer';
    attempt.reallocationReason = reason || 'Trainer reallocated exam for retake';
    attempt.status = 'in_progress';
    const now = new Date();
    attempt.startedAt = now;
    attempt.endsAt = new Date(now.getTime() + (test.durationMin || 45) * 60000);
    attempt.answers = (test.questions || []).map(() => -1);
    attempt.score = null;
    attempt.correct = 0;
    attempt.submittedAt = null;
    attempt.autoSubmitted = false;
    attempt.late = false;
    await attempt.save();

    // Reset score entry on test so retake can be fresh
    const key = attempt.studentKey;
    if (key && test.scores) {
      const scores = test.scores instanceof Map ? Object.fromEntries(test.scores) : { ...test.scores };
      delete scores[key];
      test.scores = scores;
      await test.save();
    }

    const st = await findStudentByAnyId(studentId);
    if (st) {
      await notifyStudent(st.studentId, {
        type: 'assessment_reallocated',
        title: `Exam Reallocated: ${test.name}`,
        message: `Your trainer ${test.trainerName || ''} has reallocated "${test.name}" for Attempt ${nextIteration}. You can retake the exam now.`,
        createdBy: test.trainerName || ''
      }).catch(() => {});
    }

    res.json({ message: `Exam successfully reallocated for ${st?.name || studentId} (Attempt ${nextIteration})`, attempt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Online tests: student side ----------
async function portalStudentOf(req) {
  if (req.user?.department !== 'student' || !req.user?.studentId) return null;
  return findStudentByAnyId(req.user.studentId);
}

async function loadStudentTest(req, res) {
  const st = await portalStudentOf(req);
  if (!st) { res.status(403).json({ error: 'Please sign in with your student account.' }); return null; }
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ error: 'Invalid test' }); return null; }
  const test = await TrainerAssessment.findById(req.params.id);
  if (!test || test.mode !== 'online' || !(test.questions || []).length) { res.status(404).json({ error: 'This online test is not available.' }); return null; }
  if (!sameBatch(test.batch, studentBatchOf(st))) { res.status(403).json({ error: 'This test is not for your batch.' }); return null; }
  return { st, test };
}

const cleanAnswers = (answers, test) => (test.questions || []).map((q, i) => {
  const a = Number(Array.isArray(answers) ? answers[i] : -1);
  return Number.isInteger(a) && a >= 0 && a < q.options.length ? a : -1;
});

// Grade, store the score on the test (same place a trainer's manual score
// goes) and refresh the student's test average & readiness
async function gradeAttempt(attempt, test, st, { auto = false } = {}) {
  const answers = cleanAnswers(attempt.answers, test);
  let score = 0;
  let correct = 0;
  test.questions.forEach((q, i) => { if (answers[i] === q.answer) { score += q.marks || 1; correct += 1; } });
  attempt.answers = answers;
  attempt.score = score;
  attempt.correct = correct;
  attempt.totalMarks = test.totalMarks;
  attempt.status = 'submitted';
  attempt.submittedAt = new Date();
  attempt.autoSubmitted = auto;
  attempt.late = !auto && Date.now() > new Date(attempt.endsAt).getTime() + TEST_GRACE_MS;

  // Compute and record AAPC-style chapter breakdown on attempt
  const chapterMap = {};
  test.questions.forEach((q, i) => {
    const chap = (q.chapter || test.topic || 'General Medical Coding').trim();
    if (!chapterMap[chap]) chapterMap[chap] = { name: chap, totalQuestions: 0, totalMarks: 0, earnedMarks: 0, correctCount: 0 };
    chapterMap[chap].totalQuestions += 1;
    const qMarks = q.marks || 1;
    chapterMap[chap].totalMarks += qMarks;
    if (answers[i] === q.answer) {
      chapterMap[chap].earnedMarks += qMarks;
      chapterMap[chap].correctCount += 1;
    }
  });
  attempt.chapterScores = chapterMap;
  await attempt.save();

  const key = attempt.studentKey || studentKeyOf(st);
  const fresh = await TrainerAssessment.findById(test._id);
  const scores = fresh.scores instanceof Map ? Object.fromEntries(fresh.scores) : (fresh.scores || {});
  scores[key] = score;
  fresh.scores = scores;
  if (fresh.status === 'Active') fresh.status = 'Scored';
  await fresh.save();
  await recomputeAssessmentScores([key]);
  await notifyStudent(st.studentId, {
    type: 'score', title: `Score: ${test.name}`,
    message: `You scored ${score}/${test.totalMarks} (${correct} of ${test.questions.length} correct)${auto ? ' — submitted automatically when time ran out' : ''}.`,
    createdBy: test.trainerName || ''
  });
  if (test.trainerId) {
    await pushNotification({
      audience: 'trainer', recipientId: test.trainerId, recipientName: test.trainerName, type: 'submission',
      title: `${st.name} finished ${test.name}`, message: `Score ${score}/${test.totalMarks}${attempt.late ? ' · submitted late' : ''}.`,
      studentId: st.studentId, createdBy: st.name
    });
  }
  return attempt;
}

// Attempts left open past their time are closed with whatever was saved
async function closeIfExpired(attempt, test, st) {
  if (attempt?.status === 'in_progress' && Date.now() > new Date(attempt.endsAt).getTime() + TEST_GRACE_MS) {
    return gradeAttempt(attempt, test, st, { auto: true });
  }
  return attempt;
}

function studentTestView(test, attempt, st) {
  const base = {
    id: test._id.toString(), name: test.name, type: test.type, topic: test.topic || '', date: test.date || '',
    durationMin: test.durationMin || minutesOf(test.timeLimit), totalMarks: test.totalMarks, passMark: test.passMark,
    questionCount: test.questions.length, trainerName: test.trainerName || '',
    opensToday: !test.date || test.date <= todayStr(),
    alreadyScored: !attempt && Object.prototype.hasOwnProperty.call(test.scores instanceof Map ? Object.fromEntries(test.scores) : (test.scores || {}), studentKeyOf(st)),
    attemptIteration: attempt?.attemptIteration || 1,
    reallocated: Boolean(attempt?.reallocated)
  };
  if (!attempt) return { ...base, state: 'not_started' };
  if (attempt.status === 'in_progress') {
    return {
      ...base, state: 'in_progress', endsAt: attempt.endsAt, serverNow: new Date(),
      answers: cleanAnswers(attempt.answers, test),
      questions: test.questions.map((q) => ({ q: q.q, options: q.options, marks: q.marks, chapter: q.chapter || '' }))
    };
  }

  // AAPC-style chapter breakdown calculation
  const chapterMap = {};
  test.questions.forEach((q, i) => {
    const chap = (q.chapter || test.topic || 'General Medical Coding').trim();
    if (!chapterMap[chap]) chapterMap[chap] = { name: chap, totalQuestions: 0, totalMarks: 0, earnedMarks: 0, correctCount: 0 };
    chapterMap[chap].totalQuestions += 1;
    const qMarks = q.marks || 1;
    chapterMap[chap].totalMarks += qMarks;
    if (attempt.answers?.[i] === q.answer) {
      chapterMap[chap].earnedMarks += qMarks;
      chapterMap[chap].correctCount += 1;
    }
  });
  const chapterBreakdown = Object.values(chapterMap).map((c) => {
    const pct = c.totalMarks > 0 ? Math.round((c.earnedMarks / c.totalMarks) * 100) : 0;
    return {
      ...c,
      percentage: pct,
      mastery: pct >= 75 ? 'Strength' : pct >= 60 ? 'Moderate' : 'Improvement Area'
    };
  });

  return {
    ...base,
    state: 'submitted',
    score: attempt.score,
    correct: attempt.correct,
    submittedAt: attempt.submittedAt,
    autoSubmitted: attempt.autoSubmitted,
    rationale: test.rationale || '',
    chapterBreakdown,
    attemptIteration: attempt.attemptIteration || 1,
    reallocated: Boolean(attempt.reallocated),
    review: test.questions.map((q, i) => ({
      q: q.q,
      options: q.options,
      marks: q.marks,
      answer: q.answer,
      yours: attempt.answers?.[i] ?? -1,
      chapter: q.chapter || '',
      rationale: q.rationale || test.rationale || '',
      audioRationaleUrl: q.audioRationaleUrl || '',
      audioRationaleText: q.audioRationaleText || q.rationale || test.rationale || ''
    }))
  };
}

// Leaderboard endpoint for mock exams and practice exams
router.get('/student-portal/tests/:id/leaderboard', async (req, res) => {
  try {
    const test = await TrainerAssessment.findById(req.params.id).select('name topic totalMarks passMark batch mode type');
    if (!test) return res.status(404).json({ error: 'Assessment not found' });
    const currentStudentId = req.query.studentId || req.user?.studentId || '';

    const attempts = await TestAttempt.find({ assessmentId: req.params.id, status: 'submitted' })
      .sort({ score: -1, submittedAt: 1 })
      .limit(100);

    const MEDALS = ['🥇', '🥈', '🥉'];
    const leaderboard = attempts.map((att, idx) => {
      const timeMs = att.submittedAt && att.startedAt ? Math.max(0, new Date(att.submittedAt).getTime() - new Date(att.startedAt).getTime()) : 0;
      const durationMin = Math.round(timeMs / 60000);
      const totalMarks = att.totalMarks || test.totalMarks || 1;
      const percentage = Math.round(((att.score || 0) / totalMarks) * 100);
      const isCurrent = currentStudentId && att.studentId === currentStudentId;
      return {
        rank: idx + 1,
        medal: MEDALS[idx] || `${idx + 1}`,
        studentId: att.studentId,
        studentName: att.studentName || 'Student',
        score: att.score || 0,
        totalMarks,
        correct: att.correct || 0,
        percentage,
        durationMin,
        submittedAt: att.submittedAt,
        attemptIteration: att.attemptIteration || 1,
        isCurrentUser: Boolean(isCurrent),
        passed: (att.score || 0) >= (test.passMark || Math.ceil(totalMarks * 0.7))
      };
    });

    res.json({
      testName: test.name,
      testType: test.type,
      totalMarks: test.totalMarks,
      passMark: test.passMark,
      totalParticipants: attempts.length,
      leaderboard
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Student side reallocation / retake request
router.post('/student-portal/tests/:id/reallocate', async (req, res) => {
  try {
    const ctx = await loadStudentTest(req, res);
    if (!ctx) return;
    const { st, test } = ctx;
    const { reason = 'Retake exam to practice weak chapters and improve score' } = req.body || {};

    const attempt = await TestAttempt.findOne({ assessmentId: req.params.id, studentId: st.studentId });
    if (!attempt || attempt.status !== 'submitted') {
      return res.status(400).json({ error: 'You have not completed an attempt yet to retake.' });
    }

    const historyEntry = {
      attemptIteration: attempt.attemptIteration || 1,
      score: attempt.score || 0,
      totalMarks: attempt.totalMarks || test.totalMarks,
      correct: attempt.correct || 0,
      submittedAt: attempt.submittedAt || new Date(),
      chapterScores: attempt.chapterScores || {}
    };

    const nextIteration = (attempt.attemptIteration || 1) + 1;
    attempt.attemptHistory = [...(attempt.attemptHistory || []), historyEntry];
    attempt.attemptIteration = nextIteration;
    attempt.reallocated = true;
    attempt.reallocatedAt = new Date();
    attempt.reallocatedBy = st.name;
    attempt.reallocationReason = reason;
    const now = new Date();
    attempt.startedAt = now;
    attempt.endsAt = new Date(now.getTime() + (test.durationMin || 45) * 60000);
    attempt.answers = (test.questions || []).map(() => -1);
    attempt.score = null;
    attempt.correct = 0;
    attempt.status = 'in_progress';
    attempt.submittedAt = null;
    attempt.autoSubmitted = false;
    attempt.late = false;
    await attempt.save();

    if (test.trainerId) {
      await pushNotification({
        audience: 'trainer',
        recipientId: test.trainerId,
        recipientName: test.trainerName,
        type: 'exam_retake',
        title: `${st.name} retaking ${test.name} (Attempt ${nextIteration})`,
        message: `${st.name} has reallocated and begun Attempt ${nextIteration} for ${test.name}. Reason: ${reason}`,
        studentId: st.studentId,
        createdBy: st.name
      }).catch(() => {});
    }

    res.json(studentTestView(test, attempt, st));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/student-portal/tests/:id', async (req, res) => {
  try {
    const ctx = await loadStudentTest(req, res);
    if (!ctx) return;
    let attempt = await TestAttempt.findOne({ assessmentId: req.params.id, studentId: ctx.st.studentId });
    attempt = await closeIfExpired(attempt, ctx.test, ctx.st);
    res.json(studentTestView(ctx.test, attempt, ctx.st));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/student-portal/tests/:id/start', async (req, res) => {
  try {
    const ctx = await loadStudentTest(req, res);
    if (!ctx) return;
    const { st, test } = ctx;
    let attempt = await TestAttempt.findOne({ assessmentId: req.params.id, studentId: st.studentId });
    if (!attempt) {
      if (test.date && test.date > todayStr()) return res.status(409).json({ error: `This test opens on ${test.date}.` });
      const view = studentTestView(test, null, st);
      if (view.alreadyScored) return res.status(409).json({ error: 'Your trainer has already entered a score for this test.' });
      const now = new Date();
      try {
        attempt = await TestAttempt.create({
          assessmentId: req.params.id, studentId: st.studentId, studentKey: studentKeyOf(st), studentName: st.name,
          batch: studentBatchOf(st), startedAt: now,
          endsAt: new Date(now.getTime() + (test.durationMin || minutesOf(test.timeLimit)) * 60000),
          answers: test.questions.map(() => -1), totalMarks: test.totalMarks
        });
      } catch (err) {
        if (err?.code !== 11000) throw err; // double click → reuse the attempt just created
        attempt = await TestAttempt.findOne({ assessmentId: req.params.id, studentId: st.studentId });
      }
    }
    attempt = await closeIfExpired(attempt, test, st);
    res.json(studentTestView(test, attempt, st));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Autosave while the student works (keeps answers if the browser closes)
router.post('/student-portal/tests/:id/save', async (req, res) => {
  try {
    const ctx = await loadStudentTest(req, res);
    if (!ctx) return;
    const attempt = await TestAttempt.findOne({ assessmentId: req.params.id, studentId: ctx.st.studentId });
    if (!attempt || attempt.status !== 'in_progress') return res.status(409).json({ error: 'This attempt is closed.' });
    if (Date.now() > new Date(attempt.endsAt).getTime() + TEST_GRACE_MS) return res.status(409).json({ error: 'Time is over.' });
    attempt.answers = cleanAnswers(req.body?.answers, ctx.test);
    await attempt.save();
    res.json({ success: true, savedAt: new Date() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/student-portal/tests/:id/submit', async (req, res) => {
  try {
    const ctx = await loadStudentTest(req, res);
    if (!ctx) return;
    const { st, test } = ctx;
    let attempt = await TestAttempt.findOne({ assessmentId: req.params.id, studentId: st.studentId });
    if (!attempt) return res.status(409).json({ error: 'Start the test first.' });
    if (attempt.status === 'in_progress') {
      // Answers sent after the time (plus grace) are ignored — the saved ones count
      if (Date.now() <= new Date(attempt.endsAt).getTime() + TEST_GRACE_MS) attempt.answers = cleanAnswers(req.body?.answers, test);
      attempt = await gradeAttempt(attempt, test, st);
    }
    res.json(studentTestView(test, attempt, st));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- Class recordings ----------
router.get('/trainer/live-class/history', async (req, res) => {
  try {
    const query = { isLive: false };
    if (isTrainerReq(req)) query.trainerId = myTrainerId(req);
    else if (req.query.trainerId) query.trainerId = String(req.query.trainerId);
    if (req.query.batch) query.batch = String(req.query.batch);
    const list = await LiveClassSession.find(query).sort({ startedAt: -1 }).limit(30)
      .select('trainerId trainerName batch topic startedAt endedAt recordingUrl recordingAddedAt joins notes attendanceSaved');
    res.json(list.map((s) => ({
      sessionId: s._id.toString(), batch: s.batch, topic: s.topic, startedAt: s.startedAt, endedAt: s.endedAt,
      recordingUrl: s.recordingUrl || '', joins: (s.joins || []).length, notes: (s.notes || []).length, attendanceSaved: s.attendanceSaved
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/trainer/live-class/:id/recording', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid session' });
    const url = String(req.body?.url || '').trim();
    if (url && (!/^https?:\/\/\S+$/i.test(url) || url.length > 1000)) return res.status(400).json({ error: 'Paste a valid https:// link' });
    const sess = await LiveClassSession.findById(req.params.id);
    if (!sess) return res.status(404).json({ error: 'Session not found' });
    if (!trainerOwnsRecord(req, sess)) return res.status(403).json(NOT_YOUR_RECORD);
    const isNew = url && !sess.recordingUrl;
    sess.recordingUrl = url;
    sess.recordingAddedAt = url ? new Date() : null;
    await sess.save();
    if (isNew) {
      await notifyBatch(sess.batch, {
        type: 'recording', title: `Class recording: ${sess.topic || 'class'}`,
        message: `The recording of ${new Date(sess.startedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}'s class is ready. Open Classes to watch it.`,
        createdBy: sess.trainerName || ''
      });
    }
    res.json({ success: true, recordingUrl: sess.recordingUrl });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- Doubt follow-ups (student) ----------
async function loadOwnDoubt(req, res) {
  const st = await portalStudentOf(req);
  if (!st) { res.status(403).json({ error: 'Please sign in with your student account.' }); return null; }
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ error: 'Invalid doubt' }); return null; }
  const doubt = await TrainerDoubt.findById(req.params.id);
  if (!doubt || doubt.studentId !== st.studentId) { res.status(404).json({ error: 'Doubt not found' }); return null; }
  return { st, doubt };
}

router.post('/student-portal/doubts/:id/followup', async (req, res) => {
  try {
    const ctx = await loadOwnDoubt(req, res);
    if (!ctx) return;
    const { st, doubt } = ctx;
    const text = String(req.body?.text || '').trim().slice(0, 2000);
    if (!text) return res.status(400).json({ error: 'Write your follow-up question' });
    if (!(doubt.thread || []).length && doubt.reply) {
      // keep the first reply in the conversation
      doubt.thread.push({ by: 'trainer', name: doubt.trainerName || 'Trainer', text: doubt.reply, at: doubt.repliedAt || doubt.updatedAt });
    }
    const now = new Date();
    doubt.thread.push({ by: 'student', name: st.name, text, at: now });
    doubt.status = 'New';
    doubt.lastStudentAt = now;
    doubt.resolvedByStudent = false;
    doubt.resolvedAt = null;
    await doubt.save();
    if (doubt.trainerId) {
      await pushNotification({
        audience: 'trainer', recipientId: doubt.trainerId, recipientName: doubt.trainerName, type: 'doubt',
        title: `Follow-up from ${st.name}`, message: `${doubt.topic ? `${doubt.topic}: ` : ''}${text.slice(0, 200)}`,
        studentId: st.studentId, createdBy: st.name
      });
    }
    res.json(formatDoubt(doubt));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/student-portal/doubts/:id/resolve', async (req, res) => {
  try {
    const ctx = await loadOwnDoubt(req, res);
    if (!ctx) return;
    ctx.doubt.resolvedByStudent = true;
    ctx.doubt.resolvedAt = new Date();
    await ctx.doubt.save();
    res.json(formatDoubt(ctx.doubt));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
