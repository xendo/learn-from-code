<script lang="ts">
    import LoadingSpinner from "./LoadingSpinner.svelte";
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import * as Tooltip from "$lib/components/ui/tooltip";

    interface Props {
        repoUrl: string;
        isGenerating: boolean;
        onGenerate: () => void;
    }

    let { repoUrl = $bindable(), isGenerating, onGenerate }: Props = $props();
</script>

<Card.Root class="p-4">
    <div class="flex items-center gap-3">
        <div class="flex-1">
            <Input
                type="text"
                bind:value={repoUrl}
                placeholder="https://github.com/user/repo"
                disabled={isGenerating}
                class="w-full"
            />
        </div>
        
        <Tooltip.Provider>
            <Tooltip.Root>
                <Tooltip.Trigger>
                    <Button 
                        onclick={onGenerate} 
                        disabled={isGenerating}
                        class="min-w-[140px]"
                    >
                        {#if isGenerating}
                            <div class="flex items-center gap-2">
                                <LoadingSpinner size={16} color="currentColor" />
                                <span>Initializing...</span>
                            </div>
                        {:else}
                            Analyze Project
                        {/if}
                    </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                    <p>Showcase Tier: Limited to ~20 gens/day.</p>
                </Tooltip.Content>
            </Tooltip.Root>
        </Tooltip.Provider>
    </div>
</Card.Root>
