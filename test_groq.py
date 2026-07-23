import os
from dotenv import load_dotenv
load_dotenv()
print('API key present:', bool(os.getenv('GROQ_API_KEY')))
from backend import groq_client
history = [{'role': 'user', 'content': 'Say hello in one sentence.'}]
print('Starting stream...')
for kind, value in groq_client.stream_reply(history):
    print(f'Kind: {kind}, Value: {value[:100]}')
    if kind == 'done':
        break
