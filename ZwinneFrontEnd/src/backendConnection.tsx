export const BACKEND_URL = "http://localhost:8080";

export const ENDPOINTS = {
    auth: {
        login: () => `${BACKEND_URL}/api/auth/login`,
        register: () => `${BACKEND_URL}/api/auth/register`,
        refresh: () => `${BACKEND_URL}/api/auth/refresh`,
        logout: () => `${BACKEND_URL}/api/auth/logout`,
    },
    projects: {
        getAll: (page = 0, size = 10, search = "", sortBy = "utworzony", direction = "DESC") => 
            `${BACKEND_URL}/api/projects?page=${page}&size=${size}&search=${encodeURIComponent(search)}&sortBy=${sortBy}&direction=${direction}`,
        getById: (id: number) => `${BACKEND_URL}/api/projects/${id}`,
        search: (query: string) => `${BACKEND_URL}/api/projects/search?q=${encodeURIComponent(query)}`,
        delete: (id: number) => `${BACKEND_URL}/api/projects/${id}`,
        update: (id: number) => `${BACKEND_URL}/api/projects/${id}`,
        getCalendar: () => `${BACKEND_URL}/api/projects/calendar`,
        getStats: (projectId: number) => `${BACKEND_URL}/api/projects/${projectId}/stats`,
    },
    create: () => `${BACKEND_URL}/api/projects`,
    tasks: {
        getByProject: (projectId: number) => `${BACKEND_URL}/api/projects/${projectId}/tasks`,
        create: (projectId: number) => `${BACKEND_URL}/api/projects/${projectId}/tasks`,
        update: (taskId: number) => `${BACKEND_URL}/api/tasks/${taskId}`,
        delete: (taskId: number) => `${BACKEND_URL}/api/tasks/${taskId}`,
        assign: (taskId: number, studentId: number | null) => `${BACKEND_URL}/api/tasks/${taskId}/assign/${studentId || ""}`,
        getComments: (taskId: number) => `${BACKEND_URL}/api/tasks/${taskId}/comments`,
        addComment: (taskId: number) => `${BACKEND_URL}/api/tasks/${taskId}/comments`,
        deleteComment: (commentId: number) => `${BACKEND_URL}/api/comments/${commentId}`,
    },
    students: {
        getAll: () => `${BACKEND_URL}/api/students`,
        getByProject: (projectId: number) => `${BACKEND_URL}/api/projects/${projectId}/students`,
        addToProject: (projectId: number, studentId: number) => `${BACKEND_URL}/api/projects/${projectId}/students/${studentId}`,
        removeFromProject: (projectId: number, studentId: number) => `${BACKEND_URL}/api/projects/${projectId}/students/${studentId}`,
    },
    files: {
        upload: (projectId: number, taskId?: number) => 
            `${BACKEND_URL}/api/projects/${projectId}/files${taskId ? `?taskId=${taskId}` : ""}`,
        download: (fileId: number) => `${BACKEND_URL}/api/files/${fileId}`,
        getByProject: (projectId: number) => `${BACKEND_URL}/api/projects/${projectId}/files`,
        getByTask: (taskId: number) => `${BACKEND_URL}/api/tasks/${taskId}/files`,
        delete: (fileId: number) => `${BACKEND_URL}/api/files/${fileId}`,
    },
    chat: {
        getPublicHistory: () => `${BACKEND_URL}/api/chat/public`,
        getProjectHistory: (projectId: number) => `${BACKEND_URL}/api/chat/project/${projectId}`,
        wsEndpoint: () => `${BACKEND_URL}/ws`,
    }
};

// Funkcja pomocnicza do wykonywania uwierzytelnionych żądań z obsługą odświeżania tokenu (JWT)
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let accessToken = localStorage.getItem("accessToken");
    
    // Inicjalizacja nagłówków
    const headers = new Headers(options.headers || {});
    if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }
    
    // Przypisanie nagłówków z powrotem do opcji
    const newOptions = { ...options, headers };
    
    let response = await fetch(url, newOptions);
    
    // Jeśli token wygasł (status 401), spróbujmy go odświeżyć
    if (response.status === 401) {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
            try {
                const refreshRes = await fetch(ENDPOINTS.auth.refresh(), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken }),
                });
                
                if (refreshRes.ok) {
                    const refreshData = await refreshRes.json();
                    localStorage.setItem("accessToken", refreshData.accessToken);
                    localStorage.setItem("refreshToken", refreshData.refreshToken);
                    
                    // Ponowne wykonanie żądania z nowym tokenem dostępu
                    headers.set("Authorization", `Bearer ${refreshData.accessToken}`);
                    response = await fetch(url, { ...options, headers });
                } else {
                    // Token odświeżania wygasł/jest niepoprawny - wyloguj
                    logoutUser();
                }
            } catch (err) {
                console.error("Błąd podczas odświeżania tokenu:", err);
                logoutUser();
            }
        } else {
            logoutUser();
        }
    }
    
    return response;
}

function logoutUser() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("currentUser");
    // Przekierowanie na stronę logowania
    window.location.href = "/";
}