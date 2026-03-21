'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { create } from 'zustand'

interface Toast {
  id: number
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: number) => void
}

let nextId = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, message, type }] }))
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

// Convenience function callable from anywhere
export function showToast(message: string, type: Toast['type'] = 'info') {
  useToastStore.getState().addToast(message, type)
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore()

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 3000)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  const borderColor =
    toast.type === 'success' ? 'border-[#0d9488]/50' :
    toast.type === 'warning' ? 'border-[#d97706]/50' :
    toast.type === 'error' ? 'border-[#dc2626]/50' :
    'border-[#0d9488]/30'

  const dotColor =
    toast.type === 'success' ? 'bg-[#0d9488]' :
    toast.type === 'warning' ? 'bg-[#d97706]' :
    toast.type === 'error' ? 'bg-[#dc2626]' :
    'bg-[#0d9488]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: -20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 20, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${borderColor}`}
      style={{ background: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span className="text-[14px] text-[#0f172a] font-medium">{toast.message}</span>
    </motion.div>
  )
}

export function ToastContainer() {
  const { toasts } = useToastStore()

  return (
    <div className="fixed bottom-6 left-6 z-[60] flex flex-col gap-2 max-w-[400px]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
