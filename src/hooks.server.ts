import { SvelteKitAuth } from "@auth/sveltekit";
import GitHub from "@auth/core/providers/github";
import { env } from "$env/dynamic/private";
import fs from 'fs';

export const { handle, signIn, signOut } = SvelteKitAuth({
    providers: [
        GitHub({
            clientId: env.GITHUB_ID,
            clientSecret: env.GITHUB_SECRET,
        }),
    ],
    secret: env.AUTH_SECRET,
    trustHost: true,
    callbacks: {
        async signIn({ user }) {
            const logEntry = `[${new Date().toISOString()}] User Signed In: ${user.name} (${user.email || 'no email'})\n`;
            try {
                fs.appendFileSync('user_activity.log', logEntry);
                console.log('📝 Logged sign-in to user_activity.log');
            } catch (err) {
                console.error('Failed to write to log file:', err);
            }
            return true;
        }
    }
});
