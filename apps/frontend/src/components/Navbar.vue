<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const emit = defineEmits(['navigate-home'])

const authStore = useAuthStore()

const handleLogin = async () => {
    try {
        await authStore.signInWithGoogle()
    } catch (error) {
        // Error handling is done in the store or can be added here
    }
}

const handleLogout = () => {
    authStore.signOut()
}
</script>

<template>
    <nav class="border-b bg-white/75 backdrop-blur-md sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex items-center gap-8">
                    <div class="flex items-center gap-3 cursor-pointer" @click="$emit('navigate-home')">
                        <div
                            class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                            Q
                        </div>
                        <span class="font-bold text-xl tracking-tight text-slate-800">QuantStrategy</span>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    

                    <div v-if="authStore.isLoading" class="h-8 w-8 rounded-full bg-slate-200 animate-pulse"></div>

                    <div v-else-if="authStore.user">
                        <DropdownMenu>
                            <DropdownMenuTrigger class="focus:outline-none">
                                <Avatar>
                                    <AvatarImage :src="authStore.user.photoURL || ''"
                                        :alt="authStore.user.displayName || 'User'" />
                                    <AvatarFallback>{{ authStore.user.displayName ?
                                        authStore.user.displayName.charAt(0).toUpperCase() : 'U' }}</AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                    <div class="flex flex-col space-y-1">
                                        <p class="text-sm font-medium leading-none">{{ authStore.user.displayName }}</p>
                                        <p class="text-xs leading-none text-muted-foreground">{{ authStore.user.email }}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem @click="handleLogout" class="text-red-600 cursor-pointer">
                                    <i class="fa-solid fa-right-from-bracket mr-2"></i>
                                    退出登录
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Button v-else @click="handleLogin" variant="default" size="sm"
                        class="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <i class="fa-brands fa-google mr-2"></i>
                        登录
                    </Button>
                </div>
            </div>
        </div>
    </nav>
</template>
