# Autivision — Project Overview

> Bilingual (FR/EN) clinical decision-support web application for early autism (ASD) screening in children, combining facial-image AI analysis with the validated AQ-10 questionnaire.

This document is the single source of truth describing **what the website is**, **what it does**, and **how it is used** end-to-end. It is written for jury reading: technical enough to defend the architecture, plain enough to follow the user journey.

---

## 1. Product summary

Autivision is a hybrid web platform with two faces:

1. **Public marketing site** — explains autism, the screening approach, methodology metrics, and the team. It is the entry point for clinicians, families, and the jury.
2. **Clinical application** — an authenticated workspace where practitioners (paediatrician, psychologist, speech therapist) manage anonymised patients, run a screening (image + questionnaire), and produce a printable PDF report.

The product is bilingual (French / English) with a single locale switcher, supports light/dark mode, and follows a clinical medical-tech aesthetic (blues / whites, no mint green).

### 1.1 Target users

| Role          | Primary need                                                      |
| ------------- | ----------------------------------------------------------------- |
| Paediatrician | Quick triage tool to flag children needing a full diagnostic eval |
| Psychologist  | Standardised AQ-10 capture + audit trail per patient              |
| Speech therapist | Screening result as a referral artefact                        |
| Family / educator (read-only via report) | Understand the result, next steps      |
| Project jury  | Demonstrable, defensible PFE artefact                             |

### 1.2 What it is **not**

- Not a diagnostic tool. Every report carries a clinical disclaimer.
- Not a public self-test. Access is gated behind email OTP authentication.
- Not a data-collection platform. Patient identity is never stored — only an anonymised code, age and sex.

---

## 2. Tech stack

| Layer        | Choice                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| Framework    | Next.js 14 (App Router) + React 18 + TypeScript                        |
| Styling      | Tailwind CSS + shadcn/ui (Radix primitives) + Framer Motion            |
| 3D / visuals | react-three-fiber + drei (brain preview)                               |
| Auth         | Supabase Auth (passwordless email OTP)                                 |
| Database     | Supabase Postgres (3 migrations: init / image-only / typed reports)    |
| Storage      | Supabase Storage — `facial-images` bucket, `reports` bucket            |
| ML inference | External FastAPI service (MobileNetV2) called via `/api/predict`       |
| PDF          | `@react-pdf/renderer` server-side rendering inside `/api/report/[id]`  |
| Validation   | Zod on every server action and route handler                           |
| State        | React Hook Form + server actions + `useTransition`                     |
| i18n         | Custom provider (`@/lib/i18n/provider`) — FR/EN dictionaries           |

---

## 3. Domain model

Aligned with the project's class diagram. All persistent entities live in Supabase Postgres.

```
Patient ──┐
          │ 1..*
          ▼
       Evaluation ──┬── 1 FacialImage (storage_path → facial-images bucket)
          │         ├── 0..1 Questionnaire (AQ-10 answers + score)
          │         └── 0..* Report (face | combined, JSON content + PDF)
          │
          └── History (audit trail, one row per significant action)

ModeleIA (logical only — externalised to FastAPI; metadata stored on Evaluation: ml_model, ml_prediction, ml_confidence)
```

### 3.1 Evaluation status

| Field            | Meaning                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| `statut`         | `EN_COURS` while screening is in progress, `TERMINEE` after image inference saved |
| `niveau_risque`  | `FAIBLE` (< 0.35) · `MODERE` (0.35–0.65) · `ELEVE` (≥ 0.65)                       |
| `score_image`    | P(autistic) derived from the model — always normalised regardless of predicted class |
| `score_questionnaire` | Normalised AQ-10 score = `rawScore / 10`                                    |
| `score_global`   | Final fused score = `0.6 · score_image + 0.4 · score_questionnaire` (or just `score_image` for face-only) |

### 3.2 Roles

The class diagram defines four roles (`MEDECIN`, `PSYCHOLOGUE`, `ORTHOPHONISTE`, `ADMIN`). The role field is stored on the user but **login is currently role-less** — there is one auth flow and no role-based gating in this PFE iteration.

---

## 4. Site map

