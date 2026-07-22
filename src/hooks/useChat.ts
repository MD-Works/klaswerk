// ═══════════════════════════════════════════════════
// KlasWerk — useChat Hook
// ───────────────────────────────────────────────────
// Real-time chat for Live Sessions using
// Supabase Realtime channel subscriptions.
//
// Usage:
//   const { messages, sendMessage, isLoading } = useChat(sessionId)
// Session 6
// ═══════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  message: string
  is_private: boolean
  sent_at: string
  // Resolved from profiles JOIN or broadcast payload
  sender_name: string | null
  sender_email: string
}

export interface HandRaiseEvent {
  type: 'raise_hand' | 'lower_hand'
  user_id: string
  user_name: string | null
}

// ═══════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════
export function useChat(sessionId: string | null) {
  const { user } = useAuthStore()
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── Fetch initial messages ──────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!sessionId) return
    setIsLoading(true)

    const { data, error } = await db
      .from('chat_messages')
      .select(`*, sender:user_id ( full_name, email )`)
      .eq('session_id', sessionId)
      .order('sent_at', { ascending: true })
      .limit(200)

    setIsLoading(false)
    if (error || !data) return

    setMessages(data.map((row: any) => ({  // eslint-disable-line @typescript-eslint/no-explicit-any
      id:           row.id,
      session_id:   row.session_id,
      user_id:      row.user_id,
      message:      row.message,
      is_private:   row.is_private,
      sent_at:      row.sent_at,
      sender_name:  row.sender?.full_name ?? null,
      sender_email: row.sender?.email ?? '',
    })))
  }, [sessionId])

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (
    text: string,
    isPrivate = false,
  ): Promise<boolean> => {
    if (!user || !sessionId || !text.trim()) return false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await db
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id:    user.id,
        message:    text.trim(),
        is_private: isPrivate,
      })

    return !error
  }, [user, sessionId])

  // ── Broadcast hand raise (ephemeral — not persisted) ─────────────────────
  const broadcastHandRaise = useCallback((raised: boolean) => {
    if (!channelRef.current || !user) return
    channelRef.current.send({
      type: 'broadcast',
      event: raised ? 'raise_hand' : 'lower_hand',
      payload: {
        user_id:   user.id,
        user_name: null, // caller can fill from profile
      },
    })
  }, [user])

  // ── Subscribe to Realtime ─────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return

    fetchMessages()

    const channel = supabase
      .channel(`live-room:${sessionId}`)
      // Postgres changes — new chat messages
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          // Fetch sender profile for the new message
          const row = payload.new as { id: string; session_id: string; user_id: string; message: string; is_private: boolean; sent_at: string }

          const { data: sender } = await db
            .from('profiles')
            .select('full_name, email')
            .eq('id', row.user_id)
            .single() as { data: { full_name: string | null; email: string } | null }

          const msg: ChatMessage = {
            id:           row.id,
            session_id:   row.session_id,
            user_id:      row.user_id,
            message:      row.message,
            is_private:   row.is_private,
            sent_at:      row.sent_at,
            sender_name:  sender?.full_name ?? null,
            sender_email: sender?.email ?? '',
          }

          setMessages(prev => {
            // Deduplicate
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        },
      )
      // Broadcast — hand raise/lower (ephemeral)
      .on('broadcast', { event: 'raise_hand' }, ({ payload }) => {
        setRaisedHands(prev => {
          const next = new Set(prev)
          next.add(payload.user_id)
          return next
        })
      })
      .on('broadcast', { event: 'lower_hand' }, ({ payload }) => {
        setRaisedHands(prev => {
          const next = new Set(prev)
          next.delete(payload.user_id)
          return next
        })
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [sessionId])

  return {
    messages,
    raisedHands,
    isLoading,
    sendMessage,
    broadcastHandRaise,
    refetch: fetchMessages,
  }
}
