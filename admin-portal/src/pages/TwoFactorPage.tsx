import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DEMO_OTP } from '@/data/mockAdmins';
import styles from './TwoFactorPage.module.css';

export function TwoFactorPage() {
  const { pendingUser, verify2fa, resend2fa } = useAuth();
  const navigate = useNavigate();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!pendingUser) {
      navigate('/login', { replace: true });
    }
  }, [pendingUser, navigate]);

  if (!pendingUser) return null;

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');

    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    const ok = await verify2fa(code);
    setLoading(false);

    if (!ok) {
      setError(`Invalid code. Use ${DEMO_OTP} for demo.`);
      return;
    }

    navigate('/dashboard');
  }

  function handleResend() {
    resend2fa();
    setResent(true);
    setDigits(['', '', '', '', '', '']);
    inputsRef.current[0]?.focus();
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>🔐</div>
        <h1 className={styles.title}>Two-Factor Authentication</h1>
        <p className={styles.subtitle}>
          Enter the 6-digit code sent to <strong>{pendingUser.email}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className={styles.otpRow}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className={styles.otpInput}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e.key)}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {resent && <p className={styles.success}>New code sent (demo: {DEMO_OTP})</p>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Verifying…' : 'Verify & continue'}
          </button>
        </form>

        <button type="button" className={styles.resend} onClick={handleResend}>
          Resend code
        </button>

        <p className={styles.demoHint}>Demo code: <strong>{DEMO_OTP}</strong></p>

        <Link to="/login" className={styles.backLink}>
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
