<script lang="ts">
    import { untrack } from "svelte";
    import { cn } from "$lib/utils";
    import type { CodingExercise } from "$lib/types";
    import { getRuntime, isLanguageSupported } from "$lib/runtime/registry";
    
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Badge } from "$lib/components/ui/badge";
    import { Separator } from "$lib/components/ui/separator";
    import LoadingSpinner from "./LoadingSpinner.svelte";

    let { exercise }: { exercise: CodingExercise } = $props();

    let userCode = $state(untrack(() => exercise.boilerplate));
    let output = $state<string[]>([]);
    let status = $state<"idle" | "running" | "success" | "error" | "loading">("idle");
    let aiHint = $state("");
    let analyzingError = $state(false);

    $effect(() => {
        userCode = exercise.boilerplate;
    });

    async function runCode() {
        output = [];
        status = "running";

        const runtime = getRuntime(exercise.language);
        if (!runtime) {
            status = "error";
            output = [`❌ Execution failed: No runtime found for '${exercise.language}'`];
            return;
        }

        try {
            if (runtime.load) {
                status = "loading";
                output = [...output, `📦 Loading ${exercise.language} runtime...`];
                await runtime.load();
            }

            status = "running";
            const result = await runtime.run(userCode, exercise.validationScript);

            output = [...output, ...result.output];
            status = result.success ? "success" : "error";

            if (!result.success && result.error) {
                output = [...output, `❌ ${result.error}`];
                await getAiFeedback(result.error);
            }
        } catch (e: any) {
            status = "error";
            output = [...output, `❌ Runtime Logic Error: ${e.message}`];
        }
    }

    async function getAiFeedback(errorMsg: string) {
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
                    errorOutput: errorMsg,
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

    function reset() {
        userCode = exercise.boilerplate;
        output = [];
        status = "idle";
        aiHint = "";
        analyzingError = false;
    }
</script>

<Card.Root class="my-8 border-l-4 border-l-primary">
    <Card.Header className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div class="space-y-1">
            <Card.Title class="text-xl">{exercise.title}</Card.Title>
            <Card.Description>{exercise.description}</Card.Description>
        </div>
        <div class="flex gap-2">
            <Button variant="outline" size="sm" onclick={reset}>Reset</Button>
            <Button 
                size="sm" 
                onclick={runCode} 
                disabled={status === "running" || status === "loading"}
                class="min-w-[120px]"
            >
                {#if status === "loading"}
                    <LoadingSpinner size={16} color="currentColor" />
                    <span class="ml-2">Loading...</span>
                {:else if status === "running"}
                    <LoadingSpinner size={16} color="currentColor" />
                    <span class="ml-2">Running...</span>
                {:else}
                    Run & Check
                {/if}
            </Button>
        </div>
    </Card.Header>

    <Card.Content class="space-y-4 pt-4">
        <div class="relative rounded-md border bg-muted/30">
            <Textarea
                bind:value={userCode}
                spellcheck="false"
                class="min-h-[200px] font-mono text-sm bg-transparent border-0 focus-visible:ring-0 resize-y p-4"
                placeholder="Type your code here..."
            />
        </div>

        {#if analyzingError}
            <div class="rounded-lg border border-primary/20 bg-primary/5 p-4 text-primary animate-in fade-in slide-in-from-bottom-2">
                <div class="flex items-center gap-2 font-semibold text-xs uppercase mb-1">
                    <LoadingSpinner size={12} color="currentColor" />
                    AI Tutor
                </div>
                <p class="text-sm italic">Analyzing the error to provide a hint...</p>
            </div>
        {:else if aiHint}
            <div class="rounded-lg border border-purple-200 bg-purple-50 p-4 text-purple-900 animate-in fade-in slide-in-from-bottom-2 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-100">
                <div class="font-semibold text-xs uppercase mb-1 flex items-center gap-2">
                    🤖 AI Tutor Hint
                </div>
                <p class="text-sm border-l-2 border-purple-300 pl-3 ml-1">{aiHint}</p>
            </div>
        {/if}

        {#if output.length > 0}
            <div class={cn(
                "rounded-lg border p-0 overflow-hidden text-sm",
                status === "success" ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800" : 
                status === "error" ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800" :
                "bg-muted"
            )}>
                <div class="px-3 py-1.5 border-b text-xs font-semibold uppercase text-muted-foreground bg-black/5 dark:bg-white/5">
                    Console Output
                </div>
                <div class="p-3 font-mono max-h-[200px] overflow-y-auto space-y-1">
                    {#each output as line}
                        <div class={cn(
                            "break-all whitespace-pre-wrap",
                            status === "success" && "text-green-700 dark:text-green-300",
                            status === "error" && "text-red-700 dark:text-red-300"
                        )}>{line}</div>
                    {/each}
                </div>
            </div>
        {/if}
    </Card.Content>
</Card.Root>
