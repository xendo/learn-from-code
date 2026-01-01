export interface ExecutionResult {
    success: boolean;
    output: string[];
    error?: string;
}

export interface CodeRunner {
    language: string;
    load(): Promise<void>;
    run(code: string, validationScript?: string): Promise<ExecutionResult>;
}
