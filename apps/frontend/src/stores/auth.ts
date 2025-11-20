import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)
    const isLoading = ref(true)

    // Initialize auth listener
    const init = () => {
        onAuthStateChanged(auth, async (currentUser) => {
            user.value = currentUser
            if (currentUser) {
                token.value = await currentUser.getIdToken()
            } else {
                token.value = null
            }
            isLoading.value = false
        })
    }

    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider)
        } catch (error) {
            console.error('Error signing in with Google:', error)
            throw error
        }
    }

    const signOut = async () => {
        try {
            await firebaseSignOut(auth)
            user.value = null
            token.value = null
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const getFreshToken = async () => {
        if (user.value) {
            try {
                const newToken = await user.value.getIdToken()
                token.value = newToken
                return newToken
            } catch (error) {
                console.error('Error getting fresh token:', error)
                return null
            }
        }
        return null
    }

    const isAuthenticated = computed(() => !!user.value)

    return {
        user,
        token,
        isLoading,
        isAuthenticated,
        init,
        signInWithGoogle,
        signOut,
        getFreshToken
    }
})
