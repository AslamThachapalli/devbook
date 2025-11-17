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

export async function saveNotebook(notebook: Notebook): Promise<string> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        // First, check if notebook exists
        const getRequest = store.get(notebook.id);

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

            putRequest.onsuccess = () => resolve(notebook.id);
            putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
}
