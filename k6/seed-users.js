const path = require('path')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')

const N = parseInt(process.argv[2], 10) || 1000
const db = new Database(path.join(__dirname, '..', 'data', 'poke-bicrave.sqlite'))
db.pragma('journal_mode = WAL')

const passwordHash = bcrypt.hashSync('seed-password', 10)

const randomPokedex = () => {
  const count = Math.floor(Math.random() * 60)
  const seen = new Set()
  while (seen.size < count) seen.add(Math.floor(Math.random() * 151) + 1)
  return [...seen].map((id) => ({
    id: String(id),
    name: `pokemon-${id}`,
    url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
  }))
}

const makeData = () => {
  const pokedex = randomPokedex()
  const pc = pokedex.flatMap((p) => Array(1 + Math.floor(Math.random() * 4)).fill(p.id))
  return JSON.stringify({
    balance: Math.floor(Math.random() * 5000),
    upgrade: {
      balls: [
        { name: 'PokeBall', lvl: 20, basePrice: 0, sprite: '/assets/images/balls/PokeBall.png', difficulty: 3 },
        { name: 'SuperBall', lvl: Math.floor(Math.random() * 10), basePrice: 100, sprite: '/assets/images/balls/SuperBall.png', difficulty: 2 },
        { name: 'HyperBall', lvl: Math.floor(Math.random() * 5), basePrice: 1000, sprite: '/assets/images/balls/HyperBall.png', difficulty: 1 },
      ],
    },
    pokemons: { pc, pokedex },
  })
}

const insert = db.prepare('INSERT OR IGNORE INTO users (username, password_hash, data) VALUES (?, ?, ?)')
const seedAll = db.transaction(() => {
  let inserted = 0
  for (let i = 0; i < N; i++) {
    inserted += insert.run(`seed_user_${i}`, passwordHash, makeData()).changes
  }
  return inserted
})

const inserted = seedAll()
const total = db.prepare('SELECT COUNT(*) AS c FROM users').get().c
console.log(`${inserted} joueurs insérés (${total} au total en base).`)
console.log(`Nettoyage après les tests : DELETE FROM users WHERE username LIKE 'seed_user_%';`)
