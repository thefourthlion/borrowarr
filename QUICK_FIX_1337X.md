# Quick Fix: Enable 1337x with FlareSolverr

## ✅ Good News!

Your system is **working correctly**! It detected Cloudflare and is telling you exactly how to fix it.

## 🚀 Quick Setup (2 minutes)

### Step 1: Install FlareSolverr

```bash
docker run -d \
  --name=flaresolverr \
  -p 8191:8191 \
  ghcr.io/flaresolverr/flaresolverr:latest
```

### Step 2: Verify It's Running

```bash
# Check if it's running
docker ps | grep flaresolverr

# Test it
curl http://localhost:8191/v1
# Should return: {"status":"ok","message":"FlareSolverr is ready"}
```

### Step 3: Enable in BorrowArr

**Option A: Environment Variables**
```bash
export FLARESOLVERR_ENABLED=true
export FLARESOLVERR_URL=http://localhost:8191

# Restart your server
cd server && npm start
```

**Option B: Add to `.env` file**
```bash
# Create or edit server/.env
echo "FLARESOLVERR_ENABLED=true" >> server/.env
echo "FLARESOLVERR_URL=http://localhost:8191" >> server/.env
```

### Step 4: Test Again

1. Go to **Indexers** page
2. Click **Test** on 1337x
3. Should now show: **"Connection successful"** ✅

## 🎯 What Happens Next

Once FlareSolverr is installed:

1. **Test** → Shows "Connection successful" ✅
2. **Save** → Indexer is saved
3. **Search** → Results from 1337x appear! 🎉

## 🔍 Why This Happens

- **1337x uses Cloudflare** to block automated requests
- **FlareSolverr** solves Cloudflare challenges using a browser
- **Your scraper** automatically uses FlareSolverr when needed
- **No manual work** - it all happens automatically!

## 📊 Status

- ✅ **Cloudflare detection** - Working
- ✅ **Error messages** - Clear and helpful
- ✅ **FlareSolverr integration** - Ready
- ⏳ **FlareSolverr installation** - Needs to be done

## 🎉 After Setup

Once FlareSolverr is running:
- 1337x will work automatically
- No more Cloudflare errors
- Search will return results
- Everything works seamlessly!

**The hard part is done - just install FlareSolverr and you're good to go!** 🚀

