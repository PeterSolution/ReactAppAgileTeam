import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./register.css";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    indexNumber: "",
    studyMode: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const newErrors: any = {};

    if (!form.firstName) newErrors.firstName = "Imię jest wymagane";
    if (!form.lastName) newErrors.lastName = "Nazwisko jest wymagane";

    if (!form.indexNumber)
      newErrors.indexNumber = "Numer indeksu jest wymagany";
    else if (!/^\d+$/.test(form.indexNumber))
      newErrors.indexNumber = "Numer indeksu musi być liczbą";

    if (!form.studyMode)
      newErrors.studyMode = "Wybierz formę studiów";

    if (!form.email)
      newErrors.email = "Adres e-mail jest wymagany";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Nieprawidłowy format e-maila";

    if (!form.password)
      newErrors.password = "Hasło jest wymagane";
    else if (form.password.length < 6)
      newErrors.password = "Hasło musi mieć min. 6 znaków";

    return newErrors;
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: undefined }));
  };

  const handleRegister = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (res.status === 200) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Błąd rejestracji");
      }
    } catch (err) {
      alert("Błąd połączenia z serwerem");
    }

    setLoading(false);
  };

  const handleBackToLogin = () => {
    navigate("/");
  };

  return (
    <div className="lp-page">
      <div className="lp-glow1" />
      <div className="lp-glow2" />

      <div className="lp-card">
        <h1 className="lp-heading">Rejestracja</h1>
        <p className="lp-subheading">Utwórz nowe konto</p>

        {success && (
          <div className="lp-success-banner">
            ✓ Zarejestrowano pomyślnie!
          </div>
        )}

        {/* Imię */}
        <div className="lp-input-wrapper">
          <label className="lp-label">Imię</label>
          <input
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            className={`lp-input${errors.firstName ? " error" : ""}`}
          />
          {errors.firstName && <span className="lp-error-msg">{errors.firstName}</span>}
        </div>

        {/* Nazwisko */}
        <div className="lp-input-wrapper">
          <label className="lp-label">Nazwisko</label>
          <input
            value={form.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            className={`lp-input${errors.lastName ? " error" : ""}`}
          />
          {errors.lastName && <span className="lp-error-msg">{errors.lastName}</span>}
        </div>

        {/* Numer indeksu */}
        <div className="lp-input-wrapper">
          <label className="lp-label">Numer indeksu</label>
          <input
            value={form.indexNumber}
            onChange={(e) => handleChange("indexNumber", e.target.value)}
            className={`lp-input${errors.indexNumber ? " error" : ""}`}
          />
          {errors.indexNumber && (
            <span className="lp-error-msg">{errors.indexNumber}</span>
          )}
        </div>

        {/* Forma studiów */}
        <div className="lp-input-wrapper">
          <label className="lp-label">Forma studiów</label>
          <select
            value={form.studyMode}
            onChange={(e) => handleChange("studyMode", e.target.value)}
            className={`lp-input${errors.studyMode ? " error" : ""}`}
          >
            <option value="">-- wybierz --</option>
            <option value="stacjonarne">Stacjonarne</option>
            <option value="niestacjonarne">Niestacjonarne</option>
          </select>
          {errors.studyMode && (
            <span className="lp-error-msg">{errors.studyMode}</span>
          )}
        </div>

        {/* Email */}
        <div className="lp-input-wrapper">
          <label className="lp-label">E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className={`lp-input${errors.email ? " error" : ""}`}
          />
          {errors.email && <span className="lp-error-msg">{errors.email}</span>}
        </div>

        {/* Hasło */}
        <div className="lp-input-wrapper">
          <label className="lp-label">Hasło</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            className={`lp-input${errors.password ? " error" : ""}`}
          />
          {errors.password && <span className="lp-error-msg">{errors.password}</span>}
        </div>

        <button
          className="lp-button"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Rejestracja..." : "Zarejestruj się"}
        </button>

        <div className="lp-register-row">
          <span className="lp-register-text">Masz już konto?</span>
          <button className="lp-register-link" onClick={handleBackToLogin}>
            Wróć do logowania
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;