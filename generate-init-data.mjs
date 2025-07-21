import 'dotenv/config'; // MUST be the very first line
import crypto from 'crypto';

// --- CONFIGURATION ---
// This should be your own Telegram ID, which you've set as an admin
const USER_ID = process.env.ADMIN_TELEGRAM_IDS;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// --- END CONFIGURATION ---

if (!USER_ID || !BOT_TOKEN) {
  console.error("❌ ERROR: Please ensure ADMIN_TELEGRAM_IDS and TELEGRAM_BOT_TOKEN are set in your .env file.");
  console.error("   - Make sure you copied .env.example to a new file named .env and filled it out.");
  process.exit(1);
}

const user = {
  id: parseInt(USER_ID.split(',')[0], 10), // We can safely split now
  first_name: "Test",
  last_name: "User",
  username: "testuser",
  language_code: "en",
  is_premium: true,
};

const auth_date = Math.floor(Date.now() / 1000);

const data = {
  auth_date: auth_date,
  query_id: "AA" + 'A'.repeat(28) + "AAAA" + 'A'.repeat(28),
  user: JSON.stringify(user),
};

const dataCheckString = Object.keys(data)
  .sort()
  .map(key => `${key}=${data[key]}`)
  .join('\n');

const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

const initData = new URLSearchParams({ ...data, hash }).toString();

console.log("✅ Generated Telegram InitData String:\n");
console.log("------------------------------------------");
console.log(initData);
console.log("------------------------------------------\n");
console.log("Instructions:");
console.log("1. Run 'npm run dev' to start the Astro server.");
console.log("2. Open the dev server URL in your browser.");
console.log("3. Open the browser's developer console (F12).");
console.log("4. Paste the following line into the console and press Enter:\n");
console.log(`window.Telegram = { WebApp: { initData: "${initData}", ready: () => {}, expand: () => {}, HapticFeedback: { notificationOccurred: () => {} }, colorScheme: 'dark', setHeaderColor: () => {}, MainButton: { show: () => {}, hide: () => {} } } };`);
console.log("\n5. Refresh the page. The app should now recognize you as a valid user.");