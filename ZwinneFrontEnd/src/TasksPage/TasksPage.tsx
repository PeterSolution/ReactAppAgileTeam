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

    // Modal szczegółów zadania i komentarze
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
    const [taskComments, setTaskComments] = useState<any[]>([]);
    const [newCommentText, setNewCommentText] = useState("");
    const [taskFiles, setTaskFiles] = useState<FileMetadata[]>([]);

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

        const optimisticTask: Task = {
            id: Math.floor(Math.random() * -1000000),
            nazwa: newTaskName,
            opis: newTaskDesc,
            status: "TODO",
            kolejnosc: tasks.length + 1,
            dataUtworzenia: new Date().toISOString(),
            przypisanyStudent: undefined
        };

        setTasks(prev => [...prev, optimisticTask]);
        setNewTaskName("");
        setNewTaskDesc("");
        setShowAddTaskModal(false);

        try {
            const res = await fetchWithAuth(ENDPOINTS.tasks.create(Number(id)), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nazwa: optimisticTask.nazwa,
                    opis: optimisticTask.opis,
                    status: optimisticTask.status
                })
            });

            if (res.ok) {
                const created = await res.json();
                setTasks(prev => prev.map(t => t.id === optimisticTask.id ? created : t));
            } else {
                console.warn("Błąd podczas tworzenia zadania.", res.status, res.statusText);
            }
        } catch (err: any) {
            console.warn("Błąd podczas tworzenia zadania.", err);
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

        const optimisticTask = { ...task, status: newStatus };
        setTasks(prev => prev.map(t => t.id === task.id ? optimisticTask : t));
        if (selectedTask?.id === task.id) {
            setSelectedTask(optimisticTask);
        }

        try {
            const res = await fetchWithAuth(ENDPOINTS.tasks.update(task.id), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(optimisticTask)
            });

            if (res.ok) {
                const updated = await res.json();
                setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
                if (selectedTask?.id === task.id) {
                    setSelectedTask(updated);
                }
            } else {
                console.warn("Nie udało się zaktualizować statusu zadania.", res.status, res.statusText);
            }
        } catch (err: any) {
            console.warn("Nie udało się zaktualizować statusu zadania.", err);
        }
    };

    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        setDraggedTask(task);
    };

    const handleDrop = async (e: React.DragEvent, status: "TODO" | "IN_PROGRESS" | "DONE") => {
        e.preventDefault();
        if (!draggedTask) return;
        if (draggedTask.status === status) {
            setDraggedTask(null);
            return;
        }

        const optimisticTask = { ...draggedTask, status };
        setTasks(prev => prev.map(t => t.id === draggedTask.id ? optimisticTask : t));
        if (selectedTask?.id === draggedTask.id) {
            setSelectedTask(optimisticTask);
        }
        setDraggedTask(null);

        try {
            const res = await fetchWithAuth(ENDPOINTS.tasks.update(draggedTask.id), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(optimisticTask)
            });

            if (res.ok) {
                const updated = await res.json();
                setTasks(prev => prev.map(t => t.id === draggedTask.id ? updated : t));
                if (selectedTask?.id === draggedTask.id) {
                    setSelectedTask(updated);
                }
            } else {
                console.warn("Nie udało się zaktualizować statusu zadania.", res.status, res.statusText);
            }
        } catch (err: any) {
            console.warn("Nie udało się zaktualizować statusu zadania.", err);
        }
    };

    const handleExportToPDF = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        
        const todoList = tasks.filter(t => t.status === "TODO");
        const progressList = tasks.filter(t => t.status === "IN_PROGRESS");
        const doneList = tasks.filter(t => t.status === "DONE");
        
        const htmlContent = `
            <html>
            <head>
                <title>Lista zadań - ${project?.nazwa}</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
                    h1 { color: #1a1a2e; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                    .meta { margin-bottom: 30px; font-size: 14px; color: #666; }
                    .section { margin-bottom: 25px; }
                    .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; padding: 6px; border-radius: 4px; }
                    .todo-title { background: #fef3c7; color: #d97706; }
                    .progress-title { background: #dbeafe; color: #2563eb; }
                    .done-title { background: #d1fae5; color: #059669; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                    th { background: #f8fafc; font-weight: 600; }
                    .task-name { font-weight: bold; }
                    .task-desc { color: #555; font-size: 13px; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>${project?.nazwa}</h1>
                <div class="meta">
                    <p>Opis: ${project?.opis || "Brak opisu."}</p>
                    <p>Data oddania projektu: ${formatDate(project?.dataOddania ?? "")}</p>
                    <p>Wygenerowano dnia: ${new Date().toLocaleDateString("pl-PL")}</p>
                </div>
                
                ${todoList.length > 0 ? `
                    <div class="section">
                        <div class="section-title todo-title">Do zrobienia (${todoList.length})</div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 30%;">Nazwa</th>
                                    <th style="width: 40%;">Opis</th>
                                    <th style="width: 30%;">Przypisany</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${todoList.map(t => `
                                    <tr>
                                        <td class="task-name">${t.nazwa}</td>
                                        <td class="task-desc">${t.opis || ""}</td>
                                        <td>${t.przypisanyStudent ? `${t.przypisanyStudent.imie} ${t.przypisanyStudent.nazwisko}` : "Brak"}</td>
                                        
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                ` : ""}
                
                ${progressList.length > 0 ? `
                    <div class="section">
                        <div class="section-title progress-title">W realizacji (${progressList.length})</div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 30%;">Nazwa</th>
                                    <th style="width: 40%;">Opis</th>
                                    <th style="width: 30%;">Przypisany</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${progressList.map(t => `
                                    <tr>
                                        <td class="task-name">${t.nazwa}</td>
                                        <td class="task-desc">${t.opis || ""}</td>
                                        <td>${t.przypisanyStudent ? `${t.przypisanyStudent.imie} ${t.przypisanyStudent.nazwisko}` : "Brak"}</td>
                                        
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                ` : ""}
                
                ${doneList.length > 0 ? `
                    <div class="section">
                        <div class="section-title done-title">Zakończone (${doneList.length})</div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 30%;">Nazwa</th>
                                    <th style="width: 40%;">Opis</th>
                                    <th style="width: 30%;">Przypisany</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${doneList.map(t => `
                                    <tr>
                                        <td class="task-name">${t.nazwa}</td>
                                        <td class="task-desc">${t.opis || ""}</td>
                                        <td>${t.przypisanyStudent ? `${t.przypisanyStudent.imie} ${t.przypisanyStudent.nazwisko}` : "Brak"}</td>
                                        
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                ` : ""}
                
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    // Przypisywanie studenta do zadania
    const handleAssignStudent = async (taskId: number, studentIdStr: string) => {
        const studentId = studentIdStr ? Number(studentIdStr) : undefined;
        const assignedStudent = studentId !== undefined
            ? projectMembers.find(m => m.id === studentId)
            : undefined;

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, przypisanyStudent: assignedStudent } : t));
        if (selectedTask?.id === taskId) {
            setSelectedTask(prev => prev ? { ...prev, przypisanyStudent: assignedStudent } : prev);
        }

        try {
            const res = await fetchWithAuth(ENDPOINTS.tasks.assign(taskId, studentId), {
                method: "POST"
            });
            if (res.ok) {
                const updated = await res.json();
                setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
                if (selectedTask?.id === taskId) {
                    setSelectedTask(updated);
                }
            } else {
                console.warn("Nie udało się przypisać studenta do zadania.", res.status, res.statusText);
            }
        } catch (err: any) {
            console.warn("Nie udało się przypisać studenta do zadania.", err);
        }
    };

    const handleOpenTaskDetails = async (task: Task) => {
        setSelectedTask(task);
        setShowTaskDetailsModal(true);
        setNewCommentText("");
        
        try {
            const commentsRes = await fetchWithAuth(ENDPOINTS.tasks.getComments(task.id));
            if (commentsRes.ok) {
                const data = await commentsRes.json();
                setTaskComments(data);
            }
            
            const filesRes = await fetchWithAuth(ENDPOINTS.files.getByTask(task.id));
            if (filesRes.ok) {
                const data = await filesRes.json();
                setTaskFiles(data);
            } else {
                setTaskFiles([]);
            }
        } catch (err) {
            console.error("Error fetching task details:", err);
        }
    };

    const handleAddComment = async () => {
        if (!newCommentText.trim() || !selectedTask) return;

        try {
            const res = await fetchWithAuth(ENDPOINTS.tasks.addComment(selectedTask.id), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tresc: newCommentText })
            });

            if (!res.ok) throw new Error("Nie udało się dodać komentarza.");
            const newComment = await res.json();
            setTaskComments(prev => [...prev, newComment]);
            setNewCommentText("");
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        if (!window.confirm("Czy na pewno chcesz usunąć ten komentarz?")) return;

        try {
            const res = await fetchWithAuth(ENDPOINTS.tasks.deleteComment(commentId), {
                method: "DELETE"
            });

            if (!res.ok) throw new Error("Nie udało się usunąć komentarza.");
            setTaskComments(prev => prev.filter(c => c.id !== commentId));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleUpdateTaskDeadline = async (dateStr: string) => {
        if (!selectedTask) return;
        const updatedTask = {
            ...selectedTask,
            deadline: dateStr ? dateStr : null
        };

        try {
            const res = await fetchWithAuth(ENDPOINTS.tasks.update(selectedTask.id), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedTask)
            });

            if (!res.ok) throw new Error("Nie udało się zaktualizować terminu zadania.");
            const data = await res.json();
            setSelectedTask(data);
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? data : t));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleTaskFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id || !selectedTask) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetchWithAuth(ENDPOINTS.files.upload(Number(id), selectedTask.id), {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Nie udało się przesłać pliku do zadania.");
            const uploadedFile = await res.json();
            setTaskFiles(prev => [...prev, uploadedFile]);
            
            const filesRes = await fetchWithAuth(ENDPOINTS.files.getByProject(Number(id)));
            if (filesRes.ok) {
                const filesData = await filesRes.json();
                setFiles(filesData);
            }
            e.target.value = "";
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleTaskFileDelete = async (fileId: number) => {
        if (!window.confirm("Czy na pewno chcesz usunąć ten załącznik?")) return;

        try {
            const res = await fetchWithAuth(ENDPOINTS.files.delete(fileId), { method: "DELETE" });
            if (!res.ok) throw new Error("Nie udało się usunąć pliku.");
            setTaskFiles(prev => prev.filter(f => f.id !== fileId));
            setFiles(prev => prev.filter(f => f.id !== fileId));
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

            {/* Statystyki projektu */}
            <div className="tp-section-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '40px', padding: '20px' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <svg style={{ transform: 'rotate(-90deg)', width: '100px', height: '100px' }}>
                        <circle 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            stroke="var(--border-color, rgba(255,255,255,0.05))" 
                            strokeWidth="8" 
                            fill="transparent" 
                        />
                        <circle 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            stroke="#10b981" 
                            strokeWidth="8" 
                            fill="transparent" 
                            strokeDasharray={2 * Math.PI * 40}
                            strokeDashoffset={2 * Math.PI * 40 * (1 - (tasks.length > 0 ? tasks.filter(t => t.status === "DONE").length / tasks.length : 0))}
                            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                        />
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                            {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "DONE").length / tasks.length) * 100) : 0}%
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary, #9ca3af)' }}>ukończono</span>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Postęp prac projektowych</h3>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <div>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary, #9ca3af)' }}>Suma zadań:</span>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{tasks.length}</div>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingLeft: '20px' }}>
                            <span style={{ fontSize: '12px', color: '#f59e0b' }}>Do zrobienia:</span>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{tasks.filter(t => t.status === "TODO").length}</div>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingLeft: '20px' }}>
                            <span style={{ fontSize: '12px', color: '#3b82f6' }}>W realizacji:</span>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>{tasks.filter(t => t.status === "IN_PROGRESS").length}</div>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingLeft: '20px' }}>
                            <span style={{ fontSize: '12px', color: '#10b981' }}>Zakończone:</span>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{tasks.filter(t => t.status === "DONE").length}</div>
                        </div>
                    </div>
                    {/* Progres segmentowy */}
                    <div style={{ height: '8px', width: '100%', background: 'var(--border-color, rgba(255,255,255,0.05))', borderRadius: '4px', display: 'flex', overflow: 'hidden', marginTop: '5px' }}>
                        <div style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === "DONE").length / tasks.length) * 100 : 0}%`, background: '#10b981', transition: 'width 0.3s ease' }} />
                        <div style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === "IN_PROGRESS").length / tasks.length) * 100 : 0}%`, background: '#3b82f6', transition: 'width 0.3s ease' }} />
                        <div style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === "TODO").length / tasks.length) * 100 : 0}%`, background: '#f59e0b', transition: 'width 0.3s ease' }} />
                    </div>
                </div>
            </div>

            {/* Główny układ: tablica Kanban po lewej, pliki i chat po prawej */}
            <div className="tp-workspace-layout">
                
                {/* Tablica Kanban */}
                <div className="tp-board-wrapper">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="tp-board-title">Tablica Scrum</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="tp-back-btn" style={{ background: '#10b981', color: '#fff', borderColor: '#10b981' }} onClick={handleExportToPDF}>
                                📄 Eksportuj PDF
                            </button>
                            {isLecturer && (
                                <button className="tp-back-btn" style={{ background: '#4f7ef7', color: '#fff', borderColor: '#4f7ef7' }} onClick={() => setShowAddTaskModal(true)}>
                                    + Dodaj Zadanie
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="tp-board-columns">
                        
                        {/* Kolumna TODO */}
                        <div className="tp-column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "TODO")}>
                            <div className="tp-column-header">
                                <span className="tp-column-title tp-column-todo">Do zrobienia</span>
                                <span className="tp-task-count">{todoTasks.length}</span>
                            </div>
                            <div className="tp-task-list">
                                {todoTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        className="tp-task-card" 
                                        draggable={true} 
                                        onDragStart={(e) => handleDragStart(e, task)} 
                                        onClick={() => handleOpenTaskDetails(task)} 
                                        style={{ cursor: 'grab' }}
                                    >
                                        <h3 className="tp-task-title">{task.nazwa}</h3>
                                        <p className="tp-task-desc">{task.opis}</p>
                                        
                                        {/* Przypisanie studenta */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Przypisany:</span>
                                            {isLecturer ? (
                                                <select
                                                    className="tp-chat-input"
                                                    style={{ padding: '4px', fontSize: '11px' }}
                                                    value={task.przypisanyStudent?.id || ""}
                                                    onClick={e => e.stopPropagation()}
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

                                        <div className="tp-task-footer" onClick={e => e.stopPropagation()}>
                                            <div className="tp-task-actions">
                                                {isLecturer && (
                                                    <button className="tp-task-btn tp-task-btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} title="Usuń zadanie">✕</button>
                                                )}
                                            </div>
                                            <button className="tp-task-btn" onClick={(e) => { e.stopPropagation(); moveTask(task, "forward"); }} title="W toku">→</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Kolumna IN PROGRESS */}
                        <div className="tp-column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "IN_PROGRESS")}>
                            <div className="tp-column-header">
                                <span className="tp-column-title tp-column-progress">W realizacji</span>
                                <span className="tp-task-count">{progressTasks.length}</span>
                            </div>
                            <div className="tp-task-list">
                                {progressTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        className="tp-task-card" 
                                        draggable={true} 
                                        onDragStart={(e) => handleDragStart(e, task)} 
                                        onClick={() => handleOpenTaskDetails(task)} 
                                        style={{ cursor: 'grab' }}
                                    >
                                        <h3 className="tp-task-title">{task.nazwa}</h3>
                                        <p className="tp-task-desc">{task.opis}</p>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Przypisany:</span>
                                            {isLecturer ? (
                                                <select
                                                    className="tp-chat-input"
                                                    style={{ padding: '4px', fontSize: '11px' }}
                                                    value={task.przypisanyStudent?.id || ""}
                                                    onClick={e => e.stopPropagation()}
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

                                        <div className="tp-task-footer" onClick={e => e.stopPropagation()}>
                                            <button className="tp-task-btn" onClick={(e) => { e.stopPropagation(); moveTask(task, "backward"); }} title="Do zrobienia">←</button>
                                            <div className="tp-task-actions">
                                                {isLecturer && (
                                                    <button className="tp-task-btn tp-task-btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} title="Usuń zadanie">✕</button>
                                                )}
                                            </div>
                                            <button className="tp-task-btn" onClick={(e) => { e.stopPropagation(); moveTask(task, "forward"); }} title="Zakończone">→</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Kolumna DONE */}
                        <div className="tp-column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "DONE")}>
                            <div className="tp-column-header">
                                <span className="tp-column-title tp-column-done">Zakończone</span>
                                <span className="tp-task-count">{doneTasks.length}</span>
                            </div>
                            <div className="tp-task-list">
                                {doneTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        className="tp-task-card" 
                                        draggable={true} 
                                        onDragStart={(e) => handleDragStart(e, task)} 
                                        onClick={() => handleOpenTaskDetails(task)} 
                                        style={{ cursor: 'grab', opacity: 0.85 }}
                                    >
                                        <h3 className="tp-task-title" style={{ textDecoration: 'line-through' }}>{task.nazwa}</h3>
                                        <p className="tp-task-desc">{task.opis}</p>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Przypisany:</span>
                                            <span className="tp-task-assignee" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                                {task.przypisanyStudent ? `${task.przypisanyStudent.imie} ${task.przypisanyStudent.nazwisko}` : "Brak"}
                                            </span>
                                        </div>

                                        <div className="tp-task-footer" onClick={e => e.stopPropagation()}>
                                            <button className="tp-task-btn" onClick={(e) => { e.stopPropagation(); moveTask(task, "backward"); }} title="W realizacji">←</button>
                                            <div className="tp-task-actions">
                                                {isLecturer && (
                                                    <button className="tp-task-btn tp-task-btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} title="Usuń zadanie">✕</button>
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

            {/* Modal szczegółów zadania */}
            {showTaskDetailsModal && selectedTask && (
                <div className="tp-modal">
                    <div className="tp-modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                            <h2 className="tp-modal-title" style={{ margin: 0 }}>{selectedTask.nazwa}</h2>
                            <button className="tp-file-btn tp-file-btn-delete" onClick={() => setShowTaskDetailsModal(false)} style={{ fontSize: '18px', padding: '4px 10px' }}>✕</button>
                        </div>
                        
                        <div className="task-details-grid-container" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginTop: '15px' }}>
                            {/* Lewa kolumna: Opis i Komentarze */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#9ca3af' }}>Opis</h4>
                                    <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        {selectedTask.opis || "Brak opisu."}
                                    </p>
                                </div>

                                {/* Komentarze */}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '15px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#9ca3af' }}>Komentarze ({taskComments.length})</h4>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', marginBottom: '10px', paddingRight: '5px' }}>
                                        {taskComments.length === 0 ? (
                                            <span style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>Brak komentarzy. Dodaj pierwszy!</span>
                                        ) : (
                                            taskComments.map(c => {
                                                const isAuthor = c.autor?.id === currentUser?.id;
                                                return (
                                                    <div key={c.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                            <strong style={{ color: '#a78bfa' }}>{c.autor ? `${c.autor.imie} ${c.autor.nazwisko}` : "Użytkownik"}</strong>
                                                            <span style={{ fontSize: '10px', color: '#6b7280' }}>
                                                                {new Date(c.dataUtworzenia).toLocaleString("pl-PL")}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: '4px 0', color: '#e5e7eb', wordBreak: 'break-word' }}>{c.tresc}</p>
                                                        {(isAuthor || isLecturer) && (
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                                <button 
                                                                    onClick={() => handleDeleteComment(c.id)} 
                                                                    style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                                                                >
                                                                    Usuń
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <textarea
                                            placeholder="Napisz komentarz..."
                                            value={newCommentText}
                                            onChange={e => setNewCommentText(e.target.value)}
                                            style={{
                                                flex: 1,
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '6px',
                                                color: '#fff',
                                                padding: '6px 10px',
                                                fontSize: '13px',
                                                resize: 'none',
                                                height: '40px',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                        <button 
                                            onClick={handleAddComment}
                                            className="tp-chat-send"
                                            style={{ padding: '0 12px', height: '40px', fontSize: '13px' }}
                                        >
                                            Dodaj
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Prawa kolumna: Szczegóły i Załączniki */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '20px' }}>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Status:</span>
                                    <div style={{ marginTop: '4px' }}>
                                        <span className={`cal-task-status cal-status-${selectedTask.status.toLowerCase()}`}>
                                            {selectedTask.status === 'TODO' ? 'Do zrobienia' : 
                                             selectedTask.status === 'IN_PROGRESS' ? 'W realizacji' : 'Zakończone'}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Termin (Deadline):</span>
                                    <div style={{ marginTop: '4px' }}>
                                        {isLecturer ? (
                                            <input 
                                                type="date" 
                                                className="tp-chat-input"
                                                style={{ padding: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                                                value={selectedTask.deadline || ""}
                                                onChange={e => handleUpdateTaskDeadline(e.target.value)}
                                            />
                                        ) : (
                                            <strong style={{ fontSize: '14px', color: selectedTask.deadline ? '#f87171' : '#9ca3af' }}>
                                                {formatDate(selectedTask.deadline ?? "")}
                                            </strong>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Przypisany:</span>
                                    <div style={{ marginTop: '4px', fontSize: '14px' }}>
                                        {selectedTask.przypisanyStudent 
                                            ? `${selectedTask.przypisanyStudent.imie} ${selectedTask.przypisanyStudent.nazwisko}` 
                                            : "Brak"}
                                    </div>
                                </div>

                                {/* Pliki powiązane z tym zadaniem */}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '15px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#9ca3af' }}>Pliki zadania ({taskFiles.length})</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto', marginBottom: '8px' }}>
                                        {taskFiles.length === 0 ? (
                                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Brak załączników zadania.</span>
                                        ) : (
                                            taskFiles.map(file => (
                                                <div key={file.id} className="tp-file-item" style={{ padding: '6px', fontSize: '11px' }}>
                                                    <span className="tp-file-name" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.nazwaPliku}>
                                                        {file.nazwaPliku}
                                                    </span>
                                                    <div className="tp-file-actions">
                                                        <button className="tp-file-btn tp-file-btn-download" onClick={() => window.open(ENDPOINTS.files.download(file.id), "_blank")} style={{ padding: '2px 4px' }}>
                                                            ⬇
                                                        </button>
                                                        {(isLecturer || currentUser?.id === file.przeslanyPrzez?.id) && (
                                                            <button className="tp-file-btn tp-file-btn-delete" onClick={() => handleTaskFileDelete(file.id)} style={{ padding: '2px 4px' }}>
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <label className="tp-back-btn" style={{ display: 'block', fontSize: '11px', padding: '4px 8px', background: '#3b82f6', borderColor: '#3b82f6', color: '#fff', textAlign: 'center', cursor: 'pointer' }}>
                                        Dodaj plik do zadania
                                        <input 
                                            type="file" 
                                            style={{ display: 'none' }} 
                                            onChange={handleTaskFileUpload}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '15px', marginTop: '10px' }}>
                            <button className="ep-btn ep-btn-secondary" onClick={() => setShowTaskDetailsModal(false)}>
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TasksPage;
