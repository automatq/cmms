# Public Request Portal

People who are not users of your organization (tenants in a building, operators on a
line, visitors) can still report problems.

## How it works

1. Share `https://<your-web-host>/request/<organization-slug>`. The slug is set when the
   organization is created and shown under settings.
2. The form asks for a name, contact, location, optional asset, description and photos.
   It needs no account. Submissions hit `POST /api/v1/tenants/:slug/work-requests`.
3. A **work request** is created in `requested` state. Technicians and admins are
   notified in-app and by email, and the `request.submitted` webhook event fires.
4. On `/dashboard/work-requests` a reviewer can accept the request (which creates a work
   order linked to it), ask for more information, or reject it with a reason.

Rate limiting and basic spam protection apply to the public endpoint. QR codes on assets
can also point at the portal with the asset pre-selected.
