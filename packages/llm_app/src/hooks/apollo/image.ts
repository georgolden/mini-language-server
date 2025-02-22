import { gql, useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';

const GET_UPLOAD_SIGNATURE = gql`
  mutation GetUploadSignature {
    getUploadSignature {
      signature
      timestamp
      cloudName
      apiKey
    }
  }
`;

const GET_AVATAR_URL = gql`
  query GetAvatarUrl($id: String!) {
    getAvatarUrl(id: $id)
  }
`;

interface UseCloudinaryUploadOptions {
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

export const useCloudinaryUpload = (options?: UseCloudinaryUploadOptions) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<Error | null>(null);

  const [getSignature] = useMutation(GET_UPLOAD_SIGNATURE);

  const uploadToCloudinary = async (file: File): Promise<{ id: string; url: string }> => {
    try {
      setIsUploading(true);
      setUploadError(null);

      // Get upload signature
      const { data } = await getSignature();
      const { signature, timestamp, cloudName, apiKey } = data.getUploadSignature;

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', apiKey);
      formData.append('upload_preset', 'user-upload');

      // Upload to Cloudinary
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      options?.onSuccess?.(result.secure_url);
      return { id: result.public_id, url: result.secure_url };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed');
      setUploadError(err);
      options?.onError?.(err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadToCloudinary,
    isUploading,
    uploadError,
  };
};
