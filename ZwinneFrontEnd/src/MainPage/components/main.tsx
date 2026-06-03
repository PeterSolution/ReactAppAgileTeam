import './main.css';
import { useState, useEffect, useCallback } from "react";
import React from "react";
import { useNavigate } from 'react-router-dom';
import { ENDPOINTS, fetchWithAuth } from '../../backendConnection';

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
    const [projects, setProjects] = useState<Project[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Stan paginacji
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize] = useState(10);

    const currentUserStr = localStorage.getItem("currentUser");
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const isLecturer = currentUser?.rola === "ROLE_PROWADZACY";

    const fetchProjects = useCallback(async (query: string, pageNum: number) => {
        setLoading(true);
        setError(null);
        try {
            const url = ENDPOINTS.projects.getAll(pageNum, pageSize, query);
            const res = await fetchWithAuth(url);
            if (!res.ok) throw new Error(`Błąd serwera: ${res.status}`);
            
            const data = await res.json();
            setProjects(data.content || []);
            setTotalPages(data.totalPages || 1);
        } catch (err: any) {
            setError(err.message || "Nie udało się pobrać projektów.");
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProjects(searchQuery, page);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, page, fetchProjects]);

    const handleDelete = async (id: number) => {
        if (!window.confirm("Czy na pewno chcesz usunąć ten projekt?")) return;
        try {
            const res = await fetchWithAuth(ENDPOINTS.projects.delete(id), { method: "DELETE" });
            if (!res.ok) throw new Error("Nie udało się usunąć projektu.");
            setProjects(prev => prev.filter(p => p.id !== id));
            // Ponowne pobranie w celu odświeżenia paginacji
            fetchProjects(searchQuery, page);
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
                        onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                    />
                    {searchQuery && (
                        <button className="search-clear" onClick={() => { setSearchQuery(""); setPage(0); }}>✕</button>
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
                                        {isLecturer && (
                                            <button
                                                className="btn btn-edit"
                                                onClick={() => goToEdit(project.id)}
                                                title="Edytuj"
                                            >
                                                Edytuj
                                            </button>
                                        )}
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
                                        {isLecturer && (
                                            <button
                                                className="btn btn-delete"
                                                onClick={() => handleDelete(project.id)}
                                                title="Usuń"
                                            >
                                                Usuń
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '15px' }}>
                        <button 
                            className="btn" 
                            disabled={page === 0} 
                            onClick={() => setPage(p => p - 1)}
                            style={{ cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                        >
                            Poprzednia
                        </button>
                        <span style={{ color: '#fff' }}>Strona {page + 1} z {totalPages}</span>
                        <button 
                            className="btn" 
                            disabled={page >= totalPages - 1} 
                            onClick={() => setPage(p => p + 1)}
                            style={{ cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                        >
                            Następna
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Main;