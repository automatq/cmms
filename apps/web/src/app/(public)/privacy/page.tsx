import type { Metadata } from 'next'
import Link from 'next/link'

const EFFECTIVE_DATE = '2026-05-09'

export const metadata: Metadata = {
  title: 'Privacy Policy — MainTek',
  description: 'How MainTek collects, uses, and protects your data.',
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12 prose prose-neutral dark:prose-invert">
      <div className="not-prose mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <strong>DRAFT — pending legal review.</strong> This is template language
        and must be reviewed by counsel before public launch. Do not rely on it
        as legal advice.
      </div>

      <h1>Privacy Policy</h1>
      <p><em>Effective {EFFECTIVE_DATE}</em></p>

      <p>
        This Privacy Policy explains how MainTek (&ldquo;MainTek&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and shares
        information when you use our maintenance management platform (the
        &ldquo;Service&rdquo;).
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account information.</strong> Name, email, password hash,
          organization, role, and profile details you provide at signup or
          later.
        </li>
        <li>
          <strong>Workspace data.</strong> Assets, work orders, preventive
          maintenance schedules, files, comments, and other content you or your
          teammates create in the Service.
        </li>
        <li>
          <strong>Usage data.</strong> Server logs, IP address, device and
          browser information, timestamps of requests, and feature interactions
          we capture for diagnostics and product improvement.
        </li>
        <li>
          <strong>Payment information.</strong> Billing is handled by our
          payment processor (Polar.sh). MainTek does not store full card
          numbers; we receive subscription status and customer identifiers.
        </li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>To provide, maintain, and improve the Service.</li>
        <li>To authenticate users and protect against fraud and abuse.</li>
        <li>To send transactional emails (verification, password reset, invitations, billing notices).</li>
        <li>To analyze aggregate usage and prioritize improvements.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2>3. Sharing</h2>
      <p>
        We do not sell personal information. We share data with:
      </p>
      <ul>
        <li>Service providers who host or operate parts of our infrastructure (e.g., cloud hosting, email delivery, error tracking, payment processing).</li>
        <li>Other members of your organization, who can see workspace content according to their role.</li>
        <li>Law enforcement or regulators when required by law.</li>
      </ul>

      <h2>4. Data retention</h2>
      <p>
        We retain account and workspace data for as long as your account is
        active. After account deletion, we delete or anonymize personal
        information within 90 days, except where retention is required by law
        or for legitimate business reasons (e.g., tax records, fraud
        prevention).
      </p>

      <h2>5. Security</h2>
      <p>
        We use industry-standard safeguards including TLS in transit,
        encryption at rest for backups, principle-of-least-privilege access
        controls, and routine dependency audits. No system is perfectly
        secure; if you suspect a breach affecting your account, contact us
        immediately.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live (e.g., EEA, UK, California), you may have
        rights to access, correct, delete, or port your personal information,
        and to object to or restrict certain processing. Contact us at the
        address below to exercise any of these rights.
      </p>

      <h2>7. International transfers</h2>
      <p>
        We process and store data in the United States and other jurisdictions
        where our service providers operate. By using the Service, you consent
        to these transfers.
      </p>

      <h2>8. Children</h2>
      <p>
        The Service is not directed to children under 16, and we do not
        knowingly collect personal information from them.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes
        will be communicated by email or in-product notice at least 30 days
        before they take effect.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about this Privacy Policy can be sent to{' '}
        <a href="mailto:privacy@maintek.app">privacy@maintek.app</a>.
      </p>

      <p>
        See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </main>
  )
}
