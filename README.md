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

---

## BadgerSwap Team Milestone & Time Table

### Team Members & Branch Names

| **Role ID** | **Member Name** | **Branch Name** | **Main Responsibility** |
|--------------|----------------|-----------------|--------------------------|
| **A** | [Name 1] | `member-a` | Authentication & Profile |
| **B** | Chenchen Zheng | `chenchen` | Marketplace Core |
| **C** | Johnny Hong | `johnny` | Item Details & Favorites |
| **D** | [Name 4] | `member-d` | Messaging & Notifications |


Each member commits only to their own branch during development and merges on milestone deadlines.

---

| **Milestone** | **Date** | **Goal** | **Role A** | **Role B** | **Role C** | **Role D** |
|---------------|-----------|-----------|---------------|---------------|---------------|---------------|
| **Oct 27** | Authentication + Marketplace Prototype | Users can register/login with UW email and browse mock listings; navigation Login → Marketplace → Item → Chat | **Login Screen** – UI + validation + mock login success | **Marketplace (Home)** – feed + search + filters + item cards | **Item Detail** – layout (image + price + desc + favorite btn) | **Chat Screen** – message list + input bar UI + mock threads |
| **Nov 10** | Posting + Listing Enhancement | Enable posting items + simple local messaging | **Register Screen** + local user storage | **Post Item Screen** (form + preview) | **Favorites Screen** + toggle state | **Message List Screen** (search + threads) |
| **Nov 24** | Profile & Settings | Add user profile management + notifications | **Edit Profile Screen** (name, bio, UW email) | **My Listings Screen** (edit/delete posts) | **Settings Screen** (notifications & privacy) | **Notifications Screen** (badges + alerts) |
| **Dec 8** | Final Demo & Backend Integration | Connect all screens to backend and polish UI | **Auth API** (Firebase / Supabase login + register) | **Marketplace API** (fetch + filter + search) | **Favorites/MyListings API** (save & update user items) | **Chat API** (real-time messages + unread badges) |

---

### Estimated Workload
| Milestone | Hours / Person | Complexity |
|------------|----------------|-------------|
| Oct 27 | 6 – 8 h | UI layout + mock logic |
| Nov 10 | 7 – 9 h | Form handling + local state |
| Nov 24 | 6 – 8 h | Profile logic + storage |
| Dec 8 | 7 – 9 h | Backend integration + polish |

---

### Summary
Workload and difficulty are evenly distributed among all members.  
- **Role A – Authentication & User Profiles:** Builds login/register flow, user info editing, and connects authentication to the backend.  
- **Role B – Marketplace Core:** Designs and codes the main feed, item posting, and marketplace API integration (central part of the app).  
- **Role C – Item Details & Favorites:** Implements detailed item views, favorites, personal listings, and related backend storage.  
- **Role D – Messaging & Notifications:** Develops chat interfaces, navigation between screens, and later adds notifications and real-time updates.

All four roles contribute one major screen or feature per milestone, ensuring balanced progress and no blocking dependencies.
