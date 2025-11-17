import type { ExecutionResult } from "./executor";
import type { WorkerRequest, WorkerResponse } from "./worker";

/**
 * Execution Service
 *
 * Manages the Web Worker for code execution.
 * Provides a clean async API for executing code in a dedicated worker thread.
 */
export class ExecutionService {
    private worker: Worker | null = null;
    private pendingRequests: Map<
        string,
        {
            resolve: (value: ExecutionResult) => void;
            reject: (error: Error) => void;
        }
    > = new Map();
    private requestIdCounter = 0;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize the execution service and worker
     */
    async initialize(): Promise<void> {
        if (this.isInitialized && this.worker) {
            return;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initialize();
        return this.initPromise;
    }

    private async _initialize(): Promise<void> {
        try {
            // Create worker using Vite's worker import pattern
            // Using new URL with ?worker suffix for Vite bundling
            this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
                type: "module",
            });

            // Setup message handler
            this.worker.addEventListener(
                "message",
                this.handleWorkerMessage.bind(this)
            );
            this.worker.addEventListener(
                "error",
                this.handleWorkerError.bind(this)
            );

            // Initialize the executor in the worker
            await this.sendRequest({ type: "INIT" });

            this.isInitialized = true;
        } catch (error) {
            this.isInitialized = false;
            this.initPromise = null;
            throw new Error(
                `Failed to initialize execution service: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }

    /**
     * Execute code in the worker
     *
     * @param code - The code to execute
     * @param cellId - Unique identifier for the cell being executed
     * @returns Promise resolving to execution result
     */
    async execute(code: string, cellId: string): Promise<ExecutionResult> {
        if (!this.isInitialized || !this.worker) {
            await this.initialize();
        }

        if (!this.worker) {
            throw new Error("Worker not initialized");
        }

        return this.sendRequest({ type: "EXECUTE", code, cellId });
    }

    /**
     * Reset the execution context
     * Clears all state from previous executions
     */
    async reset(): Promise<void> {
        if (!this.isInitialized || !this.worker) {
            return;
        }

        await this.sendRequest({ type: "RESET" });
    }

    /**
     * Destroy the execution service and cleanup worker
     */
    async destroy(): Promise<void> {
        if (this.worker) {
            try {
                await this.sendRequest({ type: "DESTROY" });
            } catch (error) {
                // Ignore errors during cleanup
                console.warn("Error during worker cleanup:", error);
            }

            this.worker.terminate();
            this.worker = null;
        }

        this.isInitialized = false;
        this.initPromise = null;
        this.pendingRequests.clear();
    }

    /**
     * Send a request to the worker and wait for response
     */
    private sendRequest<T extends WorkerResponse>(
        request: WorkerRequest
    ): Promise<ExecutionResult> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error("Worker not initialized"));
                return;
            }

            const requestId = `req_${this.requestIdCounter++}_${Date.now()}`;

            // Store the promise resolvers
            // For INIT, RESET, DESTROY, we'll handle them specially
            if (request.type === "INIT") {
                const initHandler = (event: MessageEvent<WorkerResponse>) => {
                    const response = event.data;
                    if (response.type === "INIT_SUCCESS") {
                        this.worker?.removeEventListener(
                            "message",
                            initHandler
                        );
                        resolve({ success: true });
                    } else if (response.type === "INIT_ERROR") {
                        this.worker?.removeEventListener(
                            "message",
                            initHandler
                        );
                        reject(new Error(response.error));
                    }
                };
                this.worker.addEventListener("message", initHandler);
                this.worker.postMessage(request);
                return;
            }

            if (request.type === "RESET") {
                const resetHandler = (event: MessageEvent<WorkerResponse>) => {
                    const response = event.data;
                    if (response.type === "RESET_SUCCESS") {
                        this.worker?.removeEventListener(
                            "message",
                            resetHandler
                        );
                        resolve({ success: true });
                    } else if (response.type === "EXECUTE_ERROR") {
                        this.worker?.removeEventListener(
                            "message",
                            resetHandler
                        );
                        reject(new Error(response.error));
                    }
                };
                this.worker.addEventListener("message", resetHandler);
                this.worker.postMessage(request);
                return;
            }

            if (request.type === "DESTROY") {
                const destroyHandler = (
                    event: MessageEvent<WorkerResponse>
                ) => {
                    const response = event.data;
                    if (response.type === "DESTROY_SUCCESS") {
                        this.worker?.removeEventListener(
                            "message",
                            destroyHandler
                        );
                        resolve({ success: true });
                    } else if (response.type === "EXECUTE_ERROR") {
                        this.worker?.removeEventListener(
                            "message",
                            destroyHandler
                        );
                        reject(new Error(response.error));
                    }
                };
                this.worker.addEventListener("message", destroyHandler);
                this.worker.postMessage(request);
                return;
            }

            // For EXECUTE requests, use cellId as the key
            if (request.type === "EXECUTE") {
                this.pendingRequests.set(request.cellId, { resolve, reject });
                this.worker.postMessage(request);
            } else {
                reject(
                    new Error(`Unknown request type: ${(request as any).type}`)
                );
            }
        });
    }

    /**
     * Handle messages from worker
     */
    private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
        const response = event.data;

        if (response.type === "EXECUTE_SUCCESS") {
            const pending = this.pendingRequests.get(response.cellId);
            if (pending) {
                this.pendingRequests.delete(response.cellId);
                pending.resolve(response.result);
            }
        } else if (response.type === "EXECUTE_ERROR") {
            const pending = this.pendingRequests.get(response.cellId);
            if (pending) {
                this.pendingRequests.delete(response.cellId);
                pending.reject(new Error(response.error));
            }
        }
        // INIT, RESET, DESTROY responses are handled by their specific handlers
    }

    /**
     * Handle worker errors
     */
    private handleWorkerError(error: ErrorEvent): void {
        console.error("Worker error:", error);
        // Reject all pending requests
        for (const [cellId, { reject }] of this.pendingRequests.entries()) {
            reject(new Error(`Worker error: ${error.message}`));
        }
        this.pendingRequests.clear();
        this.isInitialized = false;
    }
}

/**
 * Singleton instance of ExecutionService
 * Can be imported and used throughout the application
 */
export const executionService = new ExecutionService();
