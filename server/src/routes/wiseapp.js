import express from 'express';
import Student from '../models/Student.js';
import Trainer from '../models/Trainer.js';
import Batch from '../models/Batch.js';
import TrainerAssessment from '../models/TrainerAssessment.js';
import TestAttempt from '../models/TestAttempt.js';
import ClassAttendance from '../models/ClassAttendance.js';
import ClassFeedback from '../models/ClassFeedback.js';
import TrainingMaterial from '../models/TrainingMaterial.js';
import LiveClassSession from '../models/LiveClassSession.js';
import CourseFeeRate from '../models/CourseFeeRate.js';
import WiseQuestion from '../models/WiseQuestion.js';
import WiseVideo from '../models/WiseVideo.js';
import WiseServicePackage from '../models/WiseServicePackage.js';
import WiseScheduleUpdate from '../models/WiseScheduleUpdate.js';
import WiseCatalogItem from '../models/WiseCatalogItem.js';
import Branch from '../models/Branch.js';

const router = express.Router();

const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------------------
// 1. Overview KPIs & 6-Step Operational Pulse
// ---------------------------------------------------------------------------
router.get('/overview', async (req, res) => {
  try {
    const [
      assessments,
      wisePackages,
      courseRatesCount,
      students,
      wiseQuestionsCount,
      reportedQuestionsCount,
      trainersCount,
      batches,
      videos,
      liveSessions,
      materialsCount,
      feedbacks,
      schedules,
      attendanceDocs
    ] = await Promise.all([
      TrainerAssessment.find().select('name mode questions status batch course date').lean(),
      WiseServicePackage.find().select('kind status').lean(),
      CourseFeeRate.countDocuments(),
      Student.find()
        .select('studentId name course mode branch batchName trainerName onboardStatus introSessionCompleted whatsappGroupAdded classAllocationSynced createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      WiseQuestion.countDocuments(),
      WiseQuestion.countDocuments({
        $or: [
          { reported: true, 'reports.status': 'open' },
          { reported: true, reports: { $size: 0 } }
        ]
      }),
      Trainer.countDocuments({ active: { $ne: false } }),
      Batch.find().select('batchName course trainerName scheduledTime mode status').lean(),
      WiseVideo.find().select('videoType status').lean(),
      LiveClassSession.find().select('isLive batch topic trainerName startedAt').sort({ startedAt: -1 }).limit(10).lean(),
      TrainingMaterial.countDocuments(),
      ClassFeedback.find().sort({ createdAt: -1 }).limit(100).lean(),
      WiseScheduleUpdate.find().sort({ scheduledDate: -1 }).limit(100).lean(),
      ClassAttendance.find().sort({ date: -1 }).limit(60).lean()
    ]);

    const assessmentQuestionsCount = assessments.reduce(
      (sum, a) => sum + (Array.isArray(a.questions) ? a.questions.length : 0),
      0
    );
    const totalQuestions = wiseQuestionsCount + assessmentQuestionsCount;

    const packageCount = wisePackages.filter((p) => p.kind === 'package').length + courseRatesCount;
    const exclusiveServicesCount = wisePackages.filter((p) => p.kind === 'exclusive_service').length;
    const storeItemsCount = wisePackages.filter((p) => p.kind === 'store_item').length;

    const pendingIntroCount = students.filter((s) => !s.introSessionCompleted).length;
    const pendingWhatsappCount = students.filter((s) => s.mode === 'Online' && !s.whatsappGroupAdded).length;
    const unallocatedCount = students.filter((s) => !s.batchName || !s.trainerName).length;
    const syncedAllocationCount = students.filter((s) => s.classAllocationSynced).length;

    const pendingScheduleUpdates = schedules.filter((s) => s.status === 'Pending Update').length;
    const followUpNeededCount = schedules.filter(
      (s) => s.status === 'Pending Update' && s.tlFollowUpStatus !== 'Follow-up Sent' && s.tlFollowUpStatus !== 'Verified'
    ).length;

    const avgFeedbackRating = feedbacks.length
      ? Number((feedbacks.reduce((sum, f) => sum + (Number(f.rating) || 0), 0) / feedbacks.length).toFixed(2))
      : 0;

    let presentCount = 0;
    let totalAttRecords = 0;
    attendanceDocs.forEach((doc) => {
      const rec = doc.records || {};
      const values = rec instanceof Map ? Array.from(rec.values()) : Object.values(rec);
      values.forEach((val) => {
        totalAttRecords += 1;
        if (val === 'Present' || val === 'Late') presentCount += 1;
      });
    });
    const attendanceRate = totalAttRecords > 0 ? Math.round((presentCount / totalAttRecords) * 100) : 0;

    const recordedVideosCount = videos.filter((v) => v.videoType === 'recorded').length;
    const liveVideosCount =
      videos.filter((v) => v.videoType === 'live').length +
      liveSessions.filter((l) => l.isLive).length;

    res.json({
      kpis: {
        totalTests: assessments.length,
        totalPackages: packageCount,
        userRegistrations: students.length,
        totalQuestions,
        reportedQuestions: reportedQuestionsCount,
        exclusiveServices: exclusiveServicesCount
      },
      operational: {
        trainersCount,
        batchesCount: batches.length,
        activeBatchesCount: batches.filter((b) => b.status === 'Active').length,
        recordedVideosCount,
        liveVideosCount,
        materialsCount,
        storeItemsCount,
        feedbackCount: feedbacks.length,
        avgFeedbackRating,
        attendanceRate,
        pendingIntroCount,
        pendingWhatsappCount,
        unallocatedCount,
        syncedAllocationCount,
        pendingScheduleUpdates,
        followUpNeededCount,
        wiseQuestionsCount,
        assessmentQuestionsCount
      },
      recentRegistrations: students.slice(0, 6),
      recentFeedback: feedbacks.slice(0, 5),
      activeLiveSessions: liveSessions.filter((l) => l.isLive)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Student Information Management (Step 1 & Step 3)
// ---------------------------------------------------------------------------
router.get('/students', async (req, res) => {
  try {
    const { q = '', mode = '', branch = '', allocation = '' } = req.query;
    const filter = {};
    if (mode) filter.mode = mode;
    if (branch) filter.branch = branch;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: rx }, { studentId: rx }, { email: rx }, { phone: rx }, { course: rx }, { batchName: rx }];
    }

    let list = await Student.find(filter)
      .select('studentId name phone whatsappNumber email course mode branch batchName trainerId trainerName onboardStatus handoverStatus introSessionCompleted whatsappGroupAdded whatsappGroupName classAllocationSynced attendancePct readinessScore createdAt')
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    if (allocation === 'unallocated') {
      list = list.filter((s) => !s.batchName || !s.trainerName);
    } else if (allocation === 'pending_whatsapp') {
      list = list.filter((s) => s.mode === 'Online' && !s.whatsappGroupAdded);
    } else if (allocation === 'pending_intro') {
      list = list.filter((s) => !s.introSessionCompleted);
    } else if (allocation === 'synced') {
      list = list.filter((s) => s.classAllocationSynced);
    }

    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/students/:id/onboarding', async (req, res) => {
  try {
    const {
      introSessionCompleted,
      whatsappGroupAdded,
      whatsappGroupName,
      classAllocationSynced,
      onboardStatus,
      course,
      mode,
      batchName,
      trainerId,
      trainerName
    } = req.body || {};

    const update = {};
    if (typeof introSessionCompleted === 'boolean') update.introSessionCompleted = introSessionCompleted;
    if (typeof whatsappGroupAdded === 'boolean') update.whatsappGroupAdded = whatsappGroupAdded;
    if (whatsappGroupName !== undefined) update.whatsappGroupName = String(whatsappGroupName);
    if (typeof classAllocationSynced === 'boolean') update.classAllocationSynced = classAllocationSynced;
    if (onboardStatus !== undefined) update.onboardStatus = String(onboardStatus);
    if (course !== undefined && String(course).trim()) update.course = String(course).trim();
    if (mode !== undefined && ['Online', 'Classroom'].includes(mode)) update.mode = mode;
    if (batchName !== undefined) update.batchName = String(batchName);
    if (trainerId !== undefined) update.trainerId = String(trainerId);
    if (trainerName !== undefined) update.trainerName = String(trainerName);

    const query = req.params.id.startsWith('TF-')
      ? { studentId: req.params.id }
      : { _id: req.params.id };

    const updated = await Student.findOneAndUpdate(query, { $set: update }, { new: true })
      .select('studentId name phone whatsappNumber email course mode branch batchName trainerId trainerName onboardStatus handoverStatus introSessionCompleted whatsappGroupAdded whatsappGroupName classAllocationSynced')
      .lean();

    if (!updated) return res.status(404).json({ error: 'Student not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 3. Teachers / Trainers Directory & Schedule Compliance
// ---------------------------------------------------------------------------
router.get('/teachers', async (req, res) => {
  try {
    const [trainers, batches, schedules, feedbacks] = await Promise.all([
      Trainer.find().sort({ trainerName: 1 }).lean(),
      Batch.find({ status: { $in: ['Active', 'Forming'] } }).lean(),
      WiseScheduleUpdate.find().lean(),
      ClassFeedback.find().lean()
    ]);

    const enriched = trainers.map((t) => {
      const tBatches = batches.filter((b) => b.trainerId === t.trainerId || b.trainerName === t.trainerName);
      const tSchedules = schedules.filter((s) => s.trainerId === t.trainerId || s.trainerName === t.trainerName);
      const pendingUpdates = tSchedules.filter((s) => s.status === 'Pending Update').length;
      const tFeedbacks = feedbacks.filter((f) => f.trainerId === t.trainerId || f.trainerName === t.trainerName);
      const avgRating = tFeedbacks.length
        ? Number((tFeedbacks.reduce((sum, f) => sum + (Number(f.rating) || 0), 0) / tFeedbacks.length).toFixed(1))
        : null;

      return {
        ...t,
        batchCount: tBatches.length,
        batches: tBatches.map((b) => b.batchName),
        scheduleCount: tSchedules.length,
        pendingUpdates,
        avgRating,
        feedbackCount: tFeedbacks.length
      };
    });

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 4. Class Schedule Management & TL Follow-ups (Step 2 & Step 6)
// ---------------------------------------------------------------------------
router.get('/schedules', async (req, res) => {
  try {
    const { status = '', trainerId = '', batchName = '' } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (trainerId) filter.trainerId = trainerId;
    if (batchName) filter.batchName = new RegExp(escapeRegex(batchName), 'i');

    const list = await WiseScheduleUpdate.find(filter).sort({ scheduledDate: -1, createdAt: -1 }).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/schedules', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.trainerName || !body.batchName || !body.scheduledDate || !body.timeSlot) {
      return res.status(400).json({ error: 'Trainer, batch, date, and time slot are required' });
    }
    const created = await WiseScheduleUpdate.create({
      trainerId: body.trainerId || '',
      trainerName: body.trainerName,
      batchId: body.batchId || '',
      batchName: body.batchName,
      course: body.course || 'CPC',
      branch: body.branch || '',
      scheduledDate: body.scheduledDate,
      timeSlot: body.timeSlot,
      topic: body.topic || '',
      mode: body.mode || 'Online',
      status: body.status || 'Scheduled',
      changeNote: body.changeNote || '',
      updatedBy: req.user?.name || body.updatedBy || 'Trainer'
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/schedules/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const update = {
      ...(body.trainerId !== undefined ? { trainerId: body.trainerId } : {}),
      ...(body.trainerName !== undefined ? { trainerName: body.trainerName } : {}),
      ...(body.batchName !== undefined ? { batchName: body.batchName } : {}),
      ...(body.course !== undefined ? { course: body.course } : {}),
      ...(body.branch !== undefined ? { branch: body.branch } : {}),
      ...(body.scheduledDate !== undefined ? { scheduledDate: body.scheduledDate } : {}),
      ...(body.timeSlot !== undefined ? { timeSlot: body.timeSlot } : {}),
      ...(body.topic !== undefined ? { topic: body.topic } : {}),
      ...(body.mode !== undefined ? { mode: body.mode } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.changeNote !== undefined ? { changeNote: body.changeNote } : {}),
      updatedBy: req.user?.name || body.updatedBy || 'Trainer'
    };
    const updated = await WiseScheduleUpdate.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Schedule not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/schedules/:id/followup', async (req, res) => {
  try {
    const { tlFollowUpStatus = 'Follow-up Sent', tlFollowUpNote = '', status } = req.body || {};
    const update = {
      tlFollowUpStatus,
      tlFollowUpNote,
      tlFollowedUpBy: req.user?.name || 'Team Leader',
      tlFollowedUpAt: new Date()
    };
    if (status) update.status = status;
    const updated = await WiseScheduleUpdate.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Schedule not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/schedules/:id', async (req, res) => {
  try {
    await WiseScheduleUpdate.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 5. Class Allocation & Coordination (Step 3)
// ---------------------------------------------------------------------------
router.get('/allocations', async (req, res) => {
  try {
    const [batches, students, trainers] = await Promise.all([
      Batch.find().sort({ createdAt: -1 }).lean(),
      Student.find()
        .select('studentId name phone whatsappNumber course mode branch batchId batchName trainerId trainerName introSessionCompleted whatsappGroupAdded whatsappGroupName classAllocationSynced onboardStatus')
        .sort({ createdAt: -1 })
        .limit(300)
        .lean(),
      Trainer.find({ active: { $ne: false } }).select('trainerId trainerName branchName expertCourse shift').lean()
    ]);

    const enrichedBatches = batches.map((b) => {
      const assigned = students.filter((s) => s.batchId === String(b._id) || s.batchName === b.batchName);
      return {
        ...b,
        enrolledCount: assigned.length,
        whatsappSyncedCount: assigned.filter((s) => s.whatsappGroupAdded).length
      };
    });

    const unallocatedStudents = students.filter((s) => !s.batchName || !s.trainerName);

    res.json({
      batches: enrichedBatches,
      unallocatedStudents,
      allStudents: students,
      trainers
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/allocations/assign', async (req, res) => {
  try {
    const { studentId, batchId, batchName, trainerId, trainerName, whatsappGroupAdded, whatsappGroupName, introSessionCompleted } = req.body || {};
    if (!studentId || !batchName) {
      return res.status(400).json({ error: 'studentId and batchName are required' });
    }
    const query = String(studentId).startsWith('TF-') ? { studentId } : { _id: studentId };
    const update = {
      batchId: batchId || '',
      batchName,
      trainerId: trainerId || '',
      trainerName: trainerName || '',
      classAllocationSynced: true,
      handoverStatus: 'Allocated to Trainer'
    };
    if (typeof whatsappGroupAdded === 'boolean') update.whatsappGroupAdded = whatsappGroupAdded;
    if (whatsappGroupName !== undefined) update.whatsappGroupName = whatsappGroupName;
    if (typeof introSessionCompleted === 'boolean') update.introSessionCompleted = introSessionCompleted;

    const updated = await Student.findOneAndUpdate(query, { $set: update }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Student not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Manage Questions & Reported Questions
// ---------------------------------------------------------------------------
router.get('/questions', async (req, res) => {
  try {
    const { q = '', course = '', chapter = '', reported = '', difficulty = '' } = req.query;
    const filter = {};
    if (course) filter.course = course;
    if (chapter) filter.chapter = chapter;
    if (difficulty) filter.difficulty = difficulty;
    if (reported === 'true') filter.reported = true;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ questionText: rx }, { chapter: rx }, { testName: rx }, { explanation: rx }];
    }

    const questions = await WiseQuestion.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    res.json(questions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/questions', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.questionText || !Array.isArray(b.options) || b.options.filter((o) => String(o).trim()).length < 2) {
      return res.status(400).json({ error: 'Question text and at least 2 options are required' });
    }
    const created = await WiseQuestion.create({
      questionText: b.questionText.trim(),
      options: b.options.map((o) => String(o).trim()).filter(Boolean),
      correctIndex: Number(b.correctIndex) || 0,
      marks: Number(b.marks) || 1,
      chapter: b.chapter || 'ICD-10-CM Coding Guidelines & Conventions',
      course: b.course || 'CPC',
      difficulty: b.difficulty || 'Medium',
      explanation: b.explanation || '',
      testId: b.testId || '',
      testName: b.testName || '',
      status: b.status || 'Active',
      createdBy: req.user?.name || 'WiseApp Admin'
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/questions/bulk', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.questions) ? req.body.questions : [];
    if (!items.length) return res.status(400).json({ error: 'Provide questions array' });
    const docs = items
      .filter((b) => b.questionText && Array.isArray(b.options) && b.options.length >= 2)
      .map((b) => ({
        questionText: String(b.questionText).trim(),
        options: b.options.map((o) => String(o).trim()).filter(Boolean),
        correctIndex: Number(b.correctIndex) || 0,
        marks: Number(b.marks) || 1,
        chapter: b.chapter || 'ICD-10-CM Coding Guidelines & Conventions',
        course: b.course || 'CPC',
        difficulty: b.difficulty || 'Medium',
        explanation: b.explanation || '',
        testId: b.testId || '',
        testName: b.testName || '',
        status: 'Active',
        createdBy: req.user?.name || 'WiseApp Bulk Import'
      }));
    if (!docs.length) return res.status(400).json({ error: 'No valid questions found' });
    const inserted = await WiseQuestion.insertMany(docs);
    res.status(201).json({ insertedCount: inserted.length, questions: inserted });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/questions/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const update = {};
    if (b.questionText !== undefined) update.questionText = String(b.questionText).trim();
    if (Array.isArray(b.options)) update.options = b.options.map((o) => String(o).trim()).filter(Boolean);
    if (b.correctIndex !== undefined) update.correctIndex = Number(b.correctIndex) || 0;
    if (b.marks !== undefined) update.marks = Number(b.marks) || 1;
    if (b.chapter !== undefined) update.chapter = b.chapter;
    if (b.course !== undefined) update.course = b.course;
    if (b.difficulty !== undefined) update.difficulty = b.difficulty;
    if (b.explanation !== undefined) update.explanation = b.explanation;
    if (b.testId !== undefined) update.testId = b.testId;
    if (b.testName !== undefined) update.testName = b.testName;
    if (b.status !== undefined) update.status = b.status;

    const updated = await WiseQuestion.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Question not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/questions/:id/report', async (req, res) => {
  try {
    const { reason = 'Incorrect Answer Key', details = '' } = req.body || {};
    const q = await WiseQuestion.findById(req.params.id);
    if (!q) return res.status(404).json({ error: 'Question not found' });

    q.reported = true;
    q.reportCount = (q.reportCount || 0) + 1;
    q.reports.push({
      reportedBy: req.user?.name || req.body?.reportedBy || 'Student',
      reporterId: req.user?.studentId || req.user?.id || '',
      reason,
      details,
      status: 'open',
      at: new Date()
    });
    await q.save();
    res.json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/questions/:id/resolve-report', async (req, res) => {
  try {
    const { action = 'resolved', resolutionNote = '', updatedQuestion } = req.body || {};
    const q = await WiseQuestion.findById(req.params.id);
    if (!q) return res.status(404).json({ error: 'Question not found' });

    if (updatedQuestion) {
      if (updatedQuestion.questionText) q.questionText = updatedQuestion.questionText;
      if (Array.isArray(updatedQuestion.options)) q.options = updatedQuestion.options;
      if (updatedQuestion.correctIndex !== undefined) q.correctIndex = Number(updatedQuestion.correctIndex) || 0;
      if (updatedQuestion.explanation !== undefined) q.explanation = updatedQuestion.explanation;
    }

    q.reports = q.reports.map((r) => {
      if (r.status === 'open') {
        r.status = action === 'dismissed' ? 'dismissed' : 'resolved';
        r.resolvedBy = req.user?.name || 'WiseApp Reviewer';
        r.resolutionNote = resolutionNote;
        r.resolvedAt = new Date();
      }
      return r;
    });
    q.reported = false;
    await q.save();
    res.json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/questions/:id', async (req, res) => {
  try {
    await WiseQuestion.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 7. Manage Tests (unified with TrainerAssessment & TestAttempt)
// ---------------------------------------------------------------------------
router.get('/tests', async (req, res) => {
  try {
    const [tests, attempts] = await Promise.all([
      TrainerAssessment.find().sort({ createdAt: -1 }).lean(),
      TestAttempt.find().select('assessmentId status score totalMarks studentName submittedAt').lean()
    ]);

    const enriched = tests.map((t) => {
      const idStr = String(t._id);
      const tAttempts = attempts.filter((a) => a.assessmentId === idStr);
      const submitted = tAttempts.filter((a) => a.status === 'submitted');
      const avgScore = submitted.length
        ? Math.round(submitted.reduce((s, a) => s + (Number(a.score) || 0), 0) / submitted.length)
        : null;
      return {
        ...t,
        id: idStr,
        testCode: t.testCode || `TST${idStr.slice(-8).toUpperCase()}`,
        openDate: t.openDate || '',
        closeDate: t.closeDate || '',
        publishResult: t.publishResult !== false,
        questionCount: Array.isArray(t.questions) ? t.questions.length : 0,
        attemptCount: tAttempts.length,
        submittedCount: submitted.length,
        avgScore
      };
    });

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/tests', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'Test name is required' });

    let questions = Array.isArray(b.questions) ? b.questions : [];
    // Optionally pull selected questions from WiseQuestion bank
    if (Array.isArray(b.questionIds) && b.questionIds.length > 0) {
      const bankQs = await WiseQuestion.find({ _id: { $in: b.questionIds } }).lean();
      questions = bankQs.map((wq) => ({
        q: wq.questionText,
        options: wq.options,
        answer: wq.correctIndex,
        marks: wq.marks || 1,
        chapter: wq.chapter || '',
        rationale: wq.explanation || ''
      }));
    }

    const computedTotal = questions.length
      ? questions.reduce((s, q) => s + (Number(q.marks) || 1), 0)
      : Number(b.totalMarks) || 50;

    const created = await TrainerAssessment.create({
      name: b.name,
      testCode: b.testCode || `TST${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
      type: b.type || 'Practice Test',
      course: b.course || 'CPC',
      batch: b.batch || '',
      trainerId: b.trainerId || req.user?.trainerId || '',
      trainerName: b.trainerName || req.user?.name || 'WiseApp Faculty',
      topic: b.topic || '',
      date: b.date || new Date().toISOString().slice(0, 10),
      openDate: b.openDate || '',
      closeDate: b.closeDate || '',
      publishResult: b.publishResult !== false,
      timeLimit: b.timeLimit || `${b.durationMin || 45} min`,
      durationMin: Number(b.durationMin) || 45,
      totalMarks: computedTotal,
      passMark: Number(b.passMark) || Math.round(computedTotal * 0.7),
      mode: b.mode || 'online',
      status: b.status || 'Active',
      questions
    });

    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/tests/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const update = {};
    ['name', 'testCode', 'type', 'course', 'batch', 'trainerName', 'topic', 'date', 'openDate', 'closeDate', 'timeLimit', 'mode', 'status'].forEach((k) => {
      if (b[k] !== undefined) update[k] = b[k];
    });
    if (b.publishResult !== undefined) update.publishResult = Boolean(b.publishResult);
    if (b.durationMin !== undefined) update.durationMin = Number(b.durationMin) || 45;
    if (b.totalMarks !== undefined) update.totalMarks = Number(b.totalMarks) || 50;
    if (b.passMark !== undefined) update.passMark = Number(b.passMark) || 35;

    if (Array.isArray(b.questionIds)) {
      const bankQs = await WiseQuestion.find({ _id: { $in: b.questionIds } }).lean();
      update.questions = bankQs.map((wq) => ({
        q: wq.questionText,
        options: wq.options,
        answer: wq.correctIndex,
        marks: wq.marks || 1,
        chapter: wq.chapter || '',
        rationale: wq.explanation || ''
      }));
      update.totalMarks = update.questions.reduce((s, q) => s + (Number(q.marks) || 1), 0);
    }

    const updated = await TrainerAssessment.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Test not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/tests/:id', async (req, res) => {
  try {
    await TrainerAssessment.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 8. Manage Videos & Manage Live Videos
// ---------------------------------------------------------------------------
router.get('/videos', async (req, res) => {
  try {
    const { videoType = '' } = req.query;
    const filter = videoType ? { videoType } : {};
    const [videos, liveSessions] = await Promise.all([
      WiseVideo.find(filter).sort({ createdAt: -1 }).lean(),
      videoType === 'recorded'
        ? Promise.resolve([])
        : LiveClassSession.find().sort({ startedAt: -1 }).limit(30).lean()
    ]);

    res.json({ videos, liveSessions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/videos', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'Video title is required' });
    const created = await WiseVideo.create({
      title: b.title,
      course: b.course || 'CPC',
      chapter: b.chapter || 'General',
      batch: b.batch || '',
      trainerId: b.trainerId || '',
      trainerName: b.trainerName || req.user?.name || 'Faculty',
      videoType: b.videoType === 'live' ? 'live' : 'recorded',
      videoUrl: b.videoUrl || '',
      duration: b.duration || '45 min',
      scheduledAt: b.scheduledAt || '',
      status: b.status || (b.videoType === 'live' ? 'Scheduled' : 'Published'),
      description: b.description || '',
      createdBy: req.user?.name || 'WiseApp Admin'
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/videos/:id', async (req, res) => {
  try {
    const updated = await WiseVideo.findByIdAndUpdate(req.params.id, { $set: req.body || {} }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Video not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/videos/:id', async (req, res) => {
  try {
    await WiseVideo.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 9. Packages, Store & Exclusive Services
// ---------------------------------------------------------------------------
router.get('/packages', async (req, res) => {
  try {
    const { kind = '' } = req.query;
    const filter = kind ? { kind } : {};
    const [items, courseRates] = await Promise.all([
      WiseServicePackage.find(filter).sort({ createdAt: -1 }).lean(),
      !kind || kind === 'package' ? CourseFeeRate.find().sort({ name: 1 }).lean() : Promise.resolve([])
    ]);
    res.json({ items, courseRates });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/packages', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'Name is required' });
    const created = await WiseServicePackage.create({
      name: b.name,
      kind: ['package', 'exclusive_service', 'store_item'].includes(b.kind) ? b.kind : 'package',
      course: b.course || 'CPC',
      category: b.category || 'Medical Coding',
      price: Number(b.price) || 0,
      duration: b.duration || '3 Months',
      features: Array.isArray(b.features)
        ? b.features
        : String(b.features || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
      testsIncluded: Number(b.testsIncluded) || 0,
      videosIncluded: Number(b.videosIncluded) || 0,
      status: b.status || 'Active',
      enrolledCount: Number(b.enrolledCount) || 0,
      description: b.description || '',
      createdBy: req.user?.name || 'WiseApp Admin'
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/packages/:id', async (req, res) => {
  try {
    const b = req.body || {};
    if (typeof b.features === 'string') {
      b.features = b.features.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const updated = await WiseServicePackage.findByIdAndUpdate(req.params.id, { $set: b }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/packages/:id', async (req, res) => {
  try {
    await WiseServicePackage.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 10. Student Feedback & Attendance Summaries (Step 5 & Portal Reflection)
// ---------------------------------------------------------------------------
router.get('/feedback', async (req, res) => {
  try {
    const list = await ClassFeedback.find().sort({ createdAt: -1 }).limit(200).lean();
    const avg = list.length
      ? Number((list.reduce((s, f) => s + (Number(f.rating) || 0), 0) / list.length).toFixed(2))
      : 0;
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: list.filter((f) => Number(f.rating) === star).length
    }));
    res.json({ feedbacks: list, avgRating: avg, total: list.length, distribution });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const b = req.body || {};
    const rating = Number(b.rating);
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating between 1 and 5 is required' });
    }
    const created = await ClassFeedback.create({
      studentId: b.studentId || req.user?.studentId || 'PORTAL',
      studentName: b.studentName || req.user?.name || 'Student',
      trainerId: b.trainerId || '',
      trainerName: b.trainerName || '',
      batch: b.batch || '',
      topic: b.topic || '',
      kind: b.kind === 'trainer' ? 'trainer' : 'class',
      rating,
      comment: b.comment || ''
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/resources', async (req, res) => {
  try {
    const [materials, videos] = await Promise.all([
      TrainingMaterial.find().select('-data').sort({ createdAt: -1 }).limit(100).lean(),
      WiseVideo.find({ videoType: 'recorded' }).sort({ createdAt: -1 }).limit(100).lean()
    ]);
    res.json({ materials, videos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/attendance', async (req, res) => {
  try {
    const docs = await ClassAttendance.find().sort({ date: -1 }).limit(100).lean();
    const rows = docs.map((d) => {
      const rec = d.records || {};
      const entries = rec instanceof Map ? Array.from(rec.entries()) : Object.entries(rec);
      const present = entries.filter(([, v]) => v === 'Present').length;
      const late = entries.filter(([, v]) => v === 'Late').length;
      const absent = entries.filter(([, v]) => v === 'Absent').length;
      return {
        _id: d._id,
        date: d.date,
        batch: d.batch,
        trainerName: d.trainerName,
        topic: d.topic,
        total: entries.length,
        present,
        late,
        absent
      };
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 11. Management Summary Reports (Step 6 & Portal Reflection)
// ---------------------------------------------------------------------------
router.get('/reports', async (req, res) => {
  try {
    const [students, trainers, batches, assessments, attempts, feedbacks, schedules, questions] = await Promise.all([
      Student.find().select('studentId name course mode branch batchName trainerName introSessionCompleted whatsappGroupAdded classAllocationSynced attendancePct readinessScore').lean(),
      Trainer.find({ active: { $ne: false } }).select('trainerId trainerName branchName expertCourse').lean(),
      Batch.find().select('batchName course trainerName mode status').lean(),
      TrainerAssessment.find().select('name course batch mode totalMarks questions').lean(),
      TestAttempt.find({ status: 'submitted' }).select('assessmentId score totalMarks').lean(),
      ClassFeedback.find().select('trainerName batch rating kind createdAt').lean(),
      WiseScheduleUpdate.find().select('trainerName batchName status tlFollowUpStatus scheduledDate').lean(),
      WiseQuestion.find().select('course chapter reported').lean()
    ]);

    const byCourse = {};
    students.forEach((s) => {
      const c = s.course || 'Other';
      if (!byCourse[c]) byCourse[c] = { course: c, total: 0, online: 0, classroom: 0, allocated: 0, whatsappSynced: 0 };
      byCourse[c].total += 1;
      if (s.mode === 'Online') byCourse[c].online += 1;
      else byCourse[c].classroom += 1;
      if (s.batchName && s.trainerName) byCourse[c].allocated += 1;
      if (s.whatsappGroupAdded) byCourse[c].whatsappSynced += 1;
    });

    const avgTestScorePct = attempts.length
      ? Math.round(
          attempts.reduce((sum, a) => sum + ((Number(a.totalMarks) > 0 ? (Number(a.score) / Number(a.totalMarks)) * 100 : 0)), 0) /
            attempts.length
        )
      : 0;

    res.json({
      generatedAt: new Date().toISOString(),
      totals: {
        students: students.length,
        trainers: trainers.length,
        batches: batches.length,
        tests: assessments.length,
        submittedAttempts: attempts.length,
        avgTestScorePct,
        questionsBank: questions.length,
        reportedQuestions: questions.filter((q) => q.reported).length,
        schedulesTracked: schedules.length,
        pendingScheduleUpdates: schedules.filter((s) => s.status === 'Pending Update').length,
        feedbackEntries: feedbacks.length,
        avgFeedbackRating: feedbacks.length
          ? Number((feedbacks.reduce((s, f) => s + (Number(f.rating) || 0), 0) / feedbacks.length).toFixed(2))
          : 0
      },
      courseBreakdown: Object.values(byCourse).sort((a, b) => b.total - a.total)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 12. Catalog Items (Courses, Sub Courses, Subjects, Chapters, Topics, Docs,
//     News, Notifications, Passages, Instruction Parts, Test/Video Series, PDFs)
// ---------------------------------------------------------------------------
router.get('/catalog', async (req, res) => {
  try {
    const { kind = '', q = '' } = req.query;
    const filter = {};
    if (kind) filter.kind = kind;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: rx }, { parentName: rx }, { course: rx }, { subject: rx }, { description: rx }];
    }
    const items = await WiseCatalogItem.find(filter).sort({ order: 1, createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/catalog', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.kind || !b.title) {
      return res.status(400).json({ error: 'kind and title are required' });
    }
    const created = await WiseCatalogItem.create({
      kind: b.kind,
      title: String(b.title).trim(),
      code: b.code || '',
      parentName: b.parentName || '',
      course: b.course || '',
      subject: b.subject || '',
      chapter: b.chapter || '',
      description: b.description || '',
      fileUrl: b.fileUrl || '',
      linkedCount: Number(b.linkedCount) || 0,
      targetAudience: b.targetAudience || 'All',
      status: b.status || 'Active',
      order: Number(b.order) || 0,
      createdBy: req.user?.name || 'WiseApp Admin'
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/catalog/:id', async (req, res) => {
  try {
    const updated = await WiseCatalogItem.findByIdAndUpdate(
      req.params.id,
      { $set: req.body || {} },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Catalog item not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/catalog/:id', async (req, res) => {
  try {
    await WiseCatalogItem.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 13. Institute Centers (Branches + Live Student/Trainer Counts)
// ---------------------------------------------------------------------------
router.get('/centers', async (req, res) => {
  try {
    const [branches, students, trainers] = await Promise.all([
      Branch.find().sort({ name: 1 }).lean(),
      Student.find().select('branch').lean(),
      Trainer.find({ active: { $ne: false } }).select('branchName').lean()
    ]);

    const centers = branches.map((b) => ({
      ...b,
      studentCount: students.filter((s) => (s.branch || '').toLowerCase() === (b.name || '').toLowerCase()).length,
      trainerCount: trainers.filter((t) => (t.branchName || '').toLowerCase() === (b.name || '').toLowerCase()).length
    }));
    res.json(centers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
