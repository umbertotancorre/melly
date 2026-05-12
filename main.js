const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const { fetchGlucose } = require('./libreClient')

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json')
const POLL_INTERVAL_MS = 60 * 1000
const STALE_THRESHOLD_MS = 15 * 60 * 1000

let tray = null
let settingsWindow = null
let pollTimer = null

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    return null
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

function convertValue(mgdl, units) {
  if (units === 'mmol') return (mgdl / 18.0182).toFixed(1)
  return Math.round(mgdl).toString()
}

function readingAgeMs(reading) {
  const raw = reading.timestampRaw || reading.timestamp
  if (!raw) return null
  const date = new Date(raw)
  return isNaN(date.getTime()) ? null : Date.now() - date.getTime()
}

function timeAgo(ageMs) {
  if (ageMs === null) return ''
  const mins = Math.round(ageMs / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1m ago'
  return `${mins}m ago`
}

function buildMenu(info) {
  const launchAtLogin = app.getLoginItemSettings().openAtLogin
  const items = [
    { label: info.header, enabled: false },
  ]

  items.push(
    { type: 'separator' },
    { label: 'Refresh', accelerator: 'CmdOrCtrl+R', click: () => fetchAndUpdate() },
    { label: 'Settings…', click: openSettings },
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: launchAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { type: 'separator' },
    { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
  )

  return Menu.buildFromTemplate(items)
}

async function fetchAndUpdate() {
  const config = loadConfig()
  if (!config?.email || !config?.password) {
    tray.setTitle('⚠ Setup')
    tray.setContextMenu(buildMenu({ header: 'No credentials — open Settings' }))
    return
  }

  const units = config.units ?? 'mgdl'

  try {
    const reading = await fetchGlucose(config.email, config.password)

    const ageMs = readingAgeMs(reading)
    const stale = ageMs !== null && ageMs > STALE_THRESHOLD_MS
    const age = timeAgo(ageMs)
    const displayValue = convertValue(reading.value, units)
    const label = `${displayValue} ${reading.arrow}`.trim()

    tray.setTitle(stale ? `⚠ ${label}` : label)

    tray.setContextMenu(buildMenu({
      header: `${label} · ${age}${stale ? ' · stale' : ''}`,
    }))
  } catch (err) {
    console.error('Fetch error:', err.message)
    tray.setTitle('⚠ Error')
    tray.setContextMenu(buildMenu({ header: `API Error: ${err.message}` }))
  }
}

function startPolling() {
  clearInterval(pollTimer)
  fetchAndUpdate()
  pollTimer = setInterval(fetchAndUpdate, POLL_INTERVAL_MS)
}

function openSettings() {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    resizable: false,
    title: 'Melly — Settings',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  settingsWindow.loadFile('settings.html')
  settingsWindow.on('closed', () => { settingsWindow = null })
}

ipcMain.handle('load-config', () => loadConfig() ?? {})

ipcMain.handle('save-config', (_event, config) => {
  saveConfig(config)
  startPolling()
  return true
})

ipcMain.handle('verify-credentials', async (_event, { email, password }) => {
  try {
    await fetchGlucose(email, password)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

app.whenReady().then(() => {
  app.dock?.hide()

  const empty = nativeImage.createEmpty()
  tray = new Tray(empty)
  tray.setTitle('...')

  const config = loadConfig()
  if (!config?.email || !config?.password) {
    tray.setTitle('⚠ Setup')
    tray.setContextMenu(buildMenu({ header: 'No credentials — open Settings' }))
    openSettings()
  } else {
    startPolling()
  }
})

app.on('window-all-closed', (e) => e.preventDefault())
