import type { CodeRunner, ExecutionResult } from './types';

export class PythonRuntime implements CodeRunner {
    language = 'python';
    private pyodide: any = null;

    async load() {
        if (this.pyodide) return;

        if (!(window as any).loadPyodide) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
            document.head.appendChild(script);
            await new Promise((resolve) => (script.onload = resolve));
        }

        this.pyodide = await (window as any).loadPyodide();
        await this.pyodide.loadPackage('numpy');
    }

    async run(code: string, validationScript: string = ''): Promise<ExecutionResult> {
        if (!this.pyodide) await this.load();

        let output: string[] = [];
        this.pyodide.setStdout({
            batched: (text: string) => output.push(text)
        });

        try {
            await this.pyodide.runPythonAsync(code + '\n' + validationScript);
            return {
                success: true,
                output: [...output, '✅ Python tests passed!']
            };
        } catch (e: any) {
            let errorMsg = e.message;
            if (errorMsg.includes('AssertionError')) {
                errorMsg = 'Test Assertion Failed.';
            }
            return {
                success: false,
                output: [...output],
                error: errorMsg
            };
        }
    }
}
