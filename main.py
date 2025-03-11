import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")
socketio = SocketIO(app, async_mode='eventlet')

# Stockage des données du jeu
game_states = {}
players = {}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    logging.debug(f"Client connected: {request.sid}")
    players[request.sid] = {
        'ready': False
    }
    emit('connected', {'id': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    logging.debug(f"Client disconnected: {request.sid}")
    if request.sid in players:
        del players[request.sid]

@socketio.on('player_update')
def handle_player_update(data):
    game_id = data.get('game_id')
    if game_id in game_states:
        emit('game_state_update', data, broadcast=True, include_self=False, room=game_id)

@socketio.on('goal_scored')
def handle_goal_scored(data):
    game_id = data.get('game_id')
    team = data.get('team')
    score = data.get('score')
    if game_id in game_states:
        emit('score_update', {'team': team, 'score': score}, broadcast=True, room=game_id)

@socketio.on('bonus_collected')
def handle_bonus_collected(data):
    game_id = data.get('game_id')
    bonus_type = data.get('type')
    player_id = data.get('player_id')
    if game_id in game_states:
        emit('bonus_update', {'type': bonus_type, 'player_id': player_id}, broadcast=True, room=game_id)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)