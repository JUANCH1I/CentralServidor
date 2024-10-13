from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt
import json
import os
import requests
import uuid
import time
import logging
import psycopg2
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__, static_folder='public', static_url_path='/C:/Users/fio/Desktop/Desarrollo/CentralServidor/backend/public')
CORS(app)

logging.basicConfig(
    filename='system_log.log',  # Nombre del archivo de log
    level=logging.INFO,         # Nivel de log (puedes usar DEBUG para más detalles)
    format='%(asctime)s - %(levelname)s - %(message)s'  # Formato de cada línea del log
)
logging.getLogger('werkzeug').setLevel(logging.ERROR)  # Esto evita que los logs de Flask (werkzeug) se registren.



app.config['JWT_SECRET_KEY'] = '8afa8ee4-9f4d-4b72-97f2-e535348ad44a'  # Cambia esto a una clave secreta fuerte
jwt = JWTManager(app)

VISITORS_FILE = 'visitors.json'
NOTIFICATIONS_FILE = 'notifications.json'
CAMERAS_FILE = 'cameras.json'
UPLOAD_FOLDER = 'uploads'

users = [
    {"id": 1, "username": "admin", "password": bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt())}
]

# Conectar a la base de datos
def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        port="5430",
        database="postgres",  # Usa el nombre de la base de datos que hayas creado
        user="postgres",  # O el usuario que hayas configurado
        password=""  # Coloca aquí la contraseña correcta
    )
    return conn

# Función para guardar logs en la base de datos
def save_log_to_db(timestamp, log_level, usuario, accion):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO logs (timestamp, log_level, usuario, accion)
        VALUES (%s, %s, %s, %s)
    """, (timestamp, log_level, usuario, accion))
    conn.commit()
    cursor.close()
    conn.close()

# Leer el archivo de logs y subir a la base de datos
def process_logs_from_file():
    try:
        with open('system_log.log', 'r') as log_file:
            logs = log_file.readlines()
        
        conn = get_db_connection()  # Obtener la conexión a la base de datos
        cursor = conn.cursor()

        for log in logs:
            # Parsear el log para obtener los campos
            log_parts = log.split(' - ')
            if len(log_parts) < 4:
                continue  # Ignorar líneas mal formadas

            timestamp = log_parts[0].replace(',', '.')  # Reemplazar la coma por un punto en la fracción de segundo
            log_level = log_parts[1].strip()
            usuario = log_parts[2].strip()
            accion = log_parts[3].strip()

            # Insertar en la base de datos
            query = """
                INSERT INTO logs (timestamp, log_level, usuario, accion)
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(query, (timestamp, log_level, usuario, accion))

        conn.commit()  # Confirmar la transacción
        cursor.close()
        conn.close()

        # Limpiar el archivo de logs después de procesarlo
        with open('system_log.log', 'w') as log_file:
            log_file.write('')

        logging.info('Logs procesados y subidos a la base de datos correctamente.')

    except Exception as e:
        logging.error(f"Error al procesar el archivo de logs: {str(e)}")


        # Programar la tarea para que se ejecute cada cierto tiempo
scheduler = BackgroundScheduler()
scheduler.add_job(func=process_logs_from_file, trigger="interval", minutes=60)  # Cada 60 minutos
scheduler.start()


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

# Ruta para login
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = next((u for u in users if u['username'] == username), None)
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password']):
        access_token = create_access_token(identity=user['id'])
        logging.info(f"Usuario {username} ha iniciado sesión correctamente.")
        return jsonify({"token": access_token}), 200
    else:
        logging.warning(f"Intento fallido de inicio de sesión para el usuario {username}.")
        return jsonify({"msg": "Nombre de usuario o contraseña incorrectos"}), 401

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')


@app.route('/control-relay', methods=['POST'])
def control_relay():
    try:
        data = request.json
        ip = data.get('ip')
        relay = data.get('relay')
        state = data.get('state')

        # Validación de datos
        if not ip or relay is None or state is None:
            return jsonify({'error': 'Faltan parametros'}), 400

        # Log de solicitud del usuario para controlar el relé

        try:
            # Enviar la solicitud al servidor de relés
            response = requests.post(f'http://{ip}:3000/control-relay', json={'relay': relay, 'state': state})
            logging.info(f"Respuesta del servidor de relés: {response.status_code} {response.text}")
            response.raise_for_status()
        except requests.RequestException as e:
            return jsonify({'error': 'Error al enviar solicitud al servidor de relés', 'details': str(e)}), 500

        return jsonify({'status': 'success', 'message': response.text}), response.status_code

    except Exception as e:
        return jsonify({'error': 'Error interno del servidor', 'details': str(e)}), 500


@app.route('/logs', methods=['POST'])
@jwt_required()
def save_log():
    try:
        data = request.json
        observation = data.get('observation')
        user_id = get_jwt_identity()

        if not observation:
            logging.warning(f"Usuario {user_id} intento guardar una observación vacía.")
            return jsonify({'error': 'La observación está vacía'}), 400

        logging.info(f"Usuario {user_id} registró la observación: {observation}")
        save_log_to_db(time.strftime('%Y-%m-%d %H:%M:%S'), 'INFO', user_id, f"Registró la observación: {observation}")

        return jsonify({"status": "success"}), 200

    except Exception as e:
        logging.error(f"Error al guardar el log: {str(e)}")
        return jsonify({'error': f"Error al guardar el log: {str(e)}"}), 500



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

    append_to_json_file(NOTIFICATIONS_FILE, new_notification)


    return jsonify({"status": "success", "id": visitor_id})



# Ruta protegida (necesita autenticación)
@app.route('/cameras', methods=['GET'])
@jwt_required()
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
    print("Servidor corriendo en http://0.0.0.0:5000")
    app.run(debug=True, host='localhost', port='5000', threaded=True)

