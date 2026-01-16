<script lang="ts">
  import { onMount } from "svelte";
  import type { Curriculum } from "$lib/types";
  import { loadProject as loadProjectService } from "$lib/services/projectLoader";

  // Components
  import ProjectInput from "$lib/components/ProjectInput.svelte";
  import ProgressCard from "$lib/components/ProgressCard.svelte";
  import CurriculumView from "$lib/components/CurriculumView.svelte";
  import RecentProjects from "$lib/components/RecentProjects.svelte";

  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { signIn, signOut } from "@auth/sveltekit/client";

  interface RecentProject {
    projectName: string;
    description: string;
    repoUrl: string;
    timestamp: string;
  }

  // State
  // State
  const initialUrl = $page.url.searchParams.get("project") || "";
  let repoUrl = $state(initialUrl);
  let isGenerating = $state(!!initialUrl);
  let loadingStatus = $state(initialUrl ? "Initializing..." : "");
  let activeError = $state<string | null>(null);
  let fileTree = $state<any[]>([]);
  let curriculum = $state<Curriculum | null>(null);
  let recentProjects = $state<RecentProject[]>([]);

  // Derived state
  let projectParam = $derived($page.url.searchParams.get("project"));
  let session = $derived($page.data.session);
  let showProgressCard = $state(false);

  onMount(() => fetchRecent());

  // Handle URL changes
  $effect(() => {
    if (projectParam) {
      if (!curriculum || curriculum.repoUrl !== projectParam) {
        loadProject(projectParam);
      }
    } else {
      curriculum = null;
      fileTree = [];
    }
  });

  // Delay progress card to avoid flash on cached items
  $effect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isGenerating) {
      timer = setTimeout(() => (showProgressCard = true), 400);
    } else {
      showProgressCard = false;
    }
    return () => clearTimeout(timer);
  });

  async function fetchRecent() {
    try {
      const resp = await fetch("/api/recent");
      const data = await resp.json();
      recentProjects = data.projects || [];
    } catch (e) {
      console.error("Failed to fetch recent:", e);
    }
  }

  function handleGenerate(url?: string) {
    const targetUrl = url || repoUrl;
    if (!targetUrl) return;
    goto(`?project=${encodeURIComponent(targetUrl)}`);
  }

  async function loadProject(url: string) {
    isGenerating = true;
    loadingStatus = "Initializing...";
    activeError = null;
    curriculum = null;
    fileTree = [];
    repoUrl = url;

    try {
      await loadProjectService(url, {
        onStatus: (msg) => (loadingStatus = msg),
        onCurriculum: (curr, tree) => {
          curriculum = curr;
          fileTree = tree;
          fetchRecent();
        },
        onError: (error, code) => {
          activeError =
            code === 401
              ? "Sign in required to generate new curriculums."
              : error;
        },
      });
    } catch (e: any) {
      activeError = e.message;
    } finally {
      isGenerating = false;
      loadingStatus = "";
    }
  }
</script>

<div class="container landing">
  <header class="hero">
    <button class="logo" onclick={() => goto("/")}>Learn from Code</button>
    <p>Turn any GitHub repository into a step-by-step learning journey.</p>

    <div class="auth-actions">
      {#if session}
        <div class="user-info">
          <img
            src={session.user?.image}
            alt={session.user?.name}
            class="avatar"
          />
          <button class="btn-text" onclick={() => signOut()}>Sign Out</button>
        </div>
      {:else}
        <button class="btn-secondary" onclick={() => signIn("github")}>
          Sign In with GitHub
        </button>
      {/if}
    </div>
  </header>

  {#if !curriculum && (!isGenerating || !showProgressCard)}
    <ProjectInput
      bind:repoUrl
      {isGenerating}
      onGenerate={() => handleGenerate()}
    />
  {:else if isGenerating && showProgressCard}
    <ProgressCard {repoUrl} {loadingStatus} />
  {/if}

  {#if activeError}
    <div class="error-banner">
      <p>{activeError}</p>
      {#if activeError.includes("Sign in")}
        <button onclick={() => signIn("github")}>Sign In</button>
      {/if}
    </div>
  {/if}

  {#if curriculum}
    <CurriculumView {curriculum} {fileTree} />
  {/if}

  <RecentProjects
    projects={recentProjects}
    hasCurriculum={!!curriculum}
    onSelect={handleGenerate}
  />
</div>

<style>
  .landing {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    padding-top: 3rem;
    padding-bottom: 5rem;
  }

  header {
    text-align: center;
  }

  .logo {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    cursor: pointer;
    background: none;
    border: none;
    color: inherit;
  }

  .hero p {
    font-size: 1.25rem;
    color: var(--text-muted);
    margin-bottom: 2rem;
  }

  .auth-actions {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }

  .error-banner {
    background: #fef2f2;
    border: 1px solid #fee2e2;
    color: #991b1b;
    padding: 1rem;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-banner button {
    background: #dc2626;
    color: white;
    border: none;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
