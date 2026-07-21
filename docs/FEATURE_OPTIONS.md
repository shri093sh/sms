# Optional Feature Add-Ons

Pick any of these (by number or name) and tell me — I'll fold them into the
relevant phase, or add them as new phases (11, 12...) after the core 10 are
done. None of these are required for a working app; they're extensions.

## Communication & Notifications
1. **Email notifications** (nodemailer) — fee due reminders, overdue alerts, welcome emails on account creation.
2. **SMS / WhatsApp reminders** — fee due/overdue nudges via a provider API (Twilio, MSG91, WhatsApp Business API).
3. **In-app announcements** — admin can post notices visible to teachers/parents on login.

## Payments
4. **Online fee payment gateway** — Razorpay/Stripe integration so parents/students can pay installments online instead of only recording manual payments.
5. **Auto-generated PDF receipts** — downloadable/emailed receipt on every payment.

## Access & Portals
6. **Parent portal** — separate limited-access login for parents to view their child's fees/attendance only.
7. **Student self-service portal** — students view their own attendance %, fee status, notices.
8. **Google/SSO login** — OAuth login alongside email/password.
9. **Two-factor authentication (2FA)** — extra login security for admin accounts.

## Academics
10. **Timetable / class scheduling** — weekly timetable per class, teacher assignments.
11. **Exams & grades module** — record marks, generate report cards.
12. **Homework/assignment tracker** — teachers post assignments, track submission status.

## Staff & Operations
13. **Staff/teacher management** — staff profiles, subject assignments, leave tracking.
14. **Payroll (basic)** — monthly salary records tied to staff profiles.
15. **Library management** — book catalog, issue/return tracking.
16. **Document storage** — upload/store student documents (ID proof, certificates) per record.

## Reporting & Data
17. **Advanced reports & analytics** — charts for fee collection trends, attendance trends, class-wise breakdowns (using a charting lib like Recharts).
18. **CSV/Excel import & export** — bulk-import students, export any table to Excel.
19. **Audit log** — who changed what and when (useful given the original app's RBAC concerns).

## Platform & UX
20. **Multi-branch / multi-school support** — one deployment serving several schools/branches with data isolation.
21. **Multi-language support (i18n)** — Hindi/Kannada/English UI toggle.
22. **Progressive Web App (PWA)** — installable, works offline for read-only data (a lighter-weight nod to the original's offline-first goal, without the mesh complexity).
23. **Dark/light theme toggle** — the original was dark-only; add a light theme option.
24. **Push notifications (web)** — browser push for overdue fees/attendance alerts.

## Reply format
Just list numbers, e.g. **"2, 4, 6, 17"** — or names. I'll tell you which
phase each lands in (or propose new phase numbers) before building.
