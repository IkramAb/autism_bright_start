# Product Requirements Document
## Autism Center Internal Management System
**Version:** 1.0 — Draft  
**Prepared by:** Studio  
**Date:** June 2026  
**Status:** For Client Review

---

## 1. Overview

### 1.1 Purpose
An internal web-based management system to streamline client and staff onboarding, document lifecycle tracking, deadline management, and case note compliance for a small ABA (Applied Behavior Analysis) therapy center.

### 1.2 Problem Statement
The center currently manages client intake, staff onboarding, document renewals, and case note tracking across disconnected tools (Catalyst, Google Workspace, email, phone). This creates missed deadlines, lost documents, unclear ownership, and administrative overhead that grows unsustainably as the client roster expands.

### 1.3 Goals
- Centralize visibility into all client and staff pipeline stages
- Automate document renewal reminders with appropriate lead times
- Remove manual tracking of onboarding checklist steps
- Give the admin a real-time compliance dashboard for case notes
- Integrate with existing Google Workspace without replacing Catalyst

### 1.4 Non-Goals (Explicitly Out of Scope)
- Replacing Catalyst for clinical case notes or billing
- Building a client/family-facing portal (Phase 3)
- HIPAA Business Associate Agreement (BAA) — client to confirm compliance posture with their attorney before launch
- Payroll processing (Gusto stays as-is)

---

## 2. Users & Roles

| Role | Description | Key Permissions |
|---|---|---|
| **Admin** | Nicole or designated office manager | Full access to all modules, receives all notifications |
| **Staff / Provider** | RBTs and BCBAs | View own onboarding checklist, upload training docs, mark case notes submitted |
| **Super Admin** | System owner (studio) | User management, system config |

---

## 3. Modules

---

### Module 1: Client Pipeline

#### 3.1.1 Overview
A kanban-style board tracking every prospective and active client through the full intake lifecycle.

#### 3.1.2 Pipeline Stages
1. **New Referral** — Source logged (website form, phone, email, referral)
2. **Phone Screen** — Verify MA coverage; if no MA → mark as referred out
3. **New to ABA** → Schedule with Nicole
4. **Not New to ABA** → Trigger document collection sub-flow
5. **Documents Collection** — Checklist tracked per client
6. **CMDE Submitted** — 5-day turnaround timer starts
7. **CMDE Approved / ITP Creation** — Schedule with Nicole for ITP
8. **ITP Submitted** — 14-day turnaround timer starts
9. **ITP Approved** — Trigger parent handbook + service agreement
10. **Active Client** — Ongoing document tracking, renewal reminders live
11. **Referred Out / Closed**

#### 3.1.3 Client Record Fields
- Full name, DOB, primary diagnosis
- Guardian name, phone, email
- Referral source + which admin handled referral
- MA status (verified / unverified / none)
- New to ABA (yes/no)
- Assigned BCBA
- Notes field (internal only)
- Current pipeline stage
- Stage history log with timestamps

#### 3.1.4 Referral Auto-Assignment
When a referral comes in via the website intake form, the system logs the referral and assigns it to the admin who is set as "on duty" or round-robins if multiple admins. The admin who worked a referral is permanently logged on that client record.

---

### Module 2: Client Document Tracker

#### 3.2.1 Document Checklist (Per Client)
Each client has a structured document checklist. Status per document: **Missing → Uploaded → Expiring → Expired**

**Intake Documents:**
- [ ] Medical Documentation
- [ ] Insurance Card
- [ ] Food Allergies & Intolerances Form
- [ ] Student Questionnaire
- [ ] ROI (Release of Information)
- [ ] Medication questionnaire (Not New to ABA)
- [ ] Discharge document from previous provider (Not New to ABA)

**Assessment & Planning:**
- [ ] CMDE (Comprehensive Multidisciplinary Evaluation) — *Renewal: every 3 years*
- [ ] ITP (Individualized Treatment Plan) — *Renewal: every 6 months*
- [ ] IEP (Individualized Education Plan) — *Renewal: every 6 months* (if applicable)
- [ ] Wellness Assessment — *Renewal: every 1 year*
- [ ] Previous Diagnostic Assessment (if no CMDE on file)

**Agreements & Logistics:**
- [ ] Parent Handbook Acknowledgment (e-signature)
- [ ] Service Agreement (e-signature)
- [ ] Transportation Agreement — *Renewal: every 1 year*

