const express = require('express')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const Database = require('better-sqlite3')

let Pyroscope = null
if (process.env.PYROSCOPE_SERVER) {
  try {
    Pyroscope = require('@pyroscope/nodejs')
    Pyroscope.init({
      serverAddress: process.env.PYROSCOPE_SERVER,
      appName: 'poke-bicrave',
      basicAuthUser: process.env.PYROSCOPE_USER,
      basicAuthPassword: process.env.PYROSCOPE_API_KEY,
      tags: { env: process.env.NODE_ENV || 'dev' },
      wall: { collectCpuTime: true },
    })
    Pyroscope.start()
    console.log('Pyroscope: profiling continu activé')
  } catch (err) {
    Pyroscope = null
    console.warn('Pyroscope demandé mais @pyroscope/nodejs absent — profiling désactivé')
  }
}

const app = express()
app.disable('x-powered-by')

const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('JWT_SECRET manquant en production — arrêt.')
  process.exit(1)
}
const dbDir = process.env.DB_DIR || path.join(__dirname, 'data')
const dbPath = path.join(dbDir, 'poke-bicrave.sqlite')

fs.mkdirSync(dbDir, { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

const SEED_USERS = parseInt(process.env.SEED_USERS || '0', 10)
if (SEED_USERS > 0) {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM users').get()
  if (c < SEED_USERS) {
    const passwordHash = bcrypt.hashSync('seed-password', 10)
    const makeData = () => {
      const count = Math.floor(Math.random() * 60)
      const seen = new Set()
      while (seen.size < count) seen.add(Math.floor(Math.random() * 151) + 1)
      const pokedex = [...seen].map((id) => ({
        id: String(id),
        name: `pokemon-${id}`,
        url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
      }))
      const pc = pokedex.flatMap((p) => Array(1 + Math.floor(Math.random() * 4)).fill(p.id))
      return JSON.stringify({ balance: Math.floor(Math.random() * 5000), upgrade: { balls: [] }, pokemons: { pc, pokedex } })
    }
    const insert = db.prepare('INSERT OR IGNORE INTO users (username, password_hash, data) VALUES (?, ?, ?)')
    db.transaction(() => {
      for (let i = c; i < SEED_USERS; i++) insert.run(`seed_user_${i}`, passwordHash, makeData())
    })()
    console.log(`Seed: base peuplée à ${SEED_USERS} joueurs.`)
  }
}

app.use(compression({ threshold: 1024 }))
app.use(express.json({ limit: '1mb' }))

const STATIC_OPTS = { maxAge: '30d' }
app.use('/assets', express.static(path.join(__dirname, 'assets'), STATIC_OPTS))
app.use('/css', express.static(path.join(__dirname, 'css'), STATIC_OPTS))
app.use('/js', express.static(path.join(__dirname, 'js'), { maxAge: '1h' }))
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')))

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false })
const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false })
app.use('/api/', apiLimiter)

const defaultUserData = () => ({
  balance: 0,
  upgrade: {
    balls: [
      {
        name: 'PokeBall',
        lvl: 20,
        basePrice: 0,
        sprite: '/assets/images/balls/PokeBall.png',
        difficulty: 3,
      },
      {
        name: 'SuperBall',
        lvl: 0,
        basePrice: 100,
        sprite: '/assets/images/balls/SuperBall.png',
        difficulty: 2,
      },
      {
        name: 'HyperBall',
        lvl: 2,
        basePrice: 1000,
        sprite: '/assets/images/balls/HyperBall.png',
        difficulty: 1,
      },
    ],
  },
  pokemons: {
    pc: [],
    pokedex: [],
  },
})

const serializeUser = (row) => ({
  id: row.id,
  createdTime: row.created_at,
  fields: {
    username: row.username,
    data: row.data,
  },
})

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' })
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')

  if (!token) {
    return res.status(401).json({ error: 'missing_token' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = db.prepare('SELECT id, username, data, created_at FROM users WHERE id = ?').get(payload.sub)

    if (!user) {
      return res.status(401).json({ error: 'invalid_token' })
    }

    req.user = user
    req.token = token
    next()
  } catch (error) {
    return res.status(401).json({ error: 'invalid_token' })
  }
}

app.post('/api/register', authLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim()
  const password = String(req.body.password || '')

  if (!username || !password) {
    return res.status(400).json({ error: 'missing_credentials' })
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existingUser) {
    return res.status(409).json({ error: 'user_exists' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const data = JSON.stringify(defaultUserData())
  const info = db.prepare('INSERT INTO users (username, password_hash, data) VALUES (?, ?, ?)').run(username, passwordHash, data)
  const user = db.prepare('SELECT id, username, data, created_at FROM users WHERE id = ?').get(info.lastInsertRowid)
  const token = signToken(user)

  res.json({
    token,
    user: serializeUser(user),
  })
})

app.post('/api/login', authLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim()
  const password = String(req.body.password || '')

  if (!username || !password) {
    return res.status(400).json({ error: 'missing_credentials' })
  }

  const user = db.prepare('SELECT id, username, password_hash, data, created_at FROM users WHERE username = ?').get(username)
  const ok = user && (await bcrypt.compare(password, user.password_hash))
  if (!ok) {
    return res.status(401).json({ error: 'invalid_credentials' })
  }

  const token = signToken(user)
  res.json({
    token,
    user: serializeUser(user),
  })
})

app.get('/api/me', authRequired, (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  res.json({
    token: req.token,
    user: serializeUser(req.user),
  })
})

app.put('/api/me', authRequired, (req, res) => {
  const currentData = JSON.parse(req.user.data)
  const nextData = req.body.data || currentData

  db.prepare('UPDATE users SET data = ? WHERE id = ?').run(JSON.stringify(nextData), req.user.id)

  const updatedUser = db.prepare('SELECT id, username, data, created_at FROM users WHERE id = ?').get(req.user.id)

  res.set('Cache-Control', 'private, no-store')
  res.json({
    token: req.token,
    user: serializeUser(updatedUser),
  })
})

app.get('/api/leaderboard', (_req, res) => {
  const users = db.prepare('SELECT id, username, data, created_at FROM users').all()
  const leaderboard = users
    .map((user) => {
      let parsedData = defaultUserData()
      try {
        parsedData = JSON.parse(user.data)
      } catch (error) {
        parsedData = defaultUserData()
      }
      return { name: user.username, data: parsedData }
    })
    .sort((a, b) => a.data.pokemons.pokedex.length - b.data.pokemons.pokedex.length)

  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  res.set('X-Cache', 'MISS')
  res.json({ records: leaderboard.map((entry, index) => ({ id: index + 1, fields: { username: entry.name, data: JSON.stringify(entry.data) } })) })
})

app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }))
app.use((_req, res) => res.status(404).type('text/plain').send('Not Found'))

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})