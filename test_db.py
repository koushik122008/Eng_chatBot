from backend import db
s = db.create_session('test')
print('session id:', s)
msgs = db.get_messages(s)
print('messages:', len(msgs))
for m in msgs:
    print(m)
db.add_message(s, 'user', 'hello')
db.add_message(s, 'assistant', 'world')
msgs2 = db.get_messages(s)
print('after adding:', len(msgs2))
for m in msgs2:
    print(m)
db.delete_session(s)
print('deleted')
