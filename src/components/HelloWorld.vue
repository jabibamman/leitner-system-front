<script setup lang="ts">
defineProps<{
  msg: string
}>()
</script>

<template>
  <div class="greetings">
    <h1 class="green">{{ msg }}</h1>
    <h3>
      This project is a simple implementation of the Leitner System. It is a spaced repetition system that helps you remember things more effectively.
    </h3>
    <ul>
      <ul><a href="https://vitejs.dev/" target="_blank" rel="noopener">Vite</a></ul>
      <ul><a href="https://vuejs.org/" target="_blank" rel="noopener">Vue 3</a></ul>
      <ul><a href="https://spring.io/projects/spring-boot" target="_blank" rel="noopener">Spring Boot</a></ul>
      <ul><a href="https://spring.io/projects/spring-data-jpa" target="_blank" rel="noopener">Spring Data JPA</a></ul>
      <ul><a href="https://hibernate.org/" target="_blank" rel="noopener">Hibernate</a></ul>
    </ul>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
