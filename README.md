# Melly

Live glucose data from your FreeStyle Libre CGM (Continuous Glucose Monitor) in the macOS menu bar.

## Requirements

- macOS
- FreeStyle Libre, Libre 2, or Libre 3 sensor
- LibreLinkUp account

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the app:**
   ```bash
   npm start
   ```

3. **First launch:** Enter your LibreLinkUp follower credentials in the settings window.

## Usage

- Glucose value always visible in the menu bar
- Click the menu bar icon for options (Refresh, Settings, Launch at Login, Quit)

## Build

```bash
npm run build
```

The built app will be in `dist/`.

## Install

1. Open `dist/`
2. Drag `Melly.app` to the **Applications** folder
3. Launch Melly from Applications (or the menu bar on next login)

## Tech Stack

- **Electron** (v34.0.0) - Desktop app framework
- **libreClient.js** - Custom implementation for LibreLinkUp API (reverse engineered from the official app)
- **electron-builder** - Build/packaging tool

## Disclaimer

Melly is an unofficial, community-built app. It is not affiliated with, endorsed, or supported by Abbott (the manufacturer of FreeStyle Libre) or LibreLinkUp.

The app uses a reverse-engineered implementation of the LibreLinkUp API. Data shown in Melly is the same data displayed in your LibreLinkUp phone app, as it pulls from the same source.

No data is stored anywhere. Credentials are saved locally on your device only.

Use at your own risk. Always rely on your phone app or device for medical decisions.