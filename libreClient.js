const https = require('https')
const crypto = require('crypto')

const REGION_URLS = {
  US: 'api-us.libreview.io',
  EU: 'api-eu.libreview.io',
  EU2: 'api-eu2.libreview.io',
  DE: 'api-de.libreview.io',
  FR: 'api-fr.libreview.io',
  AU: 'api-au.libreview.io',
  CA: 'api-ca.libreview.io',
  JP: 'api-jp.libreview.io',
  AP: 'api-ap.libreview.io',
  AE: 'api-ae.libreview.io',
}

const CLIENT_VERSION = '4.16.0'
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU OS 17_4_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/17.4.1 Mobile/10A5355d Safari/8536.25'

const TREND_ARROWS = { 1: '↓↓', 2: '↓', 3: '→', 4: '↑', 5: '↑↑' }

// Cached session — persists for the lifetime of the process
let session = null // { hostname, token, accountIdHash, cookies, connectionId, expiresAt }

function request(hostname, path, method, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const options = {
      hostname,
      path,
      method,
      headers: {
        'user-agent': USER_AGENT,
        'cache-control': 'no-cache',
        connection: 'Keep-Alive',
        'content-type': 'application/json;charset=UTF-8',
        accept: 'application/json',
        product: 'llu.ios',
        version: CLIENT_VERSION,
        'account-id': '',
        ...extraHeaders,
        ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}),
      },
    }

    const req = https.request(options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const rawCookies = res.headers['set-cookie'] ?? []
        const cookies = rawCookies.map(c => c.split(';')[0]).join('; ')

        if (res.statusCode >= 400) {
          const bodyPreview = Buffer.concat(chunks).toString().slice(0, 300)
          reject(new Error(`HTTP ${res.statusCode} from ${hostname}${path} — ${bodyPreview}`))
          return
        }
        try {
          resolve({ body: JSON.parse(Buffer.concat(chunks).toString()), cookies })
        } catch (e) {
          reject(new Error('Invalid JSON response'))
        }
      })
    })

    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function login(email, password, region) {
  let hostname = REGION_URLS[region] ?? REGION_URLS.EU

  const loginResult = await request(hostname, '/llu/auth/login', 'POST', { email, password })
  const loginBody = loginResult.body
  const sessionCookies = loginResult.cookies

  if (loginBody.status === 2) {
    throw new Error('Bad credentials. Make sure you use your LibreLink Up account (not LibreLink).')
  }
  if (loginBody.status === 4) {
    throw new Error('Additional action required. Open the LibreLink Up app and complete any pending steps.')
  }
  if (loginBody.status === 429 || loginBody.status === 430) {
    throw new Error('Rate limited by LibreLink Up — too many login attempts. Wait 15-30 minutes and try again.')
  }

  if (loginBody.data?.redirect) {
    const targetRegion = loginBody.data.region
    const countryResult = await request(hostname, '/llu/config/country?country=DE', 'GET', null)
    const regionDef = countryResult.body.data?.regionalMap?.[targetRegion]
    if (!regionDef) throw new Error(`Unknown region '${targetRegion}'`)
    hostname = new URL(regionDef.lslApi).hostname
    const newRegion = Object.keys(REGION_URLS).find(k => REGION_URLS[k] === hostname) ?? region
    return login(email, password, newRegion)
  }

  const token = loginBody.data.authTicket.token
  const expiresAt = loginBody.data.authTicket.expires * 1000
  const accountId = loginBody.data.user.id
  const accountIdHash = crypto.createHash('sha256').update(accountId).digest('hex')

  const authHeaders = {
    authorization: `Bearer ${token}`,
    'account-id': accountIdHash,
    ...(sessionCookies ? { cookie: sessionCookies } : {}),
  }

  const connectionsResult = await request(hostname, '/llu/connections', 'GET', null, authHeaders)
  const connections = connectionsResult.body.data

  if (!connections?.length) {
    throw new Error(
      'No connections found. In the LibreLink app → Sharing, invite a follower account, ' +
      'then log in here with those follower credentials.'
    )
  }

  session = {
    hostname,
    token,
    accountIdHash,
    cookies: sessionCookies,
    connectionId: connections[0].patientId,
    expiresAt,
  }
}

async function fetchGlucose(email, password, region = 'EU') {
  // Log in only if we have no session or the token is within 1 day of expiry
  if (!session || Date.now() > session.expiresAt - 86400000) {
    await login(email, password, region)
  }

  const authHeaders = {
    authorization: `Bearer ${session.token}`,
    'account-id': session.accountIdHash,
    ...(session.cookies ? { cookie: session.cookies } : {}),
  }

  const graphResult = await request(
    session.hostname,
    `/llu/connections/${session.connectionId}/graph`,
    'GET', null, authHeaders
  )
  const graphBody = graphResult.body

  if (graphBody.status === 4) {
    throw new Error(
      'Your account is the patient, not a follower. ' +
      'In the LibreLink app → Sharing, invite a second email as a follower, ' +
      'then use those follower credentials in Settings.'
    )
  }

  // If token was rejected, clear session and retry once
  if (graphBody.status === 401 || graphBody.status === 403) {
    session = null
    return fetchGlucose(email, password, region)
  }

  const current = graphBody.data?.connection?.glucoseMeasurement
  if (!current) throw new Error('No glucose reading in API response.')

  return {
    value: current.Value,
    trend: current.TrendArrow,
    arrow: TREND_ARROWS[current.TrendArrow] ?? '',
    isHigh: current.isHigh ?? false,
    isLow: current.isLow ?? false,
    timestamp: current.FactoryTimestamp,
    timestampRaw: current.Timestamp,
  }
}

module.exports = { fetchGlucose, REGION_URLS }
