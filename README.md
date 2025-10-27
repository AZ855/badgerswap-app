### 0. Prerequisites

**Required**
- [Git](https://git-scm.com/downloads)
- [Node.js LTS (18 or 20)](https://nodejs.org)
- [VS Code](https://code.visualstudio.com)  
- **Expo Go** app on your physical phone (App Store / Play Store)

---

### 1. Clone the Repo

```bash
git clone https://github.com/JohnnyHong0116/BadgerSwap_CS407.git
cd BadgerSwap_CS407
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Environment Variables

If a sample file exists, copy it and fill in values:

```bash
cp .env.example .env
```

Never commit `.env` files — only the `.env.example`.

---

### 4. Run the App

Start the Expo dev server:

```bash
npm run start
# or:
npx expo start
```

 If cannot connect/taking longer time to open app after scanning QR code, use a tunnel:
 ```bash
 npx expo start --tunnel
```

If you enconter "Error: Failed to install ANY PACKAGE", use sudo to download.

### For setting up personal branches

Make sure have the latest main

```bash
git checkout main
git pull origin main
```

Create a branch using own name

```bash
git checkout -b name
git push -u origin name
```

Work and commit normally

```bash
git add -A
git commit -m "feat: added profile screen"
git push
```

Merge own branch to main (only for instruction update rn)

```bash
git checkout main
git pull origin main

git merge name

git push origin main
```
