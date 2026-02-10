<script lang="ts">
    import type { Lesson } from "$lib/types";
    import CodeSnippet from "./CodeSnippet.svelte";
    import Quiz from "./Quiz.svelte";
    import CodingExerciseView from "./CodingExercise.svelte";
    import * as Card from "$lib/components/ui/card";
    import { Separator } from "$lib/components/ui/separator";

    let { lesson }: { lesson: Lesson } = $props();
</script>

<Card.Root class="w-full">
    <Card.Header>
        <Card.Title class="text-2xl">{lesson.title}</Card.Title>
        <Card.Description>{lesson.description}</Card.Description>
    </Card.Header>

    <Card.Content class="space-y-8">
        {#if lesson.highlights.length > 0}
            <div class="space-y-4">
                <h4 class="text-lg font-semibold tracking-tight">Key Highlights</h4>
                <Separator />
                <ul class="list-disc pl-6 space-y-2 text-sm text-foreground/90">
                    {#each lesson.highlights as highlight}
                        <li>{highlight}</li>
                    {/each}
                </ul>
            </div>
        {/if}

        {#if lesson.codeFragments.length > 0}
            <div class="space-y-4">
                <h4 class="text-lg font-semibold tracking-tight">Code Deep Dives</h4>
                <div class="grid gap-4">
                    {#each lesson.codeFragments as snippet}
                        <CodeSnippet {snippet} />
                    {/each}
                </div>
            </div>
        {/if}

        {#if lesson.quizzes.length > 0}
            <div class="space-y-4">
                <h4 class="text-lg font-semibold tracking-tight">Quiz Your Knowledge</h4>
                <div class="grid gap-4">
                    {#each lesson.quizzes as quiz}
                        <Quiz {quiz} />
                    {/each}
                </div>
            </div>
        {/if}

        {#if lesson.codingExercises && lesson.codingExercises.length > 0}
            <div class="rounded-lg border bg-muted/40 p-6 space-y-4">
                <div class="space-y-1">
                    <h2 class="text-xl font-bold tracking-tight">Practice Tasks</h2>
                    <p class="text-sm text-muted-foreground">Apply what you've learned in the live sandbox.</p>
                </div>
                {#each lesson.codingExercises as exercise}
                    <CodingExerciseView {exercise} />
                {/each}
            </div>
        {/if}

        {#if lesson.furtherReading.length > 0}
            <div class="space-y-4">
                <h4 class="text-lg font-semibold tracking-tight">Further Reading</h4>
                <Separator />
                <ul class="list-disc pl-6 space-y-2 text-sm">
                    {#each lesson.furtherReading as reading}
                        <li>
                            <a
                                href={reading.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
                            >
                                {reading.title}
                            </a>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    </Card.Content>
</Card.Root>