#### 3.2.2 Google Drive Integration
When a client is moved to "Active," the system automatically creates a structured folder in Google Drive:
```
/Clients/[LastName, FirstName]/
  ├── Intake Documents/
  ├── Assessments/
  ├── Treatment Plans/
  ├── Agreements/
  └── Correspondence/
```
Uploaded documents are stored in Supabase Storage and mirrored to the appropriate Drive subfolder.

#### 3.2.3 Renewal Reminder Schedule

| Document | Renewal Frequency | Reminder Sent |
|---|---|---|
| CMDE | Every 3 years | 1 month before expiry |
| ITP | Every 6 months | 1 month before expiry |
| IEP | Every 6 months | 1 month before expiry |
| Wellness Assessment | Every 1 year | 1 month before expiry |
| Transportation Agreement | Every 1 year | 2 weeks before expiry |

Reminders sent to: Admin email. Notification also appears in the dashboard.

---

### Module 3: E-Signatures

#### 3.3.1 Tool
**DocSeal** (hosted, ~$30/mo) — no Adobe dependency, supports templated document sending.

#### 3.3.2 Signable Documents
- Parent Handbook Acknowledgment
- Service Agreement
- Transportation Agreement
- ROI Form

#### 3.3.3 Flow
1. Admin triggers signature request from the client record
2. DocSeal sends email link to guardian
3. Guardian signs on any device
4. Signed PDF auto-saved to client's Drive folder
5. Document status updates to "Signed" in the system
6. Admin receives confirmation notification

#### 3.3.4 ITP Note
ITP signatures involve clinical acknowledgment language that may require legal review before automating. Phase 1 will track ITP as an uploaded document. E-signature for ITP scoped to Phase 2 after client attorney review.

---

### Module 4: Staff Onboarding

#### 3.4.1 Overview
Each new employee gets a structured onboarding checklist. Managers receive notifications as steps are completed.

#### 3.4.2 Onboarding Checklist Steps

**Pre-Start:**
- [ ] Background Check — Step 1 (third-party portal)
- [ ] Background Check — Step 2 (third-party portal)
- [ ] Background Check — Step 3 + Background Study Number logged
- [ ] DHS Provider Enrollment Application submitted (must be done within 30 days of approval)
- [ ] Provider Enrollment print + physical submission confirmed

**Enrollment & Access:**
- [ ] DHS Training completed
- [ ] Enrolled in Gusto (payroll)
- [ ] Added to Catalyst
- [ ] Google Workspace account created

**Training (with deadlines):**
- [ ] RBT 40-Hour Training — *deadline set at hire + 60 days*
- [ ] ADS Strategy Training — *deadline set; completion doc uploaded by staff*
- [ ] Vulnerable Adults Training — *deadline set; completion doc uploaded by staff*
- [ ] Mandated Reporter Training — *deadline set; completion doc uploaded by staff*

**Program Onboarding:**
- [ ] Service Authorization received
- [ ] Provider Training completed (1-week OB/D for new providers)

#### 3.4.3 Document Upload Flow (Staff)
Staff do **not** have access to the main admin portal. They receive a secure upload link per training item. When they upload:
1. Document stored in Supabase Storage
2. Checklist item marked as "Submitted — Pending Review"
3. Admin receives email notification: "[Staff Name] submitted [Training Name]"
4. Admin reviews and marks "Approved" or "Rejected with notes"

#### 3.4.4 Manager Notifications
- Immediate: any training doc uploaded
- Immediate: background check step completed
- Weekly digest: all outstanding onboarding items per staff member

---

### Module 5: Case Note Compliance

#### 3.5.1 Context
Case notes are entered in Catalyst. This module does not replace or duplicate Catalyst — it creates a lightweight daily attestation layer for compliance visibility.

#### 3.5.2 Daily Staff Flow
Each staff member with active clients receives a daily prompt (email or in-system if logged in): "Did you complete your case notes for today?"
- They confirm per client they served that day
- Takes <60 seconds

#### 3.5.3 Admin Dashboard
- Grid view: Staff × Date × Status (Confirmed / Missing / Excused)
- Red highlighting on any gap older than 1 business day
- Filter by staff member or date range

