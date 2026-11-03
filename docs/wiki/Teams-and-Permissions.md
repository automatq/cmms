# Teams and Permissions

## Organizations

An organization is a tenant. Sign-up creates a user; the onboarding step creates their
first organization and makes them its **owner**. Users can belong to several
organizations and switch the active one; every API call is scoped to the active
organization.

## Roles

| Role | Scope | Can |
|---|---|---|
| `owner` | organization | everything, including deleting the organization and transferring ownership |
| `admin` | organization | manage members, settings, webhooks, all data |
| `member` | organization | work with data according to the permission set below |
| `superadmin` | platform (MainTek operators) | the HQ console: list tenants, change plans, suspend, impersonate; not granted to anyone by default |

Organization roles are Better Auth organization-plugin roles stored in `members.role`.
The superadmin role is the Better Auth admin plugin role stored in `users.role` and is
granted with `npm run promote-superadmin --workspace=@maintek/api`.

## Permissions

API routes are guarded by permission keys of the form `<module>:read` or
`<module>:write` for the modules `assets`, `work_orders`, `work_requests`, `pm`,
`inventory`, `reports`, `users`, `settings` and `ai`. Organization owners and admins hold
all of them. Members are assigned one of the **role presets** seeded into every new
organization (editable under `/dashboard/settings/members` or via the `roles` endpoint):

| Preset | Permissions |
|---|---|
| `admin` | `*` |
| `manager` | read/write on work orders, assets, PM, inventory; read reports and users |
| `planner` | read/write on work orders and PM; read assets and inventory |
| `technician` | read work orders and write their own; read assets and inventory |
| `inventory_manager` | read/write inventory; read work orders |
| `requestor` | submit work requests only |
| `viewer` | read everything, write nothing |

You can add custom presets with any subset of keys.

## Teams

Teams (`/dashboard/settings/teams`) group members for assignment and notification. A PM
plan or work order can target a team; every team member is notified.

## Invitations

Admins invite by email from the members page. The invitee receives a Resend email with a
link to `/invitations/[id]/accept`; accepting joins them to the organization (and creates
their account if needed). Pending invitations can be revoked.

## Audit

Superadmin actions and impersonation are written to `audit_logs`. Treat the superadmin
role as you would a database root account.
