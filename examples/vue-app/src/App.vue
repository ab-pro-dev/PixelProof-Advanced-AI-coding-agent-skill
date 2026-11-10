<template>
  <main>
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
    </header>

    <div v-if="currentPath === '/about'">
      <h1>About PixelProof Vue App</h1>
      <p>Route /about served by Vite + Vue on port 5176 for deterministic benchmarking.</p>
    </div>
    <div v-else>
      <h1>PixelProof Vue Benchmark Home</h1>
      <p>Minimal Vue application fixture for visual verification benchmarking.</p>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from "vue";

const currentPath = ref(typeof window !== "undefined" ? window.location.pathname : "/");

onMounted(() => {
  currentPath.value = window.location.pathname;
});
</script>