```
/                       Marketing — hero, features, mission, CTA
/about                  Team & project background
/what-is-asd            Educational page on autism spectrum disorder
/metrics                Methodology metrics (model accuracy, fusion rationale)
/contact                Contact form
/brain-preview          3D brain hero animation (react-three-fiber)

/login                  Email OTP request
/verify                 OTP verification

/app/dashboard          Authenticated landing — recent patients, last evaluations, quick actions
/app/patients           Anonymised patient list
/app/patients/new       Create a new patient (age + sex → auto-generated code)
/app/patients/[id]      Patient detail — history, all evaluations, all reports
/app/screening          Run a new screening (patient picker → image upload → ML analysis → branch)
/app/screening/report/[id]  Embedded screening result + PDF preview
/app/reports            Browse all reports across patients
/app/settings           User profile / locale / theme

/questionnaire/[patientId]?evaluation=…  AQ-10 form (10 Likert questions)
/report/[reportId]      Structured report viewer (face-only or combined) with PDF download

/api/predict            POST — proxies multipart image to the FastAPI ML service
/api/report/[id]        GET  — server-renders the persisted report JSON to PDF
```

### 4.1 Layouts

- `(marketing)/layout.tsx` — public navigation, footer, locale switcher.
- `(auth)/layout.tsx` — minimal centred card.
- `app/layout.tsx` — sidebar + topbar, locale + theme providers, toast outlet.

---

## 5. Core flows

### 5.1 Authentication (passwordless)

1. User enters email at `/login`.
2. Supabase sends an OTP code.
3. User enters code at `/verify`.
4. On success, Next.js middleware (`middleware.ts`) issues the session cookie and redirects to `/app/dashboard`.
5. Every server action / route handler revalidates the session via `supabase.auth.getUser()`.

### 5.2 Screening (the central flow)

```
/app/screening
  └─ Step 1 — Patient
     • mode = "existing"  → pick from cards
     • mode = "new"       → enter age (0–30) + sex (M/F/AUTRE) → auto code on save
  └─ Step 2 — Image
     • Drag-and-drop / file picker (jpeg, png, webp, bmp; ≤ 10 MB)
  └─ Step 3 — Analyse
     • POST /api/predict → MobileNetV2 returns {prediction, confidence, threshold, model}
     • Inline ScoreGauge + RiskBadge appear
  └─ Step 4 — Branch (two action cards)
     ├─ Generate face-only report  → persists evaluation → /report/[reportId]
     └─ Take questionnaire         → persists evaluation → /questionnaire/[patientId]?evaluation=…
```

Both branches reuse a single `persistScreening()` client helper so the evaluation and image are never written twice.

### 5.3 Questionnaire (AQ-10)

1. Page loads the patient + the targeted evaluation (explicit `?evaluation=` or the latest for that patient).
2. Form renders 10 Likert items (`DA` definitely agree · `SA` slightly agree · `SD` slightly disagree · `DD` definitely disagree).
3. Submit is enabled only when all 10 items are answered (`isComplete`).
4. Server action `submitAQ10`:
   - Scores AQ-10 (raw 0–10 → normalised 0–1, threshold ≥ 6).
   - Loads the evaluation's existing `score_image`.
   - Fuses scores: `combinedRisk = 0.6 · faceRisk + 0.4 · normalisedAQ`.
   - Upserts a `questionnaires` row, updates the evaluation (`score_questionnaire`, `score_global`, `niveau_risque`).
   - Writes a `history` audit row (`AQ10_SUBMITTED`).
5. Inline result card shows combined %, risk tier, raw AQ score, threshold met.
6. **Generate combined report** triggers `generateCombinedReport` → builds the structured `ScreeningReport` JSON → upserts a `reports` row → redirects to `/report/[reportId]`.

### 5.4 Report generation

Reports are **pure derivations** — they never re-run inference, never re-score the questionnaire. Two flavours:

| Type     | Trigger                                | Inputs                                   |
| -------- | -------------------------------------- | ---------------------------------------- |
| `face`   | `generateFaceReport(evaluationId)`     | image score + ML metadata                |
| `combined` | `generateCombinedReport(evaluationId)` | image + questionnaire + fused score      |

`services/reportGenerator.ts` produces a typed `ScreeningReport` JSON with `header`, `summary`, `interpretation`, `technicalFindings`, `recommendation`, `disclaimer`. `services/reportsRepository.ts` persists it via upsert keyed on `(evaluation_id, report_type)`.

### 5.5 PDF rendering

