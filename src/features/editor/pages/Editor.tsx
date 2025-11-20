import React, { useCallback, useEffect } from "react";
import { Play, Plus, Save } from "lucide-react";
import { IconButton, SelectInput } from "../../../components";
import {
    NotebookCell,
    type Cell,
    type CellExecutedOutput,
    type CellType,
    type NotebookCellRef,
} from "../components/NotebookCell";
import { useAppDispatch, useAppSelector } from "../../../applicationState";
import { updateNotebook } from "../../../applicationState/editorSlice";
import { executionService } from "../../../services/core/execution";
import { Sidebar } from "../components/Sidebar";
import { TabBar } from "../components/TabBar";
import { saveNotebook } from "../../../services/apis";

export function Editor() {
    const dispatch = useAppDispatch();
    const openNotebooks = useAppSelector(
        (state) => state.editorSlice.openNotebooks
    );
    const activeNotebookPath = useAppSelector(
        (state) => state.editorSlice.activeNotebookPath
    );

    const notebookRefs = React.useRef<{ [id: string]: NotebookCellRef | null }>(
        {}
    );

    const [activeCellId, setActiveCellId] = React.useState<string>("");
    const [executingCellId, setExecutingCellId] = React.useState<string | null>(
        null
    );

    const activeNotebook = openNotebooks.find(
        (nb) => nb.path === activeNotebookPath
    );

    const cells = activeNotebook?.cells || [];
    const language = activeNotebook?.language || "js";
    const activeCell = cells.find((cell) => cell.id === activeCellId);

    // Initialize execution service on mount
    useEffect(() => {
        executionService.initialize().catch((error) => {
            console.error("Failed to initialize execution service:", error);
        });

        return () => {
            executionService.destroy().catch((error) => {
                console.error("Failed to destroy execution service:", error);
            });
        };
    }, []);

    function handleAddCell() {
        if (!activeNotebook) return;

        const newCell: Cell = {
            id: crypto.randomUUID(),
            type: "markdown",
            source: "",
        };
        const updatedCells = [...cells, newCell];
        updateNotebookCells(updatedCells);
        setActiveCellId(newCell.id);
    }

    const handleMoveCellUp = useCallback(
        (id: string) => {
            if (!activeNotebook) return;

            const index = cells.findIndex((cell) => cell.id === id);
            if (index <= 0) return;

            const newCells = [...cells];
            [newCells[index - 1], newCells[index]] = [
                newCells[index],
                newCells[index - 1],
            ];
            updateNotebookCells(newCells);
        },
        [cells, activeNotebook]
    );

    const handleMoveCellDown = useCallback(
        (id: string) => {
            if (!activeNotebook) return;

            const index = cells.findIndex((cell) => cell.id === id);
            if (index < 0 || index >= cells.length - 1) return;

            const newCells = [...cells];
            [newCells[index], newCells[index + 1]] = [
                newCells[index + 1],
                newCells[index],
            ];
            updateNotebookCells(newCells);
        },
        [cells, activeNotebook]
    );

    const handleAddCellAbove = useCallback(
        (id: string) => {
            if (!activeNotebook) return;

            const newCell: Cell = {
                id: crypto.randomUUID(),
                type: "markdown",
                source: "",
            };
            const index = cells.findIndex((cell) => cell.id === id);
            if (index < 0) return;
            const newCells = [...cells];
            newCells.splice(index, 0, newCell);
            updateNotebookCells(newCells);
            setActiveCellId(newCell.id);
        },
        [cells, activeNotebook]
    );

    const handleAddCellBelow = useCallback(
        (id: string) => {
            if (!activeNotebook) return;

            const newCell: Cell = {
                id: crypto.randomUUID(),
                type: "markdown",
                source: "",
            };
            const index = cells.findIndex((cell) => cell.id === id);
            if (index < 0) return;
            const newCells = [...cells];
            newCells.splice(index + 1, 0, newCell);
            updateNotebookCells(newCells);
            setActiveCellId(newCell.id);
        },
        [cells, activeNotebook]
    );

    const handleDeleteCell = useCallback(
        (id: string) => {
            if (!activeNotebook) return;

            const filtered = cells.filter((cell) => cell.id !== id);
            if (id === activeCellId) {
                const deletedIndex = cells.findIndex((cell) => cell.id === id);
                if (deletedIndex > 0) {
                    setActiveCellId(cells[deletedIndex - 1].id);
                } else if (filtered.length > 0) {
                    setActiveCellId(filtered[0].id);
                } else {
                    setActiveCellId("");
                }
            }
            updateNotebookCells(filtered);
        },
        [cells, activeCellId, activeNotebook]
    );

    function handleCellChange(id: string, source: string) {
        if (!activeNotebook) return;

        const updatedCells = cells.map((cell) =>
            cell.id === id ? { ...cell, source } : cell
        );
        updateNotebookCells(updatedCells, true);
    }

    function handleCellTypeChange(type: CellType) {
        if (!activeNotebook || !activeCellId) return;

        const updatedCells = cells.map((cell) =>
            cell.id === activeCellId ? { ...cell, type } : cell
        );
        updateNotebookCells(updatedCells, true);
    }

    function updateNotebookCells(
        newCells: Cell[],
        markUnsaved: boolean = false
    ) {
        if (!activeNotebook) return;

        dispatch(
            updateNotebook({
                path: activeNotebook.path,
                updates: {
                    cells: newCells,
                    hasUnsavedChanges:
                        markUnsaved || activeNotebook.hasUnsavedChanges,
                },
            })
        );
    }

    async function handleExecuteCell(id: string) {
        if (!activeNotebook) return;

        const cell = cells.find((c) => c.id === id);
        if (!cell) return;

        if (cell.type === "markdown") {
            if (notebookRefs.current[id]) {
                notebookRefs.current[id]?.executeCell();
            }
            return;
        }

        if (cell.type === "code" && language === "js") {
            setExecutingCellId(id);

            try {
                const result = await executionService.execute(cell.source, id);

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
            if (notebookRefs.current[id]) {
                notebookRefs.current[id]?.executeCell();
            }
        }
    }

    function handleOnCellExecuted(output: CellExecutedOutput) {
        if (!activeNotebook) return;

        if (output.cellType === "code") {
            const updatedCells = cells.map((cell) =>
                cell.id === output.cellId
                    ? { ...cell, output: output.output }
                    : cell
            );
            updateNotebookCells(updatedCells, true);
        } else if (output.cellType === "markdown") {
            const updatedCells = cells.map((cell) =>
                cell.id === output.cellId
                    ? { ...cell, output: undefined }
                    : cell
            );
            updateNotebookCells(updatedCells, true);
        }

        setActiveCellId("");
    }

    // Keyboard shortcuts for cell operations
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (!activeCellId || !activeNotebook) return;

            const isModifierKey =
                event.key === "Alt" ||
                event.key === "Control" ||
                event.key === "Meta" ||
                event.key === "Shift";

            if (isModifierKey) return;

            const isMac =
                navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
                navigator.userAgent.toUpperCase().indexOf("MAC") >= 0;

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
        activeNotebook,
        handleAddCellAbove,
        handleAddCellBelow,
        handleDeleteCell,
        handleMoveCellUp,
        handleMoveCellDown,
    ]);

    async function handleSaveNotebook() {
        if (!activeNotebook) return;

        try {
            await saveNotebook({
                id: crypto.randomUUID(),
                path: activeNotebook.path,
                name: activeNotebook.name,
                language: activeNotebook.language,
                cells: activeNotebook.cells,
                writable: true,
            });

            dispatch(
                updateNotebook({
                    path: activeNotebook.path,
                    updates: {
                        hasUnsavedChanges: false,
                    },
                })
            );
        } catch (error) {
            console.error("Failed to save notebook:", error);
        }
    }

    if (!activeNotebook) {
        return (
            <div className="h-screen flex">
                <div className="w-64 shrink-0">
                    <Sidebar />
                </div>
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="text-center text-gray-500">
                        <p className="text-lg mb-2">No notebook open</p>
                        <p className="text-sm">
                            Double-click a notebook in the sidebar to open it
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 shrink-0">
                    <Sidebar />
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tab Bar */}
                    <TabBar />

                    {/* Toolbar */}
                    <div className="py-1 shadow-sm bg-white border-b border-gray-200">
                        <div className="flex items-center justify-between max-w-5xl mx-auto px-4">
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
                                    onClick={() =>
                                        handleExecuteCell(activeCellId)
                                    }
                                    hintText="Execute cell (cmd+shift+r/alt+r)"
                                />
                                <SelectInput
                                    options={[
                                        {
                                            value: "markdown",
                                            label: "Markdown",
                                        },
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
                                    if (activeNotebook) {
                                        dispatch(
                                            updateNotebook({
                                                path: activeNotebook.path,
                                                updates: {
                                                    language: newLanguage,
                                                    cells: cells.map(
                                                        (cell) => ({
                                                            ...cell,
                                                            output: undefined,
                                                        })
                                                    ),
                                                },
                                            })
                                        );
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Cells */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="max-w-5xl mx-auto py-10">
                            {cells.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <p>
                                        No cells yet. Click the + button to add
                                        a cell.
                                    </p>
                                </div>
                            ) : (
                                cells.map((cell) => (
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
                                        isExecuting={
                                            executingCellId === cell.id
                                        }
                                        onMoveUp={() =>
                                            handleMoveCellUp(cell.id)
                                        }
                                        onMoveDown={() =>
                                            handleMoveCellDown(cell.id)
                                        }
                                        onAddAbove={() =>
                                            handleAddCellAbove(cell.id)
                                        }
                                        onAddBelow={() =>
                                            handleAddCellBelow(cell.id)
                                        }
                                        onDelete={() =>
                                            handleDeleteCell(cell.id)
                                        }
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
