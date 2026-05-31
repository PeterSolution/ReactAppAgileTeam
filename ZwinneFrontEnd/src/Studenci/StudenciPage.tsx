import { useState, useEffect } from "react";
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ENDPOINTS } from "../backendConnection";
import "./StudenciPage.css";

interface Student {
    id: number;
    imie: string;
    nazwisko: string;
    numerIndexu: string;
    formaStudiow: "stacjonarne" | "niestacjonarne";
    email: string;
}

function getInitials(imie: string, nazwisko: string): string {
    return `${imie?.[0] ?? ""}${nazwisko?.[0] ?? ""}`.toUpperCase();
}

const AVATAR_COLORS = [
    "#4f7ef7", "#10b981", "#f59e0b", "#8b5cf6",
    "#ef4444", "#06b6d4", "#ec4899", "#14b8a6"
];

function avatarColor(id: number): string {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

type SortKey = keyof Student;

function StudenciPage() {
    const { id: projectId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [students, setStudents] = useState<Student[]>([]);
    const [search, setSearch] = useState("");
    const [filterForma, setFilterForma] = useState<"" | "stacjonarne" | "niestacjonarne">("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>("nazwisko");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    useEffect(() => {
        if (!projectId) return;
        const fetchStudents = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(ENDPOINTS.students.getByProject(Number(projectId)));
                if (!res.ok) throw new Error(`Błąd serwera: ${res.status}`);
                const data: Student[] = await res.json();
                setStudents(data);
            } catch (err: any) {
                setError(err.message || "Nie udało się pobrać studentów.");
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [projectId]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const filtered = students
        .filter(s => {
            const q = search.toLowerCase();
            const matchSearch =
                s.imie.toLowerCase().includes(q) ||
                s.nazwisko.toLowerCase().includes(q) ||
                s.email.toLowerCase().includes(q) ||
                s.numerIndexu.toLowerCase().includes(q);
            const matchForma = filterForma ? s.formaStudiow === filterForma : true;
            return matchSearch && matchForma;
        })
        .sort((a, b) => {
            const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), "pl", { numeric: true });
            return sortDir === "asc" ? cmp : -cmp;
        });

    const SortIcon = ({ col }: { col: SortKey }) => (
        <span className={`st-sort-icon ${sortKey === col ? "st-sort-active" : ""}`}>
            {sortKey === col ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
        </span>
    );

    return (
        <div className="st-container">
            <div className="st-header">
                <div className="st-header-left">
                    <button className="st-back" onClick={() => navigate(-1)}>
                        <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                            <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Wróć
                    </button>
                    <div>
                        <h1 className="st-title">Studenci</h1>
                        {!loading && !error && (
                            <span className="st-count">{filtered.length} z {students.length}</span>
                        )}
                    </div>
                </div>

                <div className="st-controls">
                    <select
                        className="st-filter"
                        value={filterForma}
                        onChange={e => setFilterForma(e.target.value as any)}
                    >
                        <option value="">Wszystkie formy</option>
                        <option value="stacjonarne">Stacjonarne</option>
                        <option value="niestacjonarne">Niestacjonarne</option>
                    </select>

                    <div className="st-search-wrapper">
                        <svg className="st-search-icon" viewBox="0 0 20 20" fill="none" width="15" height="15">
                            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <input
                            className="st-search"
                            type="text"
                            placeholder="Szukaj po nazwisku, emailu, indeksie..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="st-search-clear" onClick={() => setSearch("")}>✕</button>
                        )}
                    </div>
                </div>
            </div>

            {loading && (
                <div className="st-state">
                    <span className="st-spinner" /> Ładowanie studentów...
                </div>
            )}

            {!loading && error && (
                <div className="st-state st-state-error">⚠ {error}</div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div className="st-state">
                    Brak studentów{search ? ` dla "${search}"` : ""}.
                </div>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className="st-table-wrapper">
                    <table className="st-table">
                        <thead>
                            <tr>
                                <th className="th-avatar" />
                                <th className="th-sortable" onClick={() => handleSort("nazwisko")}>
                                    Nazwisko <SortIcon col="nazwisko" />
                                </th>
                                <th className="th-sortable" onClick={() => handleSort("imie")}>
                                    Imię <SortIcon col="imie" />
                                </th>
                                <th className="th-sortable" onClick={() => handleSort("numerIndexu")}>
                                    Nr indeksu <SortIcon col="numerIndexu" />
                                </th>
                                <th className="th-sortable" onClick={() => handleSort("formaStudiow")}>
                                    Forma studiów <SortIcon col="formaStudiow" />
                                </th>
                                <th className="th-sortable" onClick={() => handleSort("email")}>
                                    Email <SortIcon col="email" />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(student => (
                                <tr key={student.id}>
                                    <td>
                                        <div
                                            className="st-avatar"
                                            style={{ background: avatarColor(student.id) }}
                                        >
                                            {getInitials(student.imie, student.nazwisko)}
                                        </div>
                                    </td>
                                    <td className="td-bold">{student.nazwisko}</td>
                                    <td>{student.imie}</td>
                                    <td className="td-mono">{student.numerIndexu}</td>
                                    <td>
                                        <span className={`st-forma-badge st-forma-${student.formaStudiow}`}>
                                            {student.formaStudiow}
                                        </span>
                                    </td>
                                    <td>
                                        <a className="st-email" href={`mailto:${student.email}`}>
                                            {student.email}
                                        </a>
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

export default StudenciPage;