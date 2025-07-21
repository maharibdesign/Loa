# Life of Aviation - Telegram Mini App

This is a complete, production-ready Telegram Mini App for the bot `@lifeofaviationbyabel1bot`. It allows students to register for a course, access materials, and receive announcements, with a full-featured admin panel for management.

**Stack:**
- **Framework:** [Astro](https://astro.build/)
- **Backend & DB:** [Supabase](https://supabase.com/)
- **Hosting:** [Vercel](https://vercel.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)

---

## 1. Supabase Setup

1.  **Create a New Supabase Project:**
    - Go to [supabase.com](https://supabase.com) and create a new project.
    - Save your **Project URL**, `anon` **key**, and `service_role` **key**.

2.  **Run the Database Schema:**
    - In your Supabase project, navigate to the **SQL Editor**.
    - Click **+ New query**.
    - Copy the entire contents of `pgsql/schema.sql` from this project.
    - Paste it into the query editor and click **RUN**. This creates all tables, storage buckets, and security policies.

3.  **Check Storage Buckets:**
    - Navigate to the **Storage** section in your Supabase dashboard.
    - Verify that two buckets, `payment_receipts` and `course_materials`, exist and are **not** marked as public. The SQL script should have created them.

---

## 2. Project Setup & Environment Variables

1.  **Clone the Repository:**
    ```bash
    git clone <your-repo-url>
    cd <your-repo-name>
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env` File:**
    - Copy the example file: `cp .env.example .env`
    - Open the new `.env` file and fill in all the variables:
      - `PUBLIC_SUPABASE_URL`: Your Supabase project URL.
      - `PUBLIC_SUPABASE_ANON_KEY`: Your Supabase `anon` (public) key.
      - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase `service_role` (secret) key.
      - `ADMIN_TELEGRAM_IDS`: A comma-separated list of numeric Telegram User IDs for admins (e.g., `12345678,98765432`). Get your ID from `@userinfobot`.
      - `TELEGRAM_BOT_TOKEN`: The token for your Telegram bot, obtained from `@BotFather`.

---

## 3. Deployment to Vercel

1.  **Push to GitHub:**
    - Create a new repository on GitHub and push your project code to it.

2.  **Import Project in Vercel:**
    - Sign up or log in to [vercel.com](https://vercel.com).
    - Click **Add New...** -> **Project**.
    - Import your GitHub repository.
    - Vercel will automatically detect it's an Astro project.

3.  **Configure Environment Variables:**
    - In the project configuration screen on Vercel, navigate to **Settings** -> **Environment Variables**.
    - Add all the variables from your `.env` file one by one. **This is a crucial security step.** Do not commit your `.env` file.

4.  **Deploy:**
    - Click the **Deploy** button. Vercel will build and deploy your Mini App.
    - Once deployed, Vercel will give you a public URL (e.g., `https://your-project.vercel.app`). **This is your Web App URL.**

---

## 4. Connecting the Telegram Bot

To make the Mini App accessible from your bot, you need to set the Web App URL.

1.  **Talk to `@BotFather`** in Telegram.
2.  Send the command `/mybots`.
3.  Select your bot (`@lifeofaviationbyabel1bot`).
4.  Click **Bot Settings** -> **Menu Button**.
5.  Click **Configure menu button**.
6.  Paste your **Vercel deployment URL** into the chat.
7.  Give the button a short name, for example, `Student Portal`.

Now, when any user opens a chat with your bot, they will see a "Student Portal" button. Clicking it will launch your Vercel-hosted Mini App.

### Optional: Bot Script for Announcements

The app saves announcements to the database. A separate script can read and broadcast them. Create a file `bot_broadcaster.mjs` and run it on a server (`node bot_broadcaster.mjs`).

```javascript
// bot_broadcaster.mjs
import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("Bot broadcaster started. Listening for new announcements...");

const channel = supabase.channel('announcements_channel')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'announcements' }, 
    async (payload) => {
        console.log('New announcement received:', payload.new.content);
        const content = payload.new.content;

        // Fetch all active users
        const { data: users, error } = await supabase
            .from('users')
            .select('telegram_id')
            .eq('status', 'Active');
        
        if (error) {
            console.error("Error fetching active users:", error);
            return;
        }

        if (users && users.length > 0) {
            console.log(`Broadcasting to ${users.length} active users...`);
            for (const user of users) {
                try {
                    await bot.sendMessage(user.telegram_id, `📢 New Announcement:\n\n${content}`);
                } catch (e) {
                    console.warn(`Failed to send message to user ${user.telegram_id}:`, e.code, e.response?.body?.description);
                }
                // Add a small delay to avoid hitting rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.log("Broadcast complete.");
        }
    }
  )
  .subscribe();

// To keep the script running
process.on('SIGINT', () => {
  supabase.removeChannel(channel);
  process.exit();
});
```
To run this, you would need to install `node-telegram-bot-api` (`npm install node-telegram-bot-api`).