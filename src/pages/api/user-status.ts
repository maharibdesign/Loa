import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createSupabaseAdmin } from '../../lib/supabase';
import { validateInitData } from '../../lib/utils';

const StatusUpdateSchema = z.object({
  status: z.enum(['Paused', 'Active']),
});

export const POST: APIRoute = async ({ request }) => {
    const { initData, status } = await request.json();
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

    // 2. Validate Payload
    try {
        const validatedPayload = StatusUpdateSchema.parse({ status });
        const supabase = createSupabaseAdmin();

        // 3. Update user status in the database
        const { error } = await supabase
            .from('users')
            .update({ status: validatedPayload.status, updated_at: new Date().toISOString() })
            .eq('telegram_id', telegram_id);

        if (error) {
            console.error("Supabase status update error:", error);
            return new Response(JSON.stringify({ error: "Failed to update status." }), { status: 500 });
        }

        return new Response(JSON.stringify({ message: "Status updated successfully." }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid request payload." }), { status: 400 });
    }
};