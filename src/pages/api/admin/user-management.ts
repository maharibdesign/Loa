import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createSupabaseAdmin } from '../../../lib/supabase';
import { validateInitData } from '../../../lib/utils';

const AdminUserUpdateSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['Active', 'Rejected']),
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
    const { initData, userId, status } = await request.json();

    if (!initData || !checkAdmin(initData)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }
    
    try {
        const validated = AdminUserUpdateSchema.parse({ userId, status });
        const supabase = createSupabaseAdmin();
        const { error } = await supabase.from('users')
            .update({ status: validated.status, updated_at: new Date().toISOString() })
            .eq('id', validated.userId);

        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ message: "User status updated" }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
};