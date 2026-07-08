"use strict"

fetch('/api/leaderboard')
    .then(resp => resp.json())
    .then(({ records }) => {
        records.forEach((record, index) => {
            const userEl = document.createElement('li')

            const indexEl = document.createElement('span')
            indexEl.textContent = index + 1

            const username = document.createElement('span')
            username.textContent = record.fields.username

            const numberPkdx = document.createElement('span')
            numberPkdx.textContent = record.fields.pokedexCount

            userEl.appendChild(indexEl)
            userEl.appendChild(username)
            userEl.appendChild(numberPkdx)
            leaderboard.appendChild(userEl)
        })
    })
    .catch(() => {})
