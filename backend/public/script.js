const apiUrl = 'http://localhost:5000'

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form')
  const relayForm = document.getElementById('relay-form')
  const loginSection = document.getElementById('login-section')
  const cameraGridSection = document.getElementById('camera-grid-section')
  const cameraDetailSection = document.getElementById('camera-detail-section')
  const notificationsSection = document.getElementById('notifications-section')
  const backToGridButton = document.getElementById('back-to-grid')
  const modal = document.getElementById('notification-modal')
  const closeModal = document.getElementsByClassName('close')[0]

  loginForm.addEventListener('submit', handleLogin)
  relayForm.addEventListener('submit', handleRelayControl)
  backToGridButton.addEventListener('click', showCameraGrid)
  closeModal.addEventListener('click', () => (modal.style.display = 'none'))
  window.addEventListener('click', (event) => {
    if (event.target == modal) {
      modal.style.display = 'none'
    }
  })

  if (localStorage.getItem('jwt')) {
    showLoggedInState()
    getCameras()
    getNotifications()
  }
})

function handleLogin(event) {
  event.preventDefault()
  const username = document.getElementById('username').value
  const password = document.getElementById('password').value

  fetch(`${apiUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.token) {
        localStorage.setItem('jwt', data.token)
        showLoggedInState()
        getCameras()
        getNotifications()
      } else {
        showMessage('login-message', data.msg, 'error')
      }
    })
    .catch((error) => {
      console.error('Error:', error)
      showMessage('login-message', 'Error al iniciar sesión', 'error')
    })
}

function handleRelayControl(event) {
  event.preventDefault()
  const ip = document.getElementById('relay-ip').value
  const relay = document.getElementById('relay-number').value
  const state = document.getElementById('relay-state').value

  const token = localStorage.getItem('jwt')

  fetch(`${apiUrl}/control-relay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ip, relay, state }),
  })
    .then((response) => response.json())
    .then((data) => {
      showMessage(
        'relay-message',
        data.message || data.error,
        data.message ? 'success' : 'error'
      )
    })
    .catch((error) => {
      console.error('Error:', error)
      showMessage('relay-message', 'Error al controlar el relé', 'error')
    })
}

function getCameras() {
  const token = localStorage.getItem('jwt')

  fetch(`${apiUrl}/cameras`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((response) => response.json())
    .then((cameras) => {
      const cameraGrid = document.getElementById('camera-grid')
      cameraGrid.innerHTML = ''

      cameras.forEach((camera) => {
        const cameraItem = document.createElement('div')
        cameraItem.className = 'camera-item'
        cameraItem.innerHTML = `
          <h3>${camera.name}</h3>
          <iframe src="${camera.ip}" allow="camera;microphone" title="${camera.name}"></iframe>
        `
        cameraItem.addEventListener('click', () => showCameraDetail(camera))
        cameraGrid.appendChild(cameraItem)
      })
    })
    .catch((error) => {
      console.error('Error:', error)
      showMessage('camera-message', 'Error al obtener las cámaras', 'error')
    })
}

function showCameraDetail(camera) {
  document.getElementById('camera-grid-section').classList.add('hidden')
  document.getElementById('camera-detail-section').classList.remove('hidden')
  document.getElementById('camera-name').textContent = camera.name
  document.getElementById('camera-feed').innerHTML = `
    <iframe src="${camera.ip}" allow="camera;microphone" title="${camera.name}"></iframe>
  `
  document.getElementById('relay-ip').value = camera.ip
}

function showCameraGrid() {
  document.getElementById('camera-detail-section').classList.add('hidden')
  document.getElementById('camera-grid-section').classList.remove('hidden')
}

function getNotifications() {
  const token = localStorage.getItem('jwt')

  fetch(`${apiUrl}/notifications`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((response) => response.json())
    .then((notifications) => {
      const notificationsList = document.getElementById('notifications-list')
      notificationsList.innerHTML = ''

      notifications.forEach((notification) => {
        const notificationItem = document.createElement('div')
        notificationItem.className = `notification-item ${notification.alert_type}`
        notificationItem.innerHTML = `
        <h3>${notification.name}</h3>
        <p class="time">${notification.time}</p>
        <p>${notification.message}</p>
        <p class="location">${notification.location}</p>
      `
        notificationItem.addEventListener('click', () =>
          showNotificationDetails(notification)
        )
        notificationsList.appendChild(notificationItem)
      })
    })
    .catch((error) => {
      console.error('Error:', error)
      showMessage(
        'notifications-message',
        'Error al obtener las notificaciones',
        'error'
      )
    })
}

function showNotificationDetails(notification) {
  const modal = document.getElementById('notification-modal')
  document.getElementById('modal-title').textContent = notification.name
  document.getElementById('modal-time').textContent = notification.time
  document.getElementById('modal-message').textContent = notification.message
  document.getElementById('modal-location').textContent = notification.location

  const modalImage = document.getElementById('modal-image')
  if (notification.image) {
    modalImage.src = `${apiUrl}/uploads/${notification.image.split('\\').pop()}`
    modalImage.style.display = 'block'
  } else {
    modalImage.style.display = 'none'
  }

  modal.style.display = 'block'
}

function showLoggedInState() {
  document.getElementById('login-section').classList.add('hidden')

  document.getElementById('camera-grid-section').classList.remove('hidden')
  document.getElementById('notifications-section').classList.remove('hidden')
}

function showMessage(elementId, message, type) {
  const messageElement = document.getElementById(elementId)
  messageElement.textContent = message
  messageElement.className = `message ${type}`
}

// Actualizar notificaciones cada 30 segundos
setInterval(getNotifications, 30000)
