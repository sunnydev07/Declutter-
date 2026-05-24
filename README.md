# 🌿 Declutter

**Declutter** is a hardcore, system-level focus and productivity application for Windows. It goes beyond traditional focus timers by taking **full OS-level control** of your PC during study sessions. 

When you set a timer to focus, Declutter means it. No Alt+Tab, no Task Manager, no distracting websites, and no shortcuts. It locks you into productivity with a beautiful gamified interface that rewards consistency.

---

## ✨ Features

* **Extreme OS-Level Lock**: Uses a background Rust Windows Service to enforce the lock. It disables `taskmgr.exe`, CMD/PowerShell, blocks keyboard shortcuts (Alt+F4, Win Key), and restricts mouse movement based on your lock mode.
* **4 Lock Modes**:
  * **Full Lock**: Total lockdown. Keyboard and mouse are completely blocked. Pure focus.
  * **View Lock**: Keyboard blocked, mouse allowed. Perfect for watching lectures or reading PDFs.
  * **App Lock**: Input allowed, but distracting apps and websites are instantly killed/blocked.
  * **Soft Lock**: Normal timer with warnings if you lose focus.
* **Website & App Blocking**: Automatically manipulates the Windows `hosts` file to block distracting domains (YouTube, Reddit, TikTok) and aggressively monitors running processes to kill blocked `.exe` files.
* **Beautiful Gamification**: Plant virtual seeds before you study. If you complete your session, your plant grows into a beautiful tree. If you give up and trigger the emergency unlock, your plant wilts. Unlock new seeds as you build streaks.
* **The "Sword" Mode**: A special mythic seed that completely disables the "Quit Focus" emergency escape. Once you plant the Sword, you are locked in until the timer hits zero. No exceptions.
* **Rich Analytics**: Track your focus hours, success rates, and category breakdowns with a GitHub-style heatmap contribution graph and detailed charts.
* **Crash Recovery & Safety**: If your PC loses power during a lock, Declutter remembers. It saves its state persistently. If the timer expired while offline, restrictions are lifted on boot. If the timer is still active, restrictions instantly re-engage.
* **Immersive Audio**: Procedural Web Audio API chimes for session alerts and HTML5 ambient noise backgrounds (Rain, Cafe) to keep you in the zone.

---

## 🛠️ Architecture Stack

Declutter is built for extreme performance and deep Windows integration:
* **Frontend**: React 19 + TypeScript + Vite (Glassmorphism & Vanilla CSS)
* **Desktop Framework**: Tauri 2.0 (Lightweight, native performance)
* **Background Daemon**: Standalone Rust Binary running as a native Windows Service
* **IPC**: Named Pipes for ultra-fast GUI-to-Daemon communication
* **Database**: Local SQLite via `rusqlite`

---

## 🚀 How to Install & Use

### Prerequisites
* **Windows 10 or 11** (Admin privileges are strictly required).
* If building from source: Node.js 18+, Rust (`rustup`), and the MSVC C++ build tools.

### 1. Download / Install
* *(Note: Pre-compiled binaries will be available in the Releases tab soon.)*
* The installer requires **Administrator Privileges** (UAC) because it must install the background Windows Service (`declutter-service.exe`) that enforces the locks.

### 2. Getting Started
1. Open the app (it will also boot silently to your system tray on startup).
2. Go to the **App Blocker** tab to select the apps/websites you want to block or whitelist.
3. On the **Home** tab, select a focus duration (e.g., 45m).
4. Select your **Lock Mode** (Full, View, App, Soft).
5. Choose a **Plant** to grow (Try the *Sword* if you dare).
6. Click **Launch Focus Session**.

### 3. Emergency Escape & Panic Mode
* **Standard Quit**: If you didn't pick the Sword seed, you can click "Quit Focus" from the overlay to abort. **Warning:** Your plant will wilt, and your streak will be broken.
* **Panic Mode**: Declutter messes with critical system registries (like disabling Task Manager). If the daemon ever crashes or is manually uninstalled while a lock is active, open the app, go to **Settings > Safety & Recovery**, and click **Repair System Registry**. This will forcefully reset your PC's policies to normal.

---

## 💻 Building from Source

To compile the app yourself:

```bash
# Clone the repo
git clone https://github.com/sunnydev07/Declutter-.git
cd Declutter-

# Install frontend dependencies
npm install

# Build the background Rust service
cd src-service
cargo build --release
cd ..

# Build the Tauri React application & NSIS Installer
npm run tauri build
```

The resulting `perMachine` NSIS installer `.exe` will be located in `src-tauri/target/release/bundle/nsis/`.

---

## ⚠️ Disclaimer

**Declutter intentionally disables core Windows functionalities (like Task Manager) to prevent you from bypassing your study timer.** 
While we have built extensive safety nets and crash recovery loops, use this software responsibly. Test the lock modes on short 1-minute timers before committing to a 2-hour lock!

---

*Built for absolute focus.*
