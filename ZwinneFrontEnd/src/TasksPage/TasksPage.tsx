import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ENDPOINTS, fetchWithAuth, BACKEND_URL } from "../backendConnection";
import { Client } from "@stomp/stompjs";
import "./TasksPage.css";

interface Uzytkownik {
    id: number;
    email: string;
    imie: string;
    nazwisko: string;
    nrIndeksu?: string;
    rola: string;
}

interface Project {
    id: number;
    nazwa: string;
    opis: string;
    utworzony: string;
    zmodyfikowany: string;
    dataOddania: string;
}

interface Task {
    id: number;
    nazwa: string;
    opis: string;
    status: "TODO" | "IN_PROGRESS" | "DONE";
    kolejnosc: number;
    dataUtworzenia: string;
    przypisanyStudent?: Uzytkownik;
}

interface FileMetadata {
    id: number;
    nazwaPliku: string;
    typPliku: string;
    rozmiar: number;
    dataPrzeslania: string;
    przeslanyPrzez: Uzytkownik;
}

interface ChatMessage {
    id: number;
    nadawca: Uzytkownik;
    tresc: String;
    dataWyslania: string;
}

function formatDate(dateStr: string): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pl-PL");
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function TasksPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projectMembers, setProjectMembers] = useState<Uzytkownik[]>([]);
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [stompClient, setStompClient] = useState<Client | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Formularz nowego zadania
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [newTaskName, setNewTaskName] = useState("");
    const [newTaskDesc, setNewTaskDesc] = useState("");

    // Zalogowany użytkownik
    const currentUserStr = localStorage.getItem("currentUser");
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const isLecturer = currentUser?.rola === "ROLE_PROWADZACY";

    // Ładowanie podstawowych danych
    const loadAllData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const projId = Number(id);

            // Pobierz projekt
            const projRes = await fetchWithAuth(ENDPOINTS.projects.getById(projId));
            if (!projRes.ok) throw new Error("Nie udało się pobrać szczegółów projektu.");
            const projData = await projRes.json();
            setProject(projData);

            // Pobierz zadania
            const tasksRes = await fetchWithAuth(ENDPOINTS.tasks.getByProject(projId));
            if (tasksRes.ok) {
                const tasksData = await tasksRes.json();
                setTasks(tasksData);
            }

            // Pobierz studentów przypisanych do projektu
            const membersRes = await fetchWithAuth(ENDPOINTS.students.getByProject(projId));
            if (membersRes.ok) {
                const membersData = await membersRes.json();
                setProjectMembers(membersData);
            }

            // Pobierz pliki projektu
            const filesRes = await fetchWithAuth(ENDPOINTS.files.getByProject(projId));
            if (filesRes.ok) {
                const filesData = await filesRes.json();
                setFiles(filesData);
            }

            // Pobierz historię czatu projektu
            const chatRes = await fetchWithAuth(ENDPOINTS.chat.getProjectHistory(projId));
            if (chatRes.ok) {
                const chatData = await chatRes.json();
                setChatMessages(chatData);
            }
        } catch (err: any) {
            setError(err.message || "Błąd podczas ładowania danych.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // Połączenie WebSocket STOMP do czatu grupowego
    useEffect(() => {
        if (!id) return;

        const token = localStorage.getItem("accessToken");
        // Tworzymy adres brokera w formacie ws:// (zastępując http://)
        const wsUrl = ENDPOINTS.chat.wsEndpoint().replace("http://", "ws://").replace("https://", "wss://");

        const client = new Client({
            brokerURL: wsUrl,
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            debug: (str) => console.log("[STOMP Debug] " + str),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000
        });

        client.onConnect = () => {
            console.log("WebSocket connected for project " + id);
            // Subskrypcja czatu grupy projektowej
            client.subscribe(`/topic/project/${id}`, (msg) => {
                const incomingMessage = JSON.parse(msg.body);
                setChatMessages(prev => [...prev, incomingMessage]);
            });
        };

        client.onStompError = (frame) => {
            console.error("STOMP error: ", frame.body);
        };

        client.activate();
        setStompClient(client);

        return () => {
            client.deactivate();
        };
    }, [id]);

    // Przewijanie czatu do dołu przy nowej wiadomości
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // Obsługa wysyłania wiadomości
    const handleSendChatMessage = () => {
        if (!chatInput.trim() || !stompClient || !stompClient.connected) return;

        stompClient.publish({
            destination: `/app/chat.sendProjectMessage/${id}`,
            body: JSON.stringify({ tresc: chatInput })
        });
        setChatInput("");
    };

    // Tworzenie zadania (tylko prowadzący)
    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskName.trim() || !id) return;

        try {
            const res = await fetchWithAuth(ENDPOINTS.tasks.create(Number(id)), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nazwa: newTaskName,
                    opis: newTaskDesc,
                    status: "TODO"
                })
            });
            if (!res.ok) throw new Error("Błąd podczas tworzenia zadania.");

            const created = await res.json();
            setTasks(prev => [...prev, created]);
            setNewTaskName("");
            setNewTaskDesc("");
            setShowAddTaskModal(false);
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Usunięcie zadania (tylko prowadzący)
    const handleDeleteTask = async (taskId: number) => {
        if (!window.confirm("Czy na pewno chcesz usunąć to zadanie?")) return;

        try {
            const res = await fetchWithAuth(ENDPOINTS.tasks.delete(taskId), { method: "DELETE" });
            if (!res.ok) throw new Error("Nie udało się usunąć zadania.");
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Przemieszczanie zadania (modyfikacja statusu)
    const moveTask = async (task: Task, direction: "forward" | "backward") => {
        let newStatus: "TODO" | "IN_PROGRESS" | "DONE" = task.status;
        if (task.status === "TODO" && direction === "forward") {
            newStatus = "IN_PROGRESS";
        } else if (task.status === "IN_PROGRESS") {
            newStatus = direction === "forward" ? "DONE" : "TODO";
        } else if (task.status === "DONE" && direction === "backward") {
            newStatus = "IN_PROGRESS";
        }

        if (newStatus === task.status) return;

        try {
            const res = await fetchWithAuth(ENDPOINTS.tasks.update(task.id), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...task,
                    status: newStatus
                })
            });

            if (!res.ok) throw new Error("Nie udało się zaktualizować statusu zadania.");
            
            const updated = await res.json();
            setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Przypisywanie studenta do zadania
    const handleAssignStudent = async (taskId: number, studentIdStr: string) => {
        const studentId = studentIdStr ? Number(studentIdStr) : null;
        try {
            const res = await fetchWithAuth(ENDPOINTS.tasks.assign(taskId, studentId), {
                method: "POST"
            });
            if (!res.ok) throw new Error("Nie udało się przypisać studenta do zadania.");

            const updated = await res.json();
            setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Obsługa przesyłania plików
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, taskId?: number) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetchWithAuth(ENDPOINTS.files.upload(Number(id), taskId), {
                method: "POST",
                body: formData // Nagłówek Content-Type jest automatycznie ustawiany dla FormData
            });

            if (!res.ok) throw new Error("Nie udało się przesłać pliku.");

            const uploadedFile = await res.json();
            setFiles(prev => [...prev, uploadedFile]);
            
            // Czyszczenie kontrolki input
            e.target.value = "";
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Usunięcie załącznika
    const handleDeleteFile = async (fileId: number) => {
        if (!window.confirm("Czy na pewno chcesz usunąć ten załącznik?")) return;

        try {
            const res = await fetchWithAuth(ENDPOINTS.files.delete(fileId), { method: "DELETE" });
            if (!res.ok) throw new Error("Nie udało się usunąć pliku.");
            setFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) {
        return (
            <div className="ep-center">
                <span className="ep-spinner" />
                <span>Ładowanie tablicy projektu...</span>
            </div>
        );
    }

    if (error && !project) {
        return (
            <div className="ep-center ep-error-state">
                <span>⚠</span> {error}
                <button className="ep-btn ep-btn-secondary" onClick={() => navigate('/main')}>
                    Powrót do projektów
                </button>
            </div>
        );
    }

    // Grupowanie zadań wg statusów
    const todoTasks = tasks.filter(t => t.status === "TODO");
    const progressTasks = tasks.filter(t => t.status === "IN_PROGRESS");
    const doneTasks = tasks.filter(t => t.status === "DONE");

    return (
        <div className="tp-container">
            {/* Header projektu */}
            <div className="tp-header">
                <div className="tp-project-info">
                    <h1>{project?.nazwa}</h1>
                    <p className="tp-project-desc">{project?.opis || "Brak opisu projektu."}</p>
                    <div className="tp-project-meta">
                        <span>Utworzono: <strong>{formatDate(project?.utworzony ?? "")}</strong></span>
                        <span>Oddanie do: <strong style={{ color: '#f87171' }}>{formatDate(project?.dataOddania ?? "")}</strong></span>
                        <span>Członkowie: <strong>{projectMembers.length} studentów</strong></span>
                    </div>
                </div>
                <button className="tp-back-btn" onClick={() => navigate('/main')}>
                    ← Projekty
                </button>
            </div>

            {/* Główny układ: tablica Kanban po lewej, pliki i chat po prawej */}
            <div className="tp-workspace-layout">
                
                {/* Tablica Kanban */}
                <div className="tp-board-wrapper">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="tp-board-title">Tablica Scrum</h2>
                        {isLecturer && (
                            <button className="tp-back-btn" style={{ background: '#4f7ef7', color: '#fff', borderColor: '#4f7ef7' }} onClick={() => setShowAddTaskModal(true)}>
                                + Dodaj Zadanie
                            </button>
                        )}
                    </div>

                    <div className="tp-board-columns">
                        
                        {/* Kolumna TODO */}
                        <div className="tp-column">
                            <div className="tp-column-header">
                                <span className="tp-column-title tp-column-todo">Do zrobienia</span>
                                <span className="tp-task-count">{todoTasks.length}</span>
                            </div>
                            <div className="tp-task-list">
                                {todoTasks.map(task => (
                                    <div key={task.id} className="tp-task-card">
                                        <h3 className="tp-task-title">{task.nazwa}</h3>
                                        <p className="tp-task-desc">{task.opis}</p>
                                        
                                        {/* Przypisanie studenta */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Przypisany:</span>
                                            {isLecturer ? (
                                                <select
                                                    className="tp-chat-input"
                                                    style={{ padding: '4px', fontSize: '11px' }}
                                                    value={task.przypisanyStudent?.id || ""}
                                                    onChange={e => handleAssignStudent(task.id, e.target.value)}
                                                >
                                                    <option value="">Nieprzypisany</option>
                                                    {projectMembers.map(m => (
                                                        <option key={m.id} value={m.id}>{m.nazwisko} {m.imie}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="tp-task-assignee">
                                                    {task.przypisanyStudent ? `${task.przypisanyStudent.imie} ${task.przypisanyStudent.nazwisko}` : "Brak"}
                                                </span>
                                            )}
                                        </div>

                                        <div className="tp-task-footer">
                                            <div className="tp-task-actions">
                                                {isLecturer && (
                                                    <button className="tp-task-btn tp-task-btn-danger" onClick={() => handleDeleteTask(task.id)} title="Usuń zadanie">✕</button>
                                                )}
                                            </div>
                                            <button className="tp-task-btn" onClick={() => moveTask(task, "forward")} title="W toku">→</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Kolumna IN PROGRESS */}
                        <div className="tp-column">
                            <div className="tp-column-header">
                                <span className="tp-column-title tp-column-progress">W realizacji</span>
                                <span className="tp-task-count">{progressTasks.length}</span>
                            </div>
                            <div className="tp-task-list">
                                {progressTasks.map(task => (
                                    <div key={task.id} className="tp-task-card">
                                        <h3 className="tp-task-title">{task.nazwa}</h3>
                                        <p className="tp-task-desc">{task.opis}</p>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Przypisany:</span>
                                            {isLecturer ? (
                                                <select
                                                    className="tp-chat-input"
                                                    style={{ padding: '4px', fontSize: '11px' }}
                                                    value={task.przypisanyStudent?.id || ""}
                                                    onChange={e => handleAssignStudent(task.id, e.target.value)}
                                                >
                                                    <option value="">Nieprzypisany</option>
                                                    {projectMembers.map(m => (
                                                        <option key={m.id} value={m.id}>{m.nazwisko} {m.imie}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="tp-task-assignee">
                                                    {task.przypisanyStudent ? `${task.przypisanyStudent.imie} ${task.przypisanyStudent.nazwisko}` : "Brak"}
                                                </span>
                                            )}
                                        </div>

                                        <div className="tp-task-footer">
                                            <button className="tp-task-btn" onClick={() => moveTask(task, "backward")} title="Do zrobienia">←</button>
                                            <div className="tp-task-actions">
                                                {isLecturer && (
                                                    <button className="tp-task-btn tp-task-btn-danger" onClick={() => handleDeleteTask(task.id)} title="Usuń zadanie">✕</button>
                                                )}
                                            </div>
                                            <button className="tp-task-btn" onClick={() => moveTask(task, "forward")} title="Zakończone">→</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Kolumna DONE */}
                        <div className="tp-column">
                            <div className="tp-column-header">
                                <span className="tp-column-title tp-column-done">Zakończone</span>
                                <span className="tp-task-count">{doneTasks.length}</span>
                            </div>
                            <div className="tp-task-list">
                                {doneTasks.map(task => (
                                    <div key={task.id} className="tp-task-card" style={{ opacity: 0.85 }}>
                                        <h3 className="tp-task-title" style={{ textDecoration: 'line-through' }}>{task.nazwa}</h3>
                                        <p className="tp-task-desc">{task.opis}</p>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Przypisany:</span>
                                            <span className="tp-task-assignee" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                                {task.przypisanyStudent ? `${task.przypisanyStudent.imie} ${task.przypisanyStudent.nazwisko}` : "Brak"}
                                            </span>
                                        </div>

                                        <div className="tp-task-footer">
                                            <button className="tp-task-btn" onClick={() => moveTask(task, "backward")} title="W realizacji">←</button>
                                            <div className="tp-task-actions">
                                                {isLecturer && (
                                                    <button className="tp-task-btn tp-task-btn-danger" onClick={() => handleDeleteTask(task.id)} title="Usuń zadanie">✕</button>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#10b981' }}>Gotowe ✓</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Sidebar z plikami i czatem grupowym */}
                <div className="tp-sidebar">
                    
                    {/* Sekcja załączników */}
                    <div className="tp-section-card">
                        <h2 className="tp-section-title">
                            Pliki projektu ({files.length})
                        </h2>
                        
                        <div className="tp-file-list">
                            {files.length === 0 ? (
                                <span style={{ fontSize: '13px', color: '#6b7280' }}>Brak załączników.</span>
                            ) : (
                                files.map(file => (
                                    <div key={file.id} className="tp-file-item">
                                        <div className="tp-file-info">
                                            <span className="tp-file-name" title={file.nazwaPliku}>{file.nazwaPliku}</span>
                                            <span className="tp-file-size">
                                                {formatBytes(file.rozmiar)} • {file.przeslanyPrzez ? `${file.przeslanyPrzez.imie} ${file.przeslanyPrzez.nazwisko[0]}.` : "System"}
                                            </span>
                                        </div>
                                        <div className="tp-file-actions">
                                            <button className="tp-file-btn tp-file-btn-download" onClick={() => window.open(ENDPOINTS.files.download(file.id), "_blank")} title="Pobierz">
                                                ⬇
                                            </button>
                                            {(isLecturer || currentUser?.id === file.przeslanyPrzez?.id) && (
                                                <button className="tp-file-btn tp-file-btn-delete" onClick={() => handleDeleteFile(file.id)} title="Usuń">
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <label className="tp-back-btn" style={{ display: 'inline-block', fontSize: '13px', padding: '6px 12px', background: '#3b82f6', borderColor: '#3b82f6', color: '#fff', textAlign: 'center', cursor: 'pointer' }}>
                                Prześlij plik
                                <input 
                                    type="file" 
                                    style={{ display: 'none' }} 
                                    onChange={(e) => handleFileUpload(e)}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Sekcja czatu grupowego */}
                    <div className="tp-section-card">
                        <h2 className="tp-section-title">Czat projektowy</h2>
                        
                        <div className="tp-chat-container">
                            <div className="tp-chat-messages">
                                {chatMessages.length === 0 ? (
                                    <span style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', margin: 'auto' }}>
                                        Brak wiadomości. Napisz coś!
                                    </span>
                                ) : (
                                    chatMessages.map(msg => {
                                        const isSelf = msg.nadawca?.id === currentUser?.id;
                                        return (
                                            <div key={msg.id} className={`tp-message ${isSelf ? "tp-message-self" : "tp-message-other"}`}>
                                                {!isSelf && (
                                                    <div className="tp-message-header">
                                                        <span>{msg.nadawca ? `${msg.nadawca.imie} ${msg.nadawca.nazwisko}` : "System"}</span>
                                                        <span>{new Date(msg.dataWyslania).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</span>
                                                    </div>
                                                )}
                                                <div className="tp-message-bubble">
                                                    {msg.tresc}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="tp-chat-input-area">
                                <input
                                    type="text"
                                    className="tp-chat-input"
                                    placeholder="Napisz do grupy..."
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleSendChatMessage()}
                                />
                                <button className="tp-chat-send" onClick={handleSendChatMessage}>
                                    Wyślij
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* Modal dodawania zadania */}
            {showAddTaskModal && (
                <div className="tp-modal">
                    <div className="tp-modal-content">
                        <h2 className="tp-modal-title">Nowe zadanie</h2>
                        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="ep-field">
                                <label className="ep-label" htmlFor="taskName">Nazwa zadania *</label>
                                <input
                                    id="taskName"
                                    type="text"
                                    className="ep-input"
                                    placeholder="Wpisz nazwę zadania"
                                    value={newTaskName}
                                    onChange={e => setNewTaskName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="ep-field">
                                <label className="ep-label" htmlFor="taskDesc">Opis zadania</label>
                                <textarea
                                    id="taskDesc"
                                    className="ep-textarea"
                                    placeholder="Wpisz opis zadania"
                                    value={newTaskDesc}
                                    onChange={e => setNewTaskDesc(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div className="ep-actions" style={{ marginTop: '10px' }}>
                                <button type="button" className="ep-btn ep-btn-secondary" onClick={() => setShowAddTaskModal(false)}>
                                    Anuluj
                                </button>
                                <button type="submit" className="ep-btn ep-btn-primary">
                                    Stwórz zadanie
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TasksPage;
