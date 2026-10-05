import { create } from 'zustand'

type SessionStatus = 'idle' | 'authenticated' | 'unauthenticated' | 'offline'
interface GuestSessionState { status: SessionStatus }

// The public Free app has no local account session; ERPCons owns sign-in.
export const useAuthStore = create<GuestSessionState>(() => ({ status: 'unauthenticated' }))
