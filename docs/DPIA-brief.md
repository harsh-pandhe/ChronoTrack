# ChronoTrack — Privacy / DPIA Brief for Legal Counsel

Hand this to your lawyers. It describes, in plain language, exactly what the
ChronoTrack desktop agent collects and how, so they can produce a **Data
Protection Impact Assessment (DPIA)** and confirm compliance with India's
**Digital Personal Data Protection Act, 2023 (DPDP Act)** before rollout.

> You do not need to understand the engineering. The "What we collect" and
> "Questions for counsel" sections are the important parts.

---

## 1. Who and why
- **Data fiduciary (controller):** ChronoTrack (the employer).
- **Data principals:** employees who install the desktop agent.
- **Purpose:** measure genuine work utilisation and per-project cost/ROI, to
  inform staffing and project decisions. (Business purpose: workforce
  optimisation and project profitability.)

## 2. What we collect (and explicitly do NOT)
**Collected on the employee's work computer:**
- **Input densities** — *counts* of keystrokes and mouse movements in 10-second
  windows (e.g. "120 keys, 45 mouse events"). **Not the keys themselves.**
- **Active window titles** — the name of the foreground window (e.g. "AutoCAD —
  Bridge.dwg", "Chrome"), used to categorise productive vs non-productive time.
- **Self-reported project + hours** — the employee picks which project they worked
  on and for how long, via an in-app prompt.

**Never collected:**
- ❌ Keystroke contents / what was typed (no keylogging)
- ❌ Screenshots or screen recording
- ❌ Specific URLs or browser tab contents
- ❌ Webcam, microphone, files, or clipboard
- Sensitive window titles (banking, personal email, messengers, social) are
  **masked** before storage (e.g. shown as "Sensitive Banking Portal (Masked)").

## 3. How consent works
- Monitoring **does not start** until the employee explicitly ticks consent
  checkboxes and activates the agent. Consent is recorded (version, timestamp, IP).
- The employee can **withdraw consent at any time**; withdrawal immediately
  revokes the device and **stops all collection**. (Withdrawal is designed to be
  as easy as granting it.)

## 4. Storage & security
- Data is encrypted in transit (HTTPS) and the local buffer is encrypted at rest.
- Stored in a multi-tenant cloud database with per-company isolation and
  role-based access (employee sees own; team lead sees their team; admin sees the
  company). Access is authenticated (hashed passwords, signed sessions) and
  audit-logged.

## 5. Human-in-the-loop (important)
- The system **recommends**; it does **not** take automated adverse action.
  Any decision affecting an employee (e.g. staffing changes) is made by a human
  with the right to review the underlying data.

## 6. Questions for counsel (please confirm / advise)
1. **Legal basis:** Under DPDP §7 "legitimate use" covers routine employment, but
   activity/window monitoring is broader. Confirm we correctly rely on **explicit
   consent** (free, specific, informed, unambiguous) and that our consent notice
   wording is sufficient.
2. **Notice:** Approve the employee-facing consent/privacy notice text (purpose,
   data, retention, access, withdrawal).
3. **Retention:** What maximum retention period should we set for raw telemetry
   vs aggregated reports? (We can enforce any period technically.)
4. **Withdrawal & deletion:** Confirm our withdrawal flow and define the
   data-deletion/export process for an employee request.
5. **Automated decisions:** Confirm our human-in-the-loop stance satisfies DPDP
   (and any HR/labour-law) requirements for decisions affecting employees.
6. **DPIA + records:** Produce the DPIA and the record of processing; advise if a
   Data Protection Officer / Consent Manager registration applies to us.
7. **Penalty exposure:** Note DPDP penalties (up to ₹250 Cr for security failures)
   — confirm our safeguards documentation is adequate.

## 7. What engineering will provide on request
- The exact consent notice text and screenshots of the consent screen.
- A data dictionary (every field stored).
- The retention/deletion controls and how to configure them.
- Security architecture summary and audit-log samples.

> Timeline note: DPDP consent/rights provisions come into force **13 May 2027**;
> the Data Protection Board provisions are already in effect. Build + sign-off now,
> be compliant ahead of enforcement.
