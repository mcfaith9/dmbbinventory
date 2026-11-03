<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { PackageX, ArrowLeft } from '@lucide/vue'
import { Button } from '@/components/ui/button'
</script>

<template>
  <div class="min-h-svh bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
    <div class="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
      <PackageX class="size-8" />
    </div>

    <div class="space-y-1">
      <h1 class="text-3xl font-bold tracking-tight">404 - Page Not Found</h1>
      <p class="text-xs text-muted-foreground max-w-sm">
        The inventory route or module you requested does not exist or has been relocated.
      </p>
    </div>

    <Button size="sm" as-child class="h-8 gap-1.5 text-xs cursor-pointer">
      <RouterLink to="/dashboard">
        <ArrowLeft class="size-3.5" />
        <span>Return to Dashboard</span>
      </RouterLink>
    </Button>
  </div>
</template>
