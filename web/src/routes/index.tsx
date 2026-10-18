import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, CheckCheck, Compass, Download, Link2, Plus, Puzzle, Quote, Search, Smartphone, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand, BookmarkletButton, BookmarkletLink, SiteFooter, SiteHeader } from '@/components/site-chrome';
import { FeedbackBox } from '@/components/feedback-box';
import { track } from '@/lib/analytics';
import { formatStat } from '@/lib/format-stat';
import stats from '@/data/stats.json';
import archiveImage from '@/assets/family-archive.jpg';
import markImage from '@/assets/recordseek-mark.png';
import familySearchLogo from '@/assets/familysearch-logo.png';
import mobileAppImage from '@/assets/mobile-app-ios.jpg';
import familySearchTree from '@/assets/familysearch-tree.png';
import ancestryLeaf from '@/assets/ancestry-leaf.png';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'RecordSeek — Every discovery deserves to be kept' },
    { name: 'description', content: 'Turn web discoveries into family history sources with RecordSeek. Explore browser extensions and our upcoming mobile app for iOS and Android.' },
    { property: 'og:title', content: 'RecordSeek — Every discovery deserves to be kept' },
    { property: 'og:description', content: 'Less time citing. More time discovering. Save sources to FamilySearch and Ancestry with RecordSeek.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Index,
});

// Every Chromium-based browser installs from the Chrome Web Store.
const chromeStore = 'https://chrome.google.com/webstore/detail/recordseek/ekdikahbgfofidpjnldofcelffahiefl';
const browsers = [
  { name: 'Chrome', href: chromeStore },
  { name: 'Firefox', href: 'https://addons.mozilla.org/en-US/firefox/addon/recordseek/' },
  { name: 'Edge', href: chromeStore },
  { name: 'Opera', href: 'https://addons.opera.com/en/extensions/details/recordseek/' },
  { name: 'Brave', href: chromeStore },
  { name: 'Vivaldi', href: chromeStore },
  { name: 'Arc', href: chromeStore },
  { name: 'Orion', href: chromeStore },
  { name: 'Whale', href: chromeStore },
  { name: 'Yandex', href: chromeStore },
  { name: 'Chromium', href: chromeStore },
  { name: 'Safari', href: null },
];

