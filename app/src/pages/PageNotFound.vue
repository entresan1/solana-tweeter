<template>
  <div class="p-8 text-dark-400 text-center">
    <p>404 — Not Found</p>
    <router-link
      :to="{ name: 'Home' }"
      class="block text-primary-400 hover:text-primary-300 hover:underline mt-2 transition-colors duration-300"
    >
      Go back home
    </router-link>
  </div>
</template>
