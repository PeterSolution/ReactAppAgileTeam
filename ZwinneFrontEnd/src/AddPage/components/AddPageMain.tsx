import './addPageMain.css';
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { ENDPOINTS, fetchWithAuth } from '../../backendConnection';

interface ProjectForm {
    nazwa: string;
    opis: string;
    dataOddania: string;
}

function AddPageMain() {
    const navigate = useNavigate();
    const [form, setForm] = useState<ProjectForm>({
        nazwa: "",
        opis: "",
        dataOddania: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth(ENDPOINTS.create(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error(`Błąd serwera: ${res.status}`);
            navigate('/main');
        } catch (err: any) {
            setError(err.message || "Nie udało się dodać projektu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-container">
            <div className="add-card">
                <div className="add-card-header">
                    <div>
                        <p className="add-subtitle">Projekty</p>
                        <h1 className="add-title">Nowy projekt</h1>
                    </div>
                    <button
                        className="add-back-btn"
                        onClick={() => navigate('/main')}
                        type="button"
                    >
                        ← Wróć
                    </button>
                </div>

                {error && (
                    <div className="add-error">
                        <span>⚠</span> {error}
                    </div>
                )}

                <form className="add-form" onSubmit={handleSubmit}>
                    <div className="add-field">
                        <label className="add-label" htmlFor="nazwa">Nazwa projektu</label>
                        <input
                            id="nazwa"
                            name="nazwa"
                            type="text"
                            className="add-input"
                            placeholder="Wpisz nazwę projektu..."
                            value={form.nazwa}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="add-field">
                        <label className="add-label" htmlFor="opis">Opis</label>
                        <textarea
                            id="opis"
                            name="opis"
                            className="add-input add-textarea"
                            placeholder="Wpisz opis projektu..."
                            value={form.opis}
                            onChange={handleChange}
                            rows={4}
                        />
                    </div>

                    <div className="add-field">
                        <label className="add-label" htmlFor="dataOddania">Data oddania</label>
                        <input
                            id="dataOddania"
                            name="dataOddania"
                            type="date"
                            className="add-input"
                            value={form.dataOddania}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="add-actions">
                        <button
                            type="button"
                            className="add-btn-cancel"
                            onClick={() => navigate('/main')}
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            className="add-btn-submit"
                            disabled={loading}
                        >
                            {loading ? "Dodawanie..." : "Dodaj projekt"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddPageMain;