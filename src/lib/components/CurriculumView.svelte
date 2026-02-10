<script lang="ts">
    import type { Curriculum } from "$lib/types";
    import LessonView from "./LessonView.svelte";
    import * as Card from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
    import { Separator } from "$lib/components/ui/separator";

    interface Props {
        curriculum: Curriculum;
        fileTree: any[];
    }

    let { curriculum, fileTree }: Props = $props();
</script>

<main class="flex flex-col gap-8">
    <Card.Root>
        <Card.Header>
            <Card.Title class="text-3xl">{curriculum.projectName}</Card.Title>
            <Card.Description class="text-base mt-2">{curriculum.description}</Card.Description>
        </Card.Header>
        <Card.Content>
            <div class="space-y-4">
                <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold">Core Coding Patterns</h3>
                    <Separator class="flex-1" />
                </div>
                <div class="flex flex-wrap gap-2">
                    {#each curriculum.patterns as pattern}
                        <Badge variant="secondary" class="text-sm px-3 py-1">{pattern}</Badge>
                    {/each}
                </div>
            </div>
        </Card.Content>
    </Card.Root>

    <section class="flex flex-col gap-8">
        {#each curriculum.lessons as lesson}
            <LessonView {lesson} />
        {/each}
    </section>

    {#if fileTree.length > 0}
        <Card.Root>
            <Card.Header>
                <Card.Title>Project Taxonomy</Card.Title>
            </Card.Header>
            <Card.Content>
                <div class="max-h-[300px] overflow-y-auto rounded-md border p-4 bg-muted/30 font-mono text-sm">
                    <ul class="space-y-2">
                        {#each fileTree as node}
                            <li class="flex items-center gap-2">
                                <span class="opacity-70">{node.isDirectory ? "📁" : "📄"}</span>
                                <span>{node.name}</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            </Card.Content>
        </Card.Root>
    {/if}
</main>
