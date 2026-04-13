import { useState } from "react";
import React from "react";
import { useNavigate } from 'react-router-dom';
import './page.css';

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
    // const validationErrors = validate();
    // if (Object.keys(validationErrors).length > 0) {
    //   setErrors(validationErrors);
    //   return;
    // }
    // setErrors({});
    // setLoading(true);
    // await new Promise(r => setTimeout(r, 1200));
    // setLoading(false);
    // setSuccess(true);
    // // onLogin?.(email, password);

    fetch(`http://localhost:8080/api/login?email=${email}&password=${password}`, {
      method: 'GET'
    })
      .then(res => {
        setCode(res.status); // zapisujesz kod HTTP

        if (!res.ok) {
          throw new Error(`Błąd: ${res.status}`);
        }

        return res.json();
      })
      .then(data => {
        console.log(data);
        setSuccess(true); // np. jeśli 200
      })
      .catch(err => {
        console.error(err);
        setSuccess(false);
      });

      
    navigate('/main');
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