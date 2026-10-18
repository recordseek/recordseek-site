import { useState, type FormEvent } from 'react';
import { Lightbulb, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { track } from '@/lib/analytics';

// Same Cloud Run function the share app posts to (recordseek-app/functions/feedback).
const FEEDBACK_URL = 'https://us-central1-recordseek.cloudfunctions.net/feedback';

type Kind = 'idea' | 'bug';
type Status = 'idle' | 'sending' | 'sent' | 'error';

/** "Have an idea? Found a bug?" — a small band above the footer. */
export function FeedbackBox() {
  const [kind, setKind] = useState<Kind>('idea');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (message.trim().length < 3 || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch(FEEDBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: kind, message, email, website, source: 'website', page: window.location.pathname }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      track('feedback_submitted', { type: kind, source: 'website' });
      setStatus('sent');
      setMessage('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="feedback" className="feedback-section">
      <div className="container-wide feedback-inner">
        <div className="feedback-copy">
          <span className="eyebrow">Help shape RecordSeek</span>
          <h2>Have an idea? Found a bug?</h2>
          <p>Tell us. Every note goes straight to the people building RecordSeek.</p>
        </div>
        {status === 'sent' ? (
          <div className="feedback-form" role="status">
            <p className="feedback-thanks">Thanks! We read every one.</p>
            <Button variant="outline" onClick={() => setStatus('idle')}>Send another</Button>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={submit} aria-label="Send an idea or bug report">
            <div className="feedback-kinds" role="radiogroup" aria-label="Type">
              {(['idea', 'bug'] as const).map(k => (
                <Button key={k} type="button" role="radio" aria-checked={kind === k} variant={kind === k ? 'default' : 'outline'} size="sm" onClick={() => setKind(k)}>
                  {k === 'idea' ? <Lightbulb /> : <Bug />} {k === 'idea' ? 'Idea' : 'Bug'}
                </Button>
              ))}
            </div>
            <Textarea aria-label="Your idea or bug" placeholder={kind === 'idea' ? 'What would make RecordSeek better?' : 'What went wrong, and on which site?'} value={message} maxLength={5000} rows={4} required onChange={e => setMessage(e.target.value)} />
            <Input type="email" aria-label="Email (optional)" placeholder="Email (optional, if you'd like a reply)" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="feedback-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={e => setWebsite(e.target.value)} />
            {status === 'error' && <p role="alert" className="feedback-error">Couldn’t send that. Please try again in a moment.</p>}
            <Button type="submit" className="main-action" disabled={status === 'sending' || message.trim().length < 3}>{status === 'sending' ? 'Sending…' : 'Send'}</Button>
          </form>
        )}
      </div>
    </section>
  );
}
