const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const multer = require('multer')
const axios = require('axios')
const cors = require('cors')
const bodyParser = require('body-parser')
const { Pool } = require('pg')
const schedule = require('node-schedule')

const app = express()
const PORT = 5000
const JWT_SECRET_KEY = '8afa8ee4-9f4d-4b72-97f2-e535348ad44a'

// Configurar middlewares
app.use(cors())
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Configurar base de datos
const pool = new Pool({
  host: 'localhost',
  port: 5430,
  database: 'postgres',
  user: 'postgres',
  password: '',
})

// Usuarios
const users = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('password123', 10) },
]

// Configuración de Multer para manejar la subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Carpeta donde se guardarán las imágenes
  },
  filename: function (req, file, cb) {
    const visitorId = uuidv4()
    const ext = path.extname(file.originalname)
    cb(null, `${visitorId}${ext}`)
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limitar el tamaño a 5MB
})

// Función para guardar logs en la base de datos
async function saveLogToDb(timestamp, logLevel, usuario, accion) {
  const client = await pool.connect()
  try {
    await client.query(
      'INSERT INTO logs (timestamp, log_level, usuario, accion) VALUES ($1, $2, $3, $4)',
      [timestamp, logLevel, usuario, accion]
    )
  } catch (err) {
    console.error('Error al guardar el log en la base de datos:', err)
  } finally {
    client.release()
  }
}

// Leer el archivo de logs y subir a la base de datos cada 60 minutos
schedule.scheduleJob('0 * * * *', async () => {
  try {
    const logs = fs.readFileSync('system_log.log', 'utf-8').split('\n')
    for (const log of logs) {
      const logParts = log.split(' - ')
      if (logParts.length < 4) continue
      const [timestamp, logLevel, usuario, accion] = logParts
      await saveLogToDb(
        timestamp.replace(',', '.'),
        logLevel.trim(),
        usuario.trim(),
        accion.trim()
      )
    }
    fs.writeFileSync('system_log.log', '')
    console.info('Logs procesados y subidos a la base de datos correctamente.')
  } catch (err) {
    console.error('Error al procesar el archivo de logs:', err)
  }
})

// Ruta para login
app.post('/login', (req, res) => {
  const { username, password } = req.body
  const user = users.find((u) => u.username === username)

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id }, JWT_SECRET_KEY, { expiresIn: '1h' })
    console.info(`Usuario ${username} ha iniciado sesión correctamente.`)
    res.status(200).json({ token })
  } else {
    console.warn(
      `Intento fallido de inicio de sesión para el usuario ${username}.`
    )
    res.status(401).json({ msg: 'Nombre de usuario o contraseña incorrectos' })
  }
})

// Ruta para controlar el relé
app.post('/control-relay', async (req, res) => {
  const { ip, relay, state } = req.body

  if (!ip || relay == null || state == null) {
    return res.status(400).json({ error: 'Faltan parametros' })
  }

  try {
    const response = await axios.post(`http://${ip}:3000/control-relay`, {
      relay,
      state,
    })
    console.info(
      `Respuesta del servidor de relés: ${response.status} ${response.data}`
    )
    res
      .status(response.status)
      .json({ status: 'success', message: response.data })
  } catch (err) {
    console.error('Error al enviar solicitud al servidor de relés:', err)
    res.status(500).json({
      error: 'Error al enviar solicitud al servidor de relés',
      details: err.message,
    })
  }
})

// Ruta para guardar logs
app.post('/logs', (req, res) => {
  const { observation } = req.body
  const userId = req.user?.id

  if (!observation) {
    console.warn(`Usuario ${userId} intentó guardar una observación vacía.`)
    return res.status(400).json({ error: 'La observación está vacía' })
  }

  const timestamp = new Date().toISOString()
  saveLogToDb(
    timestamp,
    'INFO',
    userId,
    `Registró la observación: ${observation}`
  )
  console.info(`Usuario ${userId} registró la observación: ${observation}`)
  res.status(200).json({ status: 'success' })
})

app.get('/notifications', (req, res) => {
  try {
    const notificationsPath = path.join(__dirname, 'notifications.json')
    if (fs.existsSync(notificationsPath)) {
      const notifications = JSON.parse(
        fs.readFileSync(notificationsPath, 'utf-8')
      )
      // Modificar las rutas de las imágenes para que sean URLs relativas
      const modifiedNotifications = notifications.map((notification) => ({
        ...notification,
        image: notification.image,
      }))

      res.json(modifiedNotifications)
    } else {
      res.json([])
    }
  } catch (error) {
    console.error('Error al leer las notificaciones:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// Ruta para manejar la notificación
app.post('/notify', upload.single('image'), (req, res) => {
  try {
    const data = req.body
    const visitorId = uuidv4()

    let imagePath = null
    if (req.file) {
      imagePath = path.join(__dirname, 'uploads', req.file.filename)
    }

    const newNotification = {
      id: visitorId,
      name: data.name,
      time: data.time,
      message: data.message,
      location: data.location,
      image: imagePath,
      alert_type: data.alert_type || 'info',
    }

    appendToJsonFile('notifications.json', newNotification)

    console.log('Notificación recibida:', newNotification)

    res.status(200).json({ status: 'success', id: visitorId })
  } catch (error) {
    console.error('Error al procesar la notificación:', error)
    res
      .status(500)
      .json({ status: 'error', message: 'Error interno del servidor' })
  }
})

app.get('/cameras', async (req, res) => {
  const cameras = [
    {
      id: 1,
      name: 'Camera 1',
      ip: 'http://192.168.10.13:3000',
    },
  ]
  res.json(cameras)
})

// Función para agregar datos al archivo JSON
function appendToJsonFile(filePath, data) {
  try {
    const existingData =
      fs.existsSync(filePath) && fs.statSync(filePath).size !== 0
        ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        : []
    existingData.push(data)
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 4))
  } catch (err) {
    console.error('Error al procesar el archivo JSON:', err)
  }
}

// Manejo de errores de Multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Errores de Multer
    return res.status(400).json({ status: 'error', message: err.message })
  } else if (err) {
    // Otros errores
    return res.status(400).json({ status: 'error', message: err.message })
  }
  next()
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
