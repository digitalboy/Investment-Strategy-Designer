import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { authService } from '@/services/authService'

export const useAuthStore = defineStore('auth', () => {
    // Store only necessary user info, not the full Firebase User object
    const user = ref<{
        uid: string;
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
        getIdToken: () => Promise<string>; // We might still need this if we call it later, but better to use auth.currentUser
    } | null>(null)
    const token = ref<string | null>(null)
    const isLoading = ref(true)

    // Initialize auth listener
    const init = () => {
        onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Create a lightweight object to avoid deep reactivity issues with Firebase User
                user.value = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    getIdToken: () => currentUser.getIdToken() // Wrap method
                }
                
                token.value = await currentUser.getIdToken()
                // Sync user with backend
                try {
                    await authService.syncUser(token.value)
                } catch (e) {
                    console.error('Failed to sync user:', e)
                }
            } else {
                user.value = null
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
        const currentUser = auth.currentUser
        if (currentUser) {
            try {
                const newToken = await currentUser.getIdToken(true) // Force refresh
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
