import { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Home() {
    const [code, setCode] = useState("")
    // 1. New states for Room Creation (M3-F02)
    const [title, setTitle] = useState("")
    const [type, setType] = useState("MEET")

    const navigate = useNavigate()
    const { auth } = useAuth()

    const createMeeting = async (e) => {
        e.preventDefault(); // Stop the form from refreshing the page
        try {
            // 2. We use the real title and type now!
            const res = await axios.post("/api/rooms/create", {
                title: title || "My Awesome Meeting",
                type: type
            }, {
                headers: {
                    Authorization: `Bearer ${auth?.token}`
                }
            })
            const roomId = res.data.roomId
            navigate(`/room/${roomId}`)
        } catch (err) {
            console.error(err)
        }
    }

    const joinMeeting = (e) => {
        e.preventDefault();
        if (!code) return
        navigate(`/room/${code}`)
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 shadow-2xl">

                <div className="flex flex-col space-y-6">
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Start a new meeting</h2>
                        <p className="text-gray-400 mt-2">Create a secure room for your team.</p>
                    </div>

                    <form onSubmit={createMeeting} className="space-y-4">
                        <input
                            required
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Meeting Title (e.g., Weekly Sync)"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                        />

                        <div className="flex gap-4">
                            <label className="flex items-center space-x-2 bg-gray-800 px-4 py-3 rounded-lg flex-1 cursor-pointer hover:bg-gray-700 transition">
                                <input type="radio" value="MEET" checked={type === "MEET"} onChange={(e) => setType(e.target.value)} className="text-blue-500" />
                                <span>Standard Meet</span>
                            </label>
                            <label className="flex items-center space-x-2 bg-gray-800 px-4 py-3 rounded-lg flex-1 cursor-pointer hover:bg-gray-700 transition">
                                <input type="radio" value="WEBINAR" checked={type === "WEBINAR"} onChange={(e) => setType(e.target.value)} className="text-emerald-500" />
                                <span>Webinar</span>
                            </label>
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02]">
                            Create Room
                        </button>
                    </form>
                </div>

                <div className="flex flex-col space-y-6 border-t md:border-t-0 md:border-l border-gray-800 pt-8 md:pt-0 md:pl-12">
                    <div>
                        <h2 className="text-3xl font-bold">Join meeting</h2>
                        <p className="text-gray-400 mt-2">Got an invite code? Enter it here.</p>
                    </div>

                    <form onSubmit={joinMeeting} className="space-y-4">
                        <input
                            required
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="e.g., abc-defg-hij"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                        />
                        <button type="submit" className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all">
                            Join Room
                        </button>
                    </form>
                </div>

            </div>
        </div>
    )
}
