import { racket } from '../pixel.js';
import { useBoardCtx } from '../BoardContext.js';
import RawHtml from './RawHtml.jsx';

export default function AuthView({ sb }) {
  const { authMode, setAuthMode, authErr, setAuthErr, authMsg, setAuthMsg, load } = useBoardCtx();
  const reg = authMode === 'register';
  const Mark = reg ? 'div' : 'h1';  // signing in, the wordmark is the page heading

  const onSubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    setAuthErr('');
    setAuthMsg('');
    try {
      const email = String(v.email).trim().toLowerCase();
      if (authMode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password: v.password });
        if (error) throw error;
      } else {
        const { data, error } = await sb.auth.signUp({ email, password: v.password, options: { data: { name: String(v.name).trim() }, emailRedirectTo: location.origin } });
        if (error) throw error;
        if (!data.session) {
          setAuthMsg('Check your email to confirm your account, then sign in.');
          setAuthMode('login');
        }
      }
      await load(true);
    } catch (x) {
      setAuthErr(x.code === 'email_not_confirmed'
        ? 'Confirm your email using the link we sent before signing in.'
        : x.code === 'invalid_credentials'
          ? 'Email or password is incorrect. Check your details and try again.'
          : x.message);
    }
  };

  return (
    <main className="auth"><div className="panel">
      <Mark className="brand big"><RawHtml html={racket({ strings: true })} style={{ display: 'contents' }} /><span>Slugminton</span></Mark>
      {reg && <><h1>Join the club</h1><p className="mute">Create an account to claim a spot on court.</p></>}
      <form key={authMode} data-form="auth" onSubmit={onSubmit}>
        {reg && <label>Your name<input type="text" name="name" autoComplete="name" required maxLength={40} /></label>}
        <label>Email<input type="email" name="email" autoComplete="email" required /></label>
        <label>Password<input type="password" name="password" placeholder="8+ characters" autoComplete={reg ? 'new-password' : 'current-password'} required minLength={8} /></label>
        <button className="cta">{reg ? 'Create account' : 'Sign in'}</button>
      </form>
      <p className="err" role="alert">{authErr}</p>
      <p className="mute" role="status">{authMsg}</p>
      <button type="button" className="link" data-act="mode" onClick={() => { setAuthMode(m => (m === 'login' ? 'register' : 'login')); setAuthErr(''); setAuthMsg(''); }}>
        {reg ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
    </div></main>
  );
}
