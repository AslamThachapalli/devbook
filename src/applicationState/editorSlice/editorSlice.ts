import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { saveNotebook } from "../../services/apis";

type SaveNotebookThunkArg = {
    notebook: {
        id: string;
        cells: Array<{
            id: string;
            type: "markdown" | "code";
            source: string;
            output?: { type: "stdout" | "stderr"; data: string };
        }>;
        language: "js" | "ts";
        name: string;
        path: string;
        writable: boolean;
    };
};

export const saveNotebookThunk = createAsyncThunk<string, SaveNotebookThunkArg>(
    "editor/saveNotebook",
    async (arg) => {
        const result = await saveNotebook(arg.notebook);

        return result;
    }
);

const editorSlice = createSlice({
    name: "editor",
    initialState: {},
    reducers: {},
});

export const editorSliceReducer = editorSlice.reducer;
