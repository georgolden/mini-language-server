export interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

export interface UploadSignatureParams {
  timestamp: number;
  upload_preset: string;
  [key: string]: unknown;
}

export interface UploadSignature {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
}
