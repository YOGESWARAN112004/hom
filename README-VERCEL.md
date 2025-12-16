# Deploying to Vercel

This folder contains a clean version of your Application ready for deployment.

## Steps to Deploy

1.  **Create a GitHub Repository**:
    *   Initialize a git repo in this folder:
        ```bash
        git init
        git add .
        git commit -m "Initial commit"
        ```
    *   Push this code to a new GitHub repository.

2.  **Import to Vercel**:
    *   Go to [Vercel Dashboard](https://vercel.com).
    *   Click **"Add New Project"** > **"Import"** (select your GitHub repo).
    *   Vercel will detect it as a **Next.js** project automatically.

3.  **Environment Variables**:
    *   In the Vercel Project Settings during import, add the following Environment Variables (copy values from your local `.env` or see `.env.example`):
        *   `DATABASE_URL`: Your PostgreSQL connection string.
        *   `JWT_SECRET`: A secure random string.
        *   `NEXT_PUBLIC_APP_URL`: Your production URL (e.g., `https://your-app.vercel.app`).
        *   `RAZORPAY_KEY_ID`: Your Razorpay Key ID.
        *   `RAZORPAY_KEY_SECRET`: Your Razorpay Secret.
        *   `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`: For emails.

4.  **Deploy**:
    *   Click **"Deploy"**. Vercel will build and start your application.

## Database Note
Ensure your database (PostgreSQL) is accessible from the internet (e.g., Neon, Supabase, or a cloud VPS), as Vercel functions need to connect to it.
