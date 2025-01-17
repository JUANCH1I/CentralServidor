import React, { useState, useCallback } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Power, PowerOff } from "lucide-react"
import { useNavigate } from 'react-router-dom';  // Asegúrate de importar esto

const API_URL = 'http://localhost:5000/control-relay'

interface RelayControlProps {
  ip: string
}

interface RelayState {
  id: number
  name: string
  state: boolean
}

export default function RelayControl({ ip }: RelayControlProps) {
  const navigate = useNavigate();  // Hook para redirigir
  const [relays, setRelays] = useState<RelayState[]>([
    { id: 0, name: 'Relé 1', state: true },
    { id: 1, name: 'Relé 2', state: true },
  ])
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const controlRelay = useCallback(async (relay: number, state: number) => {
    const token = localStorage.getItem('token'); // Obtener el token JWT

    if (!token) {
      setStatus('Error: No autenticado');
      navigate('/login');  // Redirigir al login si no hay token
      return;
    }

    setLoading(true);
    setStatus('Procesando...');
    
    try {
      await axios.post(API_URL, 
        { ip, relay, state },
        {
          headers: {
            Authorization: `Bearer ${token}`  // Enviar el token JWT en los encabezados
          }
        }
      );
      setRelays(prevRelays => 
        prevRelays.map(r => 
          r.id === relay ? { ...r, state: state === 1 } : r
        )
      );
      setStatus(`Relé ${relay + 1}: ${state === 1 ? 'Apagado' : 'Encendido'}`);
    } catch (error: unknown) {  // Cambiado a "unknown" para manejar el error de TS
      if (axios.isAxiosError(error)) {
        console.error('Error al controlar el relé:', error);
        setStatus(`Error: ${error.response?.data?.error ?? 'Desconocido'}`);
        
        if (error.response?.status === 401) {
          console.log('Token no válido o expirado');
          localStorage.removeItem('token');  // Limpiar el token
          navigate('/login');  // Redirigir al login
        }
      } else {
        console.error('Error desconocido:', error);
        setStatus('Error: Desconocido');
      }
    } finally {
      setLoading(false);
    }
  }, [ip, navigate]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Control de Relés para {ip}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4">
          {relays.map((relay) => (
            <div key={relay.id} className="flex items-center justify-between p-2 border rounded">
              <span className="font-semibold">{relay.name}</span>
              <div className="space-x-2">
                <Button
                  onClick={() => controlRelay(relay.id, 1)}
                  disabled={loading || relay.state}
                  variant="outline"
                  size="sm"
                >
                  <PowerOff className="mr-2 h-4 w-4" />
                  Apagar
                </Button>
                <Button
                  onClick={() => controlRelay(relay.id, 0)}
                  disabled={loading || !relay.state}
                  variant="outline"
                  size="sm"
                >
                  <Power className="mr-2 h-4 w-4" />
                  Encender
                </Button>
              </div>
            </div>
          ))}
        </div>
        {status && (
          <Alert className="mt-4">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
