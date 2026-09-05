import sys

file_path = r'A:\Sync\G.I.L\Site\admin-panel.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "async function saveSocial(id) { await apiFetch(id ? \socials/\\ : 'socials', 'POST', Object.fromEntries(new FormData(document.getElementById('social-form')).entries())); if (res) { closeAdminModal(); refreshData(); }}"

replacement = "async function saveSocial(id) { const res = await apiFetch(id ? \socials/\\ : 'socials', 'POST', Object.fromEntries(new FormData(document.getElementById('social-form')).entries())); if (res) { closeAdminModal(); refreshData(); }}"

if target in content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content.replace(target, replacement))
    print('Fixed admin-panel.html saveSocial')
else:
    print('Target not found in admin-panel.html.')

