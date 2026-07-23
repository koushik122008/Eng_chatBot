from backend import db, groq_client
# Initialize DB (already done by main.py but we do it again)
db.init_db()
# Create a session
session_id = db.create_session('test chat')
print('Session ID:', session_id)
# Add a user message
db.add_message(session_id, 'user', 'Hello, how are you?')
# Get history for API
history = db.get_history_for_api(session_id)
print('History:', len(history))
# Call stream_reply and get first few chunks
count = 0
for kind, value in groq_client.stream_reply(history):
    print(f'Received {kind}: {value[:100] if isinstance(value, str) else value}')
    count += 1
    if count >= 5:
        break
# Clean up
db.delete_session(session_id)
print('Test done')
