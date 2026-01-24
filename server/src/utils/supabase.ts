import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || ''; // Use Service Role Key for server-side operations if needed, or Anon key if RLS allows

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key is missing in environment variables. File uploads might fail.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const uploadToSupabase = async (file: Express.Multer.File, bucket: string = 'uploads'): Promise<string | null> => {
  // Try Supabase upload if credentials exist
  if (supabaseUrl && supabaseKey) {
    try {
      let fileBuffer = file.buffer;
      
      // If using diskStorage, buffer is missing, read from file path
      if (!fileBuffer && file.path) {
        fileBuffer = fs.readFileSync(file.path);
      }

      if (fileBuffer) {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, fileBuffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (error) {
          console.error('Supabase upload error:', error);
          // Don't return null yet, try fallback
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          return publicUrl;
        }
      }
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
    }
  }

  // Fallback to local file if it exists (diskStorage)
  if (file.filename) {
    console.log('Using local file fallback:', file.filename);
    return `/uploads/${file.filename}`;
  }

  return null;
};
