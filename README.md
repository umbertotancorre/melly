# Melly

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Apple Silicon](https://img.shields.io/badge/Apple%20Silicon-94%20MB-blue)](https://github.com/umbertotancorre/melly/releases/download/v1.0.0/Melly-1.0.0-arm64.dmg)
[![Intel](https://img.shields.io/badge/Intel-98%20MB-blue)](https://github.com/umbertotancorre/melly/releases/download/v1.0.0/Melly-1.0.0.dmg)
[![Stars](https://img.shields.io/github/stars/umbertotancorre/melly)](https://github.com/umbertotancorre/melly)

**No Subscription · No Extra Server · Open Source**

A macOS menu bar app that shows your FreeStyle Libre glucose reading and trend arrow in real time, polling your LibreLink Up account every minute.

## Table of Contents

- [How It Works](#how-it-works)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Development](#development)
  - [Commands](#commands)
  - [Layout](#layout)
- [Disclaimer](#disclaimer)
- [License](#license)

## How It Works

Melly connects directly to LibreLink Up using the same API as the official mobile app. No data passes through any third-party server, and your credentials are stored only on your Mac.

## Features

- Live glucose value and trend arrow in the menu bar (e.g. `95 →`, `6.1 ↑`)
- mg/dL and mmol/L display
- Stale reading warning after 15 minutes of no update
- Automatic region detection across all LibreLink Up regions (US, EU, DE, FR, AU, CA, JP, AP, AE)
- Launch at login

## Requirements

You need a [LibreLink Up](https://www.librelinkup.com) account connected to the patient's sensor. Melly logs in as the follower, not the patient.

If you only have a patient account, open the LibreLink app → Sharing, invite a follower, and use those follower credentials in Melly's Settings. The same email as your patient account works.

## Installation

Download the `.dmg` for your Mac, open it, and drag `Melly.app` to Applications.

| Mac | Download |
|---|---|
| Apple Silicon | [Melly-1.0.0-arm64.dmg](https://github.com/umbertotancorre/melly/releases/download/v1.0.0/Melly-1.0.0-arm64.dmg) |
| Intel | [Melly-1.0.0.dmg](https://github.com/umbertotancorre/melly/releases/download/v1.0.0/Melly-1.0.0.dmg) |

Not sure which chip you have? Check Apple menu → About This Mac.

On first launch, the Settings window opens automatically: enter your LibreLink Up credentials, pick your units, and click **Connect**. The glucose value appears in the menu bar within a few seconds.

## Development

### Commands

```bash
npm install
npm start        # run in development
npm run build    # produce .dmg for macOS (arm64 + x64)
```

### Layout

```
melly/
  main.js           # Electron main process: tray, polling, IPC
  libreClient.js    # LibreLink Up API client: login, region redirect, glucose fetch
  settings.html     # Settings window UI
  renderer.js       # Settings window renderer logic
  package.json      # Dependencies and build config
  dist/             # Built .dmg output
```

## Disclaimer

Melly is an unofficial, community-built app not affiliated with Abbott or LibreLink Up. It uses the same API as the official mobile app. Always rely on your phone app or CGM device for medical decisions.

## License

`umbertotancorre/melly` is fully open source, licensed under the [MIT License](LICENSE).
