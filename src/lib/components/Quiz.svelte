<script lang="ts">
    import type { QuizQuestion } from "$lib/types";

    let { quiz }: { quiz: QuizQuestion } = $props();
    let selectedOption = $state<string | null>(null);
    let showFeedback = $state(false);

    function handleSubmit() {
        showFeedback = true;
    }
</script>

<div class="quiz-container">
    <p class="question">{quiz.question}</p>

    <div class="options">
        {#each quiz.options as option}
            <button
                class="option-btn"
                class:selected={selectedOption === option}
                onclick={() => !showFeedback && (selectedOption = option)}
                disabled={showFeedback}
            >
                {option}
            </button>
        {/each}
    </div>

    {#if selectedOption && !showFeedback}
        <button class="btn-primary" onclick={handleSubmit}>Check Answer</button>
    {/if}

    {#if showFeedback}
        <div
            class="feedback"
            class:correct={selectedOption === quiz.correctAnswer}
        >
            <p>
                {selectedOption === quiz.correctAnswer
                    ? "✅ Correct!"
                    : "❌ Incorrect."}
                The correct answer is <strong>{quiz.correctAnswer}</strong>.
            </p>
            <p class="explanation">{quiz.explanation}</p>
        </div>
    {/if}
</div>

<style>
    .quiz-container {
        background: #f1f5f9;
        padding: 1.5rem;
        border-radius: 8px;
        margin: 1.5rem 0;
    }

    .question {
        font-weight: 600;
        margin-bottom: 1rem;
    }

    .options {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .option-btn {
        text-align: left;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border-color);
        background: white;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .option-btn:hover:not(:disabled) {
        border-color: var(--primary);
        background: #f8fafc;
    }

    .option-btn.selected {
        border-color: var(--primary);
        background: #eff6ff;
    }

    .feedback {
        margin-top: 1rem;
        padding: 1rem;
        border-radius: 6px;
    }

    .feedback.correct {
        background: #dcfce7;
        color: #166534;
    }

    .feedback:not(.correct) {
        background: #fee2e2;
        color: #991b1b;
    }

    .explanation {
        margin-top: 0.5rem;
        font-size: 0.875rem;
        opacity: 0.9;
    }
</style>
