import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
    Send, Smile, MessageCircle, Lock, Unlock,
    User, Clock, Reply, AtSign, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { encryptMessage, decryptMessage } from '../utils/crypto';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ClassroomChat({ classroom, user, isTeacher, token }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isChatEnabled, setIsChatEnabled] = useState(classroom.isChatEnabled);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [mentions, setMentions] = useState([]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionIndex, setMentionIndex] = useState(-1);
    const [openPickerId, setOpenPickerId] = useState(null);

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => {
        const socket = io(BACKEND_URL, { auth: { token }, transports: ['websocket'] });
        socketRef.current = socket;

        socket.emit('join-classroom-chat', { classroomId: classroom._id }, (res) => {
            if (res.error) toast.error("Failed to connect to real-time chat.");
        });

        socket.on('new-classroom-message', (message) => {
            const decrypted = { ...message, content: decryptMessage(message.content, classroom._id) };
            setMessages(prev => [...prev, decrypted]);
            setTimeout(scrollToBottom, 100);

            const currentUserId = user?._id?.toString();
            const senderId = (message.senderId?._id || message.senderId)?.toString();
            if (senderId === currentUserId) return;

            const senderName = message.senderProfile?.fullName || 'Someone';
            const isMentioned = (message.mentions || []).some(m => (m?._id || m)?.toString() === currentUserId);
            const replyTargetId = (message.replyTo?.senderId?._id || message.replyTo?.senderId)?.toString();
            const isReplyToMe = replyTargetId === currentUserId;

            if (isMentioned) toast.custom(() => (
                <div className="max-w-xs w-full bg-indigo-600 shadow-lg rounded-xl flex items-start gap-3 px-4 py-3">
                    <span className="text-xl">📣</span>
                    <div>
                        <p className="text-xs font-black text-white uppercase tracking-widest mb-0.5">Mentioned</p>
                        <p className="text-sm text-indigo-100"><span className="font-bold">{senderName}</span> mentioned you</p>
                    </div>
                </div>
            ), { duration: 4000 });

            if (isReplyToMe) toast.custom(() => (
                <div className="max-w-xs w-full bg-[#1e1f26] border border-gray-700 shadow-lg rounded-xl flex items-start gap-3 px-4 py-3">
                    <span className="text-xl">↩️</span>
                    <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">Reply</p>
                        <p className="text-sm text-gray-200"><span className="font-bold text-white">{senderName}</span> replied to your message</p>
                    </div>
                </div>
            ), { duration: 4000 });
        });

        socket.on('classroom-chat-status-changed', ({ isEnabled }) => {
            setIsChatEnabled(isEnabled);
            toast.success(`Chat ${isEnabled ? 'enabled' : 'disabled'} by teacher`);
        });

        socket.on('react-to-classroom-message', ({ messageId, reactions }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
        });

        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/classrooms/${classroom._id}/messages`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success) {
                    setMessages(res.data.data.map(m => ({ ...m, content: decryptMessage(m.content, classroom._id) })));
                    setIsChatEnabled(res.data.isChatEnabled);
                }
            } catch (err) {
                console.error("Failed to fetch history:", err);
            } finally {
                setLoading(false);
                setTimeout(scrollToBottom, 500);
            }
        };

        fetchHistory();
        return () => { socket.emit('leave-classroom-chat', { classroomId: classroom._id }); socket.disconnect(); };
    }, [classroom._id, token]);

    const participants = [
        ...(classroom.teachers || []).map(t => ({ id: t.user?._id || t.user, name: t.fullName, type: 'Teacher' })),
        ...(classroom.students || []).map(s => ({ id: s.user?._id || s.user, name: s.fullName, type: 'Student' }))
    ];
    const filteredParticipants = participants.filter(p =>
        p.name.toLowerCase().includes(mentionQuery.toLowerCase()) && p.id !== user?._id
    );

    const handleInputChange = (e) => {
        const value = e.target.value;
        setNewMessage(value);
        const lastAtPos = value.lastIndexOf('@');
        if (lastAtPos !== -1 && (lastAtPos === 0 || value[lastAtPos - 1] === ' ')) {
            setMentionQuery(value.slice(lastAtPos + 1).split(' ')[0]);
            setShowMentions(true);
            setMentionIndex(0);
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (participant) => {
        const lastAtPos = newMessage.lastIndexOf('@');
        const beforeAt = newMessage.slice(0, lastAtPos);
        const afterMention = newMessage.slice(lastAtPos + 1).split(' ').slice(1).join(' ');
        setNewMessage(`${beforeAt}@${participant.name} ${afterMention}`);
        setMentions(prev => [...prev, participant.id]);
        setShowMentions(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (!showMentions) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(prev => (prev + 1) % filteredParticipants.length); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(prev => (prev - 1 + filteredParticipants.length) % filteredParticipants.length); }
        else if (e.key === 'Enter') { e.preventDefault(); if (filteredParticipants[mentionIndex]) insertMention(filteredParticipants[mentionIndex]); }
        else if (e.key === 'Escape') setShowMentions(false);
    };

    const handleReact = async (msgId, emoji) => {
        try {
            await axios.post(`${BACKEND_URL}/api/classrooms/${classroom._id}/messages/${msgId}/react`, { emoji }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) { console.error("Reaction failed:", err); }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;
        if (!isChatEnabled && !isTeacher) { toast.error("Chat is currently disabled."); return; }
        setSending(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/api/classrooms/${classroom._id}/messages`, {
                content: encryptMessage(newMessage.trim(), classroom._id),
                replyTo: replyingTo?._id,
                mentions
            }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) { setNewMessage(''); setReplyingTo(null); setMentions([]); }
        } catch (err) { toast.error("Failed to send message."); }
        finally { setSending(false); }
    };

    const toggleChat = async () => {
        if (!isTeacher) return;
        try {
            const res = await axios.patch(`${BACKEND_URL}/api/classrooms/${classroom._id}/chat/toggle`, {
                isEnabled: !isChatEnabled
            }, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) setIsChatEnabled(res.data.isChatEnabled);
        } catch (err) { toast.error("Failed to update chat status."); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Spinner />
            <p className="mt-4 text-xs sm:text-sm font-medium text-center px-4">Securing connection & decrypting messages...</p>
        </div>
    );

    return (
        <div className="flex flex-col w-full h-full bg-[#14151a] overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800/50 flex items-center justify-between bg-[#1a1b21]/80 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
                        <MessageCircle size={16} className="sm:hidden" />
                        <MessageCircle size={20} className="hidden sm:block" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">Classroom Discussion</h3>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-bold">End-to-End Encrypted</p>
                    </div>
                </div>

                {isTeacher && (
                    <button
                        onClick={toggleChat}
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all border shrink-0 ml-2 ${
                            isChatEnabled
                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                        }`}
                    >
                        {isChatEnabled ? <Unlock size={12} /> : <Lock size={12} />}
                        <span className="hidden xs:inline">{isChatEnabled ? 'Chat Active' : 'Chat Locked'}</span>
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40 px-4">
                        <MessageCircle size={40} className="text-gray-600 mb-3" />
                        <p className="text-xs sm:text-sm font-medium text-gray-500 max-w-[180px]">No messages yet. Be the first to start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = (msg.senderId?._id || msg.senderId)?.toString() === user?._id?.toString();
                        const senderName = msg.senderProfile?.fullName || msg.senderId?.email || 'User';
                        const senderRole = msg.senderProfile?.role || '';
                        return (
                            <div key={msg._id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                {!isOwn && (
                                    <span className="text-[10px] sm:text-[11px] font-bold mb-1 ml-1 flex items-center gap-1.5">
                                        <span className="text-gray-300 truncate max-w-[120px] sm:max-w-none">{senderName}</span>
                                        {senderRole === 'Teacher' && (
                                            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-md text-[8px] font-black uppercase tracking-widest shrink-0">Teacher</span>
                                        )}
                                    </span>
                                )}
                                <div className={`group max-w-[85%] sm:max-w-[72%] px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl relative shadow-md ${
                                    isOwn
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-[#1e1f26] text-gray-100 rounded-tl-none border border-gray-800/50'
                                }`}>
                                    {msg.replyTo && (
                                        <div className={`mb-2 p-2 rounded-lg border-l-4 text-[10px] sm:text-[11px] ${
                                            isOwn ? 'bg-indigo-700/50 border-white/30' : 'bg-gray-800/80 border-indigo-500/50'
                                        }`}>
                                            <p className="font-bold opacity-70 mb-0.5">
                                                {(msg.replyTo.senderId?._id || msg.replyTo.senderId)?.toString() === user?._id?.toString()
                                                    ? 'You' : (msg.replyTo.senderProfile?.fullName || 'User')}
                                            </p>
                                            <p className="line-clamp-1 italic opacity-80">{decryptMessage(msg.replyTo.content, classroom._id)}</p>
                                        </div>
                                    )}

                                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                                    {msg.reactions && msg.reactions.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                            {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => handleReact(msg._id, emoji)}
                                                    className={`px-1.5 py-0.5 rounded-full border text-[9px] sm:text-[10px] flex items-center gap-1 transition-all ${
                                                        msg.reactions.some(r => r.user === user?._id && r.emoji === emoji)
                                                            ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                                            : 'bg-white/5 border-white/10 text-gray-400'
                                                    }`}
                                                >
                                                    <span>{emoji}</span>
                                                    <span className="font-bold">{msg.reactions.filter(r => r.emoji === emoji).length}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className={`mt-1 flex items-center justify-between text-[8px] ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>
                                        <div className="flex items-center gap-1">
                                            <Clock size={8} />
                                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 transition-opacity duration-150 opacity-0 group-hover:opacity-100">
                                            <button onClick={() => setReplyingTo(msg)} title="Reply" className="hover:text-white transition">
                                                <Reply size={10} />
                                            </button>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenPickerId(prev => prev === msg._id ? null : msg._id)}
                                                    title="React"
                                                    className="hover:text-white transition"
                                                >
                                                    <Smile size={10} />
                                                </button>
                                                {openPickerId === msg._id && (
                                                    <div className={`absolute bottom-6 z-50 bg-[#1e1f26] border border-gray-700 rounded-xl shadow-2xl p-2 ${isOwn ? 'right-0' : 'left-0'}`}>
                                                        <div className="grid grid-cols-6 gap-1">
                                                            {['😂','❤️','👍','🔥','👏','😮','🙏','🎉','😭','😍','💯','🤔'].map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => { handleReact(msg._id, emoji); setOpenPickerId(null); }}
                                                                    className="text-base sm:text-lg hover:scale-125 transition p-1 rounded-lg hover:bg-white/10"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 sm:p-4 bg-[#1a1b21]/50 border-t border-gray-800/50 relative shrink-0">
                {/* Mentions Popover */}
                {showMentions && filteredParticipants.length > 0 && (
                    <div className="absolute bottom-full left-3 sm:left-4 mb-2 w-56 sm:w-64 bg-[#1e1f26] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="p-2 border-b border-gray-800 bg-gray-900/50 flex items-center">
                            <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center">
                                <AtSign size={10} className="mr-1" /> Mention Member
                            </span>
                        </div>
                        <div className="max-h-40 sm:max-h-48 overflow-y-auto custom-scrollbar">
                            {filteredParticipants.map((p, i) => (
                                <button
                                    key={p.id}
                                    onClick={() => insertMention(p)}
                                    className={`w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm transition-colors ${
                                        i === mentionIndex ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                            <User size={10} />
                                        </div>
                                        <span className="truncate max-w-[100px] sm:max-w-none">{p.name}</span>
                                    </div>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded shrink-0 ml-1 ${
                                        i === mentionIndex ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-500'
                                    }`}>
                                        {p.type}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Reply Bar */}
                {replyingTo && (
                    <div className="mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#1e1f26] border border-gray-800 rounded-xl">
                        <div className="w-0.5 min-h-[28px] bg-indigo-500 rounded-full shrink-0" />
                        <div className="flex-1 overflow-hidden">
                            <p className="text-[10px] sm:text-[11px] font-bold text-indigo-400 leading-none mb-0.5">
                                Replying to <span className="text-white">
                                    {(replyingTo.senderId?._id || replyingTo.senderId)?.toString() === user?._id?.toString()
                                        ? 'yourself' : (replyingTo.senderProfile?.fullName || 'User')}
                                </span>
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-400 truncate">{replyingTo.content}</p>
                        </div>
                        <button
                            onClick={() => setReplyingTo(null)}
                            className="p-1 sm:p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition shrink-0"
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}

                {!isChatEnabled && !isTeacher ? (
                    <div className="w-full py-2.5 sm:py-3 px-4 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-center gap-2 text-red-400/80 text-xs font-bold">
                        <Lock size={13} />
                        <span>The teacher has disabled chat.</span>
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={isChatEnabled ? "Type a message... (@ to mention)" : "Chat locked (Teacher override)"}
                                className="w-full bg-[#0e0e11] border border-gray-800/80 text-gray-100 text-xs sm:text-sm py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-gray-600"
                            />
                            <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition hover:bg-white/5 rounded-lg">
                                <Smile size={16} />
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="p-3 sm:p-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 shrink-0"
                        >
                            {sending ? <Spinner size="sm" /> : <Send size={16} />}
                        </button>
                    </form>
                )}
            </div>

            <style jsx>{`
                .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
            `}</style>
        </div>
    );
}

const Spinner = ({ size = "default" }) => (
    <div className={`animate-spin rounded-full border-b-2 border-indigo-500/30 border-t-indigo-500 ${size === "sm" ? "h-4 w-4" : "h-8 w-8"}`} />
);