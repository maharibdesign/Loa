import type { APIRoute } from 'astro';
import { z, ZodError } from 'zod';
import { createSupabaseAdmin } from '../../lib/supabase';
import { validateInitData } from '../../lib/utils';

// Define validation schema using Zod
const RegistrationSchema = z.object({
  full_name: z.string().min(3, 'Full name must be at least 3 characters').regex(/^[a-zA-Z\s]+$/, 'Name must only contain letters and spaces'),
  age: z.coerce.number().int().min(12, 'Must be at least 12').max(60, 'Must be 60 or younger'),
  grade: z.string().min(1, 'Grade is required'),
  phone: z.string().regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format').min(9, 'Phone number seems too short'),
  email: z.string().email('Invalid email address'),
  receipt: z.instanceof(File, { message: 'Receipt is required' })
           .refine(file => file.size < 5 * 1024 * 1024, 'File must be less than 5MB')
           .refine(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), 'Only JPEG, PNG, and WebP are allowed'),
  language: z.enum(['en', 'am']),
});


export const POST: APIRoute = async ({ request }) => {
    const formData = await request.formData();
    const initData = formData.get('initData') as string;
    const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;

    // 1. Validate Telegram User
    let validatedUser;
    try {
        if (!initData) throw new Error("initData is missing");
        validatedUser = validateInitData(botToken, initData);
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Authentication failed: ' + error.message }), { status: 401 });
    }
    
    const telegram_id = validatedUser.user.id;

    // 2. Validate Form Data
    const data = Object.fromEntries(formData);
    try {
        // We have to parse like this because Zod works with objects, not FormData directly
        const validatedData = RegistrationSchema.parse({
            ...data,
            age: data.age,
            receipt: data.receipt,
        });

        const supabase = createSupabaseAdmin();

        // 3. Check if user already exists
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('telegram_id')
            .eq('telegram_id', telegram_id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
            console.error('Supabase fetch error:', fetchError);
            return new Response(JSON.stringify({ error: "Database error checking user." }), { status: 500 });
        }
        if (existingUser) {
            return new Response(JSON.stringify({ error: "This Telegram account is already registered." }), { status: 409 });
        }

        // 4. Upload receipt to Supabase Storage
        const receiptFile = validatedData.receipt;
        const fileExt = receiptFile.name.split('.').pop();
        const filePath = `${telegram_id}/${new Date().getTime()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('payment_receipts')
            .upload(filePath, receiptFile);

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return new Response(JSON.stringify({ error: "Failed to upload receipt." }), { status: 500 });
        }

        // 5. Insert user data into the database
        const { error: insertError } = await supabase.from('users').insert({
            telegram_id: telegram_id,
            full_name: validatedData.full_name,
            age: validatedData.age,
            grade: validatedData.grade,
            phone: validatedData.phone,
            email: validatedData.email,
            receipt_url: filePath, // Store the path, not the full URL
            language_pref: validatedData.language,
        });

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            return new Response(JSON.stringify({ error: "Failed to save registration data." }), { status: 500 });
        }
        
        return new Response(JSON.stringify({ message: "Registration successful!" }), { status: 201 });

    } catch (error) {
        if (error instanceof ZodError) {
            return new Response(JSON.stringify({ errors: error.flatten().fieldErrors }), { status: 400 });
        }
        console.error("Unexpected error:", error);
        return new Response(JSON.stringify({ error: "An unexpected error occurred." }), { status: 500 });
    }
};