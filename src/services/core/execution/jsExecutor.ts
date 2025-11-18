import type { Executor, ExecutionResult, ExecutionContext } from "./executor";

/**
 * JavaScript Executor implementation
 *
 * Executes JavaScript code in isolation - each cell execution is independent.
 * No shared state between cells.
 */
export class JSExecutor implements Executor {
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
        // No initialization needed - each cell execution is isolated
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
            // Execute code in isolation - no shared state between cells
            // Each cell execution is independent
            const executor = new Function(code);

            // Execute the code
            const result = executor();

            // Handle async results - if code returns a promise, wait for it
            if (result && typeof result.then === "function") {
                await result;
            }

            // Process microtasks to ensure promises resolve
            await new Promise((resolve) => setTimeout(resolve, 0));

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
        // No context to reset since each cell is isolated
        this.outputBuffer = [];
    }

    async destroy(): Promise<void> {
        await this.reset();
        // Cleanup if needed
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
