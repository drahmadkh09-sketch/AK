# Deployment Guide: Hostinger

This application is ready for deployment on Hostinger. Follow these steps to get your NIO Intelligence Relay live.

## Prerequisites
- A Hostinger **VPS** (recommended) or **Node.js Hosting** plan.
- Domain name pointed to your Hostinger server.

## Step 1: Prepare the Build
Before uploading, generate the production build:
```bash
npm run build
```
This creates two folders:
- `dist/`: The optimized React frontend.
- `dist-server/`: The compiled Express backend (`index.cjs`).

## Step 2: Upload Files
Upload the following files and folders to your server (via FTP/SFTP or Hostinger File Manager):
- `dist/`
- `dist-server/`
- `package.json`
- `package-lock.json`
- `.env.example` (Rename to `.env` on the server)
- `dashboard.db` (If you want to keep your current data)

## Step 3: Install Dependencies
On your server terminal (SSH), run:
```bash
npm install --production
```
*Note: This will install only the necessary runtime dependencies, including `better-sqlite3`.*

## Step 4: Configure Environment Variables
Edit your `.env` file on the server and provide your actual API keys:
- `GEMINI_API_KEY`
- `META_ACCESS_TOKEN`
- `YOUTUBE_API_KEY`
- `VITE_SHARED_KEY` (Set your access password here)
- `SMTP_*` (For email alerts)

## Step 5: Start the Application

### Option A: Hostinger Node.js Panel
If using the Node.js Hosting plan:
1. Go to the **Node.js** section in hPanel.
2. Set the **Entry Point** to: `dist-server/index.cjs`
3. Set the **Run Script** to: `start`
4. Click **Start**.

### Option B: VPS with PM2 (Recommended)
If using a VPS, use PM2 to keep the app running:
```bash
npm install -g pm2
pm2 start dist-server/index.cjs --name "nio-relay"
pm2 save
pm2 startup
```

## Troubleshooting
- **Native Modules**: If `better-sqlite3` fails to load, run `npm rebuild better-sqlite3` on the server to compile it for the specific OS.
- **Port**: The app defaults to port 3000. Ensure your Hostinger firewall allows traffic on this port, or use a reverse proxy (Nginx) to map it to port 80/443.
