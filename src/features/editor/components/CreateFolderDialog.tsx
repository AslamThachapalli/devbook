import React, { useState, useEffect } from "react";
import { Dialog, Button } from "../../../components";
import { getAllNotebooks } from "../../../services/apis";

interface CreateFolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    parentPath?: string;
}

export function CreateFolderDialog({
    isOpen,
    onClose,
    onSuccess,
    parentPath,
}: CreateFolderDialogProps) {
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName("");
            setError("");
        }
    }, [isOpen]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Folder name is required");
            return;
        }

        // Validate name (no slashes, valid characters)
        if (name.includes("/")) {
            setError("Folder name cannot contain slashes");
            return;
        }

        // Check if name is unique (folders are represented by checking if any notebook starts with this path)
        setIsCreating(true);
        try {
            const fullPath = parentPath
                ? `${parentPath}/${name.trim()}`
                : name.trim();
            const notebooks = await getAllNotebooks();

            // Check if any notebook has this exact path or starts with this path
            const pathExists = notebooks.some(
                (nb) =>
                    nb.path === fullPath || nb.path.startsWith(fullPath + "/")
            );

            if (pathExists) {
                setError("A folder or notebook with this name already exists");
                setIsCreating(false);
                return;
            }

            // Folders don't need to be stored in the database - they're implicit from notebook paths
            // We just need to refresh the tree view
            onSuccess();
            onClose();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create folder"
            );
        } finally {
            setIsCreating(false);
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Folder"
            maxWidth="md"
        >
            <form onSubmit={handleSubmit} className="p-4">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Folder Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="my-folder"
                        autoFocus
                    />
                    {parentPath && (
                        <p className="mt-1 text-xs text-gray-500">
                            Path: {parentPath}/
                        </p>
                    )}
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
