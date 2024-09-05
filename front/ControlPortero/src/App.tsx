import React, { useState, useEffect, useCallback } from 'react';
import RelayControl from './components/RelayControl';
import CameraStream from './components/CameraStream';
import Notifications from './components/Notifications';
import EmergencyBanner from './components/EmergencyBanner';
import Layout from '@/components/ui/layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Camera = {
  id: number;
  name: string;
  ip?: string;
  videoUrl?: string;
};

export default function App() {
  const [emergencyMessage, setEmergencyMessage] = useState<string | null>(null);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);

  const handleEmergencyClose = useCallback(() => {
    setIsBannerVisible(false);
    localStorage.setItem('lastClosedEmergencyId', emergencyId || '');
  }, [emergencyId]);

  useEffect(() => {
    const eventSource = new EventSource('http://192.168.10.23:5000/notifications');

    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);

      if (notification.alert_type === 'emergency') {
        const lastClosedEmergencyId = localStorage.getItem('lastClosedEmergencyId');
        if (notification.id !== lastClosedEmergencyId) {
          setEmergencyMessage(notification.message);
          setEmergencyId(notification.id);
          setIsBannerVisible(true);
        }
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (emergencyId) {
      const lastClosedEmergencyId = localStorage.getItem('lastClosedEmergencyId');
      if (emergencyId !== lastClosedEmergencyId) {
        setIsBannerVisible(true);
      }
    }
  }, [emergencyId]);

  const cameras: Camera[] = [
    { ip: '192.168.191.190', name: 'Camera 1', id: 1 },
    { videoUrl: 'http://192.168.191.209:5000/video_feed', name: 'Camera 2', id: 2 },
  ];

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{selectedCamera ? selectedCamera.name : 'All Cameras'}</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCamera ? (
                <div>
                  <CameraStream camera={selectedCamera} />
                  <div className="mt-4">
                    <RelayControl ip={selectedCamera.ip || new URL(selectedCamera.videoUrl || '').hostname} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {cameras.map((camera) => (
                    <div key={camera.id} className="relative">
                      <CameraStream camera={camera} />
                      <Button 
                        className="absolute bottom-2 right-2" 
                        onClick={() => setSelectedCamera(camera)}
                      >
                        Full View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <Notifications />
            </CardContent>
          </Card>
        </div>
      </div>
      {selectedCamera && (
        <Button className="mt-4" onClick={() => setSelectedCamera(null)}>
          Back to All Cameras
        </Button>
      )}
    </Layout>
  );
}