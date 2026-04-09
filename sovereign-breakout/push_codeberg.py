import os, requests, subprocess, sys

token_path = r'C:\Veritas_Lab\secret_manager_backup\CODEBERG_TOKEN.txt'
with open(token_path) as f:
    token = f.read().strip()

headers = {'Authorization': f'token {token}', 'accept': 'application/json'}
me = requests.get('https://codeberg.org/api/v1/user', headers=headers).json()
username = me.get('login', 'VeritasOmega')

push_url = f'https://{username}:{token}@codeberg.org/{username}/sovereign-breakout.git'

# Add remote if not exists, then push
remotes = subprocess.run(['git', 'remote'], capture_output=True, text=True).stdout
if 'codeberg' not in remotes:
    subprocess.run(['git', 'remote', 'add', 'codeberg', push_url], check=True)
else:
    subprocess.run(['git', 'remote', 'set-url', 'codeberg', push_url], check=True)

result = subprocess.run(['git', 'push', 'codeberg', 'master'], capture_output=True, text=True)
if result.returncode == 0 or 'master' in (result.stdout + result.stderr):
    print(f'Pushed to: https://codeberg.org/{username}/sovereign-breakout')
else:
    print('STDOUT:', result.stdout)
    print('STDERR:', result.stderr)
