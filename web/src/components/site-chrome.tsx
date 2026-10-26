import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bookmarkletHref } from '@/lib/bookmarklet';
import markImage from '@/assets/recordseek-mark.png';
import markWhiteImage from '@/assets/recordseek-mark-white.svg';

export function Brand() {
  return <Link className="brand" to="/" aria-label="RecordSeek home"><span className="brand-mark"><img src={markImage} alt="" width={35} height={35} /></span><span className="brand-name">record<span>seek</span></span></Link>;
}

// React strips javascript: hrefs on render, so the real bookmarklet URL is
// applied after mount — the anchor stays draggable/clickable like on the original site.
// data-bookmarklet marks every bookmarklet link for analytics.
export function BookmarkletLink({ className, children }: { className?: string; children: ReactNode }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => { linkRef.current?.setAttribute('href', bookmarkletHref); }, []);
  // Drag a picture of the button itself, not the browser's default link-text box.
  const onDragStart = (event: DragEvent<HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.dataTransfer.setDragImage(event.currentTarget, event.clientX - rect.left, event.clientY - rect.top);
  };
  return <a ref={linkRef} className={className} data-bookmarklet="" title="Drag me to your bookmarks bar" aria-label="RecordSeek bookmarklet — drag to your bookmarks bar" onDragStart={onDragStart}>{children}</a>;
}

export function BookmarkletButton() {
  return <Button className="bookmarklet-button" asChild><BookmarkletLink><img src={markWhiteImage} alt="" className="bookmarklet-mark" draggable={false} />RecordSeek</BookmarkletLink></Button>;
}

const navItems = [
  { label: 'How it works', to: '/', hash: 'how-it-works' },
  { label: 'Browsers', to: '/', hash: 'extensions' },
  { label: 'Bookmark', to: '/bookmarklet' },
  { label: 'Mobile', to: '/', hash: 'mobile' },
  { label: 'Tutorials', to: '/tutorials' },
  { label: 'Help', to: '/contact' },
] as const;

export function SiteHeader({ onGetClick }: { onGetClick?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cta = onGetClick
    ? <Button className="header-cta" onClick={onGetClick}>Get RecordSeek <ArrowRight /></Button>
    : <Button className="header-cta" asChild><Link to="/" hash="extensions">Get RecordSeek <ArrowRight /></Link></Button>;
  return <header className="site-header"><div className="container-wide header-inner"><Brand /><nav className="desktop-nav" aria-label="Main navigation">{navItems.map(item => <Link key={item.label} to={item.to} {...('hash' in item ? { hash: item.hash } : {})}>{item.label}</Link>)}</nav>{cta}<Button variant="ghost" size="icon" className="menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button></div>{menuOpen && <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map(item => <Link key={item.label} to={item.to} {...('hash' in item ? { hash: item.hash } : {})} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}<Link to="/contact" onClick={() => setMenuOpen(false)}>Help</Link></nav>}</header>;
}

export function SiteFooter() {
  return <footer><div className="container-wide"><div className="footer-top"><Brand /><div className="footer-links"><Link to="/about">About RecordSeek</Link><Link to="/contact">Contact & support</Link><Link to="/faq">FAQ</Link><Link to="/tutorials">Video tutorials</Link><Link to="/developers">For developers</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms & conditions</Link><Link to="/eula">EULA</Link></div></div><div className="footer-bottom"><span>© 2012–{new Date().getFullYear()} RecordSeek. Every story matters.</span><span>Made for the discoverer in all of us.</span></div></div></footer>;
}

export function PageShell({ eyebrow, title, intro, children }: { eyebrow: string; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return <>
    <SiteHeader />
    <main>
      <section className="page-hero"><div className="container-wide"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{intro && <p>{intro}</p>}</div></section>
      {children}
    </main>
    <SiteFooter />
  </>;
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer">{children} <ArrowUpRight className="inline size-3" /></a>;
}
