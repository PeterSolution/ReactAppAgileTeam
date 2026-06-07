import { useState } from "react";
import React from "react";
import { useNavigate } from 'react-router-dom';
import './page.css';
import { ENDPOINTS } from "../../backendConnection";

interface LoginPageProps {
  onLogin?: (email: string, password: string) => void;
  onRegister?: () => void;
}

function Page(){
    const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState<number | null>(null);
  const navigate = useNavigate();

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Adres e-mail jest wymagany';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = 'Nieprawidłowy format e-maila';
    if (!password) newErrors.password = 'Hasło jest wymagane';
    else if (password.length < 6) newErrors.password = 'Hasło musi mieć min. 6 znaków';
    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(ENDPOINTS.auth.login(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      setCode(res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Błędny e-mail lub hasło.');
      }

      const data = await res.json();
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify({
        id: data.id,
        email: data.email,
        rola: data.rola,
        firstName: data.firstName,
        lastName: data.lastName
      }));

      setSuccess(true);
      setTimeout(() => {
        navigate('/main');
      }, 500);
    } catch (err: any) {
      console.error(err);
      setErrors({ email: err.message || "Błąd połączenia z serwerem." });
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const onRegister = () => {
    navigate('/register');
  }

  return (
    <div className="lp-page">
      <div className="lp-glow1" />
      <div className="lp-glow2" />

      <div className="lp-card">
        <div className="lp-logo">
          <div className="lp-logo-icon">✦</div>
          <span className="lp-logo-text">Zespół 4</span>
        </div>

        <h1 className="lp-heading">Witaj</h1>
        <p className="lp-subheading">Zaloguj się na swoje konto</p>

        {success && (
          <div className="lp-success-banner">✓ Zalogowano pomyślnie!</div>
        )}

        <div className="lp-input-wrapper">
          <label className="lp-label" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
            onKeyDown={handleKeyDown}
            placeholder="jan@przykład.pl"
            className={`lp-input${errors.email ? ' error' : ''}`}
            autoComplete="email"
          />
          {errors.email && <span className="lp-error-msg">{errors.email}</span>}
        </div>

        <div className="lp-input-wrapper">
          <label className="lp-label" htmlFor="password">Hasło</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
            onKeyDown={handleKeyDown}
            placeholder="••••••••"
            className={`lp-input${errors.password ? ' error' : ''}`}
            autoComplete="current-password"
          />
          {errors.password && <span className="lp-error-msg">{errors.password}</span>}
        </div>

        <div className="lp-forgot-row">
          <button className="lp-forgot-btn">Nie pamiętasz hasła?</button>
        </div>

        <button
          className="lp-button"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Logowanie...' : 'Zaloguj się'}
        </button>

        <div className="lp-divider">
          <div className="lp-divider-line" />
          <span className="lp-divider-text">lub</span>
          <div className="lp-divider-line" />
        </div>

        <div className="lp-register-row">
          <span className="lp-register-text">Nie masz konta?</span>
          <button className="lp-register-link" onClick={() => {  onRegister?.()  }}>
            Zarejestruj się
          </button>
        </div>
      </div>
    </div>
    )
}

export default Page;