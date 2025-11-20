import { openDatabase } from "../core";

const STORE_NAME = "notebooks";

export interface Notebook {
    id: string;
    cells: Array<{
        id: string;
        type: "markdown" | "code";
        source: string;
        output?: { type: "stdout" | "stderr"; data: string };
    }>;
    language: "js" | "ts";
    createdAt?: number;
    updatedAt?: number;
    name: string;
    path: string;
    writable: boolean;
}

export interface Folder {
    name: string;
    path: string;
    type: "folder";
}

export type NotebookItem = Notebook | Folder;

export async function getAllNotebooks(): Promise<Notebook[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

export async function getNotebookByPath(
    path: string
): Promise<Notebook | null> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(path);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

export async function checkNameUnique(
    name: string,
    parentPath: string
): Promise<boolean> {
    const notebooks = await getAllNotebooks();
    const fullPath = parentPath ? `${parentPath}/${name}` : name;

    // Check if any notebook has this exact path
    return !notebooks.some((nb) => nb.path === fullPath);
}

export async function saveNotebook(notebook: Notebook): Promise<string> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        // Use path as the key since that's what the database uses
        const getRequest = store.get(notebook.path);

        getRequest.onsuccess = () => {
            const existing = getRequest.result;

            if (!existing) {
                // New notebook
                notebook.createdAt = Date.now();
                notebook.updatedAt = Date.now();
            } else {
                // Update existing notebook
                notebook.createdAt = existing.createdAt || Date.now();
                notebook.updatedAt = Date.now();
            }

            // Now save the notebook
            const putRequest = store.put(notebook);

            putRequest.onsuccess = () => resolve(notebook.path);
            putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
}

export async function deleteNotebook(path: string): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(path);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
