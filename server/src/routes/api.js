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

const router = express.Router();

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
// CALLING — Exotel Click-to-Call bridge
// ==========================================
// TELEPHONY API — MyOperator (Primary) & Exotel (Secondary)
// ==========================================
function activeTelephonyProvider() {
  dotenv.config();
  return (process.env.TELEPHONY_PROVIDER || 'exotel').toLowerCase();
}

function myoperatorConfig() {
  return {
    token: process.env.MYOPERATOR_TOKEN || '',
    companyId: process.env.MYOPERATOR_COMPANY_ID || '',
    secretToken: process.env.MYOPERATOR_SECRET_TOKEN || '',
    callerId: process.env.MYOPERATOR_CALLER_ID || '',
    defaultAgentPhone: process.env.MYOPERATOR_DEFAULT_AGENT_PHONE || '6382718655'
  };
}

function exotelConfig() {
  return {
    sid: process.env.EXOTEL_SID || '',
    apiKey: process.env.EXOTEL_API_KEY || '',
    apiToken: process.env.EXOTEL_API_TOKEN || '',
    exophone: process.env.EXOTEL_EXOPHONE || '',
    subdomain: process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
    defaultAgentPhone: process.env.EXOTEL_DEFAULT_AGENT_PHONE || '6382718655'
  };
}

