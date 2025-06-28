/**
 * Formats a Supabase storage path into a public URL
 * @param path The storage path (e.g., 'speakers/image.jpg')
 * @returns The complete public URL
 */
export const getSupabaseImageUrl = (path: string): string => {
  if (!path) return '';
  
  // If it's already a full URL, return it
  if (path.startsWith('http')) return path;
  
  // Otherwise, construct the URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/images/${path}`;
};

/**
 * Compresses an image file before upload
 * @param file The image file to compress
 * @param options Compression options
 * @returns Promise resolving to the compressed file
 */
export const compressImage = async (
  file: File, 
  options: { 
    maxWidthOrHeight?: number; 
    maxSizeMB?: number; 
    useWebWorker?: boolean;
    fileType?: string;
  } = {}
): Promise<File> => {
  try {
    // Dynamically import the compression library
    const imageCompression = (await import('browser-image-compression')).default;
    
    // Default options
    const defaultOptions = {
      maxWidthOrHeight: 5000,
      maxSizeMB: 5,
      useWebWorker: true,
      fileType: 'image/jpeg'
    };
    
    // Merge with provided options
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Compress the image
    const compressedFile = await imageCompression(file, mergedOptions);
    
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Return original file if compression fails
  }
};

/**
 * Generates a unique filename for storage
 * @param file Original file
 * @param prefix Optional prefix for the filename
 * @returns A unique filename with timestamp
 */
export const generateUniqueFilename = (file: File, prefix = ''): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileExt = file.name.split('.').pop() || 'jpg';
  
  return `${prefix}${timestamp}_${randomString}.${fileExt}`;
};