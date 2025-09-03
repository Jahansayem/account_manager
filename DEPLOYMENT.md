# Deployment Guide - Account Manager Web App

## Quick Vercel Deployment 🚀

### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)

### Step 1: Push to GitHub
1. Create a new repository on GitHub
2. Add remote origin:
   ```bash
   git remote add origin https://github.com/yourusername/account-manager-web.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings ✅
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ONESIGNAL_APP_ID`
6. Click "Deploy"

### Step 3: Environment Variables
Copy these from your `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://vudbmzmjaglbqtuwztmw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-key-here]
NEXT_PUBLIC_ONESIGNAL_APP_ID=b5e2944b-51a4-4148-95c7-955c3423cfcb
```

### Expected Results
- ⚡ Build time: ~2-3 minutes
- 🌐 Global CDN deployment
- 📱 Mobile optimized
- 🚀 Edge functions for Supabase

### Post-Deployment
- Your app will be live at: `https://your-project.vercel.app`
- Auto-deployments on every push to main branch
- Preview deployments for pull requests

### Custom Domain (Optional)
1. Go to Vercel dashboard → Your project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

---

## Build Optimizations Included ✅

- ⚡ Production optimized Next.js config
- 📦 Bundle splitting and compression
- 🎨 CSS optimization
- 🖼️ Image optimization (WebP/AVIF)
- 🚫 Console logs removed in production
- 📱 SWC minification enabled

## Troubleshooting

**Build fails?**
- Check environment variables are set correctly
- Ensure Supabase keys are valid

**Slow loading?**
- Verify Supabase region matches your users
- Check network tab for large bundles

**Need help?**
- Check Vercel deployment logs
- Verify all environment variables match your local setup