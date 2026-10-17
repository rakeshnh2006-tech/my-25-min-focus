# Google OAuth 2.0 Detailed Setup Guide for FocusFlow

This guide provides step-by-step instructions for configuring Google OAuth 2.0 for **FocusFlow**.

---

### Step 1: Access Google Cloud Console

1. Navigate to [Google Cloud Console](https://console.cloud.google.com).
2. Sign in with your Google account.
3. In the top navigation bar, click the project dropdown and click **New Project**.
4. Name the project `FocusFlow` and click **Create**.

---

### Step 2: Configure OAuth Consent Screen

1. In the left-hand navigation menu, select **APIs & Services** &gt; **OAuth consent screen**.
2. Select **External** user type and click **Create**.
3. Fill in the required fields:
   - **App name**: `FocusFlow`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes**:
   - Select `.../auth/userinfo.email`
   - Select `.../auth/userinfo.profile`
   - Select `openid`
6. Click **Update** and then **Save and Continue**.
7. Under **Test users**, add your own Google email address (if your app is in "Testing" status).
8. Click **Save and Continue** and finish the wizard.

---

### Step 3: Create OAuth 2.0 Credentials

1. In the left-hand navigation menu, select **APIs & Services** &gt; **Credentials**.
2. Click **+ Create Credentials** at the top, and select **OAuth client ID**.
3. Choose **Application type**: `Web application`.
4. Name: `FocusFlow Web Client`.
5. Under **Authorized JavaScript origins**, click **+ Add URI** and add:
   - `http://localhost:3000`
   - `http://localhost:5000`
6. Under **Authorized redirect URIs**, click **+ Add URI** and add:
   - `http://localhost:5000/api/auth/google/callback`
   *(Important: Ensure there is no trailing slash or typo in this URI)*
7. Click **Create**.
8. A modal will appear showing your **Client ID** and **Client Secret**.

---

### Step 4: Add Credentials to Environment Variables

Open `.env` in the root of the project:

```ini
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
```

---

### Step 5: Verify Setup

1. Start the server and client:
   ```bash
   npm run dev
   ```
2. Open [http://localhost:3000/login](http://localhost:3000/login).
3. Click **Continue with Google**.
4. You will be redirected to the official Google Accounts sign-in screen.
5. Authorize the application and you will be redirected to the FocusFlow Dashboard!