`/api/report/[id]` is a Node-runtime route that:
1. Auths the user.
2. Loads the `reports` row (JSON content).
3. Server-renders it through `@react-pdf/renderer` (header, badge, summary, interpretation, technical findings, recommendation, disclaimer).
4. Best-effort uploads the PDF to the `reports` bucket and stamps `storage_path` on the row.
5. Streams the PDF inline (`Content-Type: application/pdf`).

The `/report/[reportId]` page embeds it via `<iframe src="/api/report/...">` and offers a **Download PDF** button.

---

## 6. Use cases

### UC-01 · Clinician runs a face-only screening
**Actor** Paediatrician. **Goal** Get a fast triage signal in under 2 minutes.
**Steps** Login → New patient (age 4, M) → Upload photo → Analyse → Generate face-only report → Download PDF.
**Result** A `face` report is persisted; risk tier + score embedded; PDF available offline.

### UC-02 · Clinician runs a combined screening
**Actor** Psychologist. **Goal** Produce a defensible artefact combining image + AQ-10.
**Steps** UC-01 up to "Take questionnaire" → Answer 10 items → Submit → Review combined gauge → Generate combined report.
**Result** A `combined` report joins the same evaluation; `score_global` reflects the 60/40 fusion.

### UC-03 · Re-screen an existing patient
**Actor** Speech therapist following up after 6 months.
**Steps** /app/patients → pick patient → New screening → upload new image → … → reports listed in chronological order on the patient page.
**Result** Multiple evaluations on the same patient enable longitudinal comparison.

### UC-04 · Browse all reports
**Actor** Any clinician. **Goal** Find a past report quickly.
**Steps** /app/reports → filter (when implemented) → click row → /report/[id].

### UC-05 · Public visitor learns about ASD
**Actor** Parent / educator without an account.
**Steps** Land on `/` → read /what-is-asd → check /metrics → contact the team via /contact.
**Result** Awareness; no PHI exchanged.

### UC-06 · Authentication
**Actor** New clinician.
**Steps** /login (email) → receive OTP → /verify → redirected to /app/dashboard.
**Edge cases** Wrong code → inline error; expired code → request resend.

### UC-07 · Audit trail
**Actor** Admin (later — currently no UI).
**Steps** Every meaningful action (`SCREENING_COMPLETED`, `AQ10_SUBMITTED`, `FACE_REPORT_GENERATED`, `COMBINED_REPORT_GENERATED`) writes a row to `history` with `actor_id`, `evaluation_id`, `details`.
**Result** Reproducible chronology per patient/evaluation.

### UC-08 · PDF export & sharing
**Actor** Clinician sending a referral.
**Steps** Open report → Download PDF → attach to referral letter.
**Result** Self-contained artefact with patient code (no PII), score, interpretation, recommendation, disclaimer.

---

## 7. Functional inventory

### 7.1 Marketing
- Animated hero with brain visualisation.
- Features grid (image AI, AQ-10, bilingual, PDF, anonymisation).
- Mission section.
- CTA band → /login.
- Educational pages: /about, /what-is-asd, /metrics, /contact.
- Locale switcher (FR ⇄ EN), theme switcher (dark/light).

### 7.2 Authentication
- Email OTP login.
- Verify page with auto-focus inputs.
- Middleware-enforced session on every `/app/**`, `/questionnaire/**`, `/report/**` route.
- Sign-out from topbar.

### 7.3 Patient management
- Anonymised code generated on creation (e.g. `PT-XXXXXX`).
- List with mini cards (code, age, sex).
- Detail page: per-patient timeline of evaluations and reports.
- New-patient form with Zod-validated age (0–30) and sex enum.

### 7.4 Screening
- Patient picker (existing) or inline new-patient form.
- Image uploader with preview, MIME / size validation.
- Calls `/api/predict` → MobileNetV2 inference.
- Inline `ScoreGauge` (animated SVG, Framer Motion) + `RiskBadge`.
- Two-card branch: face-only report or AQ-10 path.

### 7.5 Questionnaire (AQ-10)
- 10-item form, 4-option Likert.
- Live progress bar + counter.
- Disabled submit until 100% complete.
- Inline result panel post-submit (combined gauge, raw score, threshold).
- "Generate combined report" CTA.

