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
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') { setMode('reset-password'); setOpen(true); setProblem(''); setMessage('Choose a new password for your account.'); }
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setProblem(''); setMessage('');
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + window.location.pathname });
        if (error) throw error;
        setMessage('If an account exists for that email, a password-reset link has been sent. Check your inbox and spam folder.');
        setMode('signin'); setPassword('');
      } else if (mode === 'reset-password') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage('Password updated successfully. You can now sign in with your new password.');
        setPassword(''); setMode('signin'); setOpen(false);
      } else if (mode === 'signup') {
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

  async function signInWithGoogle() {
    setBusy(true); setProblem(''); setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
      if (error) throw error;
    } catch (error) {
      setProblem(error.message || 'Google sign-in could not be started.');
      setBusy(false);
    }
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
        <h2 id="account-title">{mode === 'reset-password' ? 'Set a new password' : user ? 'Your account' : mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h2>
        <p className="account-subtitle">{mode === 'reset-password' ? 'Enter a new password for your account.' : user ? user.email : mode === 'signup' ? 'Create an account for DocSwift.' : mode === 'forgot' ? 'We will email you a secure password-reset link.' : 'Sign in to your DocSwift account.'}</p>
        {user && mode !== 'reset-password' ? <div className="account-signed-in"><CheckCircle2 size={18}/><span>You are signed in.</span><button type="button" className="account-submit" onClick={() => setOpen(false)}>Done</button></div> :
          <form className="account-form" onSubmit={submit}>
            {(mode === 'signin' || mode === 'signup') && <><button type="button" className="account-google" onClick={signInWithGoogle} disabled={busy}><span className="google-g" aria-hidden="true">G</span>Continue with Google</button><p className="account-or">or continue with email</p></>}
            {mode === 'signup' && <label>Name <span className="account-input-wrap"><UserRound size={16}/><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={80}/></span></label>}
            <label>Email address <span className="account-input-wrap"><Mail size={16}/><input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" disabled={mode === 'reset-password'}/></span></label>
            {mode !== 'forgot' && <label>{mode === 'reset-password' ? 'New password' : 'Password'} <span className="account-input-wrap"><LockKeyhole size={16}/><input type="password" required minLength={6} autoComplete={mode === 'signup' || mode === 'reset-password' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/></span></label>}
            {problem && <p className="account-error" role="alert">{problem}</p>}
            {message && <p className="account-message" role="status">{message}</p>}
            <button type="submit" className="account-submit" disabled={busy}>{busy ? <><LoaderCircle size={16} className="account-spinner"/> Working…</> : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'reset-password' ? 'Update password' : 'Sign in'}</button>
            {mode === 'signin' && <p className="account-switch"><button type="button" onClick={() => { setMode('forgot'); setProblem(''); setMessage(''); setPassword(''); }}>Forgot password?</button></p>}
            {mode !== 'forgot' && mode !== 'reset-password' && <p className="account-switch">{mode === 'signup' ? 'Already have an account?' : 'New to DocSwift?'} <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setProblem(''); setMessage(''); }}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>}
            {(mode === 'forgot' || mode === 'reset-password') && <p className="account-switch"><button type="button" onClick={() => { setMode('signin'); setProblem(''); setMessage(''); setPassword(''); }}>Back to sign in</button></p>}
          </form>}
        <p className="account-privacy">Your documents continue to process in your browser. Never share your password with anyone.</p>
      </section>
    </div>}
  </>;
}
