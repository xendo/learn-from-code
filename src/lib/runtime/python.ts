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

            const lines = errorMsg.split('\n');
            const filteredLines = [];
            let tbStarted = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (line.startsWith('Traceback (most recent call last):')) {
                    tbStarted = true;
                    filteredLines.push(line);
                    continue;
                }

                if (!tbStarted) {
                    filteredLines.push(line);
                    continue;
                }

                // If it's a frame header, check if it's internal
                if (line.startsWith('  File "')) {
                    const isInternal = line.includes('/lib/python') || line.includes('_pyodide') || line.includes('pyodide.js');
                    if (isInternal) {
                        // Skip this frame and its code snippet (indentated line)
                        if (i + 1 < lines.length && lines[i + 1].startsWith('    ')) {
                            i++;
                        }
                        continue;
                    }
                }

                // Filter out specific garbage lines that Pyodide's internal frames often leave behind
                if (line.includes('^^^^^') || line.includes('eval(self.code') || line.includes('await CodeRunner(')) {
                    continue;
                }

                filteredLines.push(line);
            }

            errorMsg = filteredLines.join('\n').trim();

            return {
                success: false,
                output: [...output],
                error: errorMsg
            };
        }
    }
}
