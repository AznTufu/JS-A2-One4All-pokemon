const express = require('express')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Database = require('better-sqlite3')

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
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

app.use(express.json({ limit: '1mb' }))
app.use(express.static(__dirname))

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

app.post('/api/register', (req, res) => {
  const username = String(req.body.username || '').trim()
  const password = String(req.body.password || '')

  if (!username || !password) {
    return res.status(400).json({ error: 'missing_credentials' })
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existingUser) {
    return res.status(409).json({ error: 'user_exists' })
  }

  const passwordHash = bcrypt.hashSync(password, 10)
  const data = JSON.stringify(defaultUserData())
  const info = db.prepare('INSERT INTO users (username, password_hash, data) VALUES (?, ?, ?)').run(username, passwordHash, data)
  const user = db.prepare('SELECT id, username, data, created_at FROM users WHERE id = ?').get(info.lastInsertRowid)
  const token = signToken(user)

  res.json({
    token,
    user: serializeUser(user),
  })
})

app.post('/api/login', (req, res) => {
  const username = String(req.body.username || '').trim()
  const password = String(req.body.password || '')

  if (!username || !password) {
    return res.status(400).json({ error: 'missing_credentials' })
  }

  const user = db.prepare('SELECT id, username, password_hash, data, created_at FROM users WHERE username = ?').get(username)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
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

      return {
        name: user.username,
        data: parsedData,
      }
    })
    .sort((a, b) => a.data.pokemons.pokedex.length - b.data.pokemons.pokedex.length)

  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  res.json({ records: leaderboard.map((entry, index) => ({ id: index + 1, fields: { username: entry.name, data: JSON.stringify(entry.data) } })) })
})

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})