import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Upload, FileText, Download, Calendar, User, Trash2 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const formatDate = (value) => {
  if (!value) return 'Unknown date';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'Unknown date';
  }
};

export default function ClassroomResources({ classroom, token, isTeacher }) {
  const [resources, setResources] = useState(() => classroom?.resources || []);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    setResources(Array.isArray(classroom?.resources) ? classroom.resources : []);
  }, [classroom?.resources]);

  const sortedResources = useMemo(() => {
    return [...resources].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [resources]);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please choose a file first.');
      return;
    }

    if (!classroom?._id) {
      toast.error('Classroom ID is missing.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      if (title.trim()) formData.append('title', title.trim());
      formData.append('file', file);

      const res = await axios.post(
        `${BACKEND_URL}/api/classrooms/${classroom._id}/resources`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const created = res?.data?.resource;
      if (created) {
        setResources((prev) => [created, ...prev]);
      }

      toast.success('Resource uploaded successfully.');
      setTitle('');
      setFile(null);
      const input = document.getElementById('resource-file-input');
      if (input) input.value = '';
    } catch (err) {
      console.error('Resource upload failed:', err);
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message || err?.response?.data?.error;
      const fallbackMessage = err?.message || 'Failed to upload resource.';
      const finalMessage = backendMessage || fallbackMessage;
      toast.error(status ? `Upload failed (${status}): ${finalMessage}` : finalMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async (resource) => {
    if (!classroom?._id || !resource?._id) return;

    const confirmed = window.confirm(`Delete "${resource.title || 'this resource'}"?`);
    if (!confirmed) return;

    setDeletingId(resource._id);
    try {
      await axios.delete(
        `${BACKEND_URL}/api/classrooms/${classroom._id}/resources/${resource._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setResources((prev) => prev.filter((r) => r._id !== resource._id));
      toast.success('Resource deleted successfully.');
    } catch (err) {
      console.error('Resource delete failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to delete resource.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-6">
      {isTeacher && (
        <form
          onSubmit={handleUpload}
          className="bg-[#1f222b] border border-gray-800/80 rounded-2xl overflow-hidden shadow-lg"
        >
          <div className="p-4 bg-[#14151a] border-b border-gray-800/80 flex items-center space-x-2">
            <Upload size={18} className="text-indigo-400" />
            <h3 className="font-semibold text-gray-200">Upload Classroom Resource</h3>
          </div>

          <div className="p-4 grid gap-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource title (optional)"
              className="w-full bg-[#14151a] text-gray-100 border border-gray-700/80 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
            />

            <input
              id="resource-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full bg-[#14151a] text-gray-300 border border-gray-700/80 rounded-lg px-3 py-2 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-500/20 file:text-indigo-300 file:px-3 file:py-1.5 hover:file:bg-indigo-500/30"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploading}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition flex items-center space-x-2 disabled:opacity-50"
              >
                {uploading ? <Spinner size="sm" /> : <Upload size={16} />}
                <span>{uploading ? 'Uploading...' : 'Upload Resource'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-[#14151a] border border-gray-800/80 rounded-2xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Classroom Resources</h3>

        {sortedResources.length === 0 ? (
          <div className="text-center py-10 border border-gray-800/80 rounded-xl border-dashed">
            <FileText size={36} className="mx-auto text-gray-600 mb-2" />
            <p className="text-gray-500">No resources uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedResources.map((resource, idx) => {
              const uploader =
                typeof resource?.uploadedBy === 'string'
                  ? resource.uploadedBy
                  : resource?.uploadedBy?.email ||
                    resource?.uploadedBy?.fullName ||
                    resource?.uploadedBy?._id ||
                    'Unknown';

              const resourceUrl = typeof resource?.url === 'string' ? resource.url : '';

              return (
              <div
                key={resource?._id || `${resourceUrl}-${idx}`}
                className="flex items-center justify-between gap-4 p-4 bg-[#0e0e11] border border-gray-800/80 rounded-xl"
              >
                <div className="min-w-0">
                  <p className="text-gray-100 font-medium truncate">
                    {resource?.title || 'Untitled resource'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(resource?.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User size={12} />
                      Uploader: {uploader}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <a
                    href={resourceUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      if (!resourceUrl) {
                        e.preventDefault();
                        toast.error('Resource URL is missing.');
                      }
                    }}
                    className="px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
                  >
                    <Download size={14} />
                    Open
                  </a>

                  {isTeacher && (
                    <button
                      type="button"
                      onClick={() => handleDeleteResource(resource)}
                      disabled={deletingId === resource?._id}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      {deletingId === resource?._id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}

const Spinner = ({ size = 'default' }) => (
  <div
    className={`animate-spin rounded-full border-b-2 border-indigo-500/30 border-t-indigo-500 ${
      size === 'sm' ? 'h-4 w-4' : 'h-8 w-8'
    }`}
  ></div>
);