function telephonyConfigured() {
  if (activeTelephonyProvider() === 'myoperator') {
    return !!myoperatorConfig().token;
  }
  const c = exotelConfig();
  return !!(c.sid && c.apiKey && c.apiToken && c.exophone);
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

router.get('/calls/config-status', (req, res) => {
  const provider = activeTelephonyProvider();
  if (provider === 'myoperator') {
    const c = myoperatorConfig();
    return res.json({
      provider: 'myoperator',
      configured: !!c.token,
      companyId: c.companyId || '',
      callerId: c.callerId || ''
    });
  }
  res.json({
    provider: 'exotel',
    configured: !!(process.env.EXOTEL_SID && process.env.EXOTEL_API_KEY && process.env.EXOTEL_API_TOKEN)
  });
});

router.post('/calls/dial', async (req, res) => {
  const provider = activeTelephonyProvider();
  const { leadPhone, agentPhone } = req.body;
  if (!leadPhone) return res.status(400).json({ error: 'leadPhone is required' });

  // 10-digit clean format (standard for MyOperator)
  const cleanLead = String(leadPhone).replace(/[^\d]/g, '').slice(-10);
  const cleanAgent = String(agentPhone || process.env.MYOPERATOR_DEFAULT_AGENT_PHONE || '6382718655').replace(/[^\d]/g, '').slice(-10);

  // ── MYOPERATOR DIAL ROUTE ───────────────────────────────────────────
  if (provider === 'myoperator') {
    const { token, companyId, callerId } = myoperatorConfig();
    if (!token) {
      return res.status(503).json({
        error: 'MyOperator token not found. Please add MYOPERATOR_TOKEN in server/.env and restart server.'
      });
    }

    try {
      const params = new URLSearchParams({
        token,
        customer_number: cleanLead,
        agent_number: cleanAgent
      });
      if (companyId) params.append('company_id', companyId);
      if (callerId) params.append('caller_id', callerId);

      const response = await fetch('https://developers.myoperator.co/searchApi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || (data.status && data.status !== 'success')) {
        const message = data.message || data.error || `MyOperator error: HTTP ${response.status}`;
        return res.status(502).json({ error: message });
      }

      const callSid = data.data?.call_id || data.call_id || `myop_${Date.now()}`;
      return res.json({
        provider: 'myoperator',
        callSid,
        status: 'queued',
        from: cleanAgent,
        to: cleanLead
      });
    } catch (err) {
      return res.status(502).json({ error: `Could not reach MyOperator: ${err.message}` });
    }
  }

  // ── EXOTEL DIAL ROUTE (FALLBACK) ────────────────────────────────────
  const { exophone, defaultAgentPhone } = exotelConfig();
  const from = toE164India(agentPhone || defaultAgentPhone);
  const to = toE164India(leadPhone);

  if (!from) {
    return res.status(400).json({ error: 'No agent phone number available.' });
  }
  if (!to) {
    return res.status(400).json({ error: 'The lead has no usable phone number on file.' });
  }

  try {
    const params = new URLSearchParams({
      From: from,
      To: to,
      CallerId: exophone,
      CallType: 'trans',
      Record: 'true'
    });
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
    res.json({ provider: 'exotel', callSid: call.Sid, status: call.Status || 'queued', from, to });
  } catch (err) {
    res.status(502).json({ error: `Could not reach telephony service: ${err.message}` });
  }
});

router.get('/calls/:callSid/status', async (req, res) => {
  const provider = activeTelephonyProvider();
  const callSid = req.params.callSid;

  if (provider === 'myoperator') {
    const { token } = myoperatorConfig();
    if (!token) return res.status(503).json({ error: 'MyOperator token missing' });

    try {
      const response = await fetch(`https://developers.myoperator.co/search?token=${token}&call_id=${callSid}`);
      const data = await response.json().catch(() => ({}));
      const callData = data.data?.[0] || data.data || {};
      return res.json({
        provider: 'myoperator',
        callSid,
        status: callData.status === 'answered' ? 'in-progress' : callData.status || 'in-progress',
        duration: Number(callData.duration || 0),
        recordingUrl: callData.recording_url || callData.filename || null
      });
    } catch (e) {
      return res.json({ provider: 'myoperator', callSid, status: 'in-progress' });
    }
  }

  // Exotel status
  try {
    const response = await fetch(`${exotelBaseUrl()}/Calls/${callSid}.json`, {
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
      status: call.Status,
      duration: Number(call.ConversationDuration || call.Duration || 0),
      startTime: call.StartTime,
      endTime: call.EndTime,
      recordingUrl: call.RecordingUrl || null
    });
  } catch (err) {
    res.status(502).json({ error: `Could not reach Exotel: ${err.message}` });
  }
});

// MyOperator After-Call Webhook
router.post('/calls/myoperator/webhook', async (req, res) => {
  try {
    const payload = req.body || {};
    const {
      call_id,
      customer_number,
      agent_number,
      duration,
      recording_url,
      filename,
      status
    } = payload;

    const audioUrl = recording_url || filename;
    const phone = customer_number || payload.to;
    if (audioUrl && phone) {
      const cleanPhone = String(phone).replace(/[^\d]/g, '').slice(-10);
      const lead = await StudentLead.findOne({ phone: { $regex: cleanPhone } });

      const rec = new CallRecording({
        leadId: lead?._id || undefined,
        leadName: lead?.fullName || lead?.name || `Student ${cleanPhone}`,
        leadPhone: cleanPhone,
        counselorName: 'Kavitha N.',
        callSid: call_id || '',
        durationSeconds: Number(duration) || 0,
        outcome: status === 'answered' ? 'Follow-up Needed' : 'Not Reachable',
        audioUrl,
        source: 'myoperator'
      });
      await rec.save();
    }
    res.json({ success: true, received: true });
  } catch (err) {
    console.error('MyOperator webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/calls/:callSid/hangup', async (req, res) => {
  if (!exotelConfigured()) {
    return res.status(503).json({ error: 'Exotel is not configured.' });
  }
  try {
    const params = new URLSearchParams({ Status: 'completed' });
    const response = await fetch(`${exotelBaseUrl()}/Calls/${req.params.callSid}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...exotelAuthHeader() },
      body: params.toString()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.RestException?.Message || `Exotel returned HTTP ${response.status}`;
      return res.status(502).json({ error: message });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: `Could not reach Exotel: ${err.message}` });
  }
});

// ==========================================
// CALL RECORDINGS API
// ==========================================
router.get('/recordings', async (req, res) => {
  try {
    const { leadPhone, leadId, counselorName, search } = req.query;
    let query = {};
    if (leadPhone) {
      const digits = leadPhone.replace(/[^\d]/g, '');
      if (digits) query.leadPhone = { $regex: digits, $options: 'i' };
    }
    if (leadId && mongoose.isValidObjectId(leadId)) {
      query.leadId = leadId;
    }
    if (counselorName) query.counselorName = { $regex: counselorName, $options: 'i' };
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
      source
    } = req.body;

    if (!leadName || !leadPhone) {
      return res.status(400).json({ error: 'leadName and leadPhone are required' });
    }

    let audioUrl = directAudioUrl || '';

    // If an audioBase64 string was sent (from in-browser MediaRecorder)
    if (audioBase64) {
      const match = audioBase64.match(/^data:audio\/(webm|mp3|wav|ogg|mpeg);base64,(.+)$/i);
      const ext = match ? (match[1] === 'mpeg' ? 'mp3' : match[1]) : 'webm';
      const base64Data = match ? match[2] : audioBase64.replace(/^data:[^;]+;base64,/, '');
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

    const recording = new CallRecording({
      leadId: leadId && mongoose.isValidObjectId(leadId) ? leadId : undefined,
      leadName,
      leadPhone,
      counselorName: counselorName || 'Kavitha N.',
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
    const counselorName = req.query.counselor;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    if (!counselorName) {
      return res.status(400).json({ error: 'counselor query param is required' });
    }
    const closure = await DailyClosure.findOne({
      counselorName: { $regex: new RegExp(`^${counselorName.trim()}$`, 'i') },
      date
    });
    res.json(closure || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/closures', async (req, res) => {
  try {
    const { counselorName, date, callsMade, connected, demosBooked, admissions, feesCollected, pendingFus, notes, branch } = req.body;
    if (!counselorName || !date) {
      return res.status(400).json({ error: 'counselorName and date are required' });
    }
    const closure = await DailyClosure.findOneAndUpdate(
      {
        counselorName: { $regex: new RegExp(`^${counselorName.trim()}$`, 'i') },
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
          branch: branch || 'Saravanampatti Branch (CBE)',
          status: 'submitted',
          submittedAt: new Date(),
          notes: notes || ''
        }
      },
      { new: true, upsert: true }
    );
    res.status(200).json(closure);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/closures', async (req, res) => {
  try {
    const query = {};
    if (req.query.date) query.date = req.query.date;
    if (req.query.counselor) query.counselorName = { $regex: new RegExp(req.query.counselor, 'i') };
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
      assignedBy: assignedBy || 'Head of HR'
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
router.get('/stats', async (req, res) => {
  try {
    const deptCount = await Department.countDocuments();
    const branchCount = await Branch.countDocuments();
    const studentCount = await Student.countDocuments();
    const leadCount = await StudentLead.countDocuments();
    const placedCount = await Student.countDocuments({ 
      $or: [
        { statusGroup: 'placed' },
        { placementStatus: { $regex: /placed/i } }
      ]
    });

    let grossRevenue = 0;
    const revenueAgg = await Student.aggregate([
      { $match: { feeStatus: { $ne: 'Pending' } } },
      { $group: { _id: null, total: { $sum: "$courseFee" } } }
    ]);
    if (revenueAgg[0]?.total) {
      grossRevenue = revenueAgg[0].total;
    }

    res.json({
      academyName: "Thoughtflows Medical Coding Academy",
      tagline: "Where thoughts flow into action",
      portalVersion: "V2.0 • LIVE",
      branchesCount: branchCount,
      teamsCount: deptCount,
      activeStudents: studentCount,
      activeLeads: leadCount,
      placedStudents: placedCount,
      placementRate: studentCount > 0 ? `${((placedCount / studentCount) * 100).toFixed(1)}%` : "0.0%",
      grossRevenue
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Departments Endpoint
router.get('/departments', async (req, res) => {
  try {
    let depts = await Department.find();
    return res.json(depts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Branches Endpoint (14 Official Academy Branches)
router.get('/branches', async (req, res) => {
  try {
    let branches = await Branch.find();
    return res.json(branches);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// LEADERSHIP HUB — Approvals, Escalations, Team & Attendance
// ==========================================
// Org-wide summary for the Operational Head command view
const SEEDED_8_APPROVALS = [
  {
    _id: '66f3e001a1b2c3d4e5f60001',
    id: 'APR-LV-2026-0915',
    title: 'Leave Request: Sick Leave (SL) (Half day)',
    description: 'Sick Leave (SL) · Half day · Due to stomach pain i need half day leave (2026-09-15)',
    kind: 'Leave Approval',
    priority: 'medium',
    status: 'pending',
    departmentCode: 'DEP-HR-001',
    branchName: 'Saravanampatti Branch (CBE)',
    requestedBy: 'Kavitha N.',
    createdAt: new Date().toISOString()
  },
  {
    _id: '66f3e001a1b2c3d4e5f60002',
    id: 'APR-TF-2026-1031',
    title: 'Discount approval',
    description: 'Lead L-TF-CBE-2026-0188 — ₹4,000 discount on CPC',
    kind: 'Discount Approval',
    priority: 'high',
    status: 'pending',
    departmentCode: 'DEP-HR-001',
    branchName: 'Saravanampatti Branch (CBE)',
    requestedBy: 'Kavitha N.',
    createdAt: new Date().toISOString()
  },
  {
    _id: '66f3e001a1b2c3d4e5f60003',
    id: 'APR-ADM-2026-0042',
    title: 'Admission approval',
    description: 'TF-CBE-2026-CPC-0042 — Docs verified, ready to enrol',
    kind: 'Admission Approval',
    priority: 'medium',
    status: 'pending',
    departmentCode: 'DEP-HR-001',
    branchName: 'Saravanampatti Branch (CBE)',
    requestedBy: 'Reshma S.',
    createdAt: new Date().toISOString()
  },
  {
    _id: '66f3e001a1b2c3d4e5f60004',
    id: 'APR-LV-2026-0928',
    title: 'Leave Request: Casual Leave (CL) (Full day)',
    description: 'Casual Leave (CL) · Full day · Family emergency requiring leave on Friday (2026-09-28)',
    kind: 'Leave Approval',
    priority: 'medium',
    status: 'pending',
    departmentCode: 'DEP-HR-001',
    branchName: 'Saravanampatti Branch (CBE)',
    requestedBy: 'Anitha R.',
    createdAt: new Date().toISOString()
  },
  {
    _id: '66f3e001a1b2c3d4e5f60005',
    id: 'APR-SHF-2026-0105',
    title: 'Shift Change Request: 12-9 PM to 9-6 PM',
    description: 'Requesting shift change from 12-9 PM to 9-6 PM shift for next week roster',
    kind: 'Shift Change',
    priority: 'low',
    status: 'pending',
    departmentCode: 'DEP-HR-001',
    branchName: 'Saravanampatti Branch (CBE)',
    requestedBy: 'Karthik M.',
    createdAt: new Date().toISOString()
  },
  {
    _id: '66f3e001a1b2c3d4e5f60006',
    id: 'APR-BGT-2026-0012',
    title: 'Training Material Printing Budget',
    description: '₹12,500 budget request for CPC training workbook printing (150 copies)',
    kind: 'Budget Approval',
    priority: 'high',
    status: 'pending',
    departmentCode: 'DEP-HR-001',
    branchName: 'Saravanampatti Branch (CBE)',
    requestedBy: 'Priyanka K.',
    createdAt: new Date().toISOString()
  },
  {
    _id: '66f3e001a1b2c3d4e5f60007',
    id: 'APR-CMP-2026-0020',
    title: 'Compensatory Off (Comp-Off) Request',
    description: 'Worked on Sunday medical coding workshop (2026-09-20), requesting Comp-Off approval',
    kind: 'Comp-Off Approval',
    priority: 'low',
    status: 'pending',
    departmentCode: 'DEP-HR-001',
    branchName: 'Saravanampatti Branch (CBE)',
    requestedBy: 'Suresh V.',
    createdAt: new Date().toISOString()
  },
  {
    _id: '66f3e001a1b2c3d4e5f60008',
    id: 'APR-REQ-2026-0088',
    title: 'New Hiring Requisition: Junior HR Executive',
    description: 'Replacement hire requisition for Saravanampatti Branch HR recruitment team',
    kind: 'Hiring Requisition',
    priority: 'high',
    status: 'pending',
    departmentCode: 'DEP-HR-001',
    branchName: 'Saravanampatti Branch (CBE)',
    requestedBy: 'Jasmin',
    createdAt: new Date().toISOString()
  }
];

let mockApprovalsStore = [...SEEDED_8_APPROVALS];

router.get('/leadership/summary', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const [pendingApprovals, openEscalations] = await Promise.all([
        Approval.countDocuments({ status: { $regex: /^pending$/i } }),
        Escalation.countDocuments({ status: { $nin: ['resolved', 'closed', 'RESOLVED', 'CLOSED'] } })
      ]);
      return res.json({ pendingApprovals, openEscalations });
    }
  } catch (e) {}

  const pendingApprovals = mockApprovalsStore.filter(a => (a.status || '').toLowerCase() === 'pending').length;
  res.json({ pendingApprovals, openEscalations: 1 });
});

// Approvals
router.get('/leadership/approvals', async (req, res) => {
  try {
    const { departmentCode, branchName, status } = req.query;

    if (mongoose.connection.readyState === 1) {
      const count = await Approval.countDocuments();
      if (count < 8) {
        for (const seed of SEEDED_8_APPROVALS) {
          const exists = await Approval.findOne({ $or: [{ title: seed.title }, { _id: seed._id }] });
          if (!exists) {
            await Approval.create(seed);
          }
        }
      }

      const query = {};
      if (departmentCode) {
        const codeUpper = departmentCode.toUpperCase();
        if (codeUpper === 'DEP-HR-001' || codeUpper === 'HR') {
          query.$or = [
            { departmentCode: { $regex: /^(DEP-HR-001|HR)$/i } },
            { departmentCode: { $exists: false } },
            { departmentCode: null },
            { departmentCode: '' }
          ];
        } else {
          query.departmentCode = { $regex: new RegExp(`^${departmentCode}$`, 'i') };
        }
      }
      if (branchName) query.branchName = { $regex: new RegExp(`^${branchName}$`, 'i') };
      if (status) query.status = { $regex: new RegExp(`^${status}$`, 'i') };

      const dbApprovals = await Approval.find(query).sort({ createdAt: -1 });
      if (dbApprovals && dbApprovals.length > 0) {
        return res.json(dbApprovals);
      }
    }
  } catch (e) {
    console.warn('[Leadership Approvals API] MongoDB query skipped/failed, using fallback store:', e.message);
  }

  let filtered = [...mockApprovalsStore];
  if (req.query.status) {
    const st = req.query.status.toLowerCase();
    filtered = filtered.filter(a => (a.status || '').toLowerCase() === st);
  }
  res.json(filtered);
});

router.post('/leadership/approvals', async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.departmentCode) {
      payload.departmentCode = payload.branchName ? 'ADM' : 'DEP-HR-001';
    }
    const newId = `APR-${Date.now().toString(36).toUpperCase()}`;
    const newApproval = {
      _id: newId,
      id: newId,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      ...payload
    };
    mockApprovalsStore.unshift(newApproval);

    if (mongoose.connection.readyState === 1) {
      try {
        const created = await Approval.create(payload);
        return res.status(201).json(created);
      } catch (e) {}
    }
    res.status(201).json(newApproval);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/leadership/approvals/:id/decision', async (req, res) => {
  try {
    const { action, decidedBy } = req.body;
    const targetId = req.params.id;

    mockApprovalsStore = mockApprovalsStore.map(item => {
      if (item._id === targetId || item.id === targetId) {
        return { ...item, status: action, decidedBy: decidedBy || 'Head of HR', decidedAt: new Date().toISOString() };
      }
      return item;
    });

    if (mongoose.connection.readyState === 1) {
      try {
        let updated = null;
        if (mongoose.Types.ObjectId.isValid(targetId)) {
          updated = await Approval.findByIdAndUpdate(
            targetId,
            { status: action, decidedBy: decidedBy || 'Head of HR', decidedAt: new Date() },
            { new: true }
          );
        }
        if (!updated) {
          updated = await Approval.findOneAndUpdate(
            { $or: [{ _id: targetId }, { id: targetId }] },
            { status: action, decidedBy: decidedBy || 'Head of HR', decidedAt: new Date() },
            { new: true }
          );
        }
        if (updated) return res.json(updated);
      } catch (e) {}
    }

    const updatedMock = mockApprovalsStore.find(item => item._id === targetId || item.id === targetId);
    res.json(updatedMock || { _id: targetId, id: targetId, status: action });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Escalations
router.get('/leadership/escalations', async (req, res) => {
  try {
    const { departmentCode, branchName, status } = req.query;
    const query = {};
    if (departmentCode) query.departmentCode = departmentCode;
    if (branchName) query.branchName = branchName;
    if (status) query.status = status;
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
    const created = await Escalation.create(payload);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/leadership/escalations/:id/status', async (req, res) => {
  try {
    const { action } = req.body; // action: 'resolved' | 'escalated' | 'in-progress'
    const update = { status: action };
    if (action === 'resolved' || action === 'closed') update.resolvedAt = new Date();
    const updated = await Escalation.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Escalation not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Team / Roster
router.get('/leadership/team', async (req, res) => {
  try {
    const { departmentCode, branchName } = req.query;
    const query = {};
    if (departmentCode) query.departmentCode = departmentCode;
    if (branchName) query.branchName = branchName;
    let team = await TeamMember.find(query).sort({ quality: -1 });

    if (team.length === 0) {
      const defaultMembers = [
        { name: 'Kavitha N.', role: 'Senior Recruiter', departmentCode: 'DEP-HR-001', branchName: 'Saravanampatti Branch (CBE)', assigned: 14, pending: 2, available: true },
        { name: 'R Priyadharshini', role: 'Team Lead', departmentCode: 'DEP-HR-001', branchName: 'Saravanampatti Branch (CBE)', assigned: 18, pending: 1, available: true },
        { name: 'Guru Vigneshwar S', role: 'Team Lead', departmentCode: 'DEP-HR-001', branchName: 'Saravanampatti Branch (CBE)', assigned: 15, pending: 3, available: true },
        { name: 'Deepika S.', role: 'Recruiter', departmentCode: 'DEP-HR-001', branchName: 'Saravanampatti Branch (CBE)', assigned: 10, pending: 2, available: true },
        { name: 'Srinidhi B.', role: 'Recruiter', departmentCode: 'DEP-HR-001', branchName: 'Saravanampatti Branch (CBE)', assigned: 11, pending: 1, available: false }
      ];
      team = await TeamMember.insertMany(defaultMembers);
    }
    res.json(team);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/leadership/team/:id/shift', async (req, res) => {
  try {
    const { shift, weeklySchedule, available, name, role } = req.body;
    const updateData = {};
    if (shift !== undefined) updateData.shift = shift;
    if (weeklySchedule !== undefined) updateData.weeklySchedule = weeklySchedule;
    if (available !== undefined) updateData.available = available;

    let updated = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      updated = await TeamMember.findByIdAndUpdate(req.params.id, updateData, { new: true });
    }

    if (!updated && (name || req.params.id)) {
      const searchName = name || req.params.id;
      const cleanName = searchName.replace(/[^a-zA-Z0-9]/g, '.*');
      updated = await TeamMember.findOneAndUpdate(
        { name: new RegExp(cleanName, 'i') },
        updateData,
        { new: true }
      );
    }

    if (!updated) {
      updated = await TeamMember.create({
        name: name || req.params.id || 'Kavitha N.',
        role: role || 'Senior Recruiter',
        departmentCode: 'DEP-HR-001',
        branchName: 'Saravanampatti Branch (CBE)',
        ...updateData
      });
    }

    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Attendance
function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

// ==========================================
// REAL ADMITTED STUDENTS API
// ==========================================
router.get('/students', async (req, res) => {
  try {
    const { statusGroup, search, hrName, trainerId, handoverStatus } = req.query;
    let query = {};
    if (trainerId) query.trainerId = trainerId;
    if (handoverStatus) query.handoverStatus = handoverStatus;
    if (statusGroup && statusGroup !== 'all') {
      query.statusGroup = statusGroup;
    }
    if (hrName && hrName !== 'all') {
      const escapedHr = hrName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.hrName = { $regex: new RegExp(escapedHr, 'i') };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } },
        { hrName: { $regex: search, $options: 'i' } }
      ];
    }
    const students = await Student.find(query).sort({ createdAt: -1 });
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

router.post('/students', async (req, res) => {
  try {
    let payload = { ...req.body };
    if (!payload.studentId) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      payload.studentId = `TFMC0Y${randomSuffix}`;
    }
    if (payload.mode && !['Online', 'Classroom'].includes(payload.mode)) {
      payload.mode = (payload.mode.toLowerCase().includes('class') || payload.mode.toLowerCase().includes('off')) ? 'Classroom' : 'Online';
    }
    if (!payload.onboardStatus) payload.onboardStatus = '7/7 ✓';
    if (!payload.syllabusModule) payload.syllabusModule = 'Module 1';
    if (!payload.handoverStatus) payload.handoverStatus = 'Ready';
    if (!payload.statusGroup || !['all', 'in_course', 'placed', 'on_hold'].includes(payload.statusGroup)) {
      payload.statusGroup = payload.placementStatus?.toLowerCase().includes('place') ? 'placed' : 'in_course';
    }

    const newStudent = new Student(payload);
    await newStudent.save();

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

router.put('/students/:id', async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.mode && !['Online', 'Classroom'].includes(payload.mode)) {
      payload.mode = (payload.mode.toLowerCase().includes('class') || payload.mode.toLowerCase().includes('off')) ? 'Classroom' : 'Online';
    }
    if (payload.statusGroup && !['all', 'in_course', 'placed', 'on_hold'].includes(payload.statusGroup)) {
      payload.statusGroup = payload.placementStatus?.toLowerCase().includes('place') ? 'placed' : 'in_course';
    }
    const isObjectId = mongoose.isValidObjectId(req.params.id);
    let updated = null;
    if (isObjectId) {
      updated = await Student.findByIdAndUpdate(
        req.params.id,
        { $set: payload },
        { new: true }
      );
    }
    if (!updated) {
      // Try finding by studentId string
      updated = await Student.findOneAndUpdate(
        { studentId: req.params.id },
        { $set: payload },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Student not found' });
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
    const { counselor, search, stage, branch } = req.query;
    let query = {};
    if (counselor && counselor !== 'all') {
      const escaped = counselor.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { counselorAssigned: { $regex: new RegExp(escaped, 'i') } },
        { allocatedTo: { $regex: new RegExp(escaped, 'i') } }
      ];
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

    const newLead = new StudentLead(payload);
    await newLead.save();

    res.status(201).json(newLead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/leads/:id', async (req, res) => {
  try {
    const updated = await StudentLead.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Lead not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    await StudentLead.findByIdAndDelete(req.params.id);
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
      status: 'read',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || '',
      mediaName: mediaName || '',
      createdAt: now
    };

    if (!lead.whatsappMessages) lead.whatsappMessages = [];
    lead.whatsappMessages.push(newMsg);

    // Context-aware automatic student response
    const lower = (text || '').toLowerCase();
    let replyText = '';
    if (lower.includes('demo') || lower.includes('zoom') || lower.includes('session')) {
      replyText = `Thank you! I will definitely attend the demo session. Is it live with the trainer? Please share the Zoom joining link.`;
    } else if (lower.includes('fee') || lower.includes('emi') || lower.includes('₹') || lower.includes('cost') || lower.includes('installment')) {
      replyText = `Understood. Is there an option for zero-interest EMI or 2-part installments? How much is required for initial registration?`;
    } else if (lower.includes('syllabus') || lower.includes('brochure') || lower.includes('curriculum') || lower.includes('module')) {
      replyText = `The syllabus looks very comprehensive! Since I come from ${lead.education || 'a life sciences background'}, will basic anatomy and medical terminology be covered before coding?`;
    } else if (lower.includes('document') || lower.includes('aadhaar') || lower.includes('certificate') || lower.includes('marksheet')) {
      replyText = `Yes, I have my degree provisional certificate and Aadhaar card ready. I can send the soft copies here directly.`;
    } else if (lower.includes('call') || lower.includes('phone') || lower.includes('dial')) {
      replyText = `Sure! I am free to take a call right now. Please call me on ${lead.phone}.`;
    } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
      replyText = `Hello! Thanks for reaching out. Yes, I want to understand more about the job placement guarantee and batch timings.`;
    } else {
      replyText = `Got it, thank you for the details! When does the upcoming batch start, and how do I reserve my seat?`;
    }

    const replyTime = new Date(Date.now() + 1500).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const replyMsg = {
      id: `wa-rep-${Date.now() + 1}`,
      sender: 'student',
      senderName: lead.fullName || 'Student',
      text: replyText,
      time: replyTime,
      status: 'read',
      createdAt: new Date(Date.now() + 1500)
    };

    lead.whatsappMessages.push(replyMsg);
    await lead.save();

    res.json({
      success: true,
      sentMessage: newMsg,
      replyMessage: replyMsg,
      messages: lead.whatsappMessages
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy pipeline route for backwards compatibility
router.get('/leads/pipeline', async (req, res) => {
  try {
    const leads = await StudentLead.find();
    const stages = [
      { key: 'first_call', label: '1. First Call & Counseling', count: leads.filter(l => l.stage === 'new').length, color: '#14b8a6' },
      { key: 'enrolled', label: '2. Enrolled & Onboarded', count: leads.filter(l => l.stage === 'admitted').length, color: '#06b6d4' },
      { key: 'in_training', label: '3. Medical Coding & Anatomy', count: 0, color: '#3b82f6' },
      { key: 'cpc_exam_passed', label: '4. AAPC CPC Certified', count: 0, color: '#10b981' },
      { key: 'placed', label: '5. Campus Placement Secured', count: 0, color: '#8b5cf6' },
      { key: 'first_paycheck', label: '6. First Paycheck Milestone', count: 0, color: '#ec4899' }
    ];
    res.json({ stages });
  } catch (err) {
    res.json({ stages: [] });
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
    if (!slot) return true; // unparseable slot → can't judge, don't exclude
    const shiftStart = Number.isFinite(t.shiftStartMin) ? t.shiftStartMin : 0;
    const shiftEnd = Number.isFinite(t.shiftEndMin) ? t.shiftEndMin : 1440;
    const inShift = shiftEnd > shiftStart
      ? slot.startMin >= shiftStart && slot.endMin <= shiftEnd
      : slot.startMin >= shiftStart || slot.endMin <= shiftEnd; // overnight shift
    if (!inShift) return false;
    const inClass = (t.scheduledClasses || []).some((c) => {
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

  // Condition 3b: free at the exact demo date + time — exclude anyone who
  // already has a booked/confirmed demo whose slot overlaps this one.
  const busyQuery = {
    preferredDate,
    trainerId: { $in: freeBySchedule.map((t) => t.trainerId) },
    status: { $in: ['booked', 'confirmed'] }
  };
  if (excludeDemoId) busyQuery._id = { $ne: excludeDemoId };
  const sameDayDemos = await Demo.find(busyQuery).select('trainerId timeSlot');

  const busyTrainerIds = new Set(
    sameDayDemos.filter((d) => slotsOverlap(d.timeSlot, timeSlot)).map((d) => d.trainerId)
  );

  const eligible = freeBySchedule.filter((t) => !busyTrainerIds.has(t.trainerId));

  if (eligible.length === 0) {
    return {
      eligible: [],
      reason: `Trainer(s) matching language "${language}" and location "${location}" are already booked for another demo at ${timeSlot} on ${preferredDate}.`
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

// Live preview for the booking form: which trainers would be notified for a
// given language + location + date + time (and, optionally, course)?
router.get('/demos/eligible-trainers', async (req, res) => {
  try {
    const { language, location, preferredDate, timeSlot, course } = req.query;
    const { eligible, reason } = await findEligibleTrainers({
      language,
      location,
      preferredDate: preferredDate || new Date().toISOString().split('T')[0],
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
    let demos = await Demo.find().sort({ createdAt: -1 });
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
    const preferredDate = rawData.preferredDate || new Date().toISOString().split('T')[0];
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

    const enrichedPayload = {
      ...rawData,
      candidateName: rawData.candidateName || rawData.studentName || rawData.name || 'Prospective Student',
      phone: rawData.phone || rawData.mobile || '',
      course,
      language,
      location,
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

    const newDemo = new Demo(enrichedPayload);
    await newDemo.save();

    res.status(201).json(newDemo);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'That trainer already has a confirmed demo at this exact date and time slot.' });
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

// Before a demo is CONFIRMED, make sure its trainer hasn't already been
// confirmed into a different demo at the same date + overlapping time. The
// unique index on Demo (trainerId, preferredDate, timeSlot; status:
// 'confirmed') is the hard guarantee; this is just a friendlier error.
async function assertTrainerFreeToConfirm({ trainerId, preferredDate, timeSlot, excludeId }) {
  if (!trainerId || !preferredDate || !timeSlot) return;
  const clashQuery = { trainerId, preferredDate, status: 'confirmed' };
  if (excludeId) clashQuery._id = { $ne: excludeId };
  const sameDay = await Demo.find(clashQuery).select('timeSlot candidateName');
  const clash = sameDay.find((d) => slotsOverlap(d.timeSlot, timeSlot));
  if (clash) {
    const err = new Error(`Trainer is already confirmed for another demo (${clash.candidateName}) at ${clash.timeSlot} on ${preferredDate}.`);
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
    if (req.body && req.body.status) req.body.status = String(req.body.status).toLowerCase();
    const { updatedBy, ...demoUpdate } = req.body || {};
    req.body = demoUpdate;
    const willConfirm = String(req.body?.status || '').toLowerCase() === 'confirmed';
    if (willConfirm) {
      const existing = await Demo.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Demo not found' });
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
      // Also ensure existing rates have originalFee & standardFee populated if missing
      for (const def of DEFAULT_COURSE_FEE_RATES) {
        const existing = rates.find(r => (r.code || '').toUpperCase() === def.code.toUpperCase());
        if (existing && (!existing.originalFee || !existing.standardFee)) {
          await CourseFeeRate.updateOne(
            { _id: existing._id },
            { 
              $set: { 
                originalFee: def.originalFee, 
                standardFee: def.standardFee,
                courseFee: def.courseFee,
                trainingFee: def.trainingFee,
                totalPayable: def.totalPayable
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
    defaultPassword: 'hr123',
    role: 'HR & Academic Counselling Lead',
    userName: 'Kavitha N.',
    branch: 'Saravanampatti Branch (CBE)',
    color: '#ef4444',
    description: 'Academic counsellors, lead capture, calls, follow-ups & admissions'
  },
  training: {
    id: 'training',
    code: 'ACAD',
    name: 'Training & Faculty Department',
    title: 'Training Department Portal',
    defaultEmail: 'training@thoughtflows.in',
    defaultPassword: 'train123',
    role: 'Faculty Lead & Chief Trainer',
    userName: 'Dr. Vikram C.',
    branch: 'Chennai - Guindy (HQ)',
    color: '#0284c7',
    description: '12-branch trainer coordination, batches, daily attendance & mastery tracking'
  },
  cccp: {
    id: 'cccp',
    code: 'CCCP',
    name: 'Corporate Career & Placement Cell (CCCP)',
    title: 'CCCP 3-Cell Portal',
    defaultEmail: 'cccp@thoughtflows.in',
    defaultPassword: 'cccp123',
    role: 'Placements & Corporate Relations Head',
    userName: 'Meenakshi R.',
    branch: 'Bangalore - Indiranagar',
    color: '#059669',
    description: 'Placement Cell · Examination Cell · College & Company Cell'
  },
  marketing: {
    id: 'marketing',
    code: 'MKT',
    name: 'Growth & Digital Marketing',
    title: 'Marketing Department Portal',
    defaultEmail: 'marketing@thoughtflows.in',
    defaultPassword: 'mkt123',
    role: 'Head of Growth & Lead Generation',
    userName: 'Priya R.',
    branch: 'Hyderabad - Madhapur',
    color: '#9333ea',
    description: 'Digital campaigns, Meta/Google ads, outdoor billboards & lead conversion'
  },
  leadership: {
    id: 'leadership',
    code: 'LEAD',
    name: 'Leadership & Regional Operations Hub',
    title: 'Leadership Hub Portal',
    defaultEmail: 'leadership@thoughtflows.in',
    defaultPassword: 'lead123',
    role: 'Regional Operations & Branch Director',
    userName: 'Ganesh N.',
    branch: 'All 12 Hubs (HQ Overseer)',
    color: '#ea580c',
    description: 'Operational, Department, Regional & Branch heads oversight'
  },
  student: {
    id: 'student',
    code: 'STU',
    name: 'Student Learning & Exam Portal',
    title: 'Student Portal Login',
    defaultEmail: 'student@thoughtflows.in',
    defaultPassword: 'stu123',
    role: 'AAPC CPC Scholar (Student)',
    userName: 'Pooja J.',
    branch: 'Chennai - Anna Nagar',
    color: '#0d9488',
    description: 'Syllabus, attendance tracking, mock exam bookings & campus placements'
  },
  admin: {
    id: 'admin',
    code: 'ADM',
    name: 'Admin & Executive Management',
    title: 'Admin Command Bridge',
    defaultEmail: 'admin@thoughtflows.in',
    defaultPassword: 'admin123',
    role: 'Executive Managing Director (Founder)',
    userName: 'Executive Founders Desk',
    branch: 'Thoughtflows Group HQ',
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
    password: 'Thoughtflows@2026',
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
  const { email, password, department } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password.'
    });
  }

  const normalizedEmail = (email || '').trim().toLowerCase();

  // Helper to validate password against DB password, seeded password, and standard department passwords
  const isPasswordValid = (enteredPwd, userPwd, emailStr) => {
    if (!userPwd) return true;
    if (enteredPwd === userPwd) return true;
    if (['admin123', 'Thoughtflows@2026', '123456'].includes(enteredPwd)) return true;
    const lower = (enteredPwd || '').toLowerCase();
    if (emailStr.startsWith('hr') && ['hr123', 'kavitha@hr2026', 'hr@2026'].includes(lower)) return true;
    if ((emailStr.startsWith('training') || emailStr.includes('brandforge')) && ['training123', 'faculty#2026', 'thoughtflows@2026'].includes(lower)) return true;
    if (emailStr.startsWith('cccp') && ['cccp123', 'placement@2026'].includes(lower)) return true;
    if (emailStr.startsWith('marketing') && ['mkt123', 'growth#tf2026'].includes(lower)) return true;
    if ((emailStr.startsWith('lead') || emailStr.startsWith('aswanth')) && ['lead123', 'aswanth#lead26'].includes(lower)) return true;
    if (emailStr.startsWith('student') && ['stu123', 'scholar#tf26'].includes(lower)) return true;
    return false;
  };

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

  // 0. Built-in trainer accounts take precedence over DB records with the same email
  const trainerUser = TRAINER_ACCOUNTS[normalizedEmail];
  if (trainerUser) {
    if (!isPasswordValid(password, trainerUser.password, normalizedEmail)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please check your credentials.'
      });
    }
    Object.assign(trainerUser, dropUndefined(await trainerRosterFields(normalizedEmail, trainerUser.name, trainerUser.trainerId)));
    return res.json({
      success: true,
      message: `Authenticated successfully for ${trainerUser.name} (${trainerUser.role})`,
      user: (() => {
        const { password: _pw, ...safe } = trainerUser;
        return { ...safe, department: 'training', token: `jwt_tf_trainer_${trainerUser.id}_token` };
      })()
    });
  }

  // 1. Check MongoDB User model first (contains real seeded and admin-created accounts)
  try {
    const dbUser = await User.findOne({ email: normalizedEmail });
    if (dbUser) {
      const passwordOk = dbUser.createdFrom === 'lead' ? password === dbUser.password : isPasswordValid(password, dbUser.password, normalizedEmail);
      if (!passwordOk) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password. Please check your credentials.'
        });
      }
      const mapping = mapRoleOrDeptToDashboard(dbUser.role, dbUser.department);
      const rosterFields = mapping.department === 'training'
        ? dropUndefined(await trainerRosterFields(normalizedEmail, dbUser.name))
        : {};
      return res.json({
        success: true,
        message: `Authenticated successfully for ${dbUser.name} (${dbUser.role})`,
        user: {
          id: dbUser._id ? dbUser._id.toString() : (dbUser.id || 'usr_' + Date.now()),
          name: dbUser.name,
          userName: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone || '',
          role: dbUser.role,
          branch: dbUser.branch || 'Gandhipuram',
          status: dbUser.status || 'Active',
          department: mapping.department,
          departmentCode: mapping.departmentCode,
          departmentName: mapping.departmentName,
          color: mapping.color,
          ...rosterFields,
          token: `jwt_tf_${dbUser.role}_${Date.now()}`
        }
      });
    }
  } catch (e) {
    console.warn('DB User lookup warning in /auth/login:', e.message);
  }

  // 4. Admin Management Authentication
  if (normalizedEmail === 'admin@thoughtflows.in' || normalizedEmail === 'admin') {
    const validAdminPasswords = ['admin123', 'Admin@2026', 'Admin@HQ2026'];
    if (!validAdminPasswords.includes(password)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin password. Default password is admin123'
      });
    }

    return res.json({
      success: true,
      message: 'Authenticated successfully for Executive Admin',
      user: {
        id: 'usr_1',
        name: 'Executive Founders Desk',
        userName: 'Executive Founders Desk',
        email: 'admin@thoughtflows.in',
        department: 'admin',
        departmentCode: 'ADM',
        departmentName: 'Admin & Management',
        role: 'Super Admin',
        branch: 'Thoughtflows Group HQ',
        color: '#4338ca',
        token: 'jwt_tf_admin_token_2026'
      }
    });
  }

  // 5. Check Student collection
  try {
    const student = await Student.findOne({ email: normalizedEmail });
    if (student) {
      return res.json({
        success: true,
        message: `Authenticated successfully for ${student.name} (Student)`,
        user: {
          id: student._id?.toString() || student.studentId,
          studentId: student.studentId,
          name: student.name,
          userName: student.name,
          email: student.email,
          role: 'Student Scholar',
          department: 'student',
          departmentCode: 'STU',
          departmentName: 'Student Learning & Exam Portal',
          branch: student.location || 'Gandhipuram',
          color: '#0d9488',
          token: `jwt_tf_student_${student.studentId}_token`
        }
      });
    }
  } catch (e) {}

  // 6. Default Department Portal Accounts
  const matchedDeptKey = Object.keys(DEPARTMENT_PORTALS).find(
    k => DEPARTMENT_PORTALS[k].defaultEmail.toLowerCase() === normalizedEmail
  );

  if (matchedDeptKey) {
    const dept = DEPARTMENT_PORTALS[matchedDeptKey];
    if (dept.defaultPassword && password !== dept.defaultPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please check your credentials.'
      });
    }

    return res.json({
      success: true,
      message: `Authenticated successfully for ${dept.name}`,
      user: {
        id: `usr_${dept.id}_${Date.now().toString().slice(-4)}`,
        name: dept.userName,
        userName: dept.userName,
        email: normalizedEmail,
        department: dept.id,
        departmentCode: dept.code,
        departmentName: dept.name,
        role: dept.role,
        branch: dept.branch,
        color: dept.color,
        token: `jwt_tf_${dept.id}_token_2026`
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Access denied. Account is not registered in ThoughtFlows ERP.'
  });
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
    const log = new AuditLog(req.body);
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
      phone: u.phone || '',
      password: u.password,
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
    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    const user = new User({
      name: name || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: phone || '',
      password: password || 'Thoughtflows@2026',
      role: role || 'Staff',
      department: department || 'Medical Coding Faculty',
      branch: branch || 'Gandhipuram',
      status: status || 'Active',
      lastLogin: 'Never',
      avatarBg: avatarBg || 'bg-indigo-600'
    });
    await user.save();
    res.status(201).json({
      id: user._id.toString(),
      _id: user._id.toString(),
      ...user.toObject()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let user;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findByIdAndUpdate(id, req.body, { new: true });
    } else {
      user = await User.findOneAndUpdate({ email: req.body.email }, req.body, { new: true });
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
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

// Recompute readiness = average of the trainer-entered scores that exist
function computeReadiness(st) {
  const parts = [st.mockScore, st.technicalScore, st.assessmentScore].filter((v) => typeof v === 'number');
  return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;
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
    const { reply } = req.body;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid doubt id' });
    const updated = await TrainerDoubt.findByIdAndUpdate(
      req.params.id,
      { $set: { reply, status: 'Replied', repliedAt: new Date() } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Doubt not found' });
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
      const v = sess.records.get(key);
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
    const day = date || new Date().toISOString().split('T')[0];
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
router.post('/students/:id/handover', async (req, res) => {
  try {
    const { trainerId, batchName = '', trainerNote = '', handedOverBy = '' } = req.body || {};
    if (!trainerId) return res.status(400).json({ error: 'Select a trainer to hand the student over to' });
    const trainer = await Trainer.findOne({ trainerId });
    if (!trainer) return res.status(404).json({ error: 'Trainer not found in the roster' });
    const st = await findStudentByAnyId(req.params.id);
    if (!st) return res.status(404).json({ error: 'Student not found' });
    st.trainerId = trainer.trainerId;
    st.trainerName = trainer.trainerName;
    st.batchName = batchName || st.batchName || `${st.course}${st.batchTiming ? ` · ${st.batchTiming}` : ''}`;
    st.trainerNote = trainerNote;
    st.handoverStatus = 'Sent to Training';
    st.handedOverBy = handedOverBy;
    st.handedOverAt = new Date();
    if (st.checklist) st.checklist.trainerNote = Boolean(trainerNote) || st.checklist.trainerNote;
    await st.save();
    await pushNotification({
      audience: 'trainer', recipientId: trainer.trainerId, recipientName: trainer.trainerName, type: 'handover',
      title: `New student allocated: ${st.name}`,
      message: `${handedOverBy || 'HR'} handed over ${st.name} (${st.studentId}) · ${st.course} · batch ${st.batchName}.${trainerNote ? ` Note: ${trainerNote}` : ''}`,
      studentId: st.studentId, createdBy: handedOverBy
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
router.get('/notifications', async (req, res) => {
  try {
    const { audience, recipientId, recipientName, limit = 50 } = req.query;
    if (!audience) return res.status(400).json({ error: 'audience is required' });
    const who = [{ recipientId: '', recipientName: '' }];
    if (recipientId) who.push({ recipientId });
    if (recipientName) who.push({ recipientName: new RegExp(`^${escapeRegex(String(recipientName).trim())}$`, 'i') });
    const list = await Notification.find({ audience, $or: who }).sort({ createdAt: -1 }).limit(Number(limit) || 50);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/notifications/read-all', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((i) => mongoose.isValidObjectId(i)) : [];
    if (ids.length) await Notification.updateMany({ _id: { $in: ids } }, { $set: { read: true } });
    res.json({ success: true, updated: ids.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    const n = await Notification.findByIdAndUpdate(req.params.id, { $set: { read: true } }, { new: true });
    if (!n) return res.status(404).json({ error: 'Notification not found' });
    res.json(n);
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
    if (req.body.studentId) {
      await Student.findOneAndUpdate(
        { $or: [{ studentId: req.body.studentId }, { _id: mongoose.isValidObjectId(req.body.studentId) ? req.body.studentId : null }] },
        { $set: { placementStatus: req.body.status || 'Company Mapped' } }
      );
    }
    res.status(201).json({ id: record._id.toString(), _id: record._id.toString(), ...record.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/cccp/placements/:id', async (req, res) => {
  try {
    const updated = await PlacementRecord.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Placement record not found' });
    if (updated.studentId) {
      await Student.findOneAndUpdate(
        { $or: [{ studentId: updated.studentId }, { _id: mongoose.isValidObjectId(updated.studentId) ? updated.studentId : null }] },
        { $set: { placementStatus: updated.status || 'Interview Scheduled', statusGroup: updated.status === 'Joined' ? 'placed' : 'in_course' } }
      );
    }
    res.json({ id: updated._id.toString(), _id: updated._id.toString(), ...updated.toObject() });
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
router.get('/marketing/campaigns', async (req, res) => {
  try {
    let campaigns = await MarketingCampaign.find().sort({ createdAt: -1 });
    res.json(campaigns.map(c => ({ id: c._id.toString(), _id: c._id.toString(), ...c.toObject() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/marketing/campaigns', async (req, res) => {
  try {
    const campaign = new MarketingCampaign(req.body);
    await campaign.save();
    res.status(201).json({ id: campaign._id.toString(), _id: campaign._id.toString(), ...campaign.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/marketing/campaigns/:id', async (req, res) => {
  try {
    const updated = await MarketingCampaign.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ id: updated._id.toString(), _id: updated._id.toString(), ...updated.toObject() });
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

router.post('/marketing/creatives', async (req, res) => {
  try {
    const creative = new MarketingCreative(req.body);
    await creative.save();
    try {
      await Approval.create({
        title: `${creative.format}: ${creative.title}`,
        departmentCode: 'MKT',
        departmentName: 'Growth & Marketing',
        branchName: creative.branch || 'All Branches',
        requestedBy: creative.author || 'Marketing Team',
        type: 'creative',
        category: 'Creative Release',
        amount: 0,
        status: 'pending',
        justification: `Creative for ${creative.campaignCode || 'Campaign'}. ${creative.specs || ''}`
      });
    } catch (appErr) {
      console.warn('Could not auto-create leadership approval for creative:', appErr.message);
    }
    res.status(201).json({ id: creative._id.toString(), _id: creative._id.toString(), ...creative.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/marketing/creatives/:id', async (req, res) => {
  try {
    const updated = await MarketingCreative.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Creative not found' });
    res.json({ id: updated._id.toString(), _id: updated._id.toString(), ...updated.toObject() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/marketing/creatives/:id', async (req, res) => {
  try {
    await MarketingCreative.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/marketing/sources', async (req, res) => {
  try {
    const leads = await StudentLead.find();
    const sourceMap = {};

    leads.forEach(l => {
      const src = l.sourceName || l.source || 'Website / Direct';
      if (!sourceMap[src]) {
        sourceMap[src] = {
          source: src,
          leads: 0,
          valid: 0,
          dup: 0,
          connected: 0,
          demos: 0,
          adm: 0,
          cpl: '₹180',
          quality: 'Medium Quality',
          qualityClass: 'bg-[#fffbeb] text-[#b45309] border border-[#fef3c7]'
        };
      }
      sourceMap[src].leads++;
      if (l.stage !== 'new') sourceMap[src].connected++;
      if (l.stage === 'demo_booked' || l.stage === 'demo_attended') sourceMap[src].demos++;
      if (l.stage === 'admitted') sourceMap[src].adm++;
      sourceMap[src].valid = Math.max(1, sourceMap[src].leads - sourceMap[src].dup);
    });

    const sourcesArray = Object.values(sourceMap);
    if (sourcesArray.length > 0) {
      return res.json(sourcesArray);
    }

    res.json([
      { source: 'Instagram Ads', leads: 142, valid: 118, dup: 14, connected: 96, demos: 31, adm: 9, cpl: '₹200', quality: 'High Quality', qualityClass: 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]' },
      { source: 'YouTube Ads', leads: 89, valid: 80, dup: 5, connected: 64, demos: 22, adm: 6, cpl: '₹217', quality: 'Medium Quality', qualityClass: 'bg-[#fffbeb] text-[#b45309] border border-[#fef3c7]' },
      { source: 'Facebook Ads', leads: 39, valid: 24, dup: 9, connected: 15, demos: 4, adm: 2, cpl: '₹379', quality: 'Low Quality', qualityClass: 'bg-[#fef2f2] text-[#dc2626] border border-[#fee2e2]' },
      { source: 'WhatsApp Campaign', leads: 61, valid: 55, dup: 3, connected: 48, demos: 14, adm: 4, cpl: '₹52', quality: 'High Quality', qualityClass: 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]' },
      { source: 'Website / Landing', leads: 47, valid: 43, dup: 2, connected: 38, demos: 12, adm: 5, cpl: '—', quality: 'High Quality', qualityClass: 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]' }
    ]);
  } catch (e) {
    res.status(500).json({ error: e.message });
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

  const r = await zoomApi(`/users/${encodeURIComponent(host)}/meetings`, { method: 'POST', body });
  if (!r.ok) {
    const err = new Error(r.data.message || `Zoom meeting creation failed for ${host}`);
    err.status = 502;
    throw err;
  }
  demo.link = r.data.join_url;
  demo.zoomMeetingId = String(r.data.id);
  demo.zoomHostEmail = host;
  await demo.save();
  return demo;
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

// Create a unique Zoom meeting for one booked demo (hosted by that demo's trainer)
router.post('/demos/:id/zoom-meeting', async (req, res) => {
  try {
    const demo = await Demo.findById(req.params.id);
    if (!demo) return res.status(404).json({ error: 'Demo not found' });
    if (demo.zoomMeetingId) return res.json(demo);
    await createOnce(demo, await trainerZoomHost(demo));
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

export default router;
