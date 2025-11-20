import {
    createAsyncThunk,
    createSlice,
    type PayloadAction,
} from "@reduxjs/toolkit";
import { saveNotebook, type Notebook } from "../../services/apis";

type SaveNotebookThunkArg = {
    notebook: Notebook;
};

export const saveNotebookThunk = createAsyncThunk<string, SaveNotebookThunkArg>(
    "editor/saveNotebook",
    async (arg) => {
        const result = await saveNotebook(arg.notebook);
        return result;
    }
);

export interface OpenNotebook {
    path: string;
    name: string;
    language: "js" | "ts";
    cells: Notebook["cells"];
    hasUnsavedChanges?: boolean;
}

interface EditorState {
    openNotebooks: OpenNotebook[];
    activeNotebookPath: string | null;
}

const initialState: EditorState = {
    openNotebooks: [],
    activeNotebookPath: null,
};

const editorSlice = createSlice({
    name: "editor",
    initialState,
    reducers: {
        openNotebook: (state, action: PayloadAction<OpenNotebook>) => {
            const notebook = action.payload;
            // Check if notebook is already open
            const existingIndex = state.openNotebooks.findIndex(
                (nb) => nb.path === notebook.path
            );

            if (existingIndex === -1) {
                // Add new notebook
                state.openNotebooks.push(notebook);
            }
            // Set as active
            state.activeNotebookPath = notebook.path;
        },
        closeNotebook: (state, action: PayloadAction<string>) => {
            const path = action.payload;
            state.openNotebooks = state.openNotebooks.filter(
                (nb) => nb.path !== path
            );

            // If we closed the active notebook, switch to another one
            if (state.activeNotebookPath === path) {
                if (state.openNotebooks.length > 0) {
                    state.activeNotebookPath = state.openNotebooks[0].path;
                } else {
                    state.activeNotebookPath = null;
                }
            }
        },
        setActiveNotebook: (state, action: PayloadAction<string>) => {
            const path = action.payload;
            // Only set as active if it's actually open
            if (state.openNotebooks.some((nb) => nb.path === path)) {
                state.activeNotebookPath = path;
            }
        },
        updateNotebook: (
            state,
            action: PayloadAction<{
                path: string;
                updates: Partial<OpenNotebook>;
            }>
        ) => {
            const { path, updates } = action.payload;
            const index = state.openNotebooks.findIndex(
                (nb) => nb.path === path
            );
            if (index !== -1) {
                state.openNotebooks[index] = {
                    ...state.openNotebooks[index],
                    ...updates,
                };
            }
        },
    },
});

export const {
    openNotebook,
    closeNotebook,
    setActiveNotebook,
    updateNotebook,
} = editorSlice.actions;

export const editorSliceReducer = editorSlice.reducer;
