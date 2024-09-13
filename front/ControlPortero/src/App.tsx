import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import RelayControl from './components/RelayControl'
import CameraStream from './components/CameraStream'
import Notifications from './components/Notifications'
import ObservationLog from './components/ObservationLog'
import Login from './login'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CameraIcon, BellIcon, EyeIcon, ArrowLeftIcon, MenuIcon } from 'lucide-react'

type Camera = {
  id: number
  name: string
  ip?: string
  videoUrl?: string
}

type Emergency = {
  id: string
  message: string
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [emergency, setEmergency] = useState<Emergency | null>(null)
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null)
  const [observation, setObservation] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setIsAuthenticated(false)
      navigate('/login')
    } else {
      setIsAuthenticated(true)
    }
  }, [navigate])

  const handleEmergencyClose = useCallback(() => {
    if (emergency) {
      const closedEmergencies = JSON.parse(localStorage.getItem('closedEmergencies') || '[]')
      closedEmergencies.push(emergency.id)
      localStorage.setItem('closedEmergencies', JSON.stringify(closedEmergencies))
      setEmergency(null)
    }
  }, [emergency])

  useEffect(() => {
    const eventSource = new EventSource('http://192.168.10.23:5000/notifications')

    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data)

      if (notification.alert_type === 'emergency') {
        const closedEmergencies = JSON.parse(localStorage.getItem('closedEmergencies') || '[]')
        if (!closedEmergencies.includes(notification.id)) {
          setEmergency({ id: notification.id, message: notification.message })
        }
      }
    }

    return () => {
      eventSource.close()
    }
  }, [])

  const cameras: Camera[] = [
    { ip: '192.168.191.190', name: 'Camera 1', id: 1 },
    { videoUrl: 'http://192.168.191.209:5000/video_feed', name: 'Camera 2', id: 2 },
  ]

  const handleSaveObservation = () => {
    console.log('Observation saved:', observation)
    setObservation('')
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {emergency && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 z-50 flex justify-between items-center">
          <span>{emergency.message}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleEmergencyClose}
            className="text-white hover:bg-red-700"
          >
            Close
          </Button>
        </div>
      )}

      {/* Left Sidebar */}
      <aside className="w-64 bg-gray-800 p-4">
        <h2 className="text-xl font-bold mb-4">Menu</h2>
        <nav>
          <Button variant="ghost" className="w-full justify-start mb-2">
            <CameraIcon className="mr-2 h-4 w-4" /> Cameras
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <BellIcon className="mr-2 h-4 w-4" /> Notifications
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">Security Dashboard</h1>
        
        {!selectedCamera ? (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {cameras.map((camera) => (
              <Card key={camera.id} className="bg-gray-800">
                <CardHeader className="p-2">
                  <CardTitle className="text-sm">{camera.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 relative">
                  <CameraStream camera={camera} />
                  <Button 
                    className="absolute bottom-2 right-2" 
                    size="sm"
                    onClick={() => setSelectedCamera(camera)}
                  >
                    <EyeIcon className="mr-2 h-4 w-4" /> Full View
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-gray-800 mb-4">
            <CardHeader className="flex flex-row items-center justify-between p-2">
              <CardTitle className="text-lg">{selectedCamera.name} - Full View</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCamera(null)}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to All Cameras
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <CameraStream camera={selectedCamera} />
              <div className="mt-4">
                <RelayControl ip={selectedCamera.ip || new URL(selectedCamera.videoUrl || '').hostname} />
              </div>
            </CardContent>
          </Card>
        )}

        <ObservationLog />
      </main>

      {/* Right Sidebar */}
      <aside className="w-64 bg-gray-800 p-4">
        <h2 className="text-xl font-bold mb-4">Notifications</h2>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <Notifications />
        </ScrollArea>
      </aside>
    </div>
  )
}