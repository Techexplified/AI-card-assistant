# Trello Power-Up (Minimal Vite Starter)

A minimal, static Trello Power-Up project built with Vite (Vanilla JS) ready to be deployed to Vercel as a static site.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```

---

## ⚙️ Trello Power-Up Registration

Once deployed to Vercel (e.g., `https://your-app.vercel.app`), register your Power-Up in the [Trello Developer Portal](https://trello.com/power-ups/admin):

- **Iframe Connector URL:**
  ```
  https://your-app.vercel.app/
  ```
  *(Points to `index.html`, which initializes the Power-Up capabilities)*

- **OAuth 2.0 Callback URL:**
  ```
  https://your-app.vercel.app/authorized.html
  ```
  *(Points to `authorized.html`, which handles OAuth redirects, sends authorization codes back to the opener window, and closes itself)*

---

## 📁 Project Structure

```
├── index.html          # Main iframe connector page (loads Trello CDN & client script)
├── authorized.html     # Static OAuth callback handler
├── src/
│   └── client.js       # Power-Up capability initialization (card badges, board buttons)
├── vite.config.js      # Multi-page build configuration
├── vercel.json         # Static deployment configuration for Vercel
├── package.json        # Dependencies & scripts
└── README.md           # Documentation
```
