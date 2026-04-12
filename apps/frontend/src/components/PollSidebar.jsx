import { useState, useEffect } from "react"
import { BarChart, Clock, Plus, X } from "lucide-react"
import toast from "react-hot-toast"

export default function PollSidebar({ roomID, socket, activePoll, pollHistory, isHost, currentUserId, onClose }) {
    const [question, setQuestion] = useState("")
    const [options, setOptions] = useState([{ id: "1", text: "" }, { id: "2", text: "" }])
    const [correctOptionId, setCorrectOptionId] = useState("")
    const [timerDuration, setTimerDuration] = useState(60)
    const [timeLeft, setTimeLeft] = useState(0)
    const [selectedOption, setSelectedOption] = useState("")
    const [hasVoted, setHasVoted] = useState(false)

    useEffect(() => {
        if (!activePoll) { setTimeLeft(0); setHasVoted(false); setSelectedOption(""); return; }
        const endDate = new Date(activePoll.createdAt).getTime() + (activePoll.timerDuration * 1000);
        const updateTimer = () => setTimeLeft(Math.max(0, Math.floor((endDate - Date.now()) / 1000)));
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activePoll]);

    useEffect(() => {
        if (activePoll?.votes && Array.isArray(activePoll.votes)) {
            const myVote = activePoll.votes.find(v => v.userId === currentUserId);
            if (myVote) { setHasVoted(true); setSelectedOption(myVote.optionId); }
        }
    }, [activePoll, currentUserId]);

    const handleAddOption = () => {
        if (options.length >= 10) return;
        setOptions([...options, { id: Math.random().toString(36).substring(7), text: "" }]);
    };
    const handleRemoveOption = (id) => {
        if (options.length <= 2) return;
        setOptions(options.filter(o => o.id !== id));
        if (correctOptionId === id) setCorrectOptionId("");
    };
    const handleOptionChange = (id, text) => setOptions(options.map(o => o.id === id ? { ...o, text } : o));

    const handleCreatePoll = (e) => {
        e.preventDefault()
        if (!question.trim()) return toast.error("Question is required")
        if (options.some(o => !o.text.trim())) return toast.error("All options must have text")
        socket.emit("create-poll", { roomID, question, options, correctOptionId: correctOptionId || null, timerDuration }, (res) => {
            if (res?.error) toast.error(res.error)
            else {
                toast.success("Poll created!")
                setQuestion(""); setOptions([{ id: "1", text: "" }, { id: "2", text: "" }]); setCorrectOptionId(""); setTimerDuration(60)
            }
        })
    }

    const handleVote = () => {
        if (!selectedOption) return toast.error("Select an option first")
        socket.emit("submit-poll-vote", { roomID, optionId: selectedOption }, (res) => {
            if (res?.error) toast.error(res.error)
            else { setHasVoted(true); toast.success("Vote submitted!") }
        })
    }

    const handleEndPoll = () => {
        socket.emit("end-poll", { roomID }, (res) => { if (res?.error) toast.error(res.error) })
    }

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    const inputClass = "w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"

    return (
        <div className="w-full sm:w-80 bg-gray-900 rounded-none sm:rounded-2xl border-l sm:border border-gray-800 flex flex-col overflow-hidden shrink-0 shadow-lg h-full">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900 shrink-0">
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <BarChart className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> Live Polls
                </h3>
                {onClose && (
                    <button onClick={onClose} className="p-1.5 rounded-full text-gray-500 hover:text-white hover:bg-white/5 transition sm:hidden">
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col">
                <div className="space-y-5 sm:space-y-6">

                    {/* ACTIVE POLL */}
                    {activePoll && (
                        <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-3 sm:p-4 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/20">
                                <div className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                                    style={{ width: `${(timeLeft / activePoll.timerDuration) * 100}%` }} />
                            </div>
                            <div className="flex justify-between items-center mb-3 mt-1">
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Active Now</span>
                                <span className="text-xs sm:text-sm font-mono flex items-center text-gray-300">
                                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-gray-400" />
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                            <h4 className="font-semibold text-white mb-3 sm:mb-4 leading-snug text-sm sm:text-base">{activePoll.question}</h4>

                            <div className="space-y-2 mb-3 sm:mb-4">
                                {activePoll.options.map(opt => (
                                    <label key={opt.id} className={`flex items-center p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all ${selectedOption === opt.id ? 'bg-blue-600/20 border-blue-500' : 'bg-gray-900 border-gray-700 hover:border-gray-600'}`}>
                                        <input
                                            type="radio" name="poll_option" value={opt.id}
                                            checked={selectedOption === opt.id}
                                            onChange={() => !hasVoted && setSelectedOption(opt.id)}
                                            disabled={hasVoted && selectedOption !== opt.id}
                                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-500 shrink-0"
                                        />
                                        <span className="ml-2.5 sm:ml-3 text-xs sm:text-sm font-medium text-gray-200">{opt.text}</span>
                                    </label>
                                ))}
                            </div>

                            {!isHost ? (
                                <button onClick={handleVote} disabled={hasVoted || !selectedOption || timeLeft === 0}
                                    className="w-full py-2 sm:py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white">
                                    {hasVoted ? "Vote Submitted" : "Submit Vote"}
                                </button>
                            ) : (
                                <button onClick={handleEndPoll}
                                    className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg font-semibold text-sm border border-red-500/30 transition-all">
                                    End Poll Early
                                </button>
                            )}
                        </div>
                    )}

                    {/* HOST CREATE POLL */}
                    {isHost && !activePoll && (
                        <div className="bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-700">
                            <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm">Create New Poll</h4>
                            <form onSubmit={handleCreatePoll} className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Question</label>
                                    <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
                                        placeholder="What's your question?" className={inputClass} />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-400">Options</label>
                                    {options.map((opt, idx) => (
                                        <div key={opt.id} className="flex gap-2">
                                            <input type="text" value={opt.text} onChange={e => handleOptionChange(opt.id, e.target.value)}
                                                placeholder={`Option ${idx + 1}`} className={`${inputClass} flex-1`} />
                                            {options.length > 2 && (
                                                <button type="button" onClick={() => handleRemoveOption(opt.id)}
                                                    className="p-2 text-gray-500 hover:text-red-400 bg-gray-900 rounded-lg border border-gray-700 transition shrink-0">
                                                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {options.length < 10 && (
                                        <button type="button" onClick={handleAddOption}
                                            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 mt-1">
                                            <Plus className="w-3 h-3" /> Add Option
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Correct Answer</label>
                                        <select value={correctOptionId} onChange={e => setCorrectOptionId(e.target.value)}
                                            className={`${inputClass} appearance-none`}>
                                            <option value="">None</option>
                                            {options.map((opt, idx) => opt.text.trim() && (
                                                <option key={opt.id} value={opt.id}>Option {idx + 1}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Timer (s)</label>
                                        <input type="number" min="10" max="600" value={timerDuration}
                                            onChange={e => setTimerDuration(parseInt(e.target.value) || 60)}
                                            className={inputClass} />
                                    </div>
                                </div>

                                <button type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg py-2 text-sm transition-colors shadow-lg mt-1">
                                    Publish Poll
                                </button>
                            </form>
                        </div>
                    )}

                    {/* NON-HOST EMPTY STATE */}
                    {!isHost && !activePoll && (
                        <div className="flex flex-col items-center justify-center py-10 text-center opacity-50 mt-6 sm:mt-10">
                            <BarChart className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mb-3 sm:mb-4" />
                            <p className="text-sm font-medium text-gray-400">No active polls</p>
                            <p className="text-xs text-gray-500 mt-1">Wait for the host to launch a poll</p>
                        </div>
                    )}

                    {/* POLL HISTORY */}
                    {isHost && pollHistory.length > 0 && (
                        <div className="space-y-3 sm:space-y-4 pt-4 border-t border-gray-800 mt-4 sm:mt-6 pb-6">
                            <h4 className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">Past Polls</h4>
                            {pollHistory.map((poll, index) => {
                                const totalVotes = poll.votes?.length || 0;
                                const optionCounts = {};
                                poll.votes?.forEach(v => { optionCounts[v.optionId] = (optionCounts[v.optionId] || 0) + 1; });
                                return (
                                    <div key={poll._id || poll.id || index} className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-3 sm:p-4">
                                        <h5 className="font-medium text-xs sm:text-sm text-gray-200 leading-snug mb-3">{poll.question}</h5>
                                        <div className="space-y-2">
                                            {poll.options.map(opt => {
                                                const count = optionCounts[opt.id] || 0;
                                                const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                                                const isCorrect = poll.correctOptionId === opt.id;
                                                return (
                                                    <div key={opt.id} className="relative w-full">
                                                        <div className="flex justify-between text-[10px] sm:text-xs mb-1">
                                                            <span className={`font-medium truncate mr-2 ${isCorrect ? 'text-green-400' : 'text-gray-300'}`}>
                                                                {opt.text} {isCorrect && "✓"}
                                                            </span>
                                                            <span className="text-gray-400 shrink-0">{percentage}% ({count})</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${isCorrect ? 'bg-green-500' : 'bg-gray-500'}`}
                                                                style={{ width: `${percentage}%` }} />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="mt-3 text-[9px] sm:text-[10px] text-gray-500 flex justify-between font-medium tracking-wide uppercase">
                                            <span>{totalVotes} Votes</span>
                                            <span>{poll.createdAt ? new Date(poll.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}