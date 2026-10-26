# AWS Amplify Storage Integration Guide

## 1. Overview
Thoughtflows HRMS & CRM integrates **AWS Amplify Gen 2 Storage** (backed by Amazon S3) to handle heavy media and documents:
- **Teaching & Training Materials**: Lecture presentations, guidelines, PDFs, and practice papers.
- **Student Submissions**: Homework assignments, project work, improvement tasks, and video introductions.
- **Student Resumes**: Placement preparation documents and candidate resumes.
- **Audio / Video Recordings**: Class session recordings and demo meetings.

A **hybrid architecture** is implemented:
- When AWS Amplify is configured, files are uploaded directly to the S3 bucket and presigned URLs or S3 keys are stored in MongoDB.
- If AWS Amplify credentials are not yet configured or an S3 upload fails, the system automatically falls back to database inline storage without crashing.

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
| `training-materials/*` | Trainer presentations & notes | Authenticated: read/write/delete; Guest: read |
| `student-submissions/{entity_id}/*` | Student homework, assignments & tests | Student owner + authenticated trainers |
| `resumes/*` | Student resumes for HR & placement | Authenticated: read/write/delete; Guest: read |
| `recordings/*` | Class and demo session recordings | Authenticated: read/write/delete; Guest: read |
| `public/*` | Academy logos, brochures & guidelines | Public read access |

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

// 2. Upload Training Material
const { storageKey, storageUrl } = await uploadTrainingMaterialFile(file, {
  category: 'ICD-10-CM',
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
