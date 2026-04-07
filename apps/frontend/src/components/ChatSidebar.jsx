import { useState, useRef, useEffect } from "react"
import { Send, Shield } from "lucide-react"

export default function ChatSidebar({ messages, isChatEnabled, isHost, currentUserId, onSendMessage, onToggleChat }) {
    const [newMessage, setNewMessage] = useState("")
    const scrollRef = useRef(null)

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = (e) => {
        e.preventDefault()
        if (!newMessage.trim()) return
        
        onSendMessage(newMessage)
        setNewMessage("")
    }

    const canSend = isHost || isChatEnabled

    return (
        <div className="w-80 bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden shrink-0 shadow-lg h-full">
            <div className="p-4 border-b border-gray-800 flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">In-call Messages</h3>
                </div>
                {isHost && (
                    <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
                        <span className="text-sm font-medium text-gray-300">Allow participants to chat</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={isChatEnabled} 
                                onChange={(e) => onToggleChat(e.target.checked)} 
                            />
                            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                        No messages yet
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender?.id === currentUserId
                        return (
                            <div key={msg.id} className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm text-gray-200">
                                        {isMe ? "You" : msg.sender?.name}
                                    </span>
                                    {msg.isHost && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                            <Shield className="w-3 h-3" /> Host
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-500 ml-auto">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={`p-3 rounded-xl text-sm break-words border ${isMe ? 'bg-blue-600/20 border-blue-600/30 text-blue-50 rounded-tr-sm' : 'bg-gray-800 border-gray-700/50 text-gray-100 rounded-tl-sm'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900 shrink-0">
                {!canSend && !isHost ? (
                    <div className="text-center p-3 text-sm text-red-400 bg-red-400/10 rounded-lg border border-red-400/20 font-medium">
                        Chat is disabled by host
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Send a message..."
                            className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 disabled:opacity-50 text-sm"
                            disabled={!canSend}
                        />
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim() || !canSend} 
                            className="absolute right-2 p-2 text-blue-500 hover:text-blue-400 disabled:text-gray-600 transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
