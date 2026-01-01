import { SvelteKitAuth } from "@auth/sveltekit";
import GitHub from "@auth/core/providers/github";
import { env } from "$env/dynamic/private";
import { logAuth } from "$lib/logging";

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
            logAuth('info', 'User signed in', {
                name: user.name,
                email: user.email || 'no email'
            });
            return true;
        }
    }
});
