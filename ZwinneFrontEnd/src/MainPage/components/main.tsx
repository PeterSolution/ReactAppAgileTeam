import './main.css';
import { useState, useEffect, useCallback } from "react";
import React from "react";
import { useNavigate } from 'react-router-dom';
import { ENDPOINTS } from '../../backendConnection';

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
    const d = new Date(dateStr);
    return d.toLocaleDateString("pl-PL");
}

function Main() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([
    {
        id: 1,
        nazwa: "System zarządzania studentami",
        opis: "Aplikacja do obsługi projektów i studentów.",
        utworzony: "2026-05-19",
        zmodyfikowany: "2026-05-19",
        dataOddania: "2026-06-30"
    }
]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false); //zmien na true w deployu
    const [error, setError] = useState<string | null>(null);

    // const fetchProjects = useCallback(async (query: string) => {
    //     setLoading(true);
    //     setError(null);
    //     try {
    //         const url = query.trim()
    //             ? ENDPOINTS.projects.search(query)
    //             : ENDPOINTS.projects.getAll();
    //         const res = await fetch(url);
    //         if (!res.ok) throw new Error(`Błąd serwera: ${res.status}`);
    //         const data: Project[] = await res.json();
    //         setProjects(data);
    //     } catch (err: any) {
    //         setError(err.message || "Nie udało się pobrać projektów.");
    //         setProjects(null as any); // reset projects
    //     } finally {
    //         setLoading(false);
    //         setProjects(null as any); // reset projects
    //     }
    // }, []);

    // useEffect(() => {
    //     const timer = setTimeout(() => fetchProjects(searchQuery), 300);
    //     return () => clearTimeout(timer);
    // }, [searchQuery, fetchProjects]);

    const handleDelete = async (id: number) => {
        if (!window.confirm("Czy na pewno chcesz usunąć ten projekt?")) return;
        try {
            const res = await fetch(ENDPOINTS.projects.delete(id), { method: "DELETE" });
            if (!res.ok) throw new Error("Nie udało się usunąć projektu.");
            setProjects(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const goToEdit = (id: number) => navigate(`/edit/${id}`);
    const goToTasks = (id: number) => navigate(`/project/${id}/tasks`);
    const goToStudents = (id: number) => navigate(`/project/${id}/students`);

    return (
        <div className="main-container">
            <div className="main-header">
                <h1 className="main-title">Projekty</h1>
                <div className="search-wrapper">
                    <svg className="search-icon" viewBox="0 0 20 20" fill="none">
                        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Szukaj projektów..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="search-clear" onClick={() => setSearchQuery("")}>✕</button>
                    )}
                </div>
            </div>

            {loading && (
                <div className="state-message">
                    <span className="spinner" />
                    Ładowanie projektów...
                </div>
            )}

            {!loading && error && (
                <div className="state-message state-error">
                    <span>⚠</span> {error}
                </div>
            )}

            {!loading && !error && projects.length === 0 && (
                <div className="state-message">
                    Brak projektów{searchQuery ? ` dla "${searchQuery}"` : ""}.
                </div>
            )}

            {!loading && !error && projects.length > 0 && (
                <div className="table-wrapper">
                    <table className="projects-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nazwa</th>
                                <th>Opis</th>
                                <th>Utworzony</th>
                                <th>Zmodyfikowany</th>
                                <th>Oddanie</th>
                                <th>Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map(project => (
                                <tr key={project.id}>
                                    <td className="td-id">{project.id}</td>
                                    <td className="td-name">{project.nazwa}</td>
                                    <td className="td-desc">{project.opis}</td>
                                    <td>{formatDate(project.utworzony)}</td>
                                    <td>{formatDate(project.zmodyfikowany)}</td>
                                    <td>{formatDate(project.dataOddania)}</td>
                                    <td className="td-actions">
                                        <button
                                            className="btn btn-edit"
                                            onClick={() => goToEdit(project.id)}
                                            title="Edytuj"
                                        >
                                            Edytuj
                                        </button>
                                        <button
                                            className="btn btn-tasks"
                                            onClick={() => goToTasks(project.id)}
                                            title="Zadania"
                                        >
                                            Zadania
                                        </button>
                                        <button
                                            className="btn btn-students"
                                            onClick={() => goToStudents(project.id)}
                                            title="Studenci"
                                        >
                                            Studenci
                                        </button>
                                        <button
                                            className="btn btn-delete"
                                            onClick={() => handleDelete(project.id)}
                                            title="Usuń"
                                        >
                                            Usuń
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Main;