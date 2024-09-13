import React, { useState } from 'react';
import axios from 'axios';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://192.168.10.23:5000/login', { username, password });
      const { token } = response.data;

      // Guardar el token en localStorage o sessionStorage
      localStorage.setItem('token', token);

      // Llamar a onLoginSuccess para notificar que el login fue exitoso
      onLoginSuccess();
    } catch (err) {
      setError('Nombre de usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="flex h-screen w-screen">
      {/* Columna izquierda: Login */}
      <div className="flex items-center justify-center w-1/2 bg-gray-100">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Iniciar Sesión</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Usuario</label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Contraseña</label>
              <input
                type="password"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>

      {/* Columna derecha: Imagen */}
      <div className="w-1/2">
        <img
          src="/assets\loginImg.png" // Ruta hacia la imagen cargada
          alt="Imagen de fondo"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default Login;
