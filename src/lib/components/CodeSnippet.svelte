<script lang="ts">
    import type { CodeSnippet } from "$lib/types";
    import { cn } from "$lib/utils";
    
    let { snippet }: { snippet: CodeSnippet } = $props();
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-sm my-4 overflow-hidden">
    <div class="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <span class="text-xs font-mono text-muted-foreground">{snippet.filePath}</span>
        <span class="text-xs font-semibold uppercase text-muted-foreground/70">{snippet.language}</span>
    </div>
    <div class="relative">
        <pre class="p-4 overflow-x-auto text-sm font-mono bg-[#0f172a] text-gray-50 m-0"><code>{snippet.code}</code></pre>
    </div>
    {#if snippet.explanation}
        <div class="p-4 bg-muted/20 border-t text-sm text-muted-foreground">
            {snippet.explanation}
        </div>
    {/if}
</div>