function BrowserLogo({ name }: { name: string }) {
  if (name === 'Chrome') return <svg className="browser-logo" viewBox="0 0 36 36" aria-hidden="true"><path className="chrome-red" d="M18 2a16 16 0 0 1 14 8H18l-7 12L4 10A16 16 0 0 1 18 2Z"/><path className="chrome-yellow" d="M32 10a16 16 0 0 1-14 24l7-12-7-12Z"/><path className="chrome-green" d="M18 34A16 16 0 0 1 4 10l7 12h14Z"/><circle className="chrome-blue browser-center" cx="18" cy="18" r="7" strokeWidth="2"/></svg>;
  if (name === 'Firefox') return <svg className="browser-logo firefox-logo" viewBox="0 0 36 36" aria-hidden="true"><path fill="currentColor" d="m27 2 1 8c7 7 5 19-4 23C13 38 1 29 3 17c0-4 3-8 5-10l1 6 6-3-2 7c-2 2-1 9 5 10 7 1 11-7 7-11-2-2-6-2-9 0 3-6 7-8 11-14Z"/><circle className="chrome-yellow" cx="19" cy="20" r="6"/></svg>;
  if (name === 'Edge') return <svg className="browser-logo edge-logo" viewBox="0 0 36 36" aria-hidden="true"><path fill="currentColor" d="M32 25c-4 8-16 11-24 5C-2 22 3 5 15 2c12-3 21 8 18 17-2 6-11 7-17 3 10 0 12-6 8-9-6-5-14 1-12 8 2 7 12 10 20 4Z"/><path className="chrome-green" d="M4 24C-1 13 7 2 17 2 28 1 35 10 34 17 29 9 18 7 12 12 7 16 7 20 4 24Z"/></svg>;
  if (name === 'Opera') return <svg className="browser-logo opera-logo" viewBox="0 0 36 36" aria-hidden="true"><ellipse cx="18" cy="18" rx="13" ry="15" fill="none" stroke="currentColor" strokeWidth="6"/></svg>;
  if (name === 'Brave') return <svg className="browser-logo brave-logo" viewBox="0 0 36 36" aria-hidden="true"><path fill="currentColor" d="M11 3h14l3 3 4-1-1 6 1 4-3 11-9 7-9-7-3-11 1-4-1-6 4 1Z"/><path fill="#fff" d="M18 13c3 0 6 1 7 3l-3 5 2 3-6 5-6-5 2-3-3-5c1-2 4-3 7-3Z"/></svg>;
  if (name === 'Vivaldi') return <svg className="browser-logo vivaldi-logo" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16" fill="currentColor"/><path d="M10 12l8 14 8-14" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (name === 'Arc') return <svg className="browser-logo arc-logo" viewBox="0 0 36 36" aria-hidden="true"><path d="M7 30 18 7l11 23" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 22c9-5 17-5 26 0" fill="none" className="arc-swoosh" strokeWidth="5" strokeLinecap="round"/></svg>;
  if (name === 'Orion') return <svg className="browser-logo orion-logo" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="10" fill="currentColor"/><ellipse cx="18" cy="18" rx="16" ry="6" fill="none" stroke="currentColor" strokeWidth="2.5" transform="rotate(-25 18 18)"/></svg>;
  if (name === 'Whale') return <svg className="browser-logo whale-logo" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16" fill="currentColor"/><path fill="#fff" d="M8 21c5 4 12 4 17-1l2-6 3-3-1 5-3 2c-3 7-11 9-18 3Z"/></svg>;
  if (name === 'Yandex') return <svg className="browser-logo yandex-logo" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16" fill="currentColor"/><path d="M12 9l6 10 6-10M18 19v9" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (name === 'Chromium') return <svg className="browser-logo chromium-logo" viewBox="0 0 36 36" aria-hidden="true"><path className="chromium-dark" d="M18 2a16 16 0 0 1 14 8H18l-7 12L4 10A16 16 0 0 1 18 2Z"/><path className="chromium-mid" d="M32 10a16 16 0 0 1-14 24l7-12-7-12Z"/><path className="chromium-light" d="M18 34A16 16 0 0 1 4 10l7 12h14Z"/><circle className="chromium-dark browser-center" cx="18" cy="18" r="7" strokeWidth="2"/></svg>;
  return <Compass className="browser-logo safari-logo" strokeWidth={1.7} />;
}

