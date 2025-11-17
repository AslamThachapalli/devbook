/**
 * Execution result from running code
 */
export interface ExecutionResult {
    success: boolean;
    output?: {
        type: "stdout" | "stderr";
        data: string;
    };
    error?: {
        message: string;
        stack?: string;
        name?: string;
    };
}

/**
 * Execution context that can be passed between cells
 * Allows for stateful execution across multiple cells
 */
export interface ExecutionContext {
    // Serialized state from previous executions
    // For JS: we maintain a VM context that persists
    state?: string;
}

/**
 * Base interface for all code executors
 *
 * This abstraction allows for:
 * - Different language executors (JS, TS, Python, etc.)
 * - Local vs Remote executors
 * - Different execution strategies
 */
export interface Executor {
    /**
     * Initialize the executor
     * Called once when the executor is created
     */
    initialize(): Promise<void>;

    /**
     * Execute code with optional context from previous cells
     *
     * @param code - The code to execute
     * @param context - Optional execution context from previous cells
     * @returns Promise resolving to execution result
     */
    execute(code: string, context?: ExecutionContext): Promise<ExecutionResult>;

    /**
     * Reset the execution context
     * Clears all state and variables from previous executions
     */
    reset(): Promise<void>;

    /**
     * Cleanup resources and destroy the executor
     */
    destroy(): Promise<void>;
}
