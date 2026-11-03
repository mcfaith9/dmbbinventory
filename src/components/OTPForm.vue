<script setup lang="ts">
import { ref } from "vue"
import type { HTMLAttributes } from "vue"
import { useRouter, useRoute } from "vue-router"
import { Boxes, Loader2 } from "@lucide/vue"
import { cn } from "cn"
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { AuthService } from '@/services/auth.service'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const router = useRouter()
const route = useRoute()

const otp = ref("")
const isLoading = ref(false)
const errorMessage = ref("")

async function handleVerify() {
  if (otp.value.length < 6) {
    errorMessage.value = "Please enter all 6 digits of the verification code."
    return
  }

  isLoading.value = true
  errorMessage.value = ""

  try {
    const res = await AuthService.verifyOtp(otp.value)
    if (res.success) {
      const redirect = (route.query.redirect as string) || "/dashboard"
      router.push(redirect)
    } else {
      errorMessage.value = res.message || "Invalid verification code."
    }
  } catch (err: any) {
    errorMessage.value = err.message || "Authentication failed."
  } finally {
    isLoading.value = false
  }
}

function fillDemoOtp() {
  otp.value = "123456"
  handleVerify()
}
</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <form @submit.prevent="handleVerify">
      <FieldGroup>
        <div class="flex flex-col items-center gap-2 text-center">
          <div class="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Boxes class="size-6" />
          </div>
          <h1 class="text-xl font-bold tracking-tight">
            DMBB Inventory
          </h1>
          <FieldDescription class="text-sm text-muted-foreground">
            Enter the 6-digit verification code to access your inventory workspace
          </FieldDescription>
        </div>

        <Field>
          <FieldLabel for="otp" class="sr-only">
            Verification code
          </FieldLabel>
          <div class="flex justify-center">
            <InputOTP
              id="otp"
              v-model="otp"
              :maxlength="6"
              required
              container-class="gap-3"
            >
              <InputOTPGroup class="gap-2 *:data-[slot=input-otp-slot]:h-14 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl *:data-[slot=input-otp-slot]:font-mono">
                <InputOTPSlot :index="0" />
                <InputOTPSlot :index="1" />
                <InputOTPSlot :index="2" />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup class="gap-2 *:data-[slot=input-otp-slot]:h-14 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl *:data-[slot=input-otp-slot]:font-mono">
                <InputOTPSlot :index="3" />
                <InputOTPSlot :index="4" />
                <InputOTPSlot :index="5" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <FieldError v-if="errorMessage" class="text-center text-xs text-destructive mt-1">
            {{ errorMessage }}
          </FieldError>

          <FieldDescription class="text-center text-xs text-muted-foreground mt-2">
            Tip: Enter any 6-digit code or <button type="button" @click="fillDemoOtp" class="font-medium underline hover:text-foreground">use quick login (123456)</button>
          </FieldDescription>
        </Field>

        <Field>
          <Button type="submit" class="w-full cursor-pointer" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 size-4 animate-spin" />
            <span>Verify & Access System</span>
          </Button>
        </Field>
      </FieldGroup>
    </form>

    <FieldDescription class="px-6 text-center text-xs text-muted-foreground">
      DMBB Modern Barcode-Based Inventory Management System &bull; Offline Dexie.js Persistence
    </FieldDescription>
  </div>
</template>
