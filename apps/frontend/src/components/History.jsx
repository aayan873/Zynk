import { useEffect, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

export default function History() {
    const [meetings, setMeetings] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    // Fetching the history from the backend
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get("/api/rooms/history")
                setMeetings(res.data)
            } catch (err) {
                console.error("Failed to fetch history:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchHistory()
    }, [])

    // Func to calc the duration of the meeting
    const calculateDuration = (start, end) => {
        if (!end) return "Still Active"
        const ms = new Date(end) - new Date(start)
        const minutes = Math.floor(ms / 60000)
        return `${minutes} min`
    }

    if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white"><div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>

    //  Render the Dashboard
    return (
        <div className="min-h-screen bg-gray-950 text-white p-8 md:p-12">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10 border-b border-gray-800 pb-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Meeting History</h1>
                        <p className="text-gray-400 mt-2">A record of everywhere you've been.</p>
                    </div>
                    {/* Link back to the awesome Home Page you styled earlier */}
                    <button onClick={() => navigate("/")} className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition font-medium border border-gray-700 shadow-sm">
                        Go Home
                    </button>
                </div>

                {meetings.length === 0 ? (
                    <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-3xl">
                        <h3 className="text-2xl font-medium text-gray-500">No past meetings found.</h3>
                        <p className="text-gray-600 mt-2">Go host your first webinar!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Loop through every meeting the backend Waiter gave back to us */}
                        {meetings.map((meeting) => (
                            <div key={meeting.roomId} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-600 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.05)] flex flex-col justify-between group">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold truncate pr-3">{meeting.title}</h3>
                                        {/* A cool badge for MEET vs WEBINAR */}
                                        <span className={`text-xs font-bold px-2 py-1 rounded object-right ${meeting.type === 'WEBINAR' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                            {meeting.type}
                                        </span>
                                    </div>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center text-gray-400">
                                            <span className="font-semibold text-gray-300 w-20">Date:</span>
                                            {new Date(meeting.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div className="flex items-center text-gray-400">
                                            <span className="font-semibold text-gray-300 w-20">ID:</span>
                                            <span className="font-mono text-xs">{meeting.roomId}</span>
                                        </div>
                                        <div className="flex items-center text-gray-400">
                                            <span className="font-semibold text-gray-300 w-20">Duration:</span>
                                            <span className={!meeting.endedAt ? "text-amber-400 font-bold animate-pulse" : ""}>
                                                {calculateDuration(meeting.startedAt, meeting.endedAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button className="mt-6 w-full py-3 bg-gray-800 text-gray-300 font-semibold rounded-xl group-hover:bg-gray-700 transition">
                                    View Details
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
