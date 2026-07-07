"use strict"

// Le serveur renvoie déjà les joueurs triés (pokédex décroissant) et le compte pré-calculé.
// Plus de re-tri, plus de .reverse(), plus de JSON.parse du blob complet, plus de crash sous 3 joueurs.
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
    .catch(() => {
        // le classement n'a pas pu être chargé : on n'affiche rien plutôt que de casser la page
    })
