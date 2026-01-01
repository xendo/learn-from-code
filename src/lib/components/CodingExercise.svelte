<script lang="ts">
    import type { CodingExercise } from "$lib/types";

    let { exercise }: { exercise: CodingExercise } = $props();

    let userCode = $state(exercise.boilerplate);
    let output = $state<string[]>([]);
    let status = $state<"idle" | "running" | "success" | "error" | "loading">(
        "idle",
    );
    let aiHint = $state("");
    let analyzingError = $state(false);
    let pyodide: any = null;

    async function loadPyodide() {
        if (pyodide) return;
        status = "loading";
        output = [...output, "📦 Loading Python runtime (Pyodide)..."];

        if (!(window as any).loadPyodide) {
            const script = document.createElement("script");
            script.src =
                "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
            document.head.appendChild(script);
            await new Promise((resolve) => (script.onload = resolve));
        }

        pyodide = await (window as any).loadPyodide();
        await pyodide.loadPackage("numpy");
        output = [...output, "✅ Python runtime ready (with NumPy)."];
        status = "idle";
    }

    async function runCode() {
        output = [];
        status = "running";

        if (exercise.language === "python") {
            try {
                await loadPyodide();
                status = "running";

                // Redirect stdout
                pyodide.setStdout({
                    batched: (text: string) => {
                        output = [...output, text];
                    },
                });

                await pyodide.runPythonAsync(
                    userCode + "\n" + exercise.validationScript,
                );
                status = "success";
                output = [...output, "✅ All Python tests passed!"];
            } catch (e: any) {
                status = "error";
                let errorMsg = e.message;
                if (errorMsg.includes("AssertionError")) {
                    errorMsg = "Test Failed: The solution incorrect.";
                    output = [...output, "❌ " + errorMsg];
                } else {
                    output = [...output, `❌ Error: ${errorMsg}`];
                }

                // Get AI Feedback
                analyzingError = true;
                aiHint = "";
                try {
                    const response = await fetch("/api/feedback", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            exerciseTitle: exercise.title,
                            exerciseDescription: exercise.description,
                            userCode,
                            errorOutput: e.message,
                            language: exercise.language,
                        }),
                    });
                    const data = await response.json();
                    if (data.feedback) {
                        aiHint = data.feedback;
                    }
                } catch (apiErr) {
                    console.error("Feedback API error", apiErr);
                } finally {
                    analyzingError = false;
                }
            }
            return;
        }

        // JavaScript logic...
        const originalLog = console.log;
        console.log = (...args) => {
            output = [
                ...output,
                args
                    .map((arg) =>
                        typeof arg === "object"
                            ? JSON.stringify(arg)
                            : String(arg),
                    )
                    .join(" "),
            ];
        };

        try {
            const sandbox = new Function(
                userCode + "\n" + exercise.validationScript,
            );
            sandbox();
            status = "success";
            output = [...output, "✅ All JavaScript tests passed!"];
        } catch (e: any) {
            status = "error";
            output = [...output, `❌ Error: ${e.message}`];
        } finally {
            console.log = originalLog;
        }
    }

    function reset() {
        userCode = exercise.boilerplate;
        output = [];
        status = "idle";
        aiHint = "";
        analyzingError = false;
    }
</script>

<div class="coding-exercise card">
    <div class="exercise-header">
        <h3>{exercise.title}</h3>
        <div class="actions">
            <button class="btn-secondary btn-sm" onclick={reset}>Reset</button>
            <button
                class="btn-primary btn-sm"
                onclick={runCode}
                disabled={status === "running" || status === "loading"}
            >
                {#if status === "loading"}
                    Loading Pyodide...
                {:else if status === "running"}
                    Running...
                {:else}
                    Run & Check
                {/if}
            </button>
        </div>
    </div>

    <p class="description">{exercise.description}</p>

    <div class="editor-container">
        <textarea
            bind:value={userCode}
            spellcheck="false"
            class="code-editor"
            placeholder="Type your code here..."
        ></textarea>
    </div>

    {#if analyzingError}
        <div class="ai-feedback loading">
            <div class="feedback-header">🤖 AI Tutor</div>
            Analyzing the error to provide a hint...
        </div>
    {:else if aiHint}
        <div class="ai-feedback">
            <div class="feedback-header">🤖 AI Tutor Hint</div>
            <p>{aiHint}</p>
        </div>
    {/if}

    {#if output.length > 0}
        <div class="console-output {status}">
            <div class="console-header">Console Output</div>
            <div class="console-lines">
                {#each output as line}
                    <div class="line">{line}</div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .coding-exercise {
        margin-bottom: 2rem;
        padding: 1.5rem;
        border-left: 4px solid var(--primary);
    }

    .exercise-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .exercise-header h3 {
        margin: 0;
        font-size: 1.25rem;
    }

    .actions {
        display: flex;
        gap: 0.5rem;
    }

    .description {
        color: var(--text-muted);
        margin-bottom: 1.5rem;
        line-height: 1.6;
    }

    .editor-container {
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--border-color);
        background: #1e1e1e;
        margin-bottom: 1rem;
    }

    .code-editor {
        width: 100%;
        min-height: 200px;
        background: transparent;
        color: #d4d4d4;
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 0.9rem;
        padding: 1rem;
        border: none;
        resize: vertical;
        outline: none;
        line-height: 1.5;
    }

    .console-output {
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        overflow: hidden;
    }

    .console-output.success {
        border-color: #22c55e;
        background: #f0fdf4;
    }

    .console-output.error {
        border-color: #ef4444;
        background: #fef2f2;
    }

    .console-header {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-muted);
        padding: 0.5rem 1rem;
        border-bottom: 1px solid var(--border-color);
        background: rgba(0, 0, 0, 0.02);
    }

    .console-lines {
        padding: 1rem;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.85rem;
        max-height: 200px;
        overflow-y: auto;
    }

    .line {
        margin-bottom: 0.25rem;
        white-space: pre-wrap;
        word-break: break-all;
    }

    .success .line {
        color: #166534;
    }
    .error .line {
        color: #991b1b;
    }

    .btn-sm {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
    }

    .ai-feedback {
        margin-top: 1rem;
        padding: 1rem;
        background: #fdf4ff; /* Light purple/pinkish */
        border: 1px solid #f0abfc;
        border-radius: 8px;
        color: #701a75;
        animation: fadeIn 0.3s ease-in;
    }

    .ai-feedback.loading {
        background: #f8fafc;
        border-color: #e2e8f0;
        color: #64748b;
        font-style: italic;
    }

    .feedback-header {
        font-weight: 700;
        font-size: 0.8rem;
        text-transform: uppercase;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-5px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
