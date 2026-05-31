export const BACKEND_URL = "http://localhost:8080";

export const ENDPOINTS = {
    projects: {
        getAll: () => `${BACKEND_URL}/api/projects`,
        getById: (id: number) => `${BACKEND_URL}/api/projects/${id}`,
        search: (query: string) => `${BACKEND_URL}/api/projects/search?q=${encodeURIComponent(query)}`,
        delete: (id: number) => `${BACKEND_URL}/api/projects/${id}`,
        update: (id: number) => `${BACKEND_URL}/api/projects/${id}`,
    },
    create: () => `${BACKEND_URL}/api/projects`,
    tasks: {
        getByProject: (projectId: number) => `${BACKEND_URL}/api/projects/${projectId}/tasks`,
    },
    students: {
        getByProject: (projectId: number) => `${BACKEND_URL}/api/projects/${projectId}/students`,
    },
};