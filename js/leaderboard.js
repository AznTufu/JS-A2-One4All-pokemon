fetch('/api/leaderboard')
.then(resp => resp.json())
.then(resp => {
    console.log(resp.records)
    let users = []
    resp.records.forEach(record => {
        let user = {}
        console.log(record.fields.username)
        try {
            user.name = record.fields.username
            user.data = JSON.parse(record.fields.data)
            // let userEl = document.createElement('li')
            users.push(user)
            
        } catch(e) {
            console.log('ERRORRRRRRRRRRRRRRRRRRRRRRRRRR')
        }

        console.log(users)
    })
    console.log(users[0].data.pokemons.pokedex.length)
    console.log(users[1].data.pokemons.pokedex.length)
    console.log(users[2].data.pokemons.pokedex.length)

    console.log(users.sort((a, b) => a.data.pokemons.pokedex.length - b.data.pokemons.pokedex.length))
    console.log(users)

    users.reverse().forEach((user, index) => {
        let userEl = document.createElement('li')
        let indexEl = document.createElement('span')
        indexEl.textContent = index + 1
        let username = document.createElement('span')
        username.textContent = user.name
        let numberPkdx = document.createElement('span')
        numberPkdx.textContent = user.data.pokemons.pokedex.length

        userEl.appendChild(indexEl)
        userEl.appendChild(username)
        userEl.appendChild(numberPkdx)
        leaderboard.appendChild(userEl)
        
    })
})

