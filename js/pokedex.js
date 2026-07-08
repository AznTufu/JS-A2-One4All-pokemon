"use strict"

const POKEDEX_LIMIT = 151
const POKEDEX_LIST_URL = `https://pokeapi.co/api/v2/pokemon?limit=${POKEDEX_LIMIT}`
const POKEDEX_CACHE_KEY = 'pokedex_gen1_v1'
const spriteUrl = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

async function getPokedexList() {
    const cached = localStorage.getItem(POKEDEX_CACHE_KEY)
    if (cached) return JSON.parse(cached)

    const response = await fetch(POKEDEX_LIST_URL)
    const data = await response.json()
    const list = data.results.map((p) => {
        const id = p.url.split('/')[6]
        return { id, name: p.name }
    })
    localStorage.setItem(POKEDEX_CACHE_KEY, JSON.stringify(list))
    return list
}

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

let pokedexLoaded = false
document.querySelector('.btnPokedexAll').addEventListener('click', () => {
    if (!pokedexLoaded) {
        printPokemon()
        pokedexLoaded = true
    }
    document.querySelector('#pokemonCard').classList.toggle('show')
})

document.querySelector('.btprintrandompokeonwindow').addEventListener('click', summonPokemon)
