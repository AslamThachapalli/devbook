import React, { useState, useEffect } from "react";
import { Dialog, Button, SelectInput } from "../../../components";
import {
    checkNameUnique,
    saveNotebook,
    type Notebook,
} from "../../../services/apis";

interface CreateNotebookDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    parentPath?: string;
}

export function CreateNotebookDialog({
    isOpen,
    onClose,
    onSuccess,
    parentPath,
}: CreateNotebookDialogProps) {
    const [name, setName] = useState("");
    const [language, setLanguage] = useState<"js" | "ts">("js");
    const [error, setError] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName("");
            setLanguage("js");
            setError("");
        }
    }, [isOpen]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Notebook name is required");
            return;
        }

        // Validate name (no slashes, valid characters)
        if (name.includes("/")) {
            setError("Notebook name cannot contain slashes");
            return;
        }

        // Check if name is unique
        setIsCreating(true);
        try {
            const isUnique = await checkNameUnique(
                name.trim(),
                parentPath || ""
            );
            if (!isUnique) {
                setError(
                    "A notebook with this name already exists in this location"
                );
                setIsCreating(false);
                return;
            }

            // Create the notebook
            const fullPath = parentPath
                ? `${parentPath}/${name.trim()}`
                : name.trim();
            const notebook: Notebook = {
                id: crypto.randomUUID(),
                name: name.trim(),
                path: fullPath,
                language,
                cells: [
                    {
                        id: crypto.randomUUID(),
                        type: "markdown",
                        source: "",
                    },
                ],
                writable: true,
            };

            await saveNotebook(notebook);
            onSuccess();
            onClose();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create notebook"
            );
        } finally {
            setIsCreating(false);
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Notebook"
            maxWidth="md"
        >
            <form onSubmit={handleSubmit} className="p-4">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notebook Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="my-notebook"
                        autoFocus
                    />
                    {parentPath && (
                        <p className="mt-1 text-xs text-gray-500">
                            Path: {parentPath}/
                        </p>
                    )}
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                    </label>
                    <SelectInput
                        options={[
                            { value: "js", label: "JavaScript" },
                            { value: "ts", label: "TypeScript" },
                        ]}
                        value={language}
                        onChange={(value) => setLanguage(value as "js" | "ts")}
                    />
                </div>
                {error && (
                    <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {error}
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isCreating}
                    >
                        {isCreating ? "Creating..." : "Create"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
