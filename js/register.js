"use strict"

if(!(localStorage.getItem('token') && localStorage.getItem('user'))) document.querySelector('.log-bg').style.display = "grid"
else {
    player = new Player(JSON.parse(localStorage.getItem('user')))
    player.refresh()
    .then(() => {
        player.fixFields()
        player.updatePokedex()
        player.updatePc()
    })
    .catch(() => {
        document.querySelector('.log-bg').style.display = "grid"
    })
}

function handleAuthSuccess(resp, successMessage, errorSelector) {
    localStorage.setItem('token', resp.token)
    player = new Player({ ...resp.user, token: resp.token })
    player.store()
    player.fixFields()
    player.setup()
    player.updatePokedex()

    document.querySelector(errorSelector).textContent = successMessage
    setTimeout(() => {
        document.querySelector('.log-bg').style.display = "none"
    }, 1000)
}

document.querySelector('.logs .register #register__register').addEventListener('click', () => {
    let username = document.querySelector('#register__username').value
    let password = document.querySelector('#register__password').value

    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(async resp => {
        if (!resp.ok) {
            const error = await resp.json().catch(() => ({}))
            throw error
        }
        return resp.json()
    })
    .then(resp => handleAuthSuccess(resp, "Compte créé", '.logs .register .error'))
    .catch(() => {
        document.querySelector('.logs .register .error').textContent = "Ce compte existe déjà"
    })
})

document.querySelector('.logs .login #login__login').addEventListener('click', () => {
    let username = document.querySelector('#login__username').value
    let password = document.querySelector('#login__password').value

    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(async resp => {
        if (!resp.ok) {
            throw await resp.json().catch(() => ({}))
        }
        return resp.json()
    })
    .then(resp => handleAuthSuccess(resp, "Connecté", '.logs .login .error'))
    .catch(() => {
        document.querySelector('.logs .login .error').textContent = "Identifiant ou mot de passe inconnu"
    })
})
