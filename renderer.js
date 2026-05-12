const { ipcRenderer } = require('electron')

let isConnected = false

async function init() {
  const config = await ipcRenderer.invoke('load-config')

  if (config.units) document.getElementById('units').value = config.units

  if (config.email && config.password) {
    const result = await ipcRenderer.invoke('verify-credentials', {
      email: config.email,
      password: config.password,
    })

    if (result.success) {
      isConnected = true
      document.getElementById('email').value = config.email
      document.getElementById('password').value = config.password
      document.getElementById('heading').textContent = 'Connected'
      document.getElementById('saveBtn').textContent = 'Disconnect'
      document.getElementById('saveBtn').classList.add('disconnect')
      document.getElementById('email').disabled = true
      document.getElementById('password').disabled = true
    }
  }
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveBtn')

  if (isConnected) {
    btn.innerHTML = '<span class="spinner"></span>'
    await ipcRenderer.invoke('save-config', { email: '', password: '', units: 'mgdl' })
    setTimeout(() => window.close(), 500)
    return
  }

  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  const units = document.getElementById('units').value

  if (!email || !password) {
    setStatus('Please enter both email and password.', 'error')
    return
  }

  btn.innerHTML = '<span class="spinner"></span>'

  await ipcRenderer.invoke('save-config', { email, password, units })
  setTimeout(() => window.close(), 500)
})

function setStatus(msg, type = 'success') {
  const el = document.getElementById('status')
  el.textContent = msg
  el.className = type
}

document.getElementById('togglePassword').addEventListener('click', () => {
  const passwordInput = document.getElementById('password')
  const eyeIcon = document.getElementById('eyeIcon')
  const eyeOffIcon = document.getElementById('eyeOffIcon')

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text'
    eyeIcon.style.display = 'none'
    eyeOffIcon.style.display = 'block'
  } else {
    passwordInput.type = 'password'
    eyeIcon.style.display = 'block'
    eyeOffIcon.style.display = 'none'
  }
})

init()
