// src/login.tsx
import React, { useContext, useState } from 'react';
import axios from './api/axios'; // Ajusta la ruta según tu estructura de carpetas
import { AuthContext } from './context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Login: React.FC = () => {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post('/login', { username, password });
      const { token } = response.data;

      if (token) {
        // Llamar a la función login del contexto para manejar la autenticación
        login(token);
      } else {
        setError('No se recibió un token válido del servidor.');
      }
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError('Nombre de usuario o contraseña incorrectos.');
      } else {
        setError('Error al iniciar sesión. Por favor, intenta de nuevo más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen">
      {/* Columna izquierda: Login */}
      <div className="flex items-center justify-center w-1/2 bg-gray-900">
        <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-semibold text-center text-white mb-6">Iniciar Sesión</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="username" className="block text-gray-300 font-medium mb-2">
                Usuario
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-gray-300 font-medium mb-2">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </div>
      </div>

      {/* Columna derecha: Imagen */}
      <div className="w-1/2 hidden md:block">
        <img
          src="/assets/loginImg.png" // Asegúrate de que esta ruta sea correcta
          alt="Imagen de fondo"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default Login;
