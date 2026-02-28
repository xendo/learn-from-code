# Deploying "Learn from Code" to Hetzner Cloud

Since this application uses the file system heavily (for caching and git operations), a **Cloud Server (VPS)** is the perfect choice.

## 1. Create the Server
1.  Log in to [Hetzner Cloud Console](https://console.hetzner.cloud/).
2.  Create a new **Project**.
3.  **Add Server**:
    *   **Location**: Falkenstein or Nuremberg (or Ashburn if you are in US).
    *   **Image**: **Ubuntu 22.04** or **24.04**.
    *   **Type**: **CPX11** (cheap, shared CPU) or **CAX11** (ARM, cheaper). The app is lightweight, so the smallest instance is fine (~€4/mo).
    *   **SSH Key**: Add your local public key (`cat ~/.ssh/id_rsa.pub`) to access the server.

    > **About Volumes**: You likely **do not need** a Volume to start. The standard ~40GB local disk is enough to store hundreds of cloned repositories. You can attach a Volume later if you fill up the disk.

## 2. Server Setup
SSH into your new server:  
`ssh root@<your-server-ip>`

Run the following commands to install dependencies:

```bash
# Update system
apt update && apt upgrade -y

# Install Bun
curl -fsSL https://bun.sh/install | bash
source /root/.bashrc

# Install Git
apt install -y git
```

### 2.1 Create a dedicated user (Recommended)
Running apps as root is risky. Let's create a user named `legit`:

```bash
# Create user
adduser legit
usermod -aG sudo legit

# Copy SSH keys from root to new user
rsync --archive --chown=legit:legit ~/.ssh /home/legit

# Install Bun for the user logic if needed, or better, make bun available globally
# (The above link installs to ~/.bun, usually better to do per-user or move binary)

# Switch to new user
su - legit
# Install Bun for 'legit' user
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```


## 3. Clone & Configure
```bash
# Clone your repository
git clone https://github.com/xendo/learn-from-code.git
cd learn-from-code

# Install dependencies and Build
bun install
bun run build

# Create .env file
nano .env
```
Paste your production environment variables inside `.env`:
```env
GEMINI_API_KEY=...
GITHUB_ID=...
GITHUB_SECRET=...
AUTH_SECRET=...
ORIGIN=https://<your-domain-or-ip>
```
*(Note: `ORIGIN` and `BODY_SIZE_LIMIT` (optional) can be configured here)*

## 4. Start the Application
Run the app using Bun. Since `svelte-adapter-bun` produces a standalone server:

```bash
# Run directly (or use a process manager like systemd)
bun run build/index.js
```

**Using PM2 with Bun:**
If you still prefer PM2:
```bash
bun add -g pm2
pm2 start "bun build/index.js" --name "learn-from-code"
pm2 save
pm2 startup
```

Your app is now running on port **3000**!

## 5. Configure Domain (Cloudflare)
To connect your domain to your Hetzner server:

1.  Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Select your domain.
3.  Go to **DNS** > **Records**.
4.  Click **Add record**:
    *   **Type**: `A`
    *   **Name**: `@` (for root domain, e.g., `example.com`) or `subdomain` (e.g., `app` for `app.example.com`).
    *   **IPv4 address**: Your Hetzner Server IP (e.g., `123.45.67.89`).
    *   **Proxy status**:
        *   **Proxied (Orange Cloud)**: Recommended for DDoS protection and CDN.
        *   **DNS Only (Grey Cloud)**: Use this if you want Caddy to manage SSL certificates directly via Let's Encrypt without Cloudflare's proxy initially used.

> **Important SSL Setting**: If you use **Proxied (Orange Cloud)**:
1.  Click **SSL/TLS** in the left sidebar.
2.  In the **Overview** tab, you will see encryption modes.
3.  Select **Full (Strict)**.
> This ensures Cloudflare trusts the certificate Caddy generates and avoids "Too many redirects" errors.

> **Propagation Time**: Cloudflare DNS updates are usually very fast (minutes), but global propagation can technically take up to 48 hours.

## 6. Expose to the World (Caddy)
To get HTTPS and a domain, `Caddy` is the easiest web server.

```bash
# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy
```

Edit the Caddyfile:
`nano /etc/caddy/Caddyfile`

Replace the content with:
```caddy
your-domain.com {
    reverse_proxy localhost:3000
}
```

> **Using IP instead of Domain**: If you are waiting for DNS propagation or don't have a domain yet, simply use your IP address in the Caddyfile:
> ```caddy
> :80 {
>     reverse_proxy localhost:3000
> }
> ```
> This will serve the app on port 80 (HTTP) via your IP.

Restart Caddy:
`systemctl restart caddy`

## ✅ Done!
Your app is now live.
- **Logs**: `pm2 logs learn-from-code`
- **User Activity**: `tail -f user_activity.log`

## 7. Troubleshooting Connection Issues

If you can't reach your site, check these logs to see where the request is getting stuck.

### 1. Check Caddy Logs (The Entry Point)
See if requests are hitting your server at all:
```bash
sudo journalctl -u caddy --no-pager | tail -n 20
```
- If you see access logs, the request reached the server.
- If you see nothing when you refresh your browser, the issue is likely **DNS** or **Cloudflare configuration**.

### 2. Check Application Logs (The App)
If Caddy received the request but gave an error (like 502 Bad Gateway), check if your app is running:
```bash
pm2 logs learn-from-code
```
- If the app is crashing or restarting, fix the error in the logs.

### 3. Test Local Connection
Verify the app is running locally on the server:
```bash
curl -I http://localhost:3000
```
### 4. Check Firewall (UFW)
Hetzner Ubuntu images often have UFW disabled by default, but if it's on, it might block connections.
```bash
sudo ufw status
```
- If it says `active`, verify that ports 80 and 443 are allowed:
  ```bash
  sudo ufw allow 80
  sudo ufw allow 443
  sudo ufw allow 22/tcp  # IMPORTANT: Don't lock yourself out of SSH!
  sudo ufw reload
  ```

### 5. Check DNS Resolution
On your local machine (not the server), try to ping your domain:
```bash
ping your-domain.com
```
- Flush your local DNS cache or try a different device/network (e.g., phone on 4G).

### 6. "403 Forbidden" or "Cross-site... SyntaxError"
If you get a `403` error or see `SyntaxError: Unexpected token 'C', "Cross-site"...` in the console when signing in, it means SvelteKit's CSRF protection is blocking the request because the `ORIGIN` environment variable doesn't match your domain.

1.  Open `.env` on your server:
    ```bash
    nano .env
    ```
2.  Ensure `ORIGIN` matches your **exact** domain (with `https://`):
    ```env
    ORIGIN=https://learnfromcode.org
    ```
    *(If you are using an IP, it must be `http://<your-ip>`)*
3.  **Hard Restart (Critical)**:
    Sometimes `pm2 restart` doesn't pick up new environment variables. Try this:
    ```bash
    pm2 delete learn-from-code
    pm2 start "bun build/index.js" --name "learn-from-code"
    ```

4.  **Check URL Mismatch**:
    - If your browser says `https://www.learnfromcode.org`, but you set `ORIGIN=https://learnfromcode.org` (no www), it will fail.
    - Ensure they match **exactly**.

5.  **Check Protocol**:
    - If you are accessing via `http://` (IP address) but set `ORIGIN=https://...`, it will fail.

## 8. Post-Deployment: Configure GitHub OAuth
If you can't sign in, it's likely because your GitHub OAuth App is still pointing to `localhost`.

1.  Go to [GitHub Developer Settings](https://github.com/settings/developers).
2.  Select your OAuth App.
3.  Update the **Homepage URL** to your new domain (or IP):
    *   `https://your-domain.com` (or `http://<your-ip>`)
4.  Update the **Authorization callback URL**:
    *   `https://your-domain.com/auth/callback/github` (or `http://<your-ip>/auth/callback/github`)

> **Note**: If you are using the IP address temporarily, remember to update this again once your domain is ready.

## 9. Updating the Application
When you push new changes to GitHub, follow these steps to update your live server:

1.  **SSH into your server**:
    ```bash
    ssh legit@<your-ip>
    ```
2.  **Navigate to the folder**:
    ```bash
    cd learn-from-code
    ```
3.  **Pull changes**:
    ```bash
    git pull
    ```
4.  **Rebuild**:
    ```bash
    bun install  # Only if you added new dependencies
    bun run build
    ```
5.  **Restart**:
    ```bash
    pm2 restart learn-from-code
    ```
    *(Or if running manually, `Ctrl+C` the running process and start it again)*
