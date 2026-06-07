import { useState, useEffect } from "react";
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ENDPOINTS, fetchWithAuth } from "../backendConnection";
import "./StudenciPage.css";

interface Student {
    id: number;
    imie: string;
    nazwisko: string;
    numerIndexu: string;
    formaStudiow: "stacjonarne" | "niestacjonarne";
    email: string;
    rola?: string;
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
    const [allSystemStudents, setAllSystemStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<number | "">("");
    const [search, setSearch] = useState("");
    const [filterForma, setFilterForma] = useState<"" | "stacjonarne" | "niestacjonarne">("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>("nazwisko");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const currentUserStr = localStorage.getItem("currentUser");
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const isLecturer = currentUser?.rola === "ROLE_PROWADZACY";

    const fetchStudents = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = projectId 
                ? ENDPOINTS.students.getByProject(Number(projectId))
                : ENDPOINTS.students.getAll();
                
            const res = await fetchWithAuth(url);
            if (!res.ok) throw new Error(`Błąd serwera: ${res.status}`);
            
            const data = await res.json();
            // Mapowanie nrIndeksu z DTO backendu do numerIndexu używanego we frontendzie
            const mapped: Student[] = data.map((s: any) => ({
                ...s,
                numerIndexu: s.nrIndeksu || s.numerIndexu || "—"
            }));
            
            setStudents(mapped);

            // Jeśli jesteśmy w projekcie i zalogowany jest prowadzący, pobierzmy wszystkich studentów z systemu do wyboru
            if (projectId && isLecturer) {
                const allRes = await fetchWithAuth(ENDPOINTS.students.getAll());
                if (allRes.ok) {
                    const allData = await allRes.json();
                    const allMapped: Student[] = allData.map((s: any) => ({
                        ...s,
                        numerIndexu: s.nrIndeksu || s.numerIndexu || "—"
                    }));
                    
                    // Odfiltruj studentów już będących w projekcie
                    const notInProject = allMapped.filter(
                        sysStudent => !mapped.some(projStudent => projStudent.id === sysStudent.id)
                    );
                    setAllSystemStudents(notInProject);
                }
            }
        } catch (err: any) {
            setError(err.message || "Nie udało się pobrać studentów.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [projectId]);

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !selectedStudentId) return;

        try {
            const res = await fetchWithAuth(ENDPOINTS.students.addToProject(Number(projectId), Number(selectedStudentId)), {
                method: "POST"
            });
            if (!res.ok) throw new Error("Nie udało się dodać studenta do projektu.");
            
            setSelectedStudentId("");
            fetchStudents(); // Odśwież listę studentów
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleRemoveStudent = async (studentId: number) => {
        if (!projectId) return;
        if (!window.confirm("Czy na pewno chcesz usunąć tego studenta z projektu?")) return;

        try {
            const res = await fetchWithAuth(ENDPOINTS.students.removeFromProject(Number(projectId), studentId), {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Nie udało się usunąć studenta z projektu.");
            
            fetchStudents(); // Odśwież listę studentów
        } catch (err: any) {
            alert(err.message);
        }
    };

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
                (s.imie || "").toLowerCase().includes(q) ||
                (s.nazwisko || "").toLowerCase().includes(q) ||
                (s.email || "").toLowerCase().includes(q) ||
                (s.numerIndexu || "").toLowerCase().includes(q);
            const matchForma = filterForma ? s.formaStudiow === filterForma : true;
            return matchSearch && matchForma;
        })
        .sort((a, b) => {
            const valA = a[sortKey] ? String(a[sortKey]) : "";
            const valB = b[sortKey] ? String(b[sortKey]) : "";
            const cmp = valA.localeCompare(valB, "pl", { numeric: true });
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
                        <h1 className="st-title">
                            {projectId ? "Studenci w projekcie" : "Lista wszystkich studentów"}
                        </h1>
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

            {projectId && isLecturer && allSystemStudents.length > 0 && (
                <div className="st-add-student-section" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    <form onSubmit={handleAddStudent} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ color: '#fff', fontSize: '14px' }}>Przypisz studenta:</label>
                        <select
                            value={selectedStudentId}
                            onChange={e => setSelectedStudentId(Number(e.target.value))}
                            className="st-filter"
                            style={{ flex: 1, maxWidth: '300px' }}
                            required
                        >
                            <option value="">-- Wybierz studenta --</option>
                            {allSystemStudents.map(student => (
                                <option key={student.id} value={student.id}>
                                    {student.nazwisko} {student.imie} ({student.numerIndexu})
                                </option>
                            ))}
                        </select>
                        <button type="submit" className="st-filter" style={{ background: '#4f7ef7', color: '#fff', border: 'none', padding: '8px 15px', cursor: 'pointer' }}>
                            Dodaj do projektu
                        </button>
                    </form>
                </div>
            )}

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
                                {projectId && isLecturer && <th className="th-action">Akcja</th>}
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
                                    {projectId && isLecturer && (
                                        <td>
                                            <button 
                                                onClick={() => handleRemoveStudent(student.id)}
                                                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                            >
                                                Usuń
                                            </button>
                                        </td>
                                    )}
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