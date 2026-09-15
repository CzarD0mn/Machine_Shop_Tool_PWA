# The Machinist Helper (Web Edition)

Speeds-and-feeds calculator, named operation log, program log, and backup manager for shop floors and CNC machinists.

Rewritten in modern React + TypeScript with Tailwind CSS from the original Android application, fully preserving all cutting math, shop materials, time stamp tracking, averages calculations, Web Crypto AES-GCM backup encryption, and responsive split-pane layouts.

## Native Android app

The Machinist Helper ships as a **Capacitor Android app** (`com.machinisthelper.app`) wrapping this PWA in a native WebView with a shop-green splash and status bar.

### Install the APK

1. Download `app-debug.apk` from [Releases](https://github.com/CzarD0mn/Machine_Shop_Tool_PWA/releases) or the latest [Actions artifact](https://github.com/CzarD0mn/Machine_Shop_Tool_PWA/actions/workflows/build-apk.yml).
2. Copy it to an Android 7+ phone or tablet.
3. Open the file and allow install from this source if Android asks.
4. Launch **The Machinist Helper** from the app drawer.

Every push to `main` rebuilds the APK. Use **Actions → Build Android APK → Run workflow** for an on-demand build.

### Build locally

```bash
npm install
npm run build
npx cap add android          # first time only
npx cap sync android
cd android && ./gradlew assembleDebug
```

The debug APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Features

### 1. Speeds & Feeds Calculator (`Calc` tab)
- **Cutting Setup**:
  - Measurement units: **Inch** or **Metric** (auto-converts diameters, feeds, and surface speeds)
  - Operations: **Milling**, **Drilling**, **Turning**
  - Tooling: **Carbide** or **High Speed Steel (HSS)**
  - Workpiece materials: 14 categorized metals and engineering plastics (Aluminum 6061/7075, Brass, 1018 mild steel, 4140 pre-hard, 304/316 stainless, Cast Iron, Titanium Ti-6Al-4V, Inconel 718, Delrin/Acetal, UHMW).
- **Tooling & Workpiece Geometry**:
  - Tool or workpiece diameter
  - Number of cutter flutes (end mills & drills)
- **Overrides & Recommendations**:
  - Optional SFM (or m/min) catalog override
  - Optional IPT (or IPR) chip load override
- **Output Results**:
  - High-visibility spindle speed (**RPM**)
  - Feed rate (**IPM** or **mm/min**)
  - Cutting surface speed (**SFM** or **m/min**)
  - Chip load per tooth (**IPT** or **mm**)
  - Feed per revolution (**in/rev** or **mm/rev**)
  - Contextual shop notes and machining tips

### 2. Named Operation Log (`Op Log` tab)
- Track jobs, machine assignments, and labor hours:
  - **Machine Cell**
  - **Part Number**
  - **Shop Order (Job #)**
  - **Operation ID**
  - **Quantity Start** and **Quantity Finish**
  - **Next Operation**
  - **Shop Notes & Offsets**
- **Precision Time Stamps**:
  - Start Setup, End Setup, Start Production, End Production
  - **Stamp now** captures timestamp, IANA timezone name, and UTC offset
  - Full multi-day span duration tracking
  - Setup hours, production hours, and operation total calculated to 0.1 hr precision
- Debounced auto-saving to local storage.

### 3. Program Log (`Programs` tab)
- Correlate CNC program files and machine centers with part numbers:
  - **Part Number** & **Part Revision**
  - **Program Name/Number** & **Program Revision**
  - **Machine Spindle/Cell**
- **Part Time Averages**:
  - Aggregates historical setup and run times across shop orders from the Operation Log
  - Displays shop order count, last ran date, average setup hours, average production hours, and average total hours.
- Search and filter by machine, part, or program.

### 4. Settings & Backups (`Settings` tab)
- **User Experience Preferences**:
  - Adjustable text size (Normal, Large, Extra large)
  - Default start tab selection (Last used, Op Log, Programs, Calc, Settings)
  - Theme colors (Standard green, Outdoor high-contrast green)
  - Phone layout density (Roomy vs. Compact)
- **Backup & Encryption**:
  - **Backup zip**: Generates `.mhb` (encrypted with AES-256-GCM via Web Crypto API) or `.zip` file.
  - **Restore zip**: Ingests and verifies backups, prompting for decryption password if secured.
  - Password strength verification (12+ characters with letters, numbers, and symbols).
  - Directory picker support for folder backups.
- **Exporting**:
  - Export full operation log as standardized CSV or JSON.
- **Remote Push**:
  - Configuration for shop Nextcloud, WebDAV, or FTPS backup endpoints.
  - Custom SSL/TLS certificate pinning (`.crt` / `.pem`).
- **Error History**:
  - View and export operational diagnostic logs.
- **Shop Offline & Background Sync**:
  - Custom service worker caches Calc, logs, and backups for dead-cell use.
  - Silent reachability probe restores network services when signal returns.
  - Nextcloud / WebDAV backups queue into the Background Sync API and flush even if the tab is closed.
  - Daily / Weekly schedules arm Periodic Sync on installed home-screen installs.

## Math Engine

- **Spindle Speed**: $\text{RPM} = \frac{\text{SFM} \times 3.8197}{\text{diameter (in)}}$
- **Milling Feed Rate**: $\text{IPM} = \text{RPM} \times \text{flutes} \times \text{IPT}$
- **Drilling & Turning Feed Rate**: $\text{IPM} = \text{RPM} \times \text{IPR}$

Metric units convert seamlessly:
- $1\text{ in} = 25.4\text{ mm}$
- $1\text{ m/min} = 3.28084\text{ SFM}$

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom machinist shop green themes
- **Icons**: Lucide React
- **Data Persistence**: LocalStorage with Web Crypto API (`SubtleCrypto` AES-256-GCM / PBKDF2 / SHA-256)
- **Offline**: Custom service worker + Cache API, Background Sync, and Periodic Sync
- **Compression**: JSZip for `.mhb` and `.zip` archive creation and extraction
