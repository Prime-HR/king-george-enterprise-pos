# 👑 King George Enterprise - POS & Shop Manager

> **Proprietor:** King George (George Gyamfi)  
> **Location:** Juaben Adumasa, Ashanti Region, Ghana  
> **Contact / MoMo:** `0548809611` | `gyamfigeorge9990@gmail.com`  
> **Tech Stack:** React Native, Expo SDK 57, Expo SQLite (100% Offline)

---

## 🚀 How to Host on GitHub & Get Direct Phone Install Link

### Step 1: Push this codebase to GitHub
```bash
cd "c:\Users\rauf2\Desktop\ADUMASA SHOPS\king-george-enterprise-app"
git init
git add .
git commit -m "Initial commit of King George Enterprise POS"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/king-george-enterprise.git
git push -u origin main
```

---

### Step 2: Build the Direct Android APK Download Link (EAS Build)
Run this single command in the project directory:

```bash
npx eas-cli login
npx eas-cli project:init
npx eas-cli build -p android --profile preview
```

### 📲 How King George Installs it on his Phone:
1. When EAS finishes building in the cloud (takes ~3 to 5 minutes), it gives you a **QR code & short download URL** (e.g. `https://expo.dev/artifacts/eas/...`).
2. Copy that link and **send it directly to King George on WhatsApp (0548809611)**.
3. King George taps the link on his phone $\rightarrow$ the `.apk` downloads $\rightarrow$ he taps **Install**.
4. The app opens immediately with his store name, pre-loaded inventory, and offline SQLite database!

---

## 💻 Local Testing with Expo Go (Before Building APK)
```bash
cd "c:\Users\rauf2\Desktop\ADUMASA SHOPS\king-george-enterprise-app"
npx expo start -c
```
Scan the QR code with **Expo Go** on Android to test in real time!
