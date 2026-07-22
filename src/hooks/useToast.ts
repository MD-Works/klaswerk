// ═══════════════════════════════════════════════════
// KlasWerk — Toast Notification System
// ───────────────────────────────────────────────────
// Usage:
//   const { toast } = useToast()
//   toast.success('Course saved!')
//   toast.error('Something went wrong.')
//   toast.info('Session starting soon.')
// ═══════════════════════════════════════════════════

import { create } from 'zustand'
import type { ToastMessage } from '@/types'

interface ToastStore {
  toasts: ToastMessage[]
  add:    (message: string, type: ToastMessage['type']) => void
  remove: (id: string) => void
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  add: (message, type) => {
    const id = crypto.randomUUID()
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }))
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, 4000)
  },

  remove: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))

// Public hook — returns a stable toast object with typed methods
export function useToast() {
  const { toasts, add, remove } = useToastStore()

  const toast = {
    success: (message: string) => add(message, 'success'),
    error:   (message: string) => add(message, 'error'),
    info:    (message: string) => add(message, 'info'),
  }

  return { toasts, toast, removeToast: remove }
}
