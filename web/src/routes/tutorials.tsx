import { createFileRoute, Link } from '@tanstack/react-router';
import { PageShell } from '@/components/site-chrome';
import { TutorialGrid } from '@/components/tutorial-grid';
import tutorials from '@/data/tutorials.json';

const count = tutorials.videos.length;
const description = `${count} community video tutorials on saving web sources to FamilySearch and Ancestry with RecordSeek, from family history centers, librarians and genealogists.`;

export const Route = createFileRoute('/tutorials')({
  head: () => ({ meta: [
    { title: 'RecordSeek video tutorials — Learn from the community' },
    { name: 'description', content: description },
    { property: 'og:title', content: 'RecordSeek video tutorials' },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Tutorials,
});

function Tutorials() {
  const checked = new Date(tutorials.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return <PageShell eyebrow="Video tutorials" title="Learn RecordSeek from the people who teach it." intro={`Family history centers, librarians and genealogists have made ${count} videos about RecordSeek. We gather them here and check YouTube for new ones every week.`}>
    <section className="container-wide page-section">
      <TutorialGrid tutorials={tutorials.videos} asOf={tutorials.updatedAt} />
      <p className="download-note">Last checked {checked}. Made a RecordSeek video, or know one we missed? <Link to="/contact">Tell us</Link> and we’ll add it.</p>
    </section>
    <section className="container-wide page-section tutorials-more"><div className="info-card"><span className="eyebrow">Prefer reading?</span><h2>Step-by-step guides</h2><p>Install the <Link to="/bookmarklet">bookmarklet</Link> in seconds, get RecordSeek <Link to="/" hash="extensions">for your browser</Link>, or browse the <Link to="/faq">FAQ</Link>.</p></div></section>
  </PageShell>;
}
