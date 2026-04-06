# Deployment Guide - Database Connection Setup

## Problem
The app uses Vite environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) that must be available at **build time** for the database connection to work after deployment.

## Solution Overview

### Files Created/Updated:
1. **`.env.example`** - Template showing required environment variables
2. **`netlify.toml`** - Netlify deployment configuration
3. **`src/lib/supabase.ts`** - Updated with better connection handling and verification

## Steps to Fix Database Connection After Deployment

### Step 1: Set Environment Variables in Hosting Platform

The environment variables MUST be set in your hosting platform's UI (not just in local `.env` file).

#### For Netlify:
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add the following variables:

```
VITE_SUPABASE_URL=https://hqptxgzpzuhsrybuyjoy.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Vn85SyMOd3cToHzCliO5Jg_AX2BO_xY
```

5. Trigger a new deploy: **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

#### For Vercel:
1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the same variables as above
5. Redeploy the project

#### For Other Platforms:
Set these environment variables in your platform's settings:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

### Step 2: Verify the Connection

After deployment, open your app's URL and check the browser console:

```
[Supabase] URL configured: Yes
[Supabase] Key configured: Yes (length: 49)
[Supabase] Creating real client with URL: https://hqptxgzpzuhsrybuyjoy.supaba...
[Supabase] Connection verified successfully
```

If you see:
```
[Supabase] Using mock client - no database connection
```
→ The environment variables are not set correctly. Check Step 1.

### Step 3: Test Database Access

1. Open the deployed app
2. Check if data loads from the database
3. If you see empty data or "Normal" status with 0 devices, the mock client is still active

## Troubleshooting

### Issue: "Using mock client" message in console
**Cause**: Environment variables not available at build time
**Fix**: 
- Ensure variables are set in hosting platform UI
- Trigger a fresh build (not just a redeploy)
- Variable names must start with `VITE_` for Vite

### Issue: "Connection verification failed"
**Cause**: Invalid Supabase credentials or network issue
**Fix**:
- Verify URL is correct (should end with `.supabase.co`)
- Verify key is the "anon" key (not service_role key)
- Check if Supabase project is paused or has IP restrictions

### Issue: "Invalid API key" error
**Cause**: Using wrong key
**Fix**:
- Use the **anon** key (public), not service_role key
- Get from Supabase Dashboard → Project Settings → API → Project API keys

## Local Development

For local development, create a `.env` file:

```bash
cp .env.example .env
```

Then edit `.env` with your actual credentials.

## Security Note

- **NEVER** commit the `.env` file to git
- **NEVER** expose `VITE_SUPABASE_SERVICE_ROLE_KEY` in client-side code
- The `VITE_SUPABASE_ANON_KEY` is safe to expose (it's designed for client-side)

## Quick Checklist

- [ ] Environment variables set in hosting platform UI
- [ ] Variable names start with `VITE_`
- [ ] Fresh build triggered after setting variables
- [ ] Browser console shows "Creating real client"
- [ ] Database data loads correctly
