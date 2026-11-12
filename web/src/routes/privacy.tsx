import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink, PageShell } from '@/components/site-chrome';

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [
    { title: 'Privacy Policy — RecordSeek' },
    { name: 'description', content: 'What RecordSeek stores (general logs and anonymous analytics) and what we never store. No credentials or personal details are ever kept.' },
    { property: 'og:title', content: 'Privacy Policy — RecordSeek' },
    { property: 'og:description', content: 'RecordSeek stores only general logs and analytics. No credentials or additional details are ever stored.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Privacy,
});

function Privacy() {
  return <PageShell
    eyebrow="Privacy policy"
    title="Your privacy, in plain language."
    intro="Short version: we keep almost nothing, and what we keep can't identify you."
  >
    <section className="container-wide page-section">
      <div className="legal">
        <p><em>Last updated: November 2026.</em> RecordSeek is a free tool for saving citations to your FamilySearch and Ancestry trees. This policy explains exactly what happens to your data — and just as importantly, what doesn't.</p>

        <h2>What we store</h2>
        <p>RecordSeek stores only two kinds of information:</p>
        <ul>
          <li><strong>General logs</strong> — standard server records such as the page requested, the time of the request, and the browser type. These keep the service running and help us spot problems.</li>
          <li><strong>Analytics</strong> — anonymous, aggregated usage statistics (how many citations are saved, which browsers are most used, and similar counts). We use PostHog and Google Analytics for this. They receive page addresses without any query details, the website a source was saved from (its domain only), and which browser extension or app was used. Analytics data is never used to identify you personally.</li>
        </ul>
        <p>That's it. No credentials, no account details, no additional personal information is ever stored by us.</p>

        <h2>What we never store</h2>
        <ul>
          <li><strong>Your FamilySearch or Ancestry sign-in.</strong> When you save a citation, your browser talks directly with FamilySearch or Ancestry. Your credentials are never sent to RecordSeek and never touch our servers.</li>
          <li><strong>Your research or your tree data.</strong> We don't keep copies of the citations, notes, or records you save. They belong to you and to the service you saved them in.</li>
          <li><strong>Passwords or payment information.</strong> We don't have accounts, subscriptions, or a store, so there is nothing to store.</li>
        </ul>

        <h2>Browser extensions</h2>
        <p>The RecordSeek extensions for Chrome, Firefox, Safari, Edge, Opera and other browsers do nothing until you click the RecordSeek button or menu item. They do not read, collect or monitor the pages you browse in the background.</p>
        <ul>
          <li><strong>When you click RecordSeek,</strong> the extension reads the current page's address, title, main heading, any text you have selected and, on supported genealogy sites, the record details on the page. It opens RecordSeek with that information so you can build the citation. Nothing else is read.</li>
          <li><strong>Settings</strong>, such as the "forget my session" option, are saved only in your browser's extension storage.</li>
          <li><strong>The "forget my session" option</strong> uses the cookies permission for one thing: removing the RecordSeek and FamilySearch sign-in cookies before the share window opens. The extension never reads, stores or sends cookie values.</li>
          <li><strong>On recordseek.com,</strong> the extension tells the site which browser and extension version you're using, so the site can show the right instructions.</li>
        </ul>
        <p>The extensions contain no ads and no trackers, and they do not load remote code. We never sell or share extension data, or use it for anything other than building your citation.</p>

        <h2>Third-party services</h2>
        <p>RecordSeek connects to FamilySearch and Ancestry when you choose to save a citation. Those services have their own privacy policies, which apply to the data you save with them:</p>
        <ul>
          <li><ExternalLink href="https://www.familysearch.org/en/legal/privacy">FamilySearch Privacy Policy</ExternalLink></li>
          <li><ExternalLink href="https://www.ancestry.com/corporate/about-ancestry/privacy">Ancestry Privacy Statement</ExternalLink></li>
        </ul>
        <p>We use <ExternalLink href="https://posthog.com/privacy">PostHog</ExternalLink> to measure anonymous usage of recordseek.com and the RecordSeek share window: pages viewed, which browser extension you choose, and steps such as signing in to FamilySearch or saving a source. We send PostHog the website of the page you're citing (for example, findagrave.com) but never its full address, title, citation, notes, names or any record from your tree, and we don't record your screen. When you're signed in to FamilySearch, we also send PostHog a scrambled code made from your FamilySearch user ID (a one-way hash), so we can count how many people use RecordSeek across their devices. It's the same code every time, but it can't be turned back into your ID, and we never send your name, email or FamilySearch ID itself.</p>

        <h2>Cookies</h2>
        <p>RecordSeek sets no analytics cookies: PostHog and Google Analytics each keep a random visitor ID in your browser's local storage. The only cookies involved are the ones FamilySearch or Ancestry set during your own sign-in with them. We set no cookies of our own and do not track you across other websites.</p>

        <h2>Children's privacy</h2>
        <p>RecordSeek is a general-audience tool. We collect no personal information from anyone, so we collect none from children.</p>

        <h2>Changes to this policy</h2>
        <p>If we ever change what we store, we'll update this page and note the date above. Given how little we keep, we expect this policy to stay short.</p>

        <h2>Questions</h2>
        <p>Anything unclear? Email us at <a href="mailto:me@dovy.io">me@dovy.io</a> and we'll answer personally.</p>
      </div>
    </section>
  </PageShell>;
}
