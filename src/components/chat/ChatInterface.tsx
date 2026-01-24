'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  patient_id: string
  sender_type: 'therapist' | 'patient'
  sender_id: string
  content: string
  read_at: string | null
  created_at: string
}

interface ChatInterfaceProps {
  patientId: string
  currentUserId: string
  userType: 'therapist' | 'patient'
  patientName?: string
}

export function ChatInterface({ patientId, currentUserId, userType, patientName }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true })

      if (fetchError) {
        console.error('Error fetching messages:', fetchError)
        setError(`Failed to load messages: ${fetchError.message}`)
      } else if (data) {
        setMessages(data as Message[])
        // Mark unread messages as read
        const unreadIds = data
          .filter(m => m.read_at === null && m.sender_type !== userType)
          .map(m => m.id)

        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIds)
        }
      }
      setLoading(false)
    }

    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `patient_id=eq.${patientId}`
        },
        (payload) => {
          console.log('Realtime message received:', payload)
          const newMsg = payload.new as Message

          // Only add if not already in the list (prevents duplicates from optimistic updates)
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id)
            if (exists) return prev

            // Also remove any temp messages that might match (by content and sender)
            const filtered = prev.filter(m =>
              !m.id.startsWith('temp-') ||
              m.content !== newMsg.content ||
              m.sender_id !== newMsg.sender_id
            )
            return [...filtered, newMsg]
          })

          // Mark as read if from the other party
          if (newMsg.sender_type !== userType) {
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Realtime subscription status:', status, err || '')

        // Handle different subscription states
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
          // Clear any pending retry
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current)
            retryTimeoutRef.current = null
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime subscription error:', err)
          setConnectionStatus('disconnected')
          // Auto-retry after 5 seconds
          retryTimeoutRef.current = setTimeout(() => {
            console.log('Retrying realtime subscription...')
            channel.subscribe()
          }, 5000)
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected')
        }
      })

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [patientId, supabase, userType])

  // Scroll to bottom when new messages arrive - use scrollTop instead of scrollIntoView to prevent page jump
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const messageContent = newMessage.trim()
    const tempId = `temp-${Date.now()}`

    // Optimistic update - add message immediately
    const optimisticMessage: Message = {
      id: tempId,
      patient_id: patientId,
      sender_type: userType,
      sender_id: currentUserId,
      content: messageContent,
      read_at: null,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    setSending(true)
    setError(null)

    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({
        patient_id: patientId,
        sender_type: userType,
        sender_id: currentUserId,
        content: messageContent
      })
      .select()
      .single()

    if (sendError) {
      console.error('Error sending message:', sendError)
      setError(`Failed to send message: ${sendError.message}`)
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } else if (data) {
      // Replace temp message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? data as Message : m))
    }
    setSending(false)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    } else if (isYesterday) {
      return `Yesterday ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {userType === 'therapist' ? `Chat with ${patientName || 'Patient'}` : 'Chat with Therapist'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Messages are private and secure</p>
          </div>
          {/* Connection status indicator */}
          <div className="flex items-center gap-1.5" role="status" aria-live="polite">
            <div 
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`}
              aria-hidden="true"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {connectionStatus === 'connected' ? 'Live' :
               connectionStatus === 'connecting' ? 'Connecting...' :
               'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Disconnection warning banner */}
      {connectionStatus === 'disconnected' && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Real-time updates unavailable. New messages may not appear automatically. Reconnecting...</span>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50"
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">No messages yet</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwnMessage = message.sender_type === userType

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {formatTime(message.created_at)}
                      {isOwnMessage && message.read_at && (
                        <span className="ml-2">✓ Read</span>
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {error && (
          <div id="chat-error" role="alert" className="mb-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-xs">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <label htmlFor="message-input" className="sr-only">Type a message</label>
          <input
            id="message-input"
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            aria-describedby={error ? 'chat-error' : undefined}
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-500 dark:placeholder:text-slate-400 min-h-[44px]"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            aria-label={sending ? 'Sending message' : 'Send message'}
            className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed focus-ring min-h-[44px] min-w-[44px]"
          >
            {sending ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
