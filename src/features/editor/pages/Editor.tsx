import React from "react";
import { Play, Plus, Save } from "lucide-react";
import { IconButton, SelectInput } from "../../../components";
import {
    NotebookCell,
    type Cell,
    type CellType,
} from "../components/NotebookCell";

export function Editor() {
    const [cells, setCells] = React.useState<Cell[]>([
        { id: crypto.randomUUID(), type: "markdown", source: "" },
    ]);
    const [activeCellId, setActiveCellId] = React.useState<string>("1");
    const [language, setLanguage] = React.useState<"js" | "ts">("js");

    const activeCell = cells.find((cell) => cell.id === activeCellId);

    const handleAddCell = React.useCallback(() => {
        const newCell: Cell = {
            id: crypto.randomUUID(),
            type: "markdown",
            source: "",
        };
        setCells((prev) => [...prev, newCell]);
        setActiveCellId(newCell.id);
    }, []);

    const handleCellChange = React.useCallback(
        (id: string, source: string) => {
            setCells((prev) =>
                prev.map((cell) =>
                    cell.id === id ? { ...cell, source } : cell
                )
            );
        },
        []
    );

    const handleCellTypeChange = React.useCallback(
        (type: CellType) => {
            if (activeCellId) {
                setCells((prev) =>
                    prev.map((cell) =>
                        cell.id === activeCellId ? { ...cell, type } : cell
                    )
                );
            }
        },
        [activeCellId]
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="py-1 shadow-sm bg-white">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <div className="flex gap-1">
                        <IconButton
                            icon={<Save size={16} />}
                            onClick={() => {}}
                        />
                        <IconButton
                            icon={<Plus size={16} />}
                            onClick={handleAddCell}
                        />
                        <IconButton
                            icon={<Play size={16} />}
                            onClick={() => {}}
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
                        onChange={(value) => setLanguage(value as "js" | "ts")}
                    />
                </div>
            </div>

            <div className="max-w-5xl mx-auto py-10">
                {cells.map((cell) => (
                    <NotebookCell
                        key={cell.id}
                        cell={cell}
                        isActive={cell.id === activeCellId}
                        onChange={(content) =>
                            handleCellChange(cell.id, content)
                        }
                        onClick={() => setActiveCellId(cell.id)}
                        language={language}
                    />
                ))}
            </div>
        </div>
    );
}
