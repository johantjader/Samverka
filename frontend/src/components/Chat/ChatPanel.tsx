import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { ChatMessage } from '@samverka/shared';

interface ChatPanelProps {
    roomId: string;
    title?: string;
    onMessage?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ roomId, title, onMessage }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newItem, setNewItem] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Mock Users for Mentions
    const MOCK_USERS = [
        { id: '1', displayName: 'Johan' },
        { id: '2', displayName: 'Alice' },
        { id: '3', displayName: 'Bob' },
        { id: '4', displayName: 'Charlie' },
        { id: '5', displayName: 'David' },
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async () => {
        try {
            const res = await api.getMessages(roomId);
            if (res.messages) {
                setMessages(prev => {
                    const realMessages = res.messages;

                    // Simple Deduplication Strategy:
                    // 1. Start with all real messages from backend
                    // 2. Add any Pending "temp" messages ONLY if they don't seem to have been synced yet.
                    //    Match by content + sender. 

                    const backendContentSet = new Set(realMessages.map((m: any) => `${m.senderId}:${m.content}`));
                    const pendingMessages = prev.filter(m => m.id.startsWith('temp-'));

                    const merged = [...realMessages];

                    for (const temp of pendingMessages) {
                        const key = `${temp.senderId}:${temp.content}`;
                        if (!backendContentSet.has(key)) {
                            // Only keep if it's not in backend list
                            merged.push(temp);
                        }
                    }

                    merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

                    // Notify parent if count increased (and not initial load)
                    if (prev.length > 0 && merged.length > prev.length && onMessage) {
                        onMessage();
                    }

                    return merged;
                });
            }
        } catch (error) {
            console.error("Failed to poll messages", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (msg: ChatMessage) => {
        if (!confirm("Delete this message?")) return;

        // Optimistic Delete
        setMessages(prev => prev.filter(m => m.id !== msg.id));

        try {
            await api.deleteMessage(roomId, msg.timestamp, msg.id);
        } catch (err) {
            console.error("Failed to delete", err);
            fetchMessages(); // Revert on fail
        }
    };

    useEffect(() => {
        setMessages([]); // Clear on room change
        setLoading(true);
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [roomId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages.length, roomId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim() || !user) return;

        const content = newItem.trim();
        setNewItem('');
        setShowMentions(false);

        // Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: ChatMessage = {
            id: tempId,
            roomId,
            senderId: user.userId,
            senderName: user.displayName,
            content,
            timestamp: new Date().toISOString(),
            reactions: {}
        };

        setMessages(prev => [...prev, optimisticMsg]);
        scrollToBottom();

        try {
            await api.sendMessage(roomId, content, user.userId, user.displayName);
        } catch (error) {
            console.error("Failed to send", error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("Failed to send message");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewItem(val);

        // Simple mention detection: Check if the last word starts with @
        const cursorPosition = e.target.selectionStart || 0;
        const textBeforeCursor = val.slice(0, cursorPosition);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        if (lastAt !== -1) {
            // Check if there are spaces between @ and cursor, if NO spaces, then we are typing a mention
            const textAfterAt = textBeforeCursor.slice(lastAt + 1);
            if (!textAfterAt.includes(' ')) {
                setShowMentions(true);
                setMentionFilter(textAfterAt);
                return;
            }
        }
        setShowMentions(false);
    };

    const handleMentionSelect = (userName: string) => {
        // Replace @filter with @userName + space
        const cursorPosition = inputRef.current?.selectionStart || 0;
        const textBeforeCursor = newItem.slice(0, cursorPosition);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        const prefix = textBeforeCursor.slice(0, lastAt);
        const suffix = newItem.slice(cursorPosition);

        const newText = `${prefix}@${userName} ${suffix}`;
        setNewItem(newText);
        setShowMentions(false);
        inputRef.current?.focus();
    };

    const filteredUsers = MOCK_USERS.filter(u =>
        u.displayName.toLowerCase().startsWith(mentionFilter.toLowerCase())
    );

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Common Emojis for quick access
    const EMOJIS = ["👍", "👎", "❤️", "😂", "😮", "🎉", "🤔", "👋", "🚀", "🔥"];

    const insertEmoji = (emoji: string) => {
        setNewItem(prev => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    // Helper to linkify text
    const renderContent = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nnc-base hover:text-nnc-primary underline decoration-accent-tech/60 underline-offset-2 break-all"
                        onClick={(e) => e.stopPropagation()} // Prevent bubble clicks
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <div className="flex flex-col h-full bg-nnc-surface border border-nnc-subtle rounded-lg overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b border-nnc-subtle bg-nnc-base/50 shadow-sm z-10 flex justify-between items-center">
                <h3 className="font-bold text-nnc-primary font-mono">{title || "Chat Room"}</h3>
                <div className="text-[10px] text-nnc-muted flex items-center gap-1 bg-nnc-base/60 px-2 py-1 rounded-full border border-nnc-subtle" title="This chat is ephemeral">
                    <span>⏳</span>
                    <span>Raderas automatiskt (60 dagar)</span>
                </div>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-nnc-base/40">
                {loading && messages.length === 0 && <div className="text-center text-nnc-muted text-sm">Loading...</div>}

                {!loading && messages.length === 0 && (
                    <div className="text-center text-nnc-muted text-sm py-8">
                        No messages yet. Say hello! 👋
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.senderId === user?.userId;
                    // Show avatar if not me, and (first message OR previous message was from someone else)
                    const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);

                    return (
                        <div key={msg.id} className={`group flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>

                            {/* Avatar Area (Fixed Width) */}
                            {!isMe && (
                                <div className="w-8 h-8 flex-shrink-0">
                                    {showAvatar ? (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-nnc-base text-xs font-bold shadow-sm">
                                            {msg.senderName?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                {/* Name Label */}
                                {showAvatar && <span className="text-xs text-nnc-muted ml-1 mb-1">{msg.senderName}</span>}

                                <div className={`relative px-4 py-2 shadow-sm text-sm ${isMe
                                    ? 'bg-accent-action text-nnc-base rounded-2xl rounded-tr-none'
                                    : 'bg-nnc-base text-nnc-primary rounded-2xl rounded-tl-none'
                                    }`}>
                                    <p className="break-words leading-relaxed whitespace-pre-wrap">
                                        {isMe ? renderContent(msg.content) : (
                                            msg.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                                part.match(/(https?:\/\/[^\s]+)/g) ? (
                                                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-accent-tech hover:underline">{part}</a>
                                                ) : part
                                            )
                                        )}
                                    </p>

                                    {/* Delete Button (Hover) */}
                                    {isMe && !msg.id.startsWith('temp') && (
                                        <button
                                            onClick={() => handleDelete(msg)}
                                            className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-nnc-muted hover:text-red-500 transition-opacity p-1"
                                            title="Delete message"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                                <span className="text-[10px] text-nnc-muted mt-1 px-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Mentions Popup */}
            {showMentions && filteredUsers.length > 0 && (
                <div className="absolute bottom-20 left-4 bg-nnc-surface border border-nnc-subtle shadow-xl rounded-lg w-48 overflow-hidden z-20">
                    <div className="text-xs font-bold text-nnc-muted px-3 py-2 bg-nnc-base/60 border-b border-nnc-subtle">Mentions</div>
                    {filteredUsers.map(u => (
                        <div
                            key={u.id}
                            onClick={() => handleMentionSelect(u.displayName)}
                            className="px-3 py-2 hover:bg-nnc-base/60 cursor-pointer text-sm font-medium text-nnc-primary flex items-center gap-2"
                        >
                            <div className="w-5 h-5 rounded-full bg-nnc-base text-[10px] flex items-center justify-center">
                                {u.displayName[0]}
                            </div>
                            {u.displayName}
                        </div>
                    ))}
                </div>
            )}

            {/* Emoji Picker Popup */}
            {showEmojiPicker && (
                <div className="absolute bottom-20 right-4 bg-nnc-surface border border-nnc-subtle shadow-xl rounded-lg p-2 grid grid-cols-5 gap-1 z-20">
                    {EMOJIS.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => insertEmoji(emoji)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-nnc-base/60 rounded text-lg transition-colors"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-nnc-surface border-t border-nnc-subtle">
                <form onSubmit={handleSend} className="flex gap-2 items-center">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-nnc-muted hover:text-nnc-primary p-2 rounded-full hover:bg-nnc-base transition-colors"
                    >
                        😊
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        name="message"
                        id="message-input"
                        aria-label="Message"
                        value={newItem}
                        onChange={handleInputChange}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-3 bg-nnc-base border border-nnc-subtle rounded-full focus:ring-2 focus:ring-accent-tech focus:bg-nnc-surface transition-all outline-none text-nnc-primary placeholder:text-nnc-muted"
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        disabled={!newItem.trim()}
                        className="bg-accent-action text-nnc-base rounded-full p-3 w-12 h-12 flex items-center justify-center hover:bg-accent-action/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                    >
                        ➤
                    </button>
                </form>
            </div>
        </div>
    );
};




