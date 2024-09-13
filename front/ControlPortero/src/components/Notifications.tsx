import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import './Notifications.css';

const API_URL = 'http://192.168.10.23:5000';

interface Notification {
  id: string;
  message: string;
  alert_type: 'warning' | 'emergency' | 'info';
  image?: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shownNotifications = useRef(new Set<string>(JSON.parse(localStorage.getItem('shownNotifications') || '[]')));

  const handleNewNotification = useCallback((newNotification: Notification) => {
    if (newNotification.image) {
      newNotification.image = newNotification.image.replace(/\\/g, '/');
    }

    if (!shownNotifications.current.has(newNotification.id)) {
      shownNotifications.current.add(newNotification.id);
      localStorage.setItem('shownNotifications', JSON.stringify(Array.from(shownNotifications.current)));

      setNotifications(prev => [newNotification, ...prev]);

      switch (newNotification.alert_type) {
        case 'warning':
          toast.warn(
            <div>
              <strong>{newNotification.message || 'Nueva notificación'}</strong>
              {newNotification.image && (
                <img
                  src={`${API_URL}/${newNotification.image}`}
                  alt="Notificación"
                  className="w-full mt-2 rounded-md"
                />
              )}
            </div>,
            { autoClose: 5000 }
          );
          break;
        case 'emergency':
          toast.error(
            <div>
              <strong>{newNotification.message || 'Nueva notificación'}</strong>
              {newNotification.image && (
                <img
                  src={`${API_URL}/${newNotification.image}`}
                  alt="Notificación"
                  className="w-full mt-2 rounded-md"
                />
              )}
            </div>,
            { autoClose: 5000 }
          );
          break;
        case 'info':
        default:
          toast.info(
            <div>
              <strong>{newNotification.message || 'Nueva notificación'}</strong>
              {newNotification.image && (
                <img
                  src={`${API_URL}/${newNotification.image}`}
                  alt="Notificación"
                  className="w-full mt-2 rounded-md"
                />
              )}
            </div>,
            { autoClose: 5000 }
          );
          break;
      }
    }
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(`${API_URL}/notifications`);

    eventSource.onmessage = (event) => {
      try {
        const newNotification = JSON.parse(event.data);
        handleNewNotification(newNotification);
      } catch (error) {
        console.error('Error al procesar la notificación:', error);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Error con SSE:', err);
      setError('No se pudieron cargar las notificaciones.');
      setLoading(false);
    };

    eventSource.onopen = () => {
      setLoading(false);
    };

    return () => {
      eventSource.close();
    };
  }, [handleNewNotification]);

  return (
    <Card className="w-full h-full overflow-hidden">
      <CardContent className="space-y-4 overflow-auto max-h-[calc(100vh-200px)]">
        <ToastContainer />
        {loading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <AlertDescription>Cargando notificaciones...</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {notifications.map((notification) => (
          <Card key={notification.id} className="mb-4">
            <CardContent className="">
              <p className="font-semibold">{notification.message}</p>
              {notification.image && (
                <img
                  src={`${API_URL}/${notification.image}`}
                  alt="Notificación"
                  className="w-full rounded-md"
                />
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
