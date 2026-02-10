<script lang="ts">
    import type { QuizQuestion } from "$lib/types";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import * as RadioGroup from "$lib/components/ui/radio-group";

    let { quiz }: { quiz: QuizQuestion } = $props();
    let selectedOption = $state<string | null>(null);
    let showFeedback = $state(false);

    function handleSubmit() {
        showFeedback = true;
    }
</script>

<Card.Root class="my-6">
    <Card.Header>
        <Card.Title class="text-base font-semibold leading-relaxed">{quiz.question}</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
        <RadioGroup.Root bind:value={selectedOption} disabled={showFeedback} class="gap-3">
            {#each quiz.options as option}
                <div class="flex items-center space-x-2">
                    <RadioGroup.Item value={option} id={option} />
                    <Label for={option} class="text-sm font-normal cursor-pointer leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{option}</Label>
                </div>
            {/each}
        </RadioGroup.Root>

        {#if selectedOption && !showFeedback}
            <Button size="sm" onclick={handleSubmit} class="mt-2">Check Answer</Button>
        {/if}

        {#if showFeedback}
            <div class={`mt-4 p-4 rounded-md text-sm ${selectedOption === quiz.correctAnswer ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <p class="font-semibold mb-1">
                    {selectedOption === quiz.correctAnswer ? "✅ Correct!" : "❌ Incorrect."}
                </p>
                <p>The correct answer is <strong>{quiz.correctAnswer}</strong>.</p>
                <p class="mt-2 opacity-90">{quiz.explanation}</p>
            </div>
        {/if}
    </Card.Content>
</Card.Root>
