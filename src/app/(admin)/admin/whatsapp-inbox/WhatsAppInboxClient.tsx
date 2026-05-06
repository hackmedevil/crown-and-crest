'use client'

import { useEffect, useMemo, useState } from 'react'

type Conversation = {
  id: string
  wa_id: string
  contact_name: string | null
  last_message_text: string | null
  last_message_at: string | null
  unread_count: number
}

type InboxMessage = {
  id: string
  direction: 'inbound' | 'outbound' | 'status'
  message_type: string | null
  text_body: string | null
  status: string | null
  error_message: string | null
  created_at: string
  wa_id: string
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleString()
}

export default function WhatsAppInboxClient() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [selectedWaId, setSelectedWaId] = useState<string>('')
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null)

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.wa_id === selectedWaId) || null,
    [conversations, selectedWaId]
  )

  async function loadConversations(q?: string) {
    setLoadingConversations(true)
    try {
      const params = new URLSearchParams()
      if (q && q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/admin/whatsapp/inbox/conversations?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load conversations')
      const rows: Conversation[] = Array.isArray(data?.data) ? data.data : []
      setConversations(rows)
      if (!selectedWaId && rows.length > 0) {
        setSelectedWaId(rows[0].wa_id)
      } else if (selectedWaId && !rows.some((row) => row.wa_id === selectedWaId)) {
        setSelectedWaId(rows.length > 0 ? rows[0].wa_id : '')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load conversations')
    } finally {
      setLoadingConversations(false)
    }
  }

  async function loadMessages(waId: string, options?: { markAsRead?: boolean }) {
    if (!waId) return
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/admin/whatsapp/inbox/messages?wa_id=${encodeURIComponent(waId)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load messages')
      const rows: InboxMessage[] = Array.isArray(data?.data) ? data.data : []
      setMessages(rows)
      if (options?.markAsRead !== false) {
        await fetch('/api/admin/whatsapp/inbox/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wa_id: waId }),
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages')
    } finally {
      setLoadingMessages(false)
    }
  }

  async function refreshInbox() {
    setIsRefreshing(true)
    setError(null)
    try {
      await loadConversations(search)
      if (selectedWaId) {
        await loadMessages(selectedWaId, { markAsRead: false })
      }
      setLastRefreshedAt(new Date().toISOString())
    } finally {
      setIsRefreshing(false)
    }
  }

  async function sendReply() {
    if (!selectedWaId || !replyText.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/whatsapp/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wa_id: selectedWaId, message: replyText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to send message')
      setReplyText('')
      await loadMessages(selectedWaId)
      await loadConversations(search)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    void loadConversations('')
  }, [])

  useEffect(() => {
    if (!selectedWaId) return
    void loadMessages(selectedWaId)
  }, [selectedWaId])

  useEffect(() => {
    const t = setTimeout(() => {
      void loadConversations(search)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshInbox()
    }, 10000)

    return () => clearInterval(interval)
  }, [search, selectedWaId])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshInbox()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [search, selectedWaId])

  return (
    <div className="h-[calc(100vh-8rem)] p-4 md:p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Inbox</h1>
            <p className="text-sm text-gray-600">Incoming customer messages and admin replies.</p>
          </div>
          <button
            onClick={refreshInbox}
            disabled={isRefreshing}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Auto-refresh every 10s{lastRefreshedAt ? ` • Last refresh: ${formatDateTime(lastRefreshedAt)}` : ''}
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border bg-white">
          <div className="border-b p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number / name"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="h-[calc(100%-62px)] overflow-y-auto">
            {loadingConversations && (
              <div className="p-3 text-sm text-gray-500">Loading conversations...</div>
            )}

            {!loadingConversations && conversations.length === 0 && (
              <div className="p-3 text-sm text-gray-500">No conversations yet.</div>
            )}

            {conversations.map((c) => {
              const active = c.wa_id === selectedWaId
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedWaId(c.wa_id)}
                  className={`w-full border-b px-3 py-3 text-left transition ${active ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{c.contact_name || c.wa_id}</p>
                    {c.unread_count > 0 && (
                      <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">{c.unread_count}</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-600">{c.wa_id}</p>
                  <p className="mt-1 truncate text-sm text-gray-700">{c.last_message_text || '-'}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatDateTime(c.last_message_at)}</p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="flex h-full flex-col rounded-xl border bg-white">
          <div className="border-b p-3">
            <p className="font-semibold text-gray-900">{selectedConversation?.contact_name || selectedConversation?.wa_id || 'Select conversation'}</p>
            <p className="text-xs text-gray-500">{selectedConversation?.wa_id || ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {loadingMessages && <div className="text-sm text-gray-500">Loading messages...</div>}

            {!loadingMessages && !selectedWaId && (
              <div className="text-sm text-gray-500">Pick a conversation to view messages.</div>
            )}

            {!loadingMessages && selectedWaId && messages.length === 0 && (
              <div className="text-sm text-gray-500">No messages in this conversation.</div>
            )}

            <div className="space-y-2">
              {messages.map((m) => {
                const outbound = m.direction === 'outbound'
                return (
                  <div key={m.id} className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${outbound ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      <p>{m.text_body || `[${m.message_type || 'message'}]`}</p>
                      <p className={`mt-1 text-[11px] ${outbound ? 'text-green-100' : 'text-gray-500'}`}>
                        {formatDateTime(m.created_at)}
                        {outbound && m.status ? ` • ${m.status}` : ''}
                      </p>
                      {m.error_message && <p className="mt-1 text-[11px] text-red-200">{m.error_message}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type a reply..."
                className="w-full resize-none rounded-md border px-3 py-2 text-sm"
              />
              <button
                onClick={sendReply}
                disabled={sending || !replyText.trim() || !selectedWaId}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
