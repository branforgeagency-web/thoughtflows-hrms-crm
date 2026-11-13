# AWS Amplify Storage Integration Guide

## 1. Overview
Thoughtflows HRMS & CRM integrates **AWS Amplify Gen 2 Storage** (backed by Amazon S3) to handle heavy media and documents:
- **Teaching & Training Materials**: Lecture presentations, guidelines, PDFs, and practice papers.
- **Student Submissions**: Homework assignments, project work, improvement tasks, and video introductions.
- **Student Resumes**: Placement preparation documents and candidate resumes.
- **Audio / Video Recordings**: Class session recordings and demo meetings.

**S3 is the only file store.** Every upload streams from the browser straight
into the bucket; the database holds the metadata row and the S3 key, never the
file bytes. There is no base64-in-MongoDB fallback and no write to the API
server's local disk.

### Upload paths

| Path | S3 prefix | Limit |
|---|---|---|
| Trainer LMS materials | `training-materials/` | 200 MB per file |
| Student submissions, video intros, improvement tasks | `student-submissions/` | 200 MB per file |
| Student resumes | `resumes/` | 200 MB per file |
| Break-request supporting documents | `student-submissions/` | 200 MB per file |
| Lead call recordings, phone sync, manual recording upload | `recordings/` | 200 MB per file |

If the bucket is unreachable the upload fails with an explicit message. It is
never silently rerouted into the database.

### Server behaviour

- `POST /api/training/materials`, `POST /api/student-portal/:id/submissions`,
  `POST /api/recordings` and `POST /api/recordings/phone-sync` all **reject**
  requests carrying inline file bytes (`data`, `documentData`, `audioBase64`)
  with a 400, so a stale client build cannot write bytes into MongoDB.
- Files are never proxied through Node above 12 MB.
  `GET /api/training/materials/:id/file` redirects to the bucket, so downloads
  and video seeking use S3 bandwidth and byte-range requests.
- The LMS viewer streams audio/video and large PDFs from a freshly signed S3
  URL derived from `storageKey`.

### Legacy records

Files uploaded *before* this change still have their bytes base64-inline in
MongoDB (`TrainingMaterial.data`, `StudentSubmission.data`,
`StudentRequest.documentData`) or on the API server's local disk
(`CallRecording.storageProvider === 'local'`). Nothing writes these any more,
but the read paths are kept so older records still open. The `'inline'` and
`'local'` enum values remain for the same reason.

> **Still on local disk:** `downloadAndStoreRecording()` pulls Edesy's
> ~1-hour-signed recording links to `uploads/recordings/` on the API server.
> This runs server-side from a webhook, so it cannot use the browser Amplify
> SDK — moving it to S3 needs `@aws-sdk/client-s3` plus AWS credentials in the
> server environment. Until then these recordings do not survive a Render
> redeploy.

---

## 2. Directory Structure

```text
thoughtflows-hrms-crm/
├── amplify/
│   ├── auth/
│   │   └── resource.ts          # Amplify Gen 2 Authentication configuration
│   ├── storage/
│   │   └── resource.ts          # Amplify Gen 2 S3 Storage definition & access policies
│   ├── backend.ts               # Backend definition linking auth & storage
│   └── tsconfig.json            # TypeScript configuration for Amplify
├── client/
│   └── src/
│       └── services/
│           └── amplifyStorage.js # Client upload, download URL, list & delete utility
└── server/
    └── src/
        ├── models/
        │   ├── TrainingMaterial.js  # Supports storageKey, storageUrl, storageProvider
        │   └── StudentSubmission.js # Supports storageKey, storageUrl, storageProvider
        └── routes/
            └── api.js               # Auto-redirects to S3 URLs or serves inline files
```

---

## 3. Storage Bucket Paths & Access Rules

Defined in `amplify/storage/resource.ts`:

| Path Pattern | Purpose | Access Permissions |
|---|---|---|
| `training-materials/*` | Trainer presentations, notes & class videos (≤ 200 MB) | Authenticated: read/write/delete; Guest: read/write/delete\* |
| `student-submissions/{entity_id}/*` | Student homework, assignments & tests | Student owner + authenticated trainers |
| `resumes/*` | Student resumes for HR & placement | Authenticated: read/write/delete; Guest: read |
| `recordings/*` | Class and demo session recordings | Authenticated: read/write/delete; Guest: read |
| `public/*` | Academy logos, brochures & guidelines | Public read access |

\* The HRMS/CRM app signs staff in with its own JWT, **not** Cognito, so every browser upload reaches S3 as the Identity Pool's *unauthenticated (guest)* identity. Paths that accept uploads from the dashboard must therefore grant `write` to guest, or the Identity Pool rejects them. This is a known trade-off: anyone who learns the Identity Pool ID can write to those prefixes. The hardening path is to mint short-lived presigned `PUT` URLs on the API server after it validates the staff JWT, then narrow these prefixes back to `read` for guest.

---

## 4. Deploying Amplify Gen 2 Storage to AWS

### Option A: Local Cloud Sandbox (Fast Development)
Run this command from the project root to provision a per-developer cloud sandbox on your AWS account:
```bash
npx ampx sandbox
```
Upon completion, Amplify automatically generates `amplify_outputs.json` in your workspace, which is auto-detected by `client/src/services/amplifyStorage.js`.

### Option B: Deploying via Amplify Hosting / CI/CD
In AWS Amplify Console:
1. Connect your GitHub repository (`thoughtflows-hrms-crm`).
2. Amplify Gen 2 will automatically detect the `amplify/` directory and deploy backend resources during the build pipeline.

### Option C: Manual Environment Variables (Vercel / Production Deployment)
> **Note on Vercel**: Vercel does not allow environment variables starting with `AWS_` (they are reserved by AWS Lambda). Always use the `VITE_*` prefix:

```env
VITE_STORAGE_BUCKET=your-s3-bucket-name
VITE_STORAGE_REGION=ap-south-1
VITE_USER_POOL_ID=ap-south-1_xxxxxxxxx
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 5. Client Usage Examples

Import the storage service in any React component:

```javascript
import {
  isAmplifyStorageConfigured,
  uploadTrainingMaterialFile,
  uploadStudentSubmissionFile,
  uploadResumeFile,
  getStorageFileUrl,
  removeStorageFile
} from '../services/amplifyStorage';

// 1. Check if Amplify is configured
if (isAmplifyStorageConfigured()) {
  console.log('Amplify S3 Storage is active');
}

// 2. Upload Training Material (up to 200 MB; multipart is automatic over 5 MB)
const { storageKey, storageUrl } = await uploadTrainingMaterialFile(file, {
  category: 'ICD-10-CM',
  folder: 'CPC Batch 12',
  onProgress: ({ percent }) => console.log(`Upload: ${percent}%`)
});

// 3. Upload Student Submission (Assignment / Resume)
const submission = await uploadStudentSubmissionFile(file, studentId, {
  type: 'assignment'
});

// 4. Retrieve a Presigned URL for viewing or streaming
const url = await getStorageFileUrl(storageKey, { expiresIn: 7200 });

// 5. Delete from S3
await removeStorageFile(storageKey);
```