function Index() {
  const [dialog, setDialog] = useState<'extensions' | 'mobile' | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const openDialog = (type: 'extensions' | 'mobile') => { triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setDialog(type); track(type === 'mobile' ? 'mobile_app_interest' : 'extensions_dialog_opened'); };
  useEffect(() => {
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null);
      if (event.key === 'Tab') {
        const elements = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href]');
        if (!elements?.length) return;
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keyHandler);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keyHandler); triggerRef.current?.focus(); };
  }, [dialog]);
  return <>
    <SiteHeader onGetClick={() => openDialog('extensions')} />
    <main>
      <section className="hero"><img src={archiveImage} className="hero-image" alt="A collection of vintage family photographs, letters, and postcards" width={1600} height={960} fetchPriority="high" /><div className="container-wide hero-inner"><div className="hero-copy"><span className="eyebrow launch-label"><span className="launch-dot" /> A new chapter for RecordSeek</span><h1>Every discovery<br />deserves to<br />be <span>kept.</span></h1><p className="hero-description">Your family’s story is out there. Turn the things you find into sources you can trust — and keep them connected to the people who matter.</p><div className="hero-actions"><Button className="main-action" onClick={() => openDialog('extensions')}><Puzzle /> Get the browser extension <ArrowRight /></Button><Button variant="outline" className="main-action outline-action" asChild><a href="#mobile"><Smartphone /> Meet the mobile app</a></Button></div><div className="hero-reassurance"><span><Check /> Simple to use</span><span><Check /> Works across the web</span><span><Check /> Made for family history</span></div></div><div className="source-toast"><span className="toast-check"><CheckCheck /></span><div><strong>Another piece of your story, saved.</strong><small>One discovery. A lasting connection.</small></div></div></div></section>
      <section className="integration-band" aria-label="Supported family history services"><div className="container-wide integration-inner"><span className="integration-label">YOUR DISCOVERIES. CONNECTED.</span><span className="partner"><img src={familySearchLogo} className="partner-logo" alt="FamilySearch" /></span><span className="partner ancestry"><img src={ancestryLeaf} className="partner-leaf" alt="" />ancestry</span><span className="partner-note"><Link2 className="size-3" /> Right where your family story lives.</span></div></section>
      <section className="stats-band" aria-label="RecordSeek in numbers"><div className="container-wide stats-inner"><div className="stat"><strong>{formatStat(stats.sources)}</strong><span>sources saved</span></div><div className="stat"><strong>{formatStat(stats.historians)}</strong><span>family historians</span></div><div className="stat"><strong>{browsers.filter(browser => browser.href).length}</strong><span>browsers supported</span></div></div></section>
      <section id="how-it-works" className="container-wide section"><div className="section-heading"><span className="eyebrow">Less busywork. More breakthroughs.</span><h2>A little click. A lasting connection.</h2><p>From “look what I found” to a source in your family tree, in a few simple steps.</p></div><div className="steps"><article className="step"><div className="step-visual"><span className="step-number">01</span><div className="mini-browser"><div className="mini-browser-top"><i /><i /><i /><span>your next discovery</span><Search className="size-2" /></div><div className="mini-content"><img src={archiveImage} alt="" width={37} height={34} loading="lazy" /><div className="mini-lines"><i /><i /><i /></div></div></div></div><h3>Find a piece of your story</h3><p>A historical record, a newspaper article, a photograph. If it’s on the web, it can be part of your family’s story.</p></article><article className="step"><div className="step-visual"><span className="step-number">02</span><BookmarkletLink className="capture-pill"><img src={markImage} alt="" className="pill-mark" draggable={false} /> RecordSeek</BookmarkletLink></div><h3>Capture it in a click</h3><p>RecordSeek turns the page into a source citation. Keep the details, skip the copying and pasting.</p></article><article className="step"><div className="step-visual"><span className="step-number">03</span><div className="connection-visual"><span><img src={markImage} alt="" className="connect-mark" /></span><ArrowRight className="size-5" /><span><img src={familySearchTree} alt="" className="connect-fs" /></span></div></div><h3>Connect it to your family</h3><p>Attach your source to a person in FamilySearch or Ancestry. A discovery today, preserved for generations.</p></article></div></section>
      <section id="mobile" className="mobile-section"><div className="container-wide mobile-inner"><div className="mobile-copy"><span className="eyebrow"><Smartphone className="size-4" /> A new way to RecordSeek</span><h2>Big discoveries.<br />Now in your pocket.</h2><p>Family history doesn’t stay at your desk. Soon, neither will RecordSeek. Our new mobile app brings source saving along for the journey.</p><div className="mobile-benefits"><span><Check /> Built for on-the-go discoveries</span><span><Check /> iOS & Android</span></div><Button className="main-action" variant="outline" onClick={() => openDialog('mobile')}>Meet what’s coming <ArrowRight /></Button></div><div className="phone-scene" aria-label="The RecordSeek iOS app"><div className="phone phone-shot"><img src={mobileAppImage} alt="The RecordSeek iOS app: open a record, tap Share, choose RecordSeek, or paste a link" width={460} height={999} loading="lazy" /></div><div className="phone-badge"><Sparkles /><div><strong>A whole new chapter</strong><small>Mobile app · Coming soon</small></div></div></div></div></section>
      <section className="testimonial"><Quote className="quote-icon" /><blockquote>“It has made family history so much easier and I am so grateful that you have developed it.”</blockquote><cite><strong>Luisa</strong> · RecordSeek community member</cite></section>
      <section id="extensions" className="download-section"><div className="container-wide section"><div className="section-heading"><span className="eyebrow">Your browser. Your discoveries.</span><h2>Make room for your next discovery.</h2><p>Get RecordSeek for your browser. A refreshed extension experience is on its way.</p></div><div className="browser-grid">{browsers.map(browser => <article className="browser-item" key={browser.name}><BrowserLogo name={browser.name} />{browser.href ? <Button variant="outline" className="browser-download" asChild><a href={browser.href} target="_blank" rel="noreferrer" data-browser={browser.name} aria-label={`Get RecordSeek for ${browser.name}`}>{browser.name} <ArrowUpRight /></a></Button> : <Button variant="outline" className="browser-download" disabled title="Coming soon">{browser.name} · Soon</Button>}</article>)}</div><div id="bookmarklet" className="bookmarklet-strip"><div className="bookmarklet-copy"><strong>No install? No problem.</strong><span>Drag the button to your browser’s bookmarks bar. Whenever you find something worth keeping, click it on any page to save it as a source — works on shared and public computers too.</span></div><BookmarkletButton /></div><p className="download-note">Prefer step-by-step instructions? <Link to="/bookmarklet">Installation guide</Link></p></div></section>
      <section id="questions" className="container-wide section faq-section"><div><span className="eyebrow">A few things worth knowing</span><h2>Good questions.<br />Simple answers.</h2><p>Need a hand? <Link to="/contact">Get in touch</Link> · <Link to="/faq">All questions</Link></p></div><div className="faq-list">{[
        ['What does RecordSeek do?', 'RecordSeek captures a web page as a source citation and helps you attach it to a person in your FamilySearch or Ancestry family tree. You can spend less time recording sources and more time researching.'],
        ['Does it work with FamilySearch and Ancestry?', 'Yes. RecordSeek supports connecting web sources to both FamilySearch and Ancestry. You’ll use your account with the service you choose to attach a source to your family tree.'],
        ['When can I get the mobile app?', 'The new RecordSeek mobile app is coming soon. The release date and download links will be shared when it is ready.'],
        ['Can I use it without a browser extension?', 'Yes. The RecordSeek bookmarklet is an alternative for supported browsers and shared computers. Drag the button from the download section to your bookmarks bar, or follow the installation instructions linked above to get started.'],
      ].map(([question, answer]) => <details key={question}><summary>{question}<Plus /></summary><p>{answer}</p></details>)}</div></section>
      <FeedbackBox />
    </main>
    <SiteFooter />
    {dialog && <div className="dialog-backdrop" onClick={event => { if (event.target === event.currentTarget) setDialog(null); }}><div ref={dialogRef} className="download-dialog" role="dialog" aria-modal="true" aria-labelledby="download-title"><Button className="dialog-close" variant="ghost" size="icon" aria-label="Close dialog" onClick={() => setDialog(null)}><X /></Button><span className="eyebrow">{dialog === 'extensions' ? 'Your next discovery awaits' : 'A new chapter is coming'}</span><h2 id="download-title">{dialog === 'extensions' ? 'Choose your browser.' : 'RecordSeek, on the go.'}</h2>{dialog === 'extensions' ? <><p>Get the current extension today. New updates are on the way.</p><div className="dialog-browsers">{browsers.filter(browser => browser.href).map(browser => <Button key={browser.name} variant="outline" asChild><a href={browser.href ?? undefined} target="_blank" rel="noreferrer" data-browser={browser.name} aria-label={`Get RecordSeek for ${browser.name}`}><span className="dialog-browser-name"><BrowserLogo name={browser.name} />{browser.name}</span><ArrowUpRight /></a></Button>)}</div><p>Safari · Coming soon</p></> : <><p>We’re preparing a new mobile app for discoveries away from your desk. Download links and a release date will be shared when it’s ready.</p><div className="dialog-platforms"><span className="platform-tag"><Smartphone /> iOS</span><span className="platform-tag"><Smartphone /> Android</span></div><Button asChild className="main-action"><a href="#extensions" onClick={() => setDialog(null)}>Explore browser extensions <ArrowRight /></a></Button></>}</div></div>}
  </>;
}
