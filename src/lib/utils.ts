import crypto from 'node:crypto';

/**
 * Validates the Telegram initData string.
 * @param botToken Your Telegram bot token.
 * @param initData The initData string from `window.Telegram.WebApp.initData`.
 * @returns The parsed and validated user data, or throws an error if invalid.
 */
export function validateInitData(botToken: string, initData: string) {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const userData = Object.fromEntries(urlParams.entries());
    
    if (!hash) {
        throw new Error('Hash is missing from initData');
    }

    urlParams.delete('hash');
    urlParams.sort(); // Keys must be sorted alphabetically

    const dataCheckString = Array.from(urlParams.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
        throw new Error('Invalid hash: initData is not from Telegram');
    }

    const user = JSON.parse(userData.user);

    return {
        ...userData,
        user
    };
}