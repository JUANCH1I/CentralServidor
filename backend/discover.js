const onvif = require('onvif')

// Dirección MAC objetivo
const targetMacAddress = 'c0:39:5a:f5:74:a3'

// Inicializa el descubrimiento de dispositivos ONVIF
onvif.Discovery.probe((err, devices) => {
  if (err) {
    console.error('Error al descubrir dispositivos:', err)
    return
  }

  if (devices.length === 0) {
    console.log('No se encontraron dispositivos ONVIF.')
    return
  }

  // Itera sobre los dispositivos descubiertos
  devices.forEach((device, index) => {
    // Verifica si xaddrs[0] es un objeto o una cadena, y extrae la dirección IP
    let deviceServiceUrl = device.xaddrs[0]
    if (typeof deviceServiceUrl === 'object' && deviceServiceUrl.href) {
      deviceServiceUrl = deviceServiceUrl.href
    }

    const ipAddress = deviceServiceUrl.split('/')[2] // Extraer la IP del xaddrs

    // Crear un nuevo objeto de dispositivo ONVIF
    const cam = new onvif.Cam(
      {
        hostname: ipAddress, // Usa la IP extraída
        username: 'admin', // Reemplaza con el usuario correcto
        password: 'Manfre2010', // Reemplaza con la contraseña correcta
        port: 80, // Por defecto, ONVIF usa el puerto 80
      },
      function (err) {
        if (err) {
          console.error('Error al conectar con la cámara:', err)
          return
        }

        // Obtener la información de la red, que incluye la dirección MAC
        cam.getNetworkInterfaces((err, networkInterfaces) => {
          if (err) {
            console.error('Error al obtener la información de red:', err)
            return
          }

          // Verificar si alguna interfaz coincide con la dirección MAC objetivo
          networkInterfaces.forEach((iface) => {
            if (
              iface.info &&
              iface.info.hwAddress &&
              iface.info.hwAddress.toLowerCase() ===
                targetMacAddress.toLowerCase()
            ) {
              console.log(
                '¡Cámara encontrada con la dirección MAC:',
                iface.info.hwAddress
              )
              console.log('IP de la cámara:', ipAddress)

              // Aquí puedes detener la búsqueda si ya encontraste la cámara que necesitas
              // Si solo quieres la IP, puedes salir de la función o agregar un return
            }
          })
        })
      }
    )
  })
})
