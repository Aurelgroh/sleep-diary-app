'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatInterface } from './ChatInterface'

interface ChatSectionProps {
  patientId: string
  currentUserId: string
  patientName: string
}

export function ChatSection({ patientId, currentUserId, patientName }: ChatSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  // Fetch unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId)
        .eq('sender_type', 'patient')
        .is('read_at', null)

      setUnreadCount(count || 0)
    }

    fetchUnreadCount()

    // Subscribe to new messages
    const channel = supabase
      .channel(`unread:${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `patient_id=eq.${patientId}`
        },
        (payload) => {
          if (payload.new && (payload.new as { sender_type: string }).sender_type === 'patient') {
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Unread count subscription error:', err)
          // Silently fail - unread badge is not critical
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId, supabase])

  // Clear unread count when expanded
  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0)
    }
  }, [isExpanded])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
            <p className="text-sm text-slate-500">Chat with {patientName}</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200">
          <ChatInterface
            patientId={patientId}
            currentUserId={currentUserId}
            userType="therapist"
            patientName={patientName}
          />
        </div>
      )}
    </div>
  )
}
