import type { Metadata } from 'next'
import Link from 'next/link'

const EFFECTIVE_DATE = '2026-05-09'

export const metadata: Metadata = {
  title: 'Terms of Service — MainTek',
  description: 'Terms governing use of the MainTek platform.',
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12 prose prose-neutral dark:prose-invert">
      <div className="not-prose mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <strong>DRAFT — pending legal review.</strong> This is template language
        and must be reviewed by counsel before public launch. Do not rely on it
        as legal advice.
      </div>

      <h1>Terms of Service</h1>
      <p><em>Effective {EFFECTIVE_DATE}</em></p>

      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and
        use of the MainTek platform (the &ldquo;Service&rdquo;). By creating an
        account or using the Service, you agree to these Terms.
      </p>

      <h2>1. Accounts</h2>
      <p>
        You must provide accurate registration information and keep your
        credentials confidential. You are responsible for activity under your
        account. You must be at least 16 years old to use the Service.
      </p>

      <h2>2. Pricing</h2>
      <p>
        MainTek is currently provided free of charge, with every feature
        included and no per-user fees. If we introduce paid plans in the future,
        we will give at least 30 days&rsquo; notice before any fees apply to your
        account.
      </p>

      <h2>3. Free access</h2>
      <p>
        There is no trial period or payment required to use the Service. Your
        workspace and data remain available for as long as your account is
        active.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service to violate any law or third-party right.</li>
        <li>Attempt to access the Service or other accounts without authorization.</li>
        <li>Probe, scan, or test the vulnerability of the Service except under a written security testing agreement.</li>
        <li>Interfere with the Service&rsquo;s operation, including by sending excessive automated requests.</li>
        <li>Upload malicious code or content that infringes intellectual property rights.</li>
      </ul>

      <h2>5. Your data</h2>
      <p>
        You retain ownership of content you upload. You grant us a limited
        license to host, process, and display that content as needed to operate
        the Service. We may delete content that violates these Terms.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        MainTek and its licensors own the Service, including software, design,
        and trademarks. These Terms do not grant you any rights to our
        intellectual property except as expressly stated.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may cancel at any time from billing settings. We may suspend or
        terminate your account for breach of these Terms, non-payment, or
        prolonged inactivity. On termination, access ends and your data may be
        deleted as described in our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY
        KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, MAINTEK&rsquo;S TOTAL LIABILITY
        ARISING FROM OR RELATED TO THE SERVICE WILL NOT EXCEED THE FEES YOU
        PAID IN THE 12 MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM. WE
        ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You agree to defend and indemnify MainTek against claims arising from
        your use of the Service or your content.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of [JURISDICTION TO BE SET BY
        COUNSEL], without regard to its conflict of laws principles.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update these Terms from time to time. Material changes will be
        communicated by email or in-product notice at least 30 days before they
        take effect.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms can be sent to{' '}
        <a href="mailto:legal@maintek.app">legal@maintek.app</a>.
      </p>

      <p>
        See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </main>
  )
}
