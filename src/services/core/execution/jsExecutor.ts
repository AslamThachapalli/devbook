import type { Executor, ExecutionResult, ExecutionContext } from "./executor";

/**
 * JavaScript Executor implementation
 *
 * Maintains a stateful execution context similar to Jupyter notebooks.
 * Each cell execution has access to variables and state from previous cells.
 */
export class JSExecutor implements Executor {
    private context: Record<string, any> = {};
    private outputBuffer: Array<{ type: "stdout" | "stderr"; data: string }> =
        [];
    private originalConsole: {
        log: typeof console.log;
        error: typeof console.error;
        warn: typeof console.warn;
        info: typeof console.info;
    };

    constructor() {
        // Store original console methods
        this.originalConsole = {
            log: console.log.bind(console),
            error: console.error.bind(console),
            warn: console.warn.bind(console),
            info: console.info.bind(console),
        };
    }

    async initialize(): Promise<void> {
        // Initialize with empty context
        this.context = {};
        this.outputBuffer = [];
    }

    async execute(
        code: string,
        _context?: ExecutionContext
    ): Promise<ExecutionResult> {
        // Clear output buffer for this execution
        this.outputBuffer = [];

        // Setup console interception
        this.setupConsoleInterception();

        try {
            // Build variable declarations from current context
            const contextKeys = Object.keys(this.context);
            const varDeclarations = this.buildVariableDeclarations(contextKeys);

            // Create a context object that will be mutated by the code
            // We'll pass it to the executor so variables can be synced back
            const executionContext: Record<string, any> = { ...this.context };

            // Execute code with access to context variables
            // We'll use Function constructor to create an execution environment
            // The context object is passed so we can sync variables back
            const executor = new Function(
                "context",
                `
                // Inject context variables into local scope
                ${varDeclarations}
                
                // Execute user code
                ${code}
                
                // Sync variables back to context object
                // We need to check if variables exist before syncing
                ${contextKeys
                    .map((key) => {
                        // Check if variable exists in scope and sync it back
                        // Using typeof check to see if variable is defined
                        return `
                    try {
                        if (typeof ${key} !== 'undefined') {
                            context['${key}'] = ${key};
                        }
                    } catch(e) {
                        // Variable doesn't exist or can't be accessed
                    }
                    `;
                    })
                    .join("\n")}
                `
            );

            // Execute with execution context
            executor(executionContext);

            // Update our context from execution context
            // Copy all properties that exist
            for (const key of contextKeys) {
                if (key in executionContext) {
                    this.context[key] = executionContext[key];
                }
            }

            // Also copy any new properties that might have been added
            Object.assign(this.context, executionContext);

            return {
                success: true,
                output: this.getCombinedOutput(),
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            const errorName = error instanceof Error ? error.name : "Error";

            return {
                success: false,
                output: this.getCombinedOutput(),
                error: {
                    message: errorMessage,
                    stack: errorStack,
                    name: errorName,
                },
            };
        } finally {
            // Restore original console methods
            this.restoreConsole();
        }
    }

    async reset(): Promise<void> {
        this.context = {};
        this.outputBuffer = [];
    }

    async destroy(): Promise<void> {
        await this.reset();
        // Cleanup if needed
    }

    /**
     * Build variable declarations from context keys
     * Handles different value types properly
     */
    private buildVariableDeclarations(keys: string[]): string {
        return keys
            .map((key) => {
                const value = this.context[key];
                return this.serializeValue(key, value);
            })
            .join("\n");
    }

    /**
     * Serialize a value for use in code
     * Handles primitives, objects, arrays, functions, etc.
     */
    private serializeValue(key: string, value: any): string {
        if (value === undefined) {
            return `var ${key} = undefined;`;
        }
        if (value === null) {
            return `var ${key} = null;`;
        }
        if (typeof value === "string") {
            return `var ${key} = ${JSON.stringify(value)};`;
        }
        if (typeof value === "number" || typeof value === "boolean") {
            return `var ${key} = ${String(value)};`;
        }
        if (typeof value === "function") {
            // Serialize function - this works for simple functions
            // Complex closures might not work perfectly
            try {
                return `var ${key} = ${value.toString()};`;
            } catch {
                // Fallback for functions that can't be serialized
                return `var ${key} = function() { throw new Error("Function cannot be serialized"); };`;
            }
        }
        if (Array.isArray(value)) {
            // Serialize array
            try {
                return `var ${key} = ${JSON.stringify(value)};`;
            } catch {
                return `var ${key} = [];`;
            }
        }
        if (typeof value === "object") {
            // Serialize object
            try {
                return `var ${key} = ${JSON.stringify(value)};`;
            } catch {
                // Handle circular references or non-serializable objects
                return `var ${key} = {};`;
            }
        }
        // Fallback
        return `var ${key} = undefined;`;
    }

    /**
     * Setup console interception to capture stdout/stderr
     */
    private setupConsoleInterception(): void {
        console.log = (...args: any[]) => {
            this.captureOutput("stdout", this.formatConsoleArgs(args));
        };

        console.error = (...args: any[]) => {
            this.captureOutput("stderr", this.formatConsoleArgs(args));
        };

        console.warn = (...args: any[]) => {
            this.captureOutput("stderr", this.formatConsoleArgs(args));
        };

        console.info = (...args: any[]) => {
            this.captureOutput("stdout", this.formatConsoleArgs(args));
        };
    }

    /**
     * Restore original console methods
     */
    private restoreConsole(): void {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        console.info = this.originalConsole.info;
    }

    /**
     * Capture output to buffer
     */
    private captureOutput(type: "stdout" | "stderr", data: string): void {
        this.outputBuffer.push({ type, data });
    }

    /**
     * Format console arguments to string
     */
    private formatConsoleArgs(args: any[]): string {
        return args
            .map((arg) => {
                if (typeof arg === "object" && arg !== null) {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            })
            .join(" ");
    }

    /**
     * Get combined output from buffer
     * Combines all output into a single string
     */
    private getCombinedOutput():
        | { type: "stdout" | "stderr"; data: string }
        | undefined {
        if (this.outputBuffer.length === 0) {
            return undefined;
        }

        // Combine all output
        const combined = this.outputBuffer.map((item) => item.data).join("\n");

        // Determine output type (stderr takes precedence if any exists)
        const hasStderr = this.outputBuffer.some(
            (item) => item.type === "stderr"
        );
        const type = hasStderr ? "stderr" : "stdout";

        return {
            type,
            data: combined,
        };
    }
}
