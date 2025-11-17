/**
 * Web Worker entry point for code execution
 *
 * This file is imported as a Web Worker by the ExecutionService.
 * Vite will handle the worker bundling automatically.
 */

import { JSExecutor } from "./jsExecutor";
import type { ExecutionResult } from "./executor";

/**
 * Message types sent from main thread to worker
 */
export type WorkerRequest =
    | { type: "INIT" }
    | { type: "EXECUTE"; code: string; cellId: string }
    | { type: "RESET" }
    | { type: "DESTROY" };

/**
 * Message types sent from worker to main thread
 */
export type WorkerResponse =
    | { type: "INIT_SUCCESS" }
    | { type: "INIT_ERROR"; error: string }
    | { type: "EXECUTE_SUCCESS"; cellId: string; result: ExecutionResult }
    | { type: "EXECUTE_ERROR"; cellId: string; error: string }
    | { type: "RESET_SUCCESS" }
    | { type: "DESTROY_SUCCESS" };

/**
 * Worker state
 */
let executor: JSExecutor | null = null;
let isInitialized = false;

/**
 * Send response to main thread
 */
function sendResponse(response: WorkerResponse): void {
    self.postMessage(response);
}

/**
 * Handle initialization request
 */
async function handleInit(): Promise<void> {
    try {
        if (executor) {
            await executor.destroy();
        }

        executor = new JSExecutor();
        await executor.initialize();
        isInitialized = true;

        sendResponse({ type: "INIT_SUCCESS" });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        sendResponse({ type: "INIT_ERROR", error: errorMessage });
    }
}

/**
 * Handle execution request
 */
async function handleExecute(code: string, cellId: string): Promise<void> {
    try {
        if (!executor || !isInitialized) {
            throw new Error("Executor not initialized. Call INIT first.");
        }

        const result = await executor.execute(code);
        sendResponse({ type: "EXECUTE_SUCCESS", cellId, result });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        sendResponse({ type: "EXECUTE_ERROR", cellId, error: errorMessage });
    }
}

/**
 * Handle reset request
 */
async function handleReset(): Promise<void> {
    try {
        if (!executor || !isInitialized) {
            throw new Error("Executor not initialized. Call INIT first.");
        }

        await executor.reset();
        sendResponse({ type: "RESET_SUCCESS" });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        sendResponse({
            type: "EXECUTE_ERROR",
            cellId: "",
            error: errorMessage,
        });
    }
}

/**
 * Handle destroy request
 */
async function handleDestroy(): Promise<void> {
    try {
        if (executor) {
            await executor.destroy();
            executor = null;
            isInitialized = false;
        }

        sendResponse({ type: "DESTROY_SUCCESS" });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        sendResponse({
            type: "EXECUTE_ERROR",
            cellId: "",
            error: errorMessage,
        });
    }
}

/**
 * Main message handler
 */
self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
    const request = event.data;

    switch (request.type) {
        case "INIT":
            await handleInit();
            break;

        case "EXECUTE":
            await handleExecute(request.code, request.cellId);
            break;

        case "RESET":
            await handleReset();
            break;

        case "DESTROY":
            await handleDestroy();
            break;

        default:
            sendResponse({
                type: "EXECUTE_ERROR",
                cellId: "",
                error: `Unknown request type: ${(request as any).type}`,
            });
    }
});
