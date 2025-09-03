@echo off
echo 🚀 Deploying Account Manager to Vercel...
echo.

echo 📦 Checking Vercel CLI...
vercel --version
if %errorlevel% neq 0 (
    echo Installing Vercel CLI...
    npm install -g vercel
)

echo.
echo 🌐 Starting deployment...
vercel --prod

echo.
echo ✅ Deployment complete!
echo 📊 Visit your Vercel dashboard to manage your app
pause