import type { CodeRunner, ExecutionResult } from './types';

export class JavascriptRuntime implements CodeRunner {
    language = 'javascript';

    async load() {
        // No loading needed for JS
    }

    async run(code: string, validationScript: string = ''): Promise<ExecutionResult> {
        let output: string[] = [];

        // Capture console.log
        const originalLog = console.log;
        console.log = (...args) => {
            output.push(args.map(a =>
                typeof a === 'object' ? JSON.stringify(a) : String(a)
            ).join(' '));
        };

        try {
            // Safe(ish) execution
            const sandbox = new Function(code + '\n' + validationScript);
            sandbox();
            console.log = originalLog; // Restore immediately

            return {
                success: true,
                output: [...output, '✅ JavaScript execution successful.']
            };
        } catch (e: any) {
            console.log = originalLog; // Restore in case of error
            return {
                success: false,
                output: [...output],
                error: e.message
            };
        }
    }
}
