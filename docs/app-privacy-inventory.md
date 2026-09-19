# App Privacy inventory — Finan.

Generated from the actual implementation. No tracking SDK, advertising SDK or
analytics SDK is present in the codebase; "Used for tracking" is therefore `No`
for every entry.

| Data type | Collected | Linked to user | Tracking | Purpose | Where in code |
| --- | --- | --- | --- | --- | --- |
| Email address | Yes | Yes | No | Account creation, sign-in, password reset | Supabase Auth |
| Name (preferred / full) | Yes | Yes | No | Personalised greeting and profile | `public.profiles` |
| Profile photo | Yes (optional) | Yes | No | Profile avatar | private `avatars` bucket |
| Financial info (accounts, balances, transactions, goals, reservations) | Yes | Yes | No | Core app functionality | currently device storage (`pfos.*`), migrating to Postgres |
| Photos / receipts / files | Yes (optional) | Yes | No | Proof of payment attached to a transaction | private `receipts` bucket + `public.attachments` |
| Agent conversations | Yes | Yes | No | Assistant answers and prepared actions | device storage (`pfos.agent.v1`) |
| Agent memory | Yes (explicit) | Yes | No | Personalised assistant context; user can view, edit and delete | device storage (`pfos.agent.v1`) |
| Notification content | Yes | Yes | No | In-app reminders | device storage (`pfos.notifications.v1`) |
| Identifiers (user id) | Yes | Yes | No | Data ownership and RLS | Supabase Auth |
| Usage data | No | — | No | No product analytics SDK installed | — |
| Diagnostics / crash data | No | — | No | Server errors are logged without user content | server logs |
| Contacts, location, health, browsing history | No | — | No | Never requested | — |

## Processing notes

- Question and pre-computed financial facts are sent to the AI provider when the
  user writes to the Agent; attached images are sent only for that message.
  Nothing is sent when the Agent is not used.
- The AI key lives only on the server (`LOVABLE_API_KEY`); it never reaches the
  client bundle.
- Receipts and avatars live in private buckets, read only through short-lived
  signed URLs owned by the uploading user.
- Account deletion removes the profile row and the auth user; attachments cascade
  with the user row.
