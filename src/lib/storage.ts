import { supabase } from './supabase';

/**
 * Upload a file to Supabase Storage
 * @param file The file to upload
 * @param bucket The storage bucket name
 * @param path The path within the bucket
 * @returns The public URL of the uploaded file
 */
export const uploadFile = async (file: File, bucket: string, path: string): Promise<string> => {
  try {
    // Create a unique file name to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const fullPath = `${path}/${fileName}`;

    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fullPath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Delete a file from Supabase Storage
 * @param url The public URL of the file to delete
 * @param bucket The storage bucket name
 */
export const deleteFile = async (url: string, bucket: string): Promise<void> => {
  try {
    // Extract the path from the URL
    const urlObj = new URL(url);
    const pathWithBucket = urlObj.pathname;
    
    // Remove the bucket name and leading slash from the path
    const path = pathWithBucket.replace(`/${bucket}/`, '');

    // Delete the file
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};