import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Upload, FileText, Download, Calendar, User, Trash2, Plus, X } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const formatDate = (value) => {
  if (!value) return 'Unknown date';
  try { return new Date(value).toLocaleString(); }
  catch { return 'Unknown date'; }
};

export default function ClassroomResources({ classroom, token, isTeacher }) {
  const [resources,   setResources]   = useState(() => classroom?.resources || []);
  const [title,       setTitle]       = useState('');
  const [file,        setFile]        = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [deletingId,  setDeletingId]  = useState(null);
  const [showUpload,  setShowUpload]  = useState(false);   // ← toggle

  useEffect(() => {
    setResources(Array.isArray(classroom?.resources) ? classroom.resources : []);
  }, [classroom?.resources]);

  const sortedResources = useMemo(() => {
    return [...resources].sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [resources]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file)           { toast.error('Please choose a file first.'); return; }
    if (!classroom?._id) { toast.error('Classroom ID is missing.');    return; }

    setUploading(true);
    try {
      const formData = new FormData();
      if (title.trim()) formData.append('title', title.trim());
      formData.append('file', file);

      const res = await axios.post(
        `${BACKEND_URL}/api/classrooms/${classroom._id}/resources`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const created = res?.data?.resource;
      if (created) setResources((prev) => [created, ...prev]);

      toast.success('Resource uploaded successfully.');
      setTitle('');
      setFile(null);
      setShowUpload(false);
      const input = document.getElementById('resource-file-input');
      if (input) input.value = '';
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error    ||
        err?.message                  ||
        'Failed to upload resource.';
      toast.error(err?.response?.status ? `Upload failed (${err.response.status}): ${msg}` : msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async (resource) => {
    if (!classroom?._id || !resource?._id) return;
    if (!window.confirm(`Delete "${resource.title || 'this resource'}"?`)) return;

    setDeletingId(resource._id);
    try {
      await axios.delete(
        `${BACKEND_URL}/api/classrooms/${classroom._id}/resources/${resource._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResources((prev) => prev.filter((r) => r._id !== resource._id));
      toast.success('Resource deleted successfully.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete resource.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadResource = async (resource) => {
    if (!classroom?._id || !resource?._id) return;
    const toastId = toast.loading('Downloading...');
    try {
      const res = await axios.get(
        `${BACKEND_URL}/api/classrooms/${classroom._id}/resources/${resource._id}/download`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );

      let filename = resource.title || 'download';
      const cd = res.headers['content-disposition'];
      if (cd) { const m = cd.match(/filename="?([^"]+)"?/); if (m) filename = m[1]; }

      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download complete', { id: toastId });
    } catch {
      toast.error('Failed to download resource.', { id: toastId });
    }
  };

  return (
    /* Constrained height column to support internal scroll */
    <div className="flex flex-col h-[65vh] sm:h-[70vh] w-full">

      {/* ── Top bar: heading + "Upload" toggle button ── STICKY, never scrolls */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
        <h3 className="text-base sm:text-lg font-semibold text-gray-200">
          Classroom Resources
          {sortedResources.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({sortedResources.length})
            </span>
          )}
        </h3>

        {isTeacher && (
          <button
            onClick={() => setShowUpload((v) => !v)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border transition-all',
              showUpload
                ? 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10',
            ].join(' ')}
          >
            {showUpload ? <X size={14} /> : <Plus size={14} />}
            <span>{showUpload ? 'Cancel' : 'Upload Resource'}</span>
          </button>
        )}
      </div>

      {/* ── Collapsible upload form ── STICKY below top bar, never scrolls */}
      {showUpload && isTeacher && (
        <div className="shrink-0 border-b border-white/10 bg-[#121414]">
          <form onSubmit={handleUpload} className="px-4 sm:px-6 py-4 grid gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource title (optional)"
              className="w-full bg-black text-gray-100 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/50 transition-colors"
            />

            <input
              id="resource-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full bg-black text-gray-300 border border-white/10 rounded-lg px-3 py-2 text-sm
                         file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white
                         file:px-3 file:py-1 file:text-xs hover:file:bg-white/20 cursor-pointer"
            />

            <div className="flex items-center justify-between gap-3">
              {file && (
                <p className="text-xs text-gray-500 truncate min-w-0">
                  Selected: <span className="text-gray-300">{file.name}</span>
                </p>
              )}
              <button
                type="submit"
                disabled={uploading}
                className="ml-auto shrink-0 px-4 sm:px-6 py-2 bg-white hover:bg-gray-200 text-black rounded-lg text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Spinner size="sm" /> : <Upload size={14} />}
                <span>{uploading ? 'Uploading…' : 'Upload'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Resources list ── THIS is the ONLY part that scrolls ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4">
        {sortedResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[160px] border border-dashed border-gray-800 rounded-xl">
            <FileText size={36} className="text-gray-600 mb-2" />
            <p className="text-gray-500 text-sm">No resources uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedResources.map((resource, idx) => {
              const uploader =
                typeof resource?.uploadedBy === 'string'
                  ? resource.uploadedBy
                  : resource?.uploadedBy?.email    ||
                    resource?.uploadedBy?.fullName  ||
                    resource?.uploadedBy?._id       ||
                    'Unknown';

              const resourceUrl = typeof resource?.url === 'string' ? resource.url : '';

              return (
                <div
                  key={resource?._id || `${resourceUrl}-${idx}`}
                  className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-[#121414] border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                >
                  {/* Left: title + meta */}
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-100 text-sm font-medium truncate">
                      {resource?.title || 'Untitled resource'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(resource?.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User size={11} />
                        {uploader}
                      </span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadResource(resource)}
                      className="p-1.5 sm:px-3 sm:py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      title="Download"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">Download</span>
                    </button>

                    {isTeacher && (
                      <button
                        type="button"
                        onClick={() => handleDeleteResource(resource)}
                        disabled={deletingId === resource?._id}
                        className="p-1.5 sm:px-3 sm:py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                        <span className="hidden sm:inline">
                          {deletingId === resource?._id ? 'Deleting…' : 'Delete'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const Spinner = ({ size = 'default' }) => (
  <div
    className={`animate-spin rounded-full border-2 border-white/20 border-t-white ${
      size === 'sm' ? 'h-4 w-4' : 'h-8 w-8'
    }`}
  />
);