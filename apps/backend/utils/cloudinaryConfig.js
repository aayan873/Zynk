import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.CLOUDINARY_URL) {
  const parsedUrl = new URL(process.env.CLOUDINARY_URL);
  cloudinary.config({
    cloud_name: parsedUrl.hostname,
    api_key: decodeURIComponent(parsedUrl.username),
    api_secret: decodeURIComponent(parsedUrl.password),
    secure: true,
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const mime = (file.mimetype || '').toLowerCase();
    const isDocument =
      mime === 'application/pdf' ||
      mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mime === 'application/vnd.ms-powerpoint';

    return {
      folder: 'zynk_resources',
      resource_type: isDocument ? 'raw' : 'image',
      allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'pptx'],
    };
  },
});

export const upload = multer({ storage });

export const extractCloudinaryAssetInfo = (assetUrl) => {
  try {
    const url = new URL(assetUrl);
    const parts = url.pathname.split('/').filter(Boolean);

    // Expected format: /<cloud_name>/<resource_type>/<delivery_type>/.../v<version>/<public_id>
    if (parts.length < 5) return null;

    const resourceType = parts[1];
    const pathAfterType = parts.slice(3); // skips cloud_name, resource_type, delivery_type
    const versionIndex = pathAfterType.findIndex((p) => /^v\d+$/.test(p));
    const idParts = versionIndex >= 0 ? pathAfterType.slice(versionIndex + 1) : pathAfterType;

    if (!idParts.length) return null;

    const publicIdWithExt = idParts.join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');

    return {
      resourceType,
      publicId,
      publicIdWithExt,
    };
  } catch {
    return null;
  }
};

export { cloudinary };