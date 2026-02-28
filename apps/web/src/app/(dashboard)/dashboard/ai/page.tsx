'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Bot, Send, Trash2, User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export default function AiAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [conversationId, setConversationId] = useState<string | undefined>(undefined)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const chatMutation = useMutation({
        mutationFn: (message: string) => api.aiChat(message, conversationId),
        onSuccess: (res) => {
            const data = res.data
            if (data.conversationId) setConversationId(data.conversationId)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response || data.message || data.content || JSON.stringify(data),
            }])
        },
        onError: (error: any) => {
            const msg = error.response?.data?.message || 'AI service unavailable'
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
            }])
        },
    })

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault()
        const msg = input.trim()
        if (!msg) return
        setMessages(prev => [...prev, { role: 'user', content: msg }])
        setInput('')
        chatMutation.mutate(msg)
    }

    const handleClear = async () => {
        if (conversationId) {
            try {
                await api.aiClearConversation(conversationId)
            } catch {
                // ignore
            }
        }
        setMessages([])
        setConversationId(undefined)
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-primary" />
                        AI Assistant
                    </h1>
                    <p className="text-muted-foreground">Ask questions about your maintenance data, troubleshoot issues, or get recommendations.</p>
                </div>
                {messages.length > 0 && (
                    <Button variant="outline" onClick={handleClear}>
                        <Trash2 className="h-4 w-4 mr-2" /> Clear Chat
                    </Button>
                )}
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Bot className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">How can I help?</h3>
                                <p className="text-muted-foreground text-sm max-w-md mt-1">
                                    I can help you troubleshoot equipment issues, summarize work orders, predict failures, and provide maintenance recommendations.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg">
                                {[
                                    'What work orders are overdue?',
                                    'Summarize recent maintenance activity',
                                    'Help me troubleshoot a pump failure',
                                    'What assets need attention soon?',
                                ].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        className="text-left text-sm px-4 py-3 rounded-lg border hover:bg-muted transition-colors"
                                        onClick={() => {
                                            setInput(suggestion)
                                        }}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                            {msg.role === 'assistant' && (
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Bot className="h-4 w-4 text-primary" />
                                </div>
                            )}
                            <div className={cn(
                                'max-w-[70%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap',
                                msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                            )}>
                                {msg.content}
                            </div>
                            {msg.role === 'user' && (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <User className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                    ))}

                    {chatMutation.isPending && (
                        <div className="flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Bot className="h-4 w-4 text-primary" />
                            </div>
                            <div className="bg-muted rounded-lg px-4 py-2.5">
                                <div className="flex gap-1">
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </CardContent>

                <div className="border-t p-4">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything about your maintenance operations..."
                            disabled={chatMutation.isPending}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={chatMutation.isPending || !input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    )
}
