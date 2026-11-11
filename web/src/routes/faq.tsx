import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { PageShell } from '@/components/site-chrome';

export const Route = createFileRoute('/faq')({
  head: () => ({ meta: [
    { title: 'RecordSeek FAQ — Good questions, simple answers' },
    { name: 'description', content: 'Is RecordSeek free? Does it work with FamilySearch, Ancestry and mobile? Answers to common questions.' },
    { property: 'og:title', content: 'RecordSeek FAQ' },
    { property: 'og:description', content: 'Answers to common questions about RecordSeek.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Faq,
});

const faqs: [string, string][] = [
  ['Wait, is this free?!', 'Yes, and it will stay that way. We believe in open-source. We’re here to make things better for the world.'],
  ['What does RecordSeek do?', 'RecordSeek captures a web page as a source citation and helps you attach it to a person in your FamilySearch or Ancestry family tree. You can spend less time recording sources and more time researching.'],
  ['Does it work with FamilySearch and Ancestry?', 'Yes. RecordSeek supports connecting web sources to both FamilySearch and Ancestry. You’ll use your account with the service you choose to attach a source to your family tree.'],
  ['Can I use this on my mobile device?', 'Yes. The free RecordSeek app for iPhone and iPad is on the App Store (search “RecordSeek”). Find a record, tap Share, and choose RecordSeek. An Android app is coming soon, and the bookmarklet also works in mobile browsers.'],
  ['Can I use it without a browser extension?', 'Yes. The RecordSeek bookmarklet works on supported browsers and shared computers. Drag the button from the Bookmarklet page to your bookmarks bar.'],
  ['What happened to TreeConnect? Are you the same?', 'TreeConnect was the nickname given to us by a FamilySearch employee. We were always RecordSeek, so we’ve done away with the nickname to strengthen the brand and reduce confusion.'],
];

function Faq() {
  return <PageShell eyebrow="Frequently asked questions" title="The only bad questions are the ones not asked.">
    <section className="container-wide page-section"><div className="faq-list page-faq">{faqs.map(([q, a]) => <details key={q}><summary>{q}<Plus /></summary><p>{a}</p></details>)}</div><p className="download-note">Have more questions? <Link to="/contact">Get in touch</Link></p></section>
  </PageShell>;
}
