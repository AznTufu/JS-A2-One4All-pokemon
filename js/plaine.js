"use strict"

function getRandomInt(max) {
	return Math.floor(Math.random() * max)
}

function uuidv4() {
	return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	)
}

const wildSpriteUrl = (id, shiny) =>
	`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? 'shiny/' : ''}${id}.png`

async function summonPokemon() {
	let pokemon = document.createElement('div')
	pokemon.style.height = '96px'
	pokemon.style.width = '96px'
	let pokemonId = (getRandomInt(151) + 1).toString()

	// Nom récupéré depuis la liste en cache (getPokedexList, pokedex.js) : plus de fetch du JSON détail (~378 Ko parsés)
	const list = await getPokedexList()
	const entry = list.find(p => p.id === pokemonId) || { id: pokemonId, name: `pokemon-${pokemonId}` }
	const shiny = Math.random() > 0.8
	const pkmData = { id: entry.id, name: entry.name, sprites: { front_default: wildSpriteUrl(pokemonId, false) } }

	pokemon.style.background = `url('${wildSpriteUrl(pokemonId, shiny)}')`
	pokemon.classList = 'pokemon'
	pokemon.setAttribute('role', 'img')
	pokemon.setAttribute('aria-label', entry.name)
	pokemon.style.top = `${(getRandomInt(playground.clientHeight - 96) / playground.clientHeight) * 100}%`
	pokemon.style.left = `${(getRandomInt(playground.clientWidth - 96) / playground.clientWidth) * 100}%`

	pokemon.addEventListener("dragover", (event) => {
		// prevent default to allow drop
		event.preventDefault()
	}, false)

	pokemon.addEventListener('drop', (e) => {
		pokemon.appendChild(dragged)
		resultsQTE(ballDiff).then(resp => {
			if (resp) {
				player.addToPc(pkmData)
			}
			setTimeout(() => {
				reloadBall()
				document.querySelector(`#${dragId}`).remove()
				pokemon.remove()
				summonPokemon()
			}, 500)
		})
	})

	playground.appendChild(pokemon)
}

function reloadBall() {
	let ballsArray = []
	user.upgrade.balls.reverse().forEach(ball => {
		for (let i = 0; i < ball.lvl * 5; i++) ballsArray.push(ball)
	})

	let ballReturn = ballsArray[getRandomInt(99)]
	let ballEl = document.createElement('img')
	ballEl.classList = "ball"
	ballEl.src = ballReturn.sprite
	ballEl.alt = ballReturn.name
	ballEl.draggable = true
	ballEl.id = 'A' + uuidv4()

	ballEl.addEventListener("dragstart", (event) => {
		// store a ref. on the dragged elem
		dragged = event.target
		ballDiff = ballReturn.difficulty	// make it half transparent
		event.target.classList.add("dragging")
		dragId = ballEl.id
	})

	ballEl.addEventListener("dragend", (event) => {
		ballEl.style.top = 'auto'
	})

	playground.appendChild(ballEl)
}

const playground = document.querySelector('.playground')
const pc = document.querySelector('.captured__pokemons__ul')
const pokedex = document.querySelector('.pokedex__pokemons__ul')
const leaderboard = document.querySelector('.leaderboard__pokemons__ul')
let player
let dragId
let ballDiff
let user = {
	balance: 0,
	upgrade: {
		balls: [
			{
				name: "PokeBall",
				lvl: 20,
				basePrice: 0,
				sprite: '/assets/images/balls/PokeBall.png',
				difficulty : 3
			},
			{
				name: "SuperBall",
				lvl: 8,
				basePrice: 100,
				sprite: '/assets/images/balls/SuperBall.png',
				difficulty : 2
			},
			{
				name: "HyperBall",
				lvl: 6,
				basePrice: 1000,
				sprite: '/assets/images/balls/HyperBall.png',
				difficulty : 1
			},
		]
	},
	pokemons: []
}

document.querySelector('#playground__captured__toggle').checked = false
document.querySelector('#playground__pokedex__toggle').checked = false

reloadBall()

let dragged

// Pas d'invocation automatique au chargement (RGESN 4.1) : le joueur déclenche
// l'apparition via le bouton « Faire apparaitre un pokemon aléatoire ».


// QTE

async function generateQTE(difficulty) {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
	let result = ''

	let qte = document.createElement('div')
	qte.classList.add('qte')
	qte.tabIndex = 0

	for (let i = 0; i < 5; i++) {
		let letter = document.createElement('span')
		letter.classList.add('qte-letter')
		let currentLetter = characters.charAt(Math.floor(Math.random() * characters.length))

		letter.innerText = currentLetter
		qte.appendChild(letter)
		result += currentLetter
	}
	document.querySelector('body').appendChild(qte)

	let timer = 0
	let failsN = 0
	switch (difficulty) {
		case 1:
			timer = 5000
			failsN = 5
			break
		case 2:
			timer = 3500
			failsN = 2
			break
		case 3:
			timer = 2500
			break
	}

	const qteInDom = document.querySelector('.qte')
	const letters = document.querySelectorAll('.qte-letter')
	const previousFocus = document.activeElement
	let nLetter = 0
	let fails = 0
	let sLose = 0
	let sWin = 0
	const handleKeydown = (e) => {
		if (nLetter >= result.length || letters[nLetter].classList.contains('lose') || letters[nLetter].classList.contains('win')) {
			return
		}

		if (e.key.toLowerCase() === result[nLetter].toLowerCase()) {
			letters[nLetter].style.color = "#3c5aa6"
			letters[nLetter].classList.remove('wrong')
			nLetter++
		} else {
			letters[nLetter].classList.add('wrong')
			fails++
		}

		if (nLetter == result.length) {
			sWin = new Date().getTime() / 1000
			letters.forEach(l => {
				l.style.color = "rgb(14, 212, 14)"
			})
			document.removeEventListener('keydown', handleKeydown)

		} else if (fails - 1 == failsN) {
			letters[nLetter].classList.remove('wrong')
			letters.forEach(l => {
				l.classList.add("lose")
			})
			sLose = new Date().getTime() / 1000
			document.removeEventListener('keydown', handleKeydown)
		}
	}

	requestAnimationFrame(() => qteInDom.focus())
	document.addEventListener("keydown", handleKeydown)
	return new Promise(resolve => {
		setTimeout(() => {
			document.removeEventListener('keydown', handleKeydown)
			document.querySelector('.qte').remove()
			if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()
			resolve([new Date().getTime() / 1000, sLose, sWin])
		}, timer)
	})

}

async function resultsQTE(diff) {
	const cs = await generateQTE(diff)
	return !(cs[1] != 0 || cs[2] == 0 || cs[2] > cs[0])
}