### 7.6 Reports
- Structured viewer (`ReportRenderer`): summary, interpretation, technical findings, recommendation, disclaimer.
- Server-rendered PDF with risk-tier colour badge.
- Download button + back-to-dashboard CTA.
- All-reports list at /app/reports.

### 7.7 Cross-cutting
- i18n provider with FR/EN dictionaries.
- Theme provider (dark/light) via `next-themes`.
- Toaster (`sonner`) for action feedback.
- Server actions everywhere — no client-side mutations.
- Zod validation on every server boundary.
- Audit trail (`history` table).
- RLS-friendly schema (every row carries `owner_id`).

---

## 8. Scoring logic

### 8.1 Image score

```ts
// lib/ml/predict.ts
imageScore(p) = p.prediction === "autistic" ? p.confidence : 1 - p.confidence
```

Always returns **P(autistic)** in `[0, 1]` regardless of the model's chosen class.

### 8.2 AQ-10 score

```ts
// services/questionnaireScoring.ts
raw = Σ (item scores 1 if (agreed XOR scoresOnAgree=false))
normalised = raw / 10
thresholdMet = raw >= 6
```

### 8.3 Fusion

```ts
// services/fusionScoring.ts
combinedRisk = clamp01(0.6 · faceRisk + 0.4 · normalisedAQ)
tier = combined ≥ 0.65 ? ELEVE : combined ≥ 0.35 ? MODERE : FAIBLE
```

The 60/40 weighting favours the image signal because the model is the project's primary scientific contribution; AQ-10 acts as a clinical corroborator.

---

## 9. Database schema (high level)

| Table          | Purpose                                                 | Key columns |
| -------------- | ------------------------------------------------------- | ----------- |
| `patients`     | Anonymised patient                                      | `id, owner_id, code_anonymise, age, sexe` |
| `evaluations`  | One screening session                                   | `id, patient_id, owner_id, statut, niveau_risque, score_image, score_questionnaire, score_global, ml_prediction, ml_confidence, ml_model, created_at` |
| `facial_images`| Uploaded image metadata (storage path)                  | `evaluation_id, storage_path, taille_octets, mime_type` |
| `questionnaires` | One AQ-10 row per evaluation                          | `evaluation_id, type_questionnaire, reponses (jsonb), score` |
| `reports`      | Typed report content + PDF storage path                 | `id, evaluation_id, report_type ('face'|'combined'), content (jsonb), storage_path, format_document, generated_at` |
| `history`      | Audit trail                                             | `patient_id, evaluation_id, actor_id, action, details (jsonb), created_at` |

Migrations:
- `0001_init.sql` — initial schema, enums, RLS scaffolding.
- `0002_image_only_screening.sql` — added image-only evaluation path (questionnaire becomes optional).
- `0003_reports_typed_content.sql` — `reports.content` switched to typed JSON.

---

## 10. Security & privacy

- **No PII** is ever entered: only an age, a sex, and an auto-generated code.
- **Row-level security** keyed on `owner_id` (the authenticated clinician).
- **Storage paths** are namespaced by user id: `{userId}/{patientOrAnon}/{timestamp}.ext`.
- **Reports bucket** stores PDFs with the same per-user prefix.
- **Inference is stateless** — the FastAPI service receives only the image bytes; no patient metadata.
- **Audit trail** — every clinical action writes to `history`.
- **Disclaimer** — every report carries a non-diagnostic disclaimer.

---

## 11. Out of scope (this iteration)

- Role-based access control (roles stored, not enforced).
- Multi-tenant clinic accounts.
- Video / continuous-capture screening.
- Patient-facing portal (results are clinician-mediated).
- Machine-learning training UI (model is externalised).

---

## 12. Glossary

| Term          | Meaning                                                         |
| ------------- | --------------------------------------------------------------- |
| ASD           | Autism Spectrum Disorder                                        |
| AQ-10         | Autism Spectrum Quotient — 10-item validated screening tool     |
| Face-only report | Report derived from image inference alone                    |
| Combined report  | Report derived from image inference fused with AQ-10         |
| Risk tier     | FAIBLE / MODERE / ELEVE bucket of `combinedRisk`                |
| OTP           | One-Time Password sent by email for passwordless login          |
| RLS           | Row-Level Security (Postgres / Supabase)                        |

---

*Autivision · Clinical Decision Support · PFE Graduation Project*
