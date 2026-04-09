import os, requests, sys

token_path = r'C:\Veritas_Lab\secret_manager_backup\CODEBERG_TOKEN.txt'
with open(token_path) as f:
    token = f.read().strip()

headers = {
    'Authorization': f'token {token}',
    'Content-Type': 'application/json',
    'accept': 'application/json'
}

r = requests.post('https://codeberg.org/api/v1/user/repos', json={
    'name': 'sovereign-breakout',
    'description': 'VERITAS OMEGA — Shatter the encrypted data lattice. Premium HTML5 arcade breakout.',
    'private': False,
    'auto_init': False
}, headers=headers)

me = requests.get('https://codeberg.org/api/v1/user', headers=headers).json()
username = me.get('login', 'VrtxOmega')

if r.status_code in [200, 201]:
    clone_url = r.json().get('clone_url')
    print(f'CREATED: {clone_url}')
elif r.status_code == 409:
    clone_url = f'https://codeberg.org/{username}/sovereign-breakout.git'
    print(f'EXISTS: {clone_url}')
else:
    print(f'Error {r.status_code}: {r.text}')
    sys.exit(1)

# Inject token into URL for push
push_url = clone_url.replace('https://', f'https://{username}:{token}@')
print(f'Push URL ready for: {username}/sovereign-breakout')
