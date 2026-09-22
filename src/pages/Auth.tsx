import { useState } from 'react';
import { ArrowRight, ShieldCheck, ArrowUpRight, Sun, Wind, CloudRain, Check } from 'lucide-react';
import { Logo, Button, ErrorNotice } from '../components/UI';
import * as api from '../lib/api';
import type { User } from '../shared/types';
export default function Auth({ onLogin, notice }: { onLogin: (u: User) => void; notice?: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login'),
    [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy('form');
    const d = new FormData(e.currentTarget);
    try {
      onLogin(
        mode === 'login'
          ? await api.login(String(d.get('email')), String(d.get('password')))
          : await api.register(
              String(d.get('name')),
              String(d.get('email')),
              String(d.get('password')),
            ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in. Please try again.');
    } finally {
      setBusy('');
    }
  }
  async function demo() {
    setError('');
    setBusy('demo');
    try {
      onLogin(await api.enterDemo());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open demo.');
    } finally {
      setBusy('');
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Logo light />
        <div className="auth-story-copy">
          <div className="eyebrow">THE GRAIN DRYING DESK</div>
          <h1>
            Every dry
            <br />
            hour counts.
          </h1>
          <p>
            Your harvest took months.
            <br />
            Make the next few hours matter.
          </p>
        </div>
        <div className="landscape" aria-hidden="true">
          <div className="sun-disc" />
          <div className="field field-one" />
          <div className="field field-two" />
          <div className="field field-three" />
          <div className="landscape-note">
            <span>
              <Sun size={17} /> A window to dry
            </span>
            <span>
              <Wind size={17} /> A plan to act
            </span>
            <span>
              <ShieldCheck size={17} /> A record to trust
            </span>
          </div>
        </div>
        <div className="auth-source">
          <span>Built with real JKUAT Conduit observations</span>
          <span>01°05′ S &nbsp; 37°00′ E</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-top">
          <span>Hack the Weather 2026</span>
          <a href="https://github.com/shi1720/Hack-The-Weather" target="_blank" rel="noreferrer">
            Explore the project <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="auth-form">
          <div className="auth-kicker">
            <span className="live-dot" /> WEATHER INTO WORK
          </div>
          <h2>
            {api.isDemoOnly
              ? 'Meet your next drying day.'
              : mode === 'login'
                ? 'Welcome to the drying desk.'
                : 'A better day starts here.'}
          </h2>
          <p className="auth-description">
            For maize cooperatives deciding what to dry, cover, or send to a dryer.
            <br />
            Turn local weather into work your team can verify.
          </p>
          {notice && (
            <div className="auth-session-notice" role="status">
              {notice}
            </div>
          )}
          {error && <ErrorNotice message={error} />}
          <Button className="demo-button" onClick={demo} busy={busy === 'demo'} disabled={!!busy}>
            Explore demo workspace <ArrowRight size={18} />
          </Button>
          <p className="demo-description">
            No account needed · Real weather, sample batches
            {api.isDemoOnly ? (
              <>
                <br />
                An interactive sandbox. Changes stay on this device.
              </>
            ) : (
              <>
                <br />
                An isolated workspace created just for you.
              </>
            )}
          </p>
          {!api.isDemoOnly && (
            <>
              <div className="auth-divider">
                <span>
                  or {mode === 'login' ? 'sign in to your cooperative' : 'create your workspace'}
                </span>
              </div>
              {mode === 'register' && (
                <p className="register-note">
                  Start with an empty private workspace. Add your yard capacity and first measured
                  batch when you are ready.
                </p>
              )}
              <form onSubmit={submit} className="form-stack">
                {mode === 'register' && (
                  <label>
                    Your name
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={80}
                      placeholder="Your full name"
                    />
                  </label>
                )}
                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="you@cooperative.org"
                    maxLength={254}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={mode === 'register' ? 12 : 1}
                    maxLength={128}
                    placeholder={
                      mode === 'register' ? 'At least 12 characters' : 'Enter your password'
                    }
                  />
                </label>
                <Button secondary type="submit" busy={busy === 'form'} disabled={!!busy}>
                  {mode === 'login' ? 'Sign in' : 'Create workspace'}
                  <ArrowRight size={17} />
                </Button>
              </form>
              <p className="switch-auth">
                {mode === 'login' ? 'New to Kavu?' : 'Already have a workspace?'}{' '}
                <button
                  disabled={!!busy}
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError('');
                  }}
                >
                  {mode === 'login' ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            </>
          )}
          <div className="auth-trust">
            <Check size={16} />
            <span>Transparent decisions. Measured outcomes.</span>
          </div>
          {api.isDemoOnly && (
            <p className="static-note">
              Running your own cooperative? The open-source server includes accounts, private
              workspaces and persistent records.{' '}
              <a
                href="https://github.com/shi1720/Hack-The-Weather#run-locally"
                target="_blank"
                rel="noreferrer"
              >
                Deploy Kavu <ArrowUpRight size={13} />
              </a>
            </p>
          )}
        </div>
        <footer className="auth-footer">
          Made for the people behind the harvest.
          <span>
            Juja, Kenya <CloudRain size={14} />
          </span>
        </footer>
      </section>
    </main>
  );
}
