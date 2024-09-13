import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

type Camera = {
  id: number;
  name: string;
  ip?: string;
  videoUrl?: string;
};

type CameraStreamProps = {
  camera: Camera;
};

interface LoadPlayerConfig {
  url: string;
  canvas: HTMLCanvasElement;
  audio?: boolean;
}

declare global {
  interface Window {
    loadPlayer: (config: LoadPlayerConfig) => void;
  }
}

export default function CameraStream({ camera }: CameraStreamProps) {
  const [scriptStatus, setScriptStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [streamStatus, setStreamStatus] = useState<'idle' | 'streaming' | 'error'>('idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLImageElement>(null); // Ref para el video feed de imagen
  
  const isVideoUrl = !!camera.videoUrl;

  useEffect(() => {
    if (isVideoUrl) {
      setScriptStatus('loaded');
      return;
    }

    const SCRIPT_URL = `http://${camera.ip}:3000/js/index.js`;
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => setScriptStatus('loaded');
    script.onerror = () => setScriptStatus('error');
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [camera.ip, isVideoUrl]);

  const startPlayer = useCallback(() => {
    if (isVideoUrl) {
      setStreamStatus('streaming');
      return;
    }

    if (window.loadPlayer && streamStatus === 'idle' && canvasRef.current) {
      const WEBSOCKET_URL = `ws://${camera.ip}:3000/api/stream`;
      const config: LoadPlayerConfig = {
        url: WEBSOCKET_URL,
        canvas: canvasRef.current,
        audio: true,
      };
      window.loadPlayer(config);
      setStreamStatus('streaming');

      const ws = new WebSocket(WEBSOCKET_URL);
      ws.onerror = (error) => {
        console.error('Error en WebSocket:', error);
        setStreamStatus('error');
      };
    }
  }, [streamStatus, camera.ip, isVideoUrl]);

  // Función para recargar el video feed
  const reloadVideoFeed = useCallback(() => {
    const videoFeed = document.getElementById('video_feed') as HTMLImageElement | null;
    if (videoFeed) {
      const src = videoFeed.src;
      videoFeed.src = '';  // Limpiar el src para detener la transmisión
      setTimeout(() => {
        videoFeed.src = src;  // Restablecer el src para reiniciar la transmisión
      }, 1000);  // Esperar 1 segundo antes de reiniciar la transmisión
    }
  }, []);
  
  
  

  // Solo reiniciar el video feed si es una URL de video
  useEffect(() => {
    if (isVideoUrl) {
      const interval = setInterval(reloadVideoFeed, 300000); // Recargar cada 5 minutos (300000 ms)
      return () => clearInterval(interval);  // Limpiar el intervalo cuando el componente se desmonte
    }
  }, [isVideoUrl, reloadVideoFeed]);

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center space-y-4">
        {isVideoUrl ? (
          <img 
            ref={videoRef}
            src={camera.videoUrl} 
            alt={`Stream from ${camera.name}`} 
            className="w-full h-auto rounded-lg"
          />
        ) : (
          <canvas ref={canvasRef} width="640" height="480" className="rounded-lg"></canvas>
        )}
        {scriptStatus === 'loading' && !isVideoUrl && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Loading camera script...</AlertDescription>
          </Alert>
        )}
        {scriptStatus === 'error' && !isVideoUrl && (
          <Alert variant="destructive">
            <AlertDescription>Failed to load camera script. Please refresh the page.</AlertDescription>
          </Alert>
        )}
        {streamStatus === 'error' && !isVideoUrl && (
          <Alert variant="destructive">
            <AlertDescription>Error connecting to the camera stream. Please try again.</AlertDescription>
          </Alert>
        )}
        {!isVideoUrl && (
          <Button 
            onClick={startPlayer}
            disabled={scriptStatus !== 'loaded' || streamStatus !== 'idle'}
          >
            {streamStatus === 'streaming' ? 'Streaming...' : 'Start Stream'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
