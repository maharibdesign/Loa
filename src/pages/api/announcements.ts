import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createSupabaseAdmin } from '../../lib/supabase';
import { validateInitData } from '../../lib/utils';

const AnnouncementSchema = z.object({
  content: z.string().min(10, "Announcement must be at least 10 characters long."),
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

export const POST: APIRoute = async ({ request }) => {
    const { initData, content } = await request.json();

    if (!initData || !checkAdmin(initData)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }
    
    try {
        const validated = AnnouncementSchema.parse({ content });
        const supabase = createSupabaseAdmin();
        const { error } = await supabase.from('announcements').insert({
            content: validated.content,
        });

        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ message: "Announcement sent!" }), { status: 201 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
};