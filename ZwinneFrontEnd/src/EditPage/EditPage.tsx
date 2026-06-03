import { useState, useEffect } from "react";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ENDPOINTS, fetchWithAuth } from "../backendConnection";
import "./editpage.css";

interface Project {
    id: number;
    nazwa: string;
    opis: string;
    utworzony: string;
    zmodyfikowany: string;
    dataOddania: string;
}

function formatDate(dateStr: string): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pl-PL");
}

function EditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [nazwa, setNazwa] = useState("");
    const [opis, setOpis] = useState("");
    const [dataOddania, setDataOddania] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchProject = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetchWithAuth(ENDPOINTS.projects.getById(Number(id)));
                if (!res.ok) throw new Error(`Błąd serwera: ${res.status}`);
                const data: Project = await res.json();
                setProject(data);
                setNazwa(data.nazwa);
                setOpis(data.opis || "");
                setDataOddania(data.dataOddania || "");
            } catch (err: any) {
                setError(err.message || "Nie udało się pobrać projektu.");
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [id]);

    const handleSave = async () => {
        if (!nazwa.trim()) {
            setError("Nazwa nie może być pusta.");
            return;
        }
        if (!dataOddania) {
            setError("Data oddania jest wymagana.");
            return;
        }
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const res = await fetchWithAuth(ENDPOINTS.projects.update(Number(id)), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nazwa, opis, dataOddania }),
            });
            if (!res.ok) throw new Error(`Błąd serwera: ${res.status}`);
            const updatedData: Project = await res.json();
            setProject(updatedData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || "Nie udało się zapisać zmian.");
        } finally {
            setSaving(false);
        }
    };

    const hasChanges =
        project !== null && (nazwa !== project.nazwa || opis !== project.opis || dataOddania !== project.dataOddania);

    if (loading) {
        return (
            <div className="ep-center">
                <span className="ep-spinner" />
                <span>Ładowanie projektu...</span>
            </div>
        );
    }

    if (error && !project) {
        return (
            <div className="ep-center ep-error-state">
                <span>⚠</span> {error}
                <button className="ep-btn ep-btn-secondary" onClick={() => navigate(-1)}>
                    Wróć
                </button>
            </div>
        );
    }

    return (
        <div className="ep-container">
            <div className="ep-card">
                <div className="ep-card-header">
                    <button className="ep-back" onClick={() => navigate(-1)} title="Wróć">
                        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                            <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Wróć
                    </button>
                    <div>
                        <h1 className="ep-title">Edytuj projekt</h1>
                        <span className="ep-subtitle">ID: {project?.id}</span>
                    </div>
                </div>

                <div className="ep-meta-grid">
                    <div className="ep-meta-item">
                        <span className="ep-meta-label">Utworzony</span>
                        <span className="ep-meta-value">{formatDate(project?.utworzony ?? "")}</span>
                    </div>
                    <div className="ep-meta-item">
                        <span className="ep-meta-label">Zmodyfikowany</span>
                        <span className="ep-meta-value">{formatDate(project?.zmodyfikowany ?? "")}</span>
                    </div>
                </div>

                <div className="ep-divider" />

                <div className="ep-form">
                    <div className="ep-field">
                        <label className="ep-label" htmlFor="nazwa">
                            Nazwa <span className="ep-required">*</span>
                        </label>
                        <input
                            id="nazwa"
                            type="text"
                            className="ep-input"
                            value={nazwa}
                            onChange={e => setNazwa(e.target.value)}
                            maxLength={200}
                            placeholder="Wpisz nazwę projektu"
                        />
                        <span className="ep-char-count">{nazwa.length}/200</span>
                    </div>

                    <div className="ep-field">
                        <label className="ep-label" htmlFor="dataOddania">
                            Data oddania <span className="ep-required">*</span>
                        </label>
                        <input
                            id="dataOddania"
                            type="date"
                            className="ep-input"
                            value={dataOddania}
                            onChange={e => setDataOddania(e.target.value)}
                        />
                    </div>

                    <div className="ep-field">
                        <label className="ep-label" htmlFor="opis">Opis</label>
                        <textarea
                            id="opis"
                            className="ep-textarea"
                            value={opis}
                            onChange={e => setOpis(e.target.value)}
                            rows={5}
                            maxLength={2000}
                            placeholder="Wpisz opis projektu"
                        />
                        <span className="ep-char-count">{opis.length}/2000</span>
                    </div>

                    {error && <div className="ep-alert ep-alert-error">⚠ {error}</div>}
                    {success && <div className="ep-alert ep-alert-success">✓ Zmiany zostały zapisane.</div>}

                    <div className="ep-actions">
                        <button
                            className="ep-btn ep-btn-secondary"
                            onClick={() => {
                                setNazwa(project!.nazwa);
                                setOpis(project!.opis);
                                setDataOddania(project!.dataOddania);
                                setError(null);
                            }}
                            disabled={!hasChanges || saving}
                        >
                            Anuluj zmiany
                        </button>
                        <button
                            className="ep-btn ep-btn-primary"
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                        >
                            {saving ? <><span className="ep-spinner ep-spinner-sm" /> Zapisywanie...</> : "Zapisz zmiany"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditPage;