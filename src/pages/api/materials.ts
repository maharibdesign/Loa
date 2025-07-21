import type { APIRoute } from 'astro';
import { z, ZodError } from 'zod';
import { createSupabaseAdmin } from '../../lib/supabase';
import { validateInitData } from '../../lib/utils';

// Schema for creating/updating a material
const MaterialSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  material_file: z.instanceof(File, { message: 'A file is required' })
    .refine(file => file.size < 50 * 1024 * 1024, 'File must be less than 50MB')
    .refine(file => ['application/pdf', 'video/mp4', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type), 'Only PDF, MP4, or Word documents are allowed'),
});

const checkAdmin = (initData: string): boolean => {
    const adminIds = (import.meta.env.ADMIN_TELEGRAM_IDS || "").split(',');
    try {
        const validatedUser = validateInitData(import.meta.env.TELEGRAM_BOT_TOKEN, initData);
        return adminIds.includes(validatedUser.user.id.toString());
    } catch (e) {
        return false;
    }
}

// Handler for POST (Create) and PATCH (Update)
export const POST: APIRoute = async ({ request }) => {
    const formData = await request.formData();
    const initData = formData.get('initData') as string;
    const method = formData.get('_method') as string || 'POST'; // For method overriding

    if (!initData || !checkAdmin(initData)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const supabase = createSupabaseAdmin();

    // DELETE Logic
    if (method.toUpperCase() === 'DELETE') {
        const materialId = formData.get('id') as string;
        const fileUrl = formData.get('file_url') as string;
        
        if (!materialId || !fileUrl) return new Response(JSON.stringify({ error: 'Missing ID or file URL for deletion.' }), { status: 400 });

        // Delete from storage first
        const { error: storageError } = await supabase.storage.from('course_materials').remove([fileUrl]);
        if (storageError) console.warn("Could not delete file from storage, it might have already been removed:", storageError.message);
        
        // Then delete from DB
        const { error: dbError } = await supabase.from('materials').delete().eq('id', materialId);
        if (dbError) return new Response(JSON.stringify({ error: 'DB Error: ' + dbError.message }), { status: 500 });
        
        return new Response(JSON.stringify({ message: 'Material deleted' }), { status: 200 });
    }


    // CREATE Logic
    try {
        const validatedData = MaterialSchema.parse({
            title: formData.get('title'),
            description: formData.get('description'),
            material_file: formData.get('material_file'),
        });

        const materialFile = validatedData.material_file;
        const fileExt = materialFile.name.split('.').pop();
        const filePath = `protected/${new Date().getTime()}.${fileExt}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
            .from('course_materials')
            .upload(filePath, materialFile);
        if (uploadError) throw new Error('Failed to upload material file.');

        // Insert metadata into DB
        const { error: insertError } = await supabase.from('materials').insert({
            title: validatedData.title,
            description: validatedData.description,
            file_url: filePath, // The path in the bucket
            file_name: materialFile.name, // The original filename
        });
        if (insertError) throw new Error('Failed to save material metadata.');
        
        return new Response(JSON.stringify({ message: "Material created" }), { status: 201 });

    } catch (error) {
        if (error instanceof ZodError) {
            return new Response(JSON.stringify({ errors: error.flatten().fieldErrors }), { status: 400 });
        }
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};