import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { Send, User as UserIcon, Plus, X } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const modules = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        ['link', 'code-block'],
        ['clean']
    ],
};

const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'code-block'
];

export default function ClassroomAnnouncements({ classroom, user, isTeacher }) {
    const { auth } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [title,         setTitle]         = useState('');
    const [content,       setContent]       = useState('');
    const [submitting,    setSubmitting]    = useState(false);
    const [showForm,      setShowForm]      = useState(false);   // ← toggle

    const fetchAnnouncements = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/api/announcements/${classroom._id}`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            if (res.data.success) setAnnouncements(res.data.data);
        } catch (err) {
            console.error("Failed to fetch announcements:", err);
            toast.error("Could not load announcements.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (classroom?._id) fetchAnnouncements();
    }, [classroom._id]);

    const handlePostAnnouncement = async () => {
        if (!title.trim()) return toast.error("Title is required.");
        if (!content || content.replace(/<[^>]*>?/gm, '').trim() === '')
            return toast.error("Announcement cannot be empty.");

        setSubmitting(true);
        try {
            const res = await axios.post(
                `${BACKEND_URL}/api/announcements/${classroom._id}`,
                { title, content },
                { headers: { Authorization: `Bearer ${auth.token}` } }
            );
            if (res.data.success) {
                toast.success("Announcement posted successfully!");
                setTitle('');
                setContent('');
                setShowForm(false);
                setAnnouncements(prev => [res.data.data, ...prev]);
            }
        } catch (err) {
            console.error("Failed to post announcement:", err);
            toast.error(err.response?.data?.message || "Failed to post announcement.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center py-10">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full min-h-0 overflow-hidden">

            {/* ── Top bar: title + Post button (teacher only) — never scrolls ── */}
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800/60">
                <h3 className="text-base sm:text-lg font-semibold text-gray-200">
                    Announcements
                    {announcements.length > 0 && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                            ({announcements.length})
                        </span>
                    )}
                </h3>

                {isTeacher && (
                    <button
                        onClick={() => setShowForm(v => !v)}
                        className={[
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border transition-all',
                            showForm
                                ? 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700'
                                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20',
                        ].join(' ')}
                    >
                        {showForm ? <X size={14} /> : <Plus size={14} />}
                        <span>{showForm ? 'Cancel' : 'New Announcement'}</span>
                    </button>
                )}
            </div>

            {/* ── Collapsible post form — sticky, never scrolls ── */}
            {showForm && isTeacher && (
                <div className="shrink-0 border-b border-gray-800/60 bg-[#1a1c24]">
                    <div className="px-4 sm:px-6 py-4 quill-wrapper">
                        <input
                            type="text"
                            placeholder="Announcement Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-transparent text-gray-100 border-none outline-none text-base sm:text-lg font-bold mb-3 placeholder:text-gray-600"
                        />
                        <ReactQuill
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            modules={modules}
                            formats={formats}
                            placeholder="Type your announcement details here..."
                            className="min-h-[120px]"
                        />
                        <div className="flex justify-end mt-3">
                            <button
                                onClick={handlePostAnnouncement}
                                disabled={submitting}
                                className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                            >
                                {submitting ? <Spinner size="sm" /> : <Send size={14} />}
                                <span>{submitting ? 'Posting…' : 'Post Announcement'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Announcements list — ONLY this scrolls ── */}
           <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-6 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
                {announcements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[160px] border border-dashed border-gray-800 rounded-xl">
                        <Send size={28} className="text-gray-600 mb-2" />
                        <p className="text-gray-500 text-sm">No announcements yet.</p>
                    </div>
                ) : (
                    announcements.map((announcement) => (
                        <div
                            key={announcement._id}
                            className=" bg-[#0e0e11] border border-gray-800/80 rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden group hover:border-gray-700 transition-colors"
                        >
                            {/* Accent line */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/40 group-hover:bg-indigo-500 transition-colors duration-300 rounded-l-2xl" />

                            {/* Author row */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400">
                                    <UserIcon size={16} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-gray-200 text-sm truncate">
                                        {announcement.author?.email?.split('@')[0] || 'Teacher'}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                        {new Date(announcement.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <h4 className="text-base sm:text-lg font-bold text-gray-100 mb-2 px-1 leading-snug">
                                {announcement.title}
                            </h4>

                            <div
                                className="prose prose-invert max-w-none prose-indigo prose-sm leading-relaxed px-1"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.content) }}
                            />
                        </div>
                    ))
                )}
            </div>

            <style jsx global>{`
                .quill-wrapper .ql-toolbar {
                    border: 1px solid #374151 !important;
                    border-radius: 0.5rem 0.5rem 0 0 !important;
                    background-color: #14151a !important;
                    flex-wrap: wrap !important;
                }
                .quill-wrapper .ql-toolbar .ql-formats { margin-bottom: 2px !important; }
                .quill-wrapper .ql-toolbar .ql-stroke  { stroke: #9ca3af !important; }
                .quill-wrapper .ql-toolbar .ql-fill    { fill:   #9ca3af !important; }
                .quill-wrapper .ql-toolbar .ql-picker   { color:  #9ca3af !important; }
                .quill-wrapper .ql-toolbar button:hover .ql-stroke { stroke: #818cf8 !important; }
                .quill-wrapper .ql-toolbar button:hover .ql-fill   { fill:   #818cf8 !important; }
                .quill-wrapper .ql-container {
                    border: 1px solid #374151 !important;
                    border-top: none !important;
                    border-radius: 0 0 0.5rem 0.5rem !important;
                    font-size: 0.9rem !important;
                    background-color: #1a1b23 !important;
                    color: #f3f4f6 !important;
                }
                .quill-wrapper .ql-editor.ql-blank::before {
                    color: #4b5563 !important;
                    font-style: italic !important;
                }
                /* Custom Scrollbar for Announcements */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #374151;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #4b5563;
                }
                @media (max-width: 480px) {
                    .quill-wrapper .ql-toolbar { padding: 4px !important; }
                    .quill-wrapper .ql-toolbar button { width: 24px !important; height: 24px !important; padding: 2px !important; }
                }
            `}</style>
        </div>
    );
}

const Spinner = ({ size = "default" }) => (
    <div className={`animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500 ${size === "sm" ? "h-4 w-4" : "h-8 w-8"}`} />
);