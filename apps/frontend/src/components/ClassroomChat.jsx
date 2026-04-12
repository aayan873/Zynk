import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
    Send, 
    Smile, 
    MessageCircle, 
    Lock, 
    Unlock, 
    ChevronRight,
    User,
    Clock
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
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Initialize Socket
        const socket = io(BACKEND_URL, {
            auth: { token },
            transports: ['websocket']
        });
        socketRef.current = socket;

        // Join Classroom Room
        socket.emit('join-classroom-chat', { classroomId: classroom._id }, (res) => {
            if (res.error) {
                console.error("Socket join error:", res.error);
                toast.error("Failed to connect to real-time chat.");
            }
        });

        // Listen for new messages
        socket.on('new-classroom-message', (message) => {
            const decryptedContent = decryptMessage(message.content, classroom._id);
            setMessages(prev => [...prev, { ...message, content: decryptedContent }]);
            setTimeout(scrollToBottom, 100);
        });

        // Listen for chat status changes
        socket.on('classroom-chat-status-changed', ({ isEnabled }) => {
            setIsChatEnabled(isEnabled);
            toast.success(`Chat ${isEnabled ? 'enabled' : 'disabled'} by teacher`);
        });

        // Listen for reactions (to be used in Task 5)
        socket.on('react-to-classroom-message', ({ messageId, reactions }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
        });

        // Fetch History
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/classrooms/${classroom._id}/messages`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success) {
                    const decryptedMessages = res.data.data.map(m => ({
                        ...m,
                        content: decryptMessage(m.content, classroom._id)
                    }));
                    setMessages(decryptedMessages);
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

        return () => {
            socket.emit('leave-classroom-chat', { classroomId: classroom._id });
            socket.disconnect();
        };
    }, [classroom._id, token]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        if (!isChatEnabled && !isTeacher) {
            toast.error("Chat is currently disabled.");
            return;
        }

        setSending(true);
        try {
            const encryptedContent = encryptMessage(newMessage.trim(), classroom._id);
            const res = await axios.post(`${BACKEND_URL}/api/classrooms/${classroom._id}/messages`, {
                content: encryptedContent,
                // replyTo and mentions will be added in Task 5
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setNewMessage('');
            }
        } catch (err) {
            console.error("Failed to send message:", err);
            toast.error("Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    const toggleChat = async () => {
        if (!isTeacher) return;
        try {
            const res = await axios.patch(`${BACKEND_URL}/api/classrooms/${classroom._id}/chat/toggle`, {
                isEnabled: !isChatEnabled
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setIsChatEnabled(res.data.isChatEnabled);
            }
        } catch (err) {
            console.error("Failed to toggle chat:", err);
            toast.error("Failed to update chat status.");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Spinner />
                <p className="mt-4 text-sm font-medium">Securing connection & decrypting messages...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#14151a] rounded-2xl overflow-hidden shadow-2xl border border-gray-800/10">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between bg-[#1a1b21]/80 backdrop-blur-md">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <MessageCircle size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">Classroom Discussion</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">End-to-End Encrypted</p>
                    </div>
                </div>

                {isTeacher && (
                    <button 
                        onClick={toggleChat}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isChatEnabled 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                        }`}
                    >
                        {isChatEnabled ? <Unlock size={14} /> : <Lock size={14} />}
                        <span>{isChatEnabled ? 'Chat Active' : 'Chat Locked'}</span>
                    </button>
                )}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                        <MessageCircle size={48} className="text-gray-600 mb-4" />
                        <p className="text-sm font-medium text-gray-500 max-w-[200px]">No messages yet. Be the first to start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isOwn = msg.senderId?._id === user?._id || msg.senderId === user?._id;
                        return (
                            <div 
                                key={msg._id} 
                                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                            >
                                {!isOwn && (
                                    <span className="text-[10px] font-bold text-gray-500 mb-1.5 ml-1 flex items-center">
                                        {msg.senderId?.name || 'User'}
                                        {msg.senderId?.role === 'Teacher' && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-[8px] uppercase">Teacher</span>
                                        )}
                                    </span>
                                )}
                                <div 
                                    className={`max-w-[80%] px-4 py-3 rounded-2xl relative shadow-md ${
                                        isOwn 
                                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                                        : 'bg-[#1e1f26] text-gray-100 rounded-tl-none border border-gray-800/50'
                                    }`}
                                >
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    <div className={`mt-1.5 flex items-center space-x-2 text-[8px] ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>
                                        <Clock size={8} />
                                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#1a1b21]/50 border-t border-gray-800/50">
                {!isChatEnabled && !isTeacher ? (
                    <div className="w-full py-3 px-4 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-center space-x-2 text-red-400/80 text-xs font-bold">
                        <Lock size={14} />
                        <span>The teacher has disabled chat for this classroom.</span>
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="relative flex items-center space-x-2">
                        <div className="flex-1 relative group">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={isChatEnabled ? "Type a message..." : "Chat is locked (Teacher override active)"}
                                className="w-full bg-[#0e0e11] border border-gray-800/80 text-gray-100 text-sm py-3.5 pl-5 pr-12 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-gray-600"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                                <button type="button" className="p-1.5 text-gray-500 hover:text-gray-300 transition hover:bg-white/5 rounded-lg">
                                    <Smile size={18} />
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="p-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            {sending ? <Spinner size="sm" /> : <Send size={18} />}
                        </button>
                    </form>
                )}
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #2a2b33;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #3f404d;
                }
            `}</style>
        </div>
    );
}

const Spinner = ({ size = "default" }) => (
    <div className={`animate-spin rounded-full border-b-2 border-indigo-500/30 border-t-indigo-500 ${size === "sm" ? "h-4 w-4" : "h-8 w-8"}`}></div>
);
