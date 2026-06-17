import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MOCK_ADMINS } from '@/data/mockAdmins';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result === 'error') {
      setError('Invalid email or password.');
      return;
    }

    if (result === '2fa') {
      navigate('/verify-2fa');
      return;
    }

    navigate('/dashboard');
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img src="/public/cares_logo.png" alt="CARES" className={styles.logo} />
          <h1 className={styles.title}>CARES Admin Portal</h1>
          <p className={styles.subtitle}>
            Sign in to manage mobile app content, events, and donation campaigns.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Email address
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cares.local"
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.label}>
            Password
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className={styles.demoBox}>
          <p className={styles.demoTitle}>Demo accounts</p>
          {MOCK_ADMINS.map((admin) => (
            <button
              key={admin.id}
              type="button"
              className={styles.demoBtn}
              onClick={() => {
                setEmail(admin.email);
                setPassword(admin.password);
              }}
            >
              <span>
                {admin.role === 'super_admin' ? 'Super Admin' : 'Event Coordinator'}
              </span>
              <span className={styles.demoEmail}>{admin.email}</span>
            </button>
          ))}
          <p className={styles.demoHint}>
            Password for both: <strong>admin123</strong>
          </p>
        </div>
      </div>

      <p className={styles.footer}>
        Mobile users access the CARES app. This portal is for administrators only.
      </p>
    </div>
  );
}
