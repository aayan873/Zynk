import { Classroom } from '../models/classroom.model.js';
import { Resource } from '../models/resource.model.js';
import Teacher from '../models/teacher.model.js';
import { cloudinary, extractCloudinaryAssetInfo } from '../utils/cloudinaryConfig.js';

export const uploadResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    const teacherProfile = await Teacher.findOne({ user: req.user._id });
    if (!teacherProfile) {
      return res.status(403).json({ message: 'Teacher profile not found' });
    }

    const isTeacherForClass = classroom.teachers.some(
      (teacherId) => teacherId.toString() === teacherProfile._id.toString()
    );

    if (!isTeacherForClass) {
      return res.status(403).json({ message: 'Only the assigned professor can add resources' });
    }

    const resource = await Resource.create({
      classroom: classroom._id,
      title: title || req.file.originalname,
      url: req.file.secure_url || req.file.path,
      uploadedBy: req.user._id,
    });

    if (!Array.isArray(classroom.resources)) {
      classroom.resources = [];
    }

    classroom.resources.push(resource._id);
    await classroom.save();

    await resource.populate('uploadedBy', 'email role institution profileCompleted');

    return res.status(200).json({ message: 'Resource added successfully', resource });
  } catch (error) {
    console.error('[RESOURCE_UPLOAD] Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const deleteResource = async (req, res) => {
  try {
    const { id, resourceId } = req.params;

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    const teacherProfile = await Teacher.findOne({ user: req.user._id });
    if (!teacherProfile) {
      return res.status(403).json({ message: 'Teacher profile not found' });
    }

    const isTeacherForClass = classroom.teachers.some(
      (teacherId) => teacherId.toString() === teacherProfile._id.toString()
    );

    if (!isTeacherForClass) {
      return res.status(403).json({ message: 'Only the assigned professor can delete resources' });
    }

    const resource = await Resource.findOne({ _id: resourceId, classroom: classroom._id });
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const url = resource.url;

    classroom.resources = (classroom.resources || []).filter(
      (rid) => rid.toString() !== resource._id.toString()
    );
    await classroom.save();

    await resource.deleteOne();

    // Best-effort Cloudinary cleanup (do not fail API if remote delete fails)
    try {
      const info = extractCloudinaryAssetInfo(url);
      if (info) {
        const firstTry = await cloudinary.uploader.destroy(info.publicId, {
          resource_type: info.resourceType,
          type: 'upload',
          invalidate: true,
        });

        if (
          (firstTry?.result === 'not found' || firstTry?.result === 'error') &&
          info.publicIdWithExt !== info.publicId
        ) {
          await cloudinary.uploader.destroy(info.publicIdWithExt, {
            resource_type: info.resourceType,
            type: 'upload',
            invalidate: true,
          });
        }
      }
    } catch (cleanupError) {
      console.error('[RESOURCE_DELETE] Cloudinary cleanup failed:', cleanupError?.message || cleanupError);
    }

    return res.status(200).json({ message: 'Resource deleted successfully', resourceId });
  } catch (error) {
    console.error('[RESOURCE_DELETE] Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const downloadResource = async (req, res) => {
  try {
    const { id, resourceId } = req.params;

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    const resource = await Resource.findOne({ _id: resourceId, classroom: classroom._id });
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const urlParts = resource.url.split('?')[0].split('/');
    const fileWithExt = urlParts[urlParts.length - 1];
    const extMatch = fileWithExt.match(/\.[^/.]+$/);
    const ext = extMatch ? extMatch[0] : '';
    
    let downloadFilename = resource.title;
    if (!downloadFilename.endsWith(ext)) {
      downloadFilename += ext;
    }

    downloadFilename = downloadFilename.replace(/[^a-zA-Z0-9.\-_ ()]/g, '_');

    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    
    const https = await import('https');
    https.get(resource.url, (fileStream) => {
      fileStream.pipe(res);
    }).on('error', (err) => {
      console.error('[RESOURCE_DOWNLOAD] External request error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to download file from storage' });
      }
    });
  } catch (error) {
    console.error('[RESOURCE_DOWNLOAD] Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
  }
};
