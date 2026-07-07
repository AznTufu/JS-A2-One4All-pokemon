class Player {
	constructor(data) {
		this.id = data.id
		this.createdTime = data.createdTime
		this.token = data.token || localStorage.getItem('token') || ''
		this.fields = {}
		this.fields.username = data.fields.username
		this.fields.data = typeof data.fields.data === 'string' ? JSON.parse(data.fields.data) : data.fields.data
	}

	setup() {
		this.updatePc()
	}

	fixFields() {
		this.fields.data = JSON.parse(this.fields.data)
	}

	store(){
		localStorage.setItem('user', JSON.stringify({
			id: this.id,
			createdTime: this.createdTime,
			token: this.token,
			fields: {
				username: this.fields.username,
				data: this.fields.data = JSON.stringify(this.fields.data)
			},
		}))
	}

	async updateUser() {
		let response = await fetch('/api/me', {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${this.token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				data: this.fields.data
			})
		})
		let data = await response.json()

		this.token = data.token || this.token
		this.fields.data = JSON.parse(data.user.fields.data)
		this.store()
	}

	async refresh() {
		let response = await fetch('/api/me', {
			headers: { 'Authorization': `Bearer ${this.token}` }
		})
		if (!response.ok) throw new Error('unauthorized')
		let data = await response.json()
		this.token = data.token || this.token
		this.fields.data = JSON.parse(data.user.fields.data)
		this.store()
	}

	async addToPc(pkmData) {
		this.fields.data.pokemons.pc.push(pkmData.id.toString())

		if(!this.fields.data.pokemons.pokedex.find(pkm => pkm.id === pkmData.id.toString())) {
			this.fields.data.pokemons.pokedex.push({id:pkmData.id.toString(),name:pkmData.name,url:pkmData.sprites.front_default})
		}

		await this.updateUser()
		this.fixFields()
		this.updatePc()
		this.updatePokedex()
	}

	async sell(pcIndex) {
		this.fields.data.pokemons.pc.splice(pcIndex, 1)
		this.fields.data.balance += 100
		await this.updateUser()
		this.fixFields()
		this.updatePc()
	}

	updatePc() {
		while(pc.firstElementChild) pc.firstElementChild.remove()
		this.fields.data.pokemons.pc.forEach((pokemon, index) => {
			let pokemonEl = document.createElement('img')
			pokemonEl.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon}.png`
			pokemonEl.alt = `Vendre le Pokémon n°${pokemon} (100 pièces)`

			pokemonEl.addEventListener('click', async () => {
				await this.sell(index)
			})
			pc.appendChild(pokemonEl)
		})

	}

	updatePokedex() {
		while(pokedex.firstElementChild) pokedex.firstElementChild.remove()
		this.fields.data.pokemons.pokedex.sort((a, b) => parseInt(a.id) - parseInt(b.id))
		this.fields.data.pokemons.pokedex.forEach(pkm => {
			let li = document.createElement('li')

			let id = document.createElement('span')
			id.textContent = pkm.id

			let name = document.createElement('span')
			name.textContent = pkm.name

			let pp = document.createElement('img')
			pp.src = pkm.url
			pp.alt = ''
			pp.height = 48

			li.appendChild(id)
			li.appendChild(name)
			li.appendChild(pp)

			pokedex.appendChild(li)
		})
	}
}
