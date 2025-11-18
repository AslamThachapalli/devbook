import React, { useCallback } from "react";
import { Play, Plus, Save } from "lucide-react";
import { IconButton, SelectInput } from "../../../components";
import {
    NotebookCell,
    type Cell,
    type CellExecutedOutput,
    type CellType,
    type NotebookCellRef,
} from "../components/NotebookCell";
import { useAppDispatch } from "../../../applicationState";
import { saveNotebookThunk } from "../../../applicationState/editorSlice";
import { executionService } from "../../../services/core/execution";

export function Editor() {
    const dispatch = useAppDispatch();

    const notebookRefs = React.useRef<{ [id: string]: NotebookCellRef | null }>(
        {}
    );

    const [cells, setCells] = React.useState<Cell[]>([
        { id: crypto.randomUUID(), type: "markdown", source: "" },
    ]);
    const [activeCellId, setActiveCellId] = React.useState<string>("");
    const [language, setLanguage] = React.useState<"js" | "ts">("js");
    const [executingCellId, setExecutingCellId] = React.useState<string | null>(
        null
    );

    const activeCell = cells.find((cell) => cell.id === activeCellId);

    // Initialize execution service on mount
    React.useEffect(() => {
        executionService.initialize().catch((error) => {
            console.error("Failed to initialize execution service:", error);
        });

        // Cleanup: destroy execution service on unmount
        return () => {
            executionService.destroy().catch((error) => {
                console.error("Failed to destroy execution service:", error);
            });
        };
    }, []);

    function handleAddCell() {
        const newCell: Cell = {
            id: crypto.randomUUID(),
            type: "markdown",
            source: "",
        };
        setCells((prev) => [...prev, newCell]);
        setActiveCellId(newCell.id);
    }

    const handleMoveCellUp = useCallback((id: string) => {
        setCells((prev) => {
            const index = prev.findIndex((cell) => cell.id === id);
            if (index <= 0) return prev; // Can't move up if already at top

            const newCells = [...prev];
            [newCells[index - 1], newCells[index]] = [
                newCells[index],
                newCells[index - 1],
            ];
            return newCells;
        });
    }, []);

    const handleMoveCellDown = useCallback((id: string) => {
        setCells((prev) => {
            const index = prev.findIndex((cell) => cell.id === id);
            if (index < 0 || index >= prev.length - 1) return prev; // Can't move down if already at bottom

            const newCells = [...prev];
            [newCells[index], newCells[index + 1]] = [
                newCells[index + 1],
                newCells[index],
            ];
            return newCells;
        });
    }, []);

    const handleAddCellAbove = useCallback((id: string) => {
        const newCell: Cell = {
            id: crypto.randomUUID(),
            type: "markdown",
            source: "",
        };
        setCells((prev) => {
            const index = prev.findIndex((cell) => cell.id === id);
            if (index < 0) return prev;
            const newCells = [...prev];
            newCells.splice(index, 0, newCell);
            return newCells;
        });
        setActiveCellId(newCell.id);
    }, []);

    const handleAddCellBelow = useCallback((id: string) => {
        const newCell: Cell = {
            id: crypto.randomUUID(),
            type: "markdown",
            source: "",
        };
        setCells((prev) => {
            const index = prev.findIndex((cell) => cell.id === id);
            if (index < 0) return prev;
            const newCells = [...prev];
            newCells.splice(index + 1, 0, newCell);
            return newCells;
        });
        setActiveCellId(newCell.id);
    }, []);

    const handleDeleteCell = useCallback(
        (id: string) => {
            setCells((prev) => {
                const filtered = prev.filter((cell) => cell.id !== id);
                // If we deleted the active cell, activate the previous one or the first one
                if (id === activeCellId) {
                    const deletedIndex = prev.findIndex(
                        (cell) => cell.id === id
                    );
                    if (deletedIndex > 0) {
                        setActiveCellId(prev[deletedIndex - 1].id);
                    } else if (filtered.length > 0) {
                        setActiveCellId(filtered[0].id);
                    } else {
                        setActiveCellId("");
                    }
                }
                return filtered;
            });
        },
        [activeCellId]
    );

    function handleCellChange(id: string, source: string) {
        setCells((prev) =>
            prev.map((cell) => (cell.id === id ? { ...cell, source } : cell))
        );
    }

    function handleCellTypeChange(type: CellType) {
        if (activeCellId) {
            setCells((prev) =>
                prev.map((cell) =>
                    cell.id === activeCellId ? { ...cell, type } : cell
                )
            );
        }
    }

    /**
     * Execute a cell in isolation - no shared state between cells
     */
    async function handleExecuteCell(id: string) {
        const cell = cells.find((c) => c.id === id);
        if (!cell) return;

        // For markdown cells, just render them
        if (cell.type === "markdown") {
            if (notebookRefs.current[id]) {
                notebookRefs.current[id]?.executeCell();
            }
            return;
        }

        // For code cells, execute in isolation
        if (cell.type === "code" && language === "js") {
            setExecutingCellId(id);

            try {
                // Execute the current cell only - no preceding cells
                const result = await executionService.execute(cell.source, id);

                // Update cell output
                handleOnCellExecuted({
                    cellId: id,
                    cellType: "code",
                    output: result.output
                        ? {
                              type: result.output.type,
                              data: result.output.data,
                          }
                        : result.error
                        ? {
                              type: "stdout",
                              data: `Error: ${result.error.message}`,
                          }
                        : undefined,
                });
            } catch (error) {
                // Handle execution error
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                handleOnCellExecuted({
                    cellId: id,
                    cellType: "code",
                    output: {
                        type: "stdout",
                        data: `Execution error: ${errorMessage}`,
                    },
                });
            } finally {
                setExecutingCellId(null);
            }
        } else {
            // For non-JS code cells or if execution service is not available
            if (notebookRefs.current[id]) {
                notebookRefs.current[id]?.executeCell();
            }
        }
    }

    function handleOnCellExecuted(output: CellExecutedOutput) {
        if (output.cellType === "code") {
            setCells((prev) =>
                prev.map((cell) =>
                    cell.id === output.cellId
                        ? { ...cell, output: output.output }
                        : cell
                )
            );
        } else if (output.cellType === "markdown") {
            setCells((prev) =>
                prev.map((cell) =>
                    cell.id === output.cellId
                        ? { ...cell, output: undefined }
                        : cell
                )
            );
        }

        setActiveCellId("");
    }

    // Keyboard shortcuts for cell operations
    React.useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            // Only handle shortcuts when a cell is active
            if (!activeCellId) return;

            // Skip if it's just a modifier key being pressed
            const isModifierKey =
                event.key === "Alt" ||
                event.key === "Control" ||
                event.key === "Meta" ||
                event.key === "Shift";

            if (isModifierKey) return;

            // Detect Mac (more reliable method)
            const isMac =
                navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
                navigator.userAgent.toUpperCase().indexOf("MAC") >= 0;

            // Mac: Cmd+Shift+key, Windows/Linux: Alt+key
            // Also allow Alt+key on Mac as fallback for better compatibility
            const isMacShortcut =
                isMac &&
                event.metaKey &&
                event.shiftKey &&
                !event.ctrlKey &&
                !event.altKey;
            const isWindowsShortcut =
                event.altKey &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey;

            if (isMacShortcut || isWindowsShortcut) {
                switch (event.key.toLowerCase()) {
                    case "a":
                        event.preventDefault();
                        handleAddCellAbove(activeCellId);
                        break;
                    case "b":
                        event.preventDefault();
                        handleAddCellBelow(activeCellId);
                        break;
                    case "d":
                        event.preventDefault();
                        handleDeleteCell(activeCellId);
                        break;
                    case "r":
                        event.preventDefault();
                        handleExecuteCell(activeCellId);
                        break;
                    case "arrowup":
                        event.preventDefault();
                        handleMoveCellUp(activeCellId);
                        break;
                    case "arrowdown":
                        event.preventDefault();
                        handleMoveCellDown(activeCellId);
                        break;
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        activeCellId,
        handleAddCellAbove,
        handleAddCellBelow,
        handleDeleteCell,
        handleMoveCellUp,
        handleMoveCellDown,
    ]);

    function handleSaveNotebook() {
        dispatch(
            saveNotebookThunk({
                notebook: {
                    id: crypto.randomUUID(),
                    cells: cells,
                    language: language,
                    name: "Untitled",
                    path: "",
                    writable: true,
                },
            })
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="py-1 shadow-sm bg-white fixed top-0 right-0 left-0 z-10">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <div className="flex gap-1">
                        <IconButton
                            icon={<Save size={16} />}
                            onClick={handleSaveNotebook}
                            hintText="Save Notebook"
                        />
                        <IconButton
                            icon={<Plus size={16} />}
                            onClick={handleAddCell}
                            hintText="Add new cell"
                        />
                        <IconButton
                            icon={<Play size={16} />}
                            onClick={() => handleExecuteCell(activeCellId)}
                            hintText="Execute cell (cmd+shift+r/alt+r)"
                        />
                        <SelectInput
                            options={[
                                { value: "markdown", label: "Markdown" },
                                { value: "code", label: "Code" },
                            ]}
                            value={activeCell?.type ?? "markdown"}
                            onChange={(value) =>
                                handleCellTypeChange(value as CellType)
                            }
                        />
                    </div>

                    <SelectInput
                        options={[
                            { value: "js", label: "JavaScript" },
                            { value: "ts", label: "TypeScript" },
                        ]}
                        value={language}
                        onChange={(value) => {
                            const newLanguage = value as "js" | "ts";
                            setLanguage(newLanguage);
                            // Clear all cell outputs when language changes
                            setCells((prev) =>
                                prev.map((cell) => ({
                                    ...cell,
                                    output: undefined,
                                }))
                            );
                        }}
                    />
                </div>
            </div>

            <div className="max-w-5xl mx-auto py-10">
                {cells.map((cell) => (
                    <NotebookCell
                        ref={(ref) => {
                            notebookRefs.current[cell.id] = ref;
                        }}
                        key={cell.id}
                        cell={cell}
                        isActive={cell.id === activeCellId}
                        onChange={(content) => {
                            handleCellChange(cell.id, content);
                        }}
                        onClick={() => {
                            setActiveCellId(cell.id);
                        }}
                        language={language}
                        onCellExecuted={handleOnCellExecuted}
                        isExecuting={executingCellId === cell.id}
                        onMoveUp={() => handleMoveCellUp(cell.id)}
                        onMoveDown={() => handleMoveCellDown(cell.id)}
                        onAddAbove={() => handleAddCellAbove(cell.id)}
                        onAddBelow={() => handleAddCellBelow(cell.id)}
                        onDelete={() => handleDeleteCell(cell.id)}
                    />
                ))}
            </div>
        </div>
    );
}
