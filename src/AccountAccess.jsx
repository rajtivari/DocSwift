import { useEffect, useState } from 'react';
import { UserRound, LogOut, X, Mail, LockKeyhole, LoaderCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from './supabase.js';

export default function AccountAccess() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setUser(data.session?.user ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setProblem(''); setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { display_name: name.trim() } }
        });
        if (error) throw error;
        setMessage(data.session ? 'Account created and signed in.' : 'Account created. Check your email to confirm, then sign in.');
        if (data.session) setOpen(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setMessage('Signed in successfully.'); setPassword(''); setOpen(false);
      }
    } catch (error) { setProblem(error.message || 'Account request failed.'); }
    finally { setBusy(false); }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setProblem(error.message);
    else { setMessage('Signed out.'); setProblem(''); }
  }

  return <>
    <button type="button" className="account-trigger" onClick={() => { setOpen(true); setProblem(''); setMessage(''); }}>
      <UserRound size={15}/><span>{user ? 'Account' : 'Sign in'}</span>
    </button>
    {user && <button type="button" className="account-signout" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={15}/></button>}
    {message && !open && <span className="account-feedback"><CheckCircle2 size={13}/>{message}</span>}
    {problem && !open && <span className="account-feedback account-feedback-error">{problem}</span>}
    {open && <div className="account-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <button type="button" className="account-close" onClick={() => setOpen(false)} aria-label="Close"><X size={18}/></button>
        <div className="account-mark"><UserRound size={23}/></div>
        <p className="account-eyebrow">DOCSWIFT ACCOUNT</p>
        <h2 id="account-title">{user ? 'Your account' : mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
        <p className="account-subtitle">{user ? user.email : mode === 'signup' ? 'Create an account for upcoming account-based features.' : 'Sign in to your DocSwift account.'}</p>
        {user ? <div className="account-signed-in"><CheckCircle2 size={18}/><span>You are signed in.</span><button type="button" className="account-submit" onClick={() => setOpen(false)}>Done</button></div> :
          <form className="account-form" onSubmit={submit}>
            {mode === 'signup' && <label>Name <span className="account-input-wrap"><UserRound size={16}/><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={80}/></span></label>}
            <label>Email address <span className="account-input-wrap"><Mail size={16}/><input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></span></label>
            <label>Password <span className="account-input-wrap"><LockKeyhole size={16}/><input type="password" required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/></span></label>
            {problem && <p className="account-error" role="alert">{problem}</p>}
            {message && <p className="account-message" role="status">{message}</p>}
            <button type="submit" className="account-submit" disabled={busy}>{busy ? <><LoaderCircle size={16} className="account-spinner"/> Working…</> : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
            <p className="account-switch">{mode === 'signup' ? 'Already have an account?' : 'New to DocSwift?'} <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setProblem(''); setMessage(''); }}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>
          </form>}
        <p className="account-privacy">Your documents continue to process in your browser. Never share your password with anyone.</p>
      </section>
    </div>}
  </>;
}
