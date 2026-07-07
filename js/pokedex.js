"use strict"

const POKEDEX_LIMIT = 151
const POKEDEX_LIST_URL = `https://pokeapi.co/api/v2/pokemon?limit=${POKEDEX_LIMIT}`
const POKEDEX_CACHE_KEY = 'pokedex_gen1_v1'
const spriteUrl = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

// Récupère la liste des 151 Pokémon (nom + id) en UNE requête, mise en cache localStorage.
// Les données de la génération 1 sont immuables : après la 1re visite, 0 requête réseau.
async function getPokedexList() {
    const cached = localStorage.getItem(POKEDEX_CACHE_KEY)
    if (cached) return JSON.parse(cached)

    const response = await fetch(POKEDEX_LIST_URL)
    const data = await response.json()
    const list = data.results.map((p) => {
        const id = p.url.split('/')[6] // .../pokemon/25/ -> "25"
        return { id, name: p.name }
    })
    localStorage.setItem(POKEDEX_CACHE_KEY, JSON.stringify(list))
    return list
}

// Construit les 151 cartes à partir de la seule liste (sprite déduit de l'id) : plus aucun fetch détail.
async function printPokemon() {
    const list = await getPokedexList()
    const html = list.map(({ id, name }) => `
        <div class="card">
            <img loading="lazy" src="${spriteUrl(id)}" alt="${name}">
            <span>${id}</span>
            <h3>${name}</h3>
        </div>
    `).join('')
    document.getElementById('pokemonCard').innerHTML = html
}

// Lazy-loading : le pokédex n'est chargé qu'au premier clic (au lieu de 152 requêtes au chargement de la page).
let pokedexLoaded = false
document.querySelector('.btnPokedexAll').addEventListener('click', () => {
    if (!pokedexLoaded) {
        printPokemon()
        pokedexLoaded = true
    }
    document.querySelector('#pokemonCard').classList.toggle('show')
})

document.querySelector('.btprintrandompokeonwindow').addEventListener('click', summonPokemon)
