import React from 'react'

function Notification({ data }) {
  const { message, image } = data

  console.log('Message:', message) // Añade esto para depuración
  console.log('Image:', image) // Añade esto para depuración

  return (
    <div>
      <p>{message || 'Sin mensaje disponible'}</p>{' '}
      {/* Esto mostrará un mensaje alternativo si `message` es undefined */}
      {image ? (
        <img
          src={`http://localhost:5000/uploads/${image}`}
          alt='Notification'
          style={{
            width: '100%',
            marginTop: '10px',
            borderRadius: '8px',
          }}
        />
      ) : (
        <p>Imagen no disponible</p> // Mostrar un texto alternativo si `image` es undefined
      )}
    </div>
  )
}

export default Notification