#### 3.5.4 Weekly Manager Report
Every Monday morning, admin receives an email summary:
- Total sessions last week
- Case notes confirmed vs. missing
- Names of staff with overdue notes
- Link to full compliance view

#### 3.5.5 Future: Catalyst Integration
If Catalyst exposes an API or data export, this module can be upgraded to pull actual note submission data automatically, eliminating the manual attestation step.

---

### Module 6: Notifications & Reminders

All notifications sent via **Resend** (email). Delivered to admin inbox and optionally to staff.

| Trigger | Recipient | Timing |
|---|---|---|
| New referral submitted via website | Admin | Immediate |
| Document expiring | Admin | Per renewal schedule |
| Document expired | Admin | Day of + weekly repeat |
| CMDE 5-day turnaround approaching | Admin | Day 4 |
| ITP 14-day turnaround approaching | Admin | Day 12 |
| Training doc uploaded by staff | Admin | Immediate |
| Onboarding step overdue | Admin | 3 days past deadline |
| Case note not confirmed | Admin (weekly) | Monday 8am |
| E-signature completed by family | Admin | Immediate |

---

## 4. Technical Architecture

### 4.1 Stack
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Background Jobs:** Supabase pg_cron (daily/weekly reminders)
- **Email:** Resend
- **E-signatures:** DocSeal
- **File Storage:** Supabase Storage + Google Drive API (mirror)
- **Hosting:** Vercel

### 4.2 Integrations
| Service | Integration Type | Purpose |
|---|---|---|
| Google Drive | OAuth2 + Drive API | Auto-folder creation, document mirroring |
| DocSeal | REST API | Send/track signature requests |
| Resend | REST API | Transactional email notifications |
| Catalyst | None (Phase 1) | Manual attestation layer only |

### 4.3 Auth
- Admin and staff log in via Supabase Auth (email + password)
- Staff have limited role permissions (own records only)
- Secure upload links for staff training docs are tokenized, single-use URLs (no login required)

---

## 5. Phased Delivery Plan

### Phase 1 — Core (Est. 8–10 weeks)
- [ ] Auth + role system
- [ ] Client pipeline board (kanban)
- [ ] Client document checklist + upload
- [ ] Renewal reminder engine (pg_cron)
- [ ] Employee onboarding checklist
- [ ] Staff upload links + admin notifications
- [ ] Google Drive auto-folder creation
- [ ] Basic admin dashboard

### Phase 2 — Automation (Est. 4–6 weeks)
- [ ] E-signature flows (DocSeal)
- [ ] Website referral form → pipeline auto-entry
- [ ] Case note compliance dashboard + weekly report
- [ ] Training deadline tracker with manager alerts
- [ ] Turnaround timers (CMDE 5-day, ITP 14-day)

### Phase 3 — Growth (Future)
- [ ] Family portal (document upload, status visibility)
- [ ] SMS reminders (Twilio)
- [ ] Reporting & analytics dashboard
- [ ] Catalyst API integration (if available)

---

## 6. Open Questions for Client

1. **HIPAA posture** — Has the center confirmed with their attorney whether this system will store PHI? If yes, we need a BAA with Supabase and Resend, and must confirm DocSeal's compliance.
2. **ITP e-signature** — What specific witnessing or acknowledgment language is required? This needs legal review before we automate it.
3. **Catalyst API** — Does the center's Catalyst plan include API access? If so, we can automate case note pulling in Phase 2.
4. **DocSeal hosting** — Prefer self-hosted (free, more control) or DocSeal cloud (~$30/mo, easier setup)?
5. **Website referral form** — Is the current website on a platform we can redirect or webhook from (e.g., Squarespace, Wix, Webflow)? Or do we build a hosted intake form page?
6. **Transportation setup** — Who manages transportation logistics? Is this tracked in any system currently?
7. **Multiple BCBAs** — Is Nicole the only BCBA now, or will the system need to support multiple BCBAs with assigned caseloads?
8. **Staff upload link delivery** — Should training upload links be sent automatically on hire, or manually triggered by admin?

---

## 7. Success Metrics

- Zero missed document renewal deadlines after 90 days
- Client onboarding stage visible in <10 seconds for any client
- Staff training completion tracked without admin manually chasing
- Admin spends <15 min/week on case note compliance review (vs. current manual process)

---

*Document prepared for internal use. Not for distribution.*
