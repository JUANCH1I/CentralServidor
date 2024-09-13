import React, { useState } from 'react';
import axios from 'axios';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const LOGS_URL = 'http://192.168.10.23:5000/logs'; // URL del endpoint para guardar logs

export default function ObservationLog() {
  const [observation, setObservation] = useState<string>('');  // Campo de entrada
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');  // Obtener el token JWT
    
    if (!token) {
      setStatus('Error: No autenticado');
      return;
    }

    if (!observation.trim()) {
      setStatus('Error: La observación está vacía.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(LOGS_URL, 
        { observation }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus('Observación guardada correctamente.');
      setObservation('');  // Limpiar el campo después de guardar
    } catch (error) {
      setStatus('Error al guardar la observación.');
      console.error('Error al enviar la observación:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-4">
      <textarea
        value={observation}
        onChange={(e) => setObservation(e.target.value)}
        placeholder="Escribe alguna observación..."
        className="mt-4 p-2 border rounded w-full"
      />
      <Button 
        className="mt-2"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Guardar Observación'}
      </Button>
      {status && (
        <Alert className="mt-4">
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
