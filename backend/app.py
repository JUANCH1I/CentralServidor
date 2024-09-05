from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
import json
import os
import requests
import uuid
import time

app = Flask(__name__)
CORS(app)

VISITORS_FILE = 'visitors.json'
NOTIFICATIONS_FILE = 'notifications.json'
CAMERAS_FILE = 'cameras.json'
UPLOAD_FOLDER = 'uploads'



def append_to_json_file(file_path, data):
    try:
        if os.path.exists(file_path) and os.stat(file_path).st_size != 0:
            with open(file_path, 'r') as file:
                try:
                    existing_data = json.load(file)
                except json.JSONDecodeError:
                    existing_data = []
        else:
            existing_data = []

        existing_data.append(data)

        with open(file_path, 'w') as file:
            json.dump(existing_data, file, indent=4)

    except Exception as e:
        print(f"Error al procesar el archivo JSON: {e}")



@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route('/control-relay', methods=['POST'])
def control_relay():
    try:
        data = request.json
        ip = data.get('ip')
        relay = data.get('relay')
        state = data.get('state')

        print(f"Datos recibidos: ip={ip}, relay={relay}, state={state}")

        if not ip or relay is None or state is None:
            return jsonify({'error': 'Faltan parámetros'}), 400

        try:
            response = requests.post(f'http://{ip}:3000/control-relay', json={
                'relay': relay,
                'state': state
            })
            print(f"Respuesta del servidor de relés: {response.status_code} {response.text}")
            response.raise_for_status()
        except requests.RequestException as e:
            return jsonify({'error': 'Error al enviar solicitud al servidor de relés', 'details': str(e)}), 500

        return jsonify({'status': 'success', 'message': response.text}), response.status_code

    except Exception as e:
        return jsonify({'error': 'Error interno del servidor', 'details': str(e)}), 500


@app.route('/notify', methods=['POST'])
def notify():
    data = request.form
    visitor_id = str(uuid.uuid4())

    image_file = request.files.get('image')
    if image_file:
        image_path = os.path.join(UPLOAD_FOLDER, f"{visitor_id}.jpg")
        image_file.save(image_path)
    else:
        image_path = None

    new_notification = {
        "id": visitor_id,
        "name": data.get('name'),
        "time": data.get('time'),
        "message": data.get('message'),
        "location": data.get('location'),
        "image": image_path,
        "alert_type": data.get('alert_type', 'info')
    }

    # Llamar a la función para agregar la nueva notificación al archivo JSON
    append_to_json_file(NOTIFICATIONS_FILE, new_notification)

    return jsonify({"status": "success", "id": visitor_id})


@app.route('/cameras', methods=['GET'])
def get_cameras():
    try:
        with open(CAMERAS_FILE, 'r') as file:
            cameras = json.load(file)
        return jsonify(cameras)
    except FileNotFoundError:
        return jsonify([]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/camera-stream-url', methods=['GET'])
def get_camera_stream_url():
    ws_url = "ws://192.168.191.227:9999"
    return jsonify({"wsUrl": ws_url})


@app.route('/notifications', methods=['GET'])
def get_notifications():
    def generate_notifications():
        """Genera notificaciones periódicamente."""
        try:
            while True:
                with open(NOTIFICATIONS_FILE, 'r') as file:
                    notifications = json.load(file)
                    for notification in notifications:
                        yield f"data: {json.dumps(notification)}\n\n"
                time.sleep(5)  # Envía actualizaciones cada 5 segundos
        except Exception as e:
            yield f"data: Error al enviar notificaciones: {str(e)}\n\n"

    return Response(generate_notifications(), content_type='text/event-stream')



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', threaded=True)
