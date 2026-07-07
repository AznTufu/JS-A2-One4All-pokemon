"use strict"

if(!(localStorage.getItem('token') && localStorage.getItem('user'))) document.querySelector('.log-bg').style.display = "grid"
else {
    player = new Player(JSON.parse(localStorage.getItem('user')))
    player.updateUser()
    .then(resp => {
        player.fixFields()
        player.updatePokedex()
        player.updatePc()
        console.log(player.fields.data.upgrade.balls)
    })
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
    .then(resp => {
        localStorage.setItem('token', resp.token)
        player = new Player({ ...resp.user, token: resp.token })
        player.store()
        player = new Player(JSON.parse(localStorage.getItem('user')))
        player.setup()

        document.querySelector('.logs .register .error').textContent = "user created"
        setTimeout(() => {
            document.querySelector('.log-bg').style.display = "none"
        }, 1000)
    })
    .catch(() => {
        document.querySelector('.logs .register .error').textContent = "user already exist"
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
    .then(resp => {
        localStorage.setItem('token', resp.token)
        player = new Player({ ...resp.user, token: resp.token })
        player.store()
        player = new Player(JSON.parse(localStorage.getItem('user')))
        player.setup()

        document.querySelector('.logs .login .error').textContent = "Connected"
        setTimeout(() => {
            document.querySelector('.log-bg').style.display = "none"
        }, 1000)
    })
    .catch(() => {
        document.querySelector('.logs .login .error').textContent = "Unknow user or password"
    })
})