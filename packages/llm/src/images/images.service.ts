import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import {
  CloudinaryConfig,
  UploadSignature,
  UploadSignatureParams,
} from './types.js';

@Injectable()
export class ImageService {
  private readonly uploadPreset = 'user-upload';

  constructor() {
    const config: CloudinaryConfig = {
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    };

    // Validate config
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      throw new Error('Missing required Cloudinary configuration');
    }

    cloudinary.config(config);
  }

  async getUploadSignature(): Promise<UploadSignature> {
    const timestamp = Math.round(new Date().getTime() / 1000);

    const params: UploadSignatureParams = {
      timestamp,
      upload_preset: this.uploadPreset,
    };

    const apiSecret = cloudinary.config().api_secret;
    if (!apiSecret) {
      throw new Error('Cloudinary API secret not configured');
    }

    const signature = cloudinary.utils.api_sign_request(params, apiSecret);

    return {
      signature,
      timestamp,
      cloudName: cloudinary.config().cloud_name,
      apiKey: cloudinary.config().api_key,
    };
  }

  getImageUrl(publicId: string): string {
    if (!publicId) {
      throw new Error('Public ID is required');
    }
    return cloudinary.url(publicId);
  }
}
