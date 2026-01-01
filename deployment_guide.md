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

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Git and Process Manager (PM2)
apt install -y git
npm install -g pm2
```

### 2.1 Create a dedicated user (Recommended)
Running apps as root is risky. Let's create a user named `legit`:

```bash
# Create user
adduser legit
usermod -aG sudo legit

# Copy SSH keys from root to new user
rsync --archive --chown=legit:legit ~/.ssh /home/legit

# Switch to new user
su - legit
```


## 3. Clone & Configure
```bash
# Clone your repository
git clone https://github.com/xendo/learn-from-code.git
cd learn-from-code

# Install dependencies and Build
npm install
npm run build

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
Run the app using PM2 to keep it alive:

```bash
pm2 start build/index.js --name "learn-from-code"
pm2 save
pm2 startup
```

Your app is now running on port **3000**!

## 5. Expose to the World (Caddy)
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
(If you don't have a domain yet, use the IP address, e.g., `http://<your-ip>`)

Restart Caddy:
`systemctl restart caddy`

## ✅ Done!
Your app is now live.
- **Logs**: `pm2 logs learn-from-code`
- **User Activity**: `tail -f user_activity.log`
