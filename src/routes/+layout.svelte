<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<div class="app-container">
  {@render children()}
</div>

<style>
  .app-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
