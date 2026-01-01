import type { CodeRunner, ExecutionResult } from './types';
import { WASI } from './wasi';

export class CRuntime implements CodeRunner {
    language = 'c'; // Supports 'c' and 'cpp'
    private compilerModule: any = null;

    async load() {
        if (this.compilerModule) return;

        try {
            // Load browsercc from CDN for in-browser C compilation
            // Note: We use the unpkg URL.
            // Vite in dev mode might block this due to CORS if not configured, but unpkg sends CORS.
            // @ts-ignore
            this.compilerModule = await import(/* @vite-ignore */ 'https://unpkg.com/browsercc@0.1.1/dist/index.js');
        } catch (e) {
            console.error("Failed to load C compiler", e);
            throw new Error("Failed to load C compiler (Check network/CORS)");
        }
    }

    async run(code: string, validationScript: string = ''): Promise<ExecutionResult> {
        if (!this.compilerModule) {
            return { success: false, output: [], error: "Compiler not loaded" };
        }

        try {
            const outputLines: string[] = [];

            // 1. Compile
            // Regex to strip 'int main(...) { ... }' or 'int main() { ... }' from user code
            // This is a naive heuristic but works for simple exercises.
            // It matches 'int main' followed by args, then tries to match brace content.
            // A safer, simpler way for this context: just replace "int main" with "int __user_main"
            // (effectively disabling it, but keeping the code valid) to avoid linker collisions.

            const sanitizedUserCode = validationScript
                ? code.replace(/\bint\s+main\s*\(/g, 'int __user_main_disabled(')
                : code;

            // Concatenate user code with validation script (which should contain the real main)
            const sourceCode = validationScript ? `${sanitizedUserCode}\n//--- Validation Script ---\n${validationScript}` : code;

            const result = await this.compilerModule.compile({
                source: sourceCode,
                fileName: "main.c",
                flags: ["-O2"], // -O2 optimization
                extraFiles: {}
            });

            if (result.compileOutput) {
                // Determine if it's an error or just warnings
                // Simple heuristic: if module is null, it's an error.
                if (!result.module) {
                    outputLines.push("--- Compilation Error ---");
                    outputLines.push(result.compileOutput);
                    return {
                        success: false,
                        output: outputLines,
                        error: "Compilation failed"
                    };
                } else {
                    outputLines.push("--- Compilation Log ---");
                    outputLines.push(result.compileOutput);
                }
            }

            if (!result.module) {
                return {
                    success: false,
                    output: outputLines,
                    error: "Compilation failed (No module produced)"
                };
            }

            // 2. Run (WASI)
            outputLines.push("--- Execution ---");

            const wasi = new WASI(
                (str) => outputLines.push(str), // stdout
                (str) => outputLines.push(str)  // stderr
            );

            // browsercc returns a WebAssembly.Module (already compiled)
            const wasmModule = result.module;
            const instantiated = await WebAssembly.instantiate(wasmModule, {
                wasi_snapshot_preview1: wasi.wasiImport
            });

            // Handle differences in return type (Instance vs { instance, module })
            const instance = 'instance' in instantiated ? instantiated.instance : instantiated as WebAssembly.Instance;

            wasi.start(instance);

            // Check Exit Code
            if (wasi.exitCode !== null && wasi.exitCode !== 0) {
                return {
                    success: false,
                    output: outputLines,
                    error: `Program exited with code ${wasi.exitCode}`
                };
            }

            return {
                success: true,
                output: outputLines
            };

        } catch (e: any) {
            return {
                success: false,
                output: ["⚠️ Runtime Error: " + e.message],
                error: e.message
            };
        }
    }
}
