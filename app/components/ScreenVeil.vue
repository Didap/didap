<template>
  <!-- Il velo sotto il testo sui video: sette strati di sfocatura, uno
       per regola .screen-veil i:nth-child in main.css -->
  <div
    class="screen-veil"
    aria-hidden="true"
  >
    <i
      v-for="n in 7"
      :key="n"
    />
  </div>
</template>
