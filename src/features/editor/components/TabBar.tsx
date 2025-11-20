import React from "react";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../applicationState";
import {
    closeNotebook,
    setActiveNotebook,
} from "../../../applicationState/editorSlice";

export function TabBar() {
    const dispatch = useAppDispatch();
    const openNotebooks = useAppSelector(
        (state) => state.editorSlice.openNotebooks
    );
    const activeNotebookPath = useAppSelector(
        (state) => state.editorSlice.activeNotebookPath
    );

    function handleCloseTab(path: string, e: React.MouseEvent) {
        e.stopPropagation();
        dispatch(closeNotebook(path));
    }

    function handleTabClick(path: string) {
        dispatch(setActiveNotebook(path));
    }

    if (openNotebooks.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center border-b border-gray-200 bg-gray-50 overflow-x-auto">
            {openNotebooks.map((notebook) => {
                const isActive = notebook.path === activeNotebookPath;
                return (
                    <div
                        key={notebook.path}
                        className={`flex items-center gap-2 px-3 py-2 border-r border-gray-200 cursor-pointer min-w-[120px] max-w-[200px] ${
                            isActive
                                ? "bg-white border-b-2 border-b-blue-500"
                                : "bg-gray-50 hover:bg-gray-100"
                        }`}
                        onClick={() => handleTabClick(notebook.path)}
                    >
                        <span
                            className={`text-sm truncate flex-1 ${
                                isActive
                                    ? "text-gray-900 font-medium"
                                    : "text-gray-600"
                            }`}
                            title={notebook.name}
                        >
                            {notebook.name}
                            {notebook.hasUnsavedChanges && (
                                <span className="ml-1 text-blue-500">●</span>
                            )}
                        </span>
                        <button
                            className="hover:bg-gray-200 rounded p-0.5 shrink-0"
                            onClick={(e) => handleCloseTab(notebook.path, e)}
                            title="Close"
                        >
                            <X size={14} className="text-gray-500" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
