<script lang="ts">
    import type { Lesson } from "$lib/types";
    import CodeSnippet from "./CodeSnippet.svelte";
    import Quiz from "./Quiz.svelte";
    import CodingExerciseView from "./CodingExercise.svelte";

    let { lesson }: { lesson: Lesson } = $props();
</script>

<div class="lesson-view card">
    <div class="lesson-header">
        <h3>{lesson.title}</h3>
        <p>{lesson.description}</p>
    </div>

    {#if lesson.highlights.length > 0}
        <div class="section">
            <h4>Key Highlights</h4>
            <ul>
                {#each lesson.highlights as highlight}
                    <li>{highlight}</li>
                {/each}
            </ul>
        </div>
    {/if}

    {#if lesson.codeFragments.length > 0}
        <div class="section">
            <h4>Code Deep Dives</h4>
            {#each lesson.codeFragments as snippet}
                <CodeSnippet {snippet} />
            {/each}
        </div>
    {/if}

    {#if lesson.quizzes.length > 0}
        <div class="section">
            <h4>Quiz Your Knowledge</h4>
            {#each lesson.quizzes as quiz}
                <Quiz {quiz} />
            {/each}
        </div>
    {/if}

    {#if lesson.codingExercises && lesson.codingExercises.length > 0}
        <section class="exercises-section">
            <div class="section-header">
                <h2>Practice Tasks</h2>
                <p>Apply what you've learned in the live sandbox.</p>
            </div>
            {#each lesson.codingExercises as exercise}
                <CodingExerciseView {exercise} />
            {/each}
        </section>
    {/if}

    {#if lesson.furtherReading.length > 0}
        <div class="section">
            <h4>Further Reading</h4>
            <ul>
                {#each lesson.furtherReading as reading}
                    <li>
                        <a
                            href={reading.url}
                            target="_blank"
                            rel="noopener noreferrer">{reading.title}</a
                        >
                    </li>
                {/each}
            </ul>
        </div>
    {/if}
</div>

<style>
    .lesson-view {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 2rem;
    }

    .lesson-header h3 {
        font-size: 1.5rem;
        margin-top: 0;
        margin-bottom: 0.5rem;
    }

    .lesson-header p {
        color: var(--text-muted);
    }

    .section h4 {
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
        color: var(--text-main);
    }

    ul {
        list-style: disc;
        padding-left: 1.5rem;
    }

    li {
        margin-bottom: 0.5rem;
    }

    a {
        color: var(--primary);
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }
</style>
