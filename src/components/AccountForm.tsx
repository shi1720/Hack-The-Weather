import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button, ErrorNotice } from './UI';
import { changePassword } from '../lib/api';
import type { User } from '../shared/types';
export default function AccountForm({ user, onSuccess }: { user: User; onSuccess: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (f.get('newPassword') !== f.get('confirmPassword')) {
          setError('The new passwords do not match.');
          return;
        }
        setBusy(true);
        setError('');
        try {
          await changePassword(String(f.get('currentPassword')), String(f.get('newPassword')));
          onSuccess();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Password could not be changed.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="form-intro">
        Signed in as <strong>{user.email}</strong>. This account owns one private yard workspace.
      </p>
      {error && <ErrorNotice message={error} />}
      <label>
        Current password
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
      </label>
      <label>
        New password
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
      </label>
      <label>
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
      </label>
      <div className="info-box">
        <ShieldCheck size={17} />
        <span>
          Use at least 12 characters. Changing your password signs out all existing sessions. Your
          batches and records stay in your workspace.
        </span>
      </div>
      <Button busy={busy} type="submit">
        <KeyRound size={16} />
        Change password
      </Button>
    </form>
  );
}
