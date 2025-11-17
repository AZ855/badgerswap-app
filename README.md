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
|--------------|-----------------|--------------|--------------------------|
| **A** | Julie Chen      | `julie`      | Authentication & Profile |
| **B** | Chenchen Zheng  | `chenchen`   | Marketplace Core |
| **C** | Johnny Hong     | `johnny`     | Item Details & Favorites |
| **D** | Kane Li         | `kane`       | Messaging & Notifications |


Each member commits only to their own branch during development and merges on milestone deadlines.

---

| **Milestone** | **Date** | **Goal** | **Role A** | **Role B** | **Role C** | **Role D** |
|---------------|-----------|-----------|---------------|---------------|---------------|---------------|
| **Oct 27** | Authentication + Marketplace Prototype | Users can register/login with UW email and browse mock listings; navigation Login → Marketplace → Item → Chat | **Login & Register UI** – UW email validation, mock login | **Marketplace (Home)** – search bar, categories, mock item grid | **Item Detail UI** – image carousel, price, description, favorite toggle UI | **Chat UI** – chat list + message screen (mock data) |
| **Nov 10** | Posting + Listing Enhancement | Enable posting items + favorites + profile UI; still mock/local data | **Settings Screen (New)** – Settings UI, logout trigger, preferences placeholders | **Post Item Screen (UI + Logic)** – full listing form + preview, multi-image picker, campus location selector **+ Backend Work:** Cloudinary upload integration, secure `.env`, type-safe Item model, Firebase Firestore listing write, Firebase service structure, marketplace backend fetch replacing mock data | **Profile UI + Favorites** – Profile header (done), Profile tabs, favorites tab logic, logout implementation | **Chat Enhancements** – message search, thread previews, improved navigation from item → chat |
| **Nov 24** | **Backend Foundations + Profile Integration** | Begin Firebase integration; connect core features to backend | **Firebase Auth Foundation** – email/password auth, user document creation, AuthContext state mgmt | **Backend Marketplace Integration** – query Firestore listings, pagination, search, category filters | **My Listings (Firestore)** – fetch user’s listings; Item Detail fetches full listing data from backend | **Chat Backend Schema** – create/find chat thread doc on “Message Seller”; message structure defined |
| **Dec 8** | Final Demo & Full Backend Integration | Connect all screens to backend and polish UI | **Auth Finalization** – persisted login, profile edit sync, secure user state | **Marketplace API Finalization** – image upload pipeline, listing search, full backend filtering | **Favorites/MyListings API** – backend favorites, listing updates, unified profile data | **Real-Time Chat API** – Firestore/RTDB chat sync, unread badges, delivery states, optional push notifications |


---

### Estimated Workload
| Milestone | Hours / Person | Complexity |
|------------|----------------|-------------|
| Oct 27 | 6 – 8 h | UI layout + mock logic |
| Nov 10 | 10 – 12 h | Form handling + integrations |
| Nov 24 | 6 – 8 h | App logic + backend foundation |
| Dec 8 | 7 – 9 h | Backend integration + polish |

---

### Summary
Workload and difficulty are evenly distributed among all members.  
- **Role A – Authentication & User Profiles:** Builds login/register flow, user info editing, and connects authentication to the backend.  
- **Role B – Marketplace Core & Backend setup:** Designs and codes the main feed, item posting, and marketplace API integration (central part of the app).  
- **Role C – Item Details & Favorites:** Implements detailed item views, favorites, personal listings, and related backend storage.  
- **Role D – Messaging & Notifications:** Develops chat interfaces, navigation between screens, and later adds notifications and real-time updates.

All four roles contribute one major screen or feature per milestone, ensuring balanced progress and no blocking dependencies.

---
