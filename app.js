/**
 * Main Application Logic
 */

const App = {
    state: {
        activeFolderId: null,
        pendingImages: [],
        currentUser: null,
        showHome: true,
        activeView: 'posts' // 'posts', 'add-folder', 'config', 'user-mgmt'
    },

    init() {
        Storage.init();
        this.state.currentUser = Storage.getCurrentUser();
        this.applySettings();
        this.renderScreen();
        this.bindEvents();
    },

    applySettings() {
        const settings = Storage.getSettings();
        document.documentElement.style.setProperty('--font-main', settings.font);
        
        // Update select dropdown if on main screen
        const fontSelect = document.getElementById('font-select');
        if (fontSelect) fontSelect.value = settings.font;
    },

    renderScreen() {
        const screens = ['home-screen', 'login-screen', 'change-pw-screen', 'main-screen'];
        screens.forEach(s => document.getElementById(s).classList.add('hidden'));

        if (this.state.currentUser) {
            if (this.state.currentUser.mustChangePassword) {
                document.getElementById('change-pw-screen').classList.remove('hidden');
            } else {
                document.getElementById('main-screen').classList.remove('hidden');
                this.renderMain();
            }
        } else {
            if (this.state.showHome) {
                document.getElementById('home-screen').classList.remove('hidden');
            } else {
                document.getElementById('login-screen').classList.remove('hidden');
            }
        }
    },

    renderMain() {
        const views = ['posts-view', 'add-folder-view', 'config-view', 'user-mgmt-view'];
        views.forEach(v => {
            const el = document.getElementById(v);
            if (el) el.classList.add('hidden');
        });

        // Sidebar selection styling
        document.querySelectorAll('.sidebar .btn-secondary').forEach(btn => btn.classList.remove('active'));

        if (this.state.activeView === 'posts') {
            document.getElementById('posts-view').classList.remove('hidden');
            if (this.state.activeFolderId) {
                this.renderPosts();
            } else {
                document.getElementById('post-list').innerHTML = '<div style="text-align: center; margin-top: 50px; color: var(--text-muted);">폴더를 선택하여 글을 확인하세요.</div>';
            }
        } else if (this.state.activeView === 'add-folder') {
            document.getElementById('add-folder-view').classList.remove('hidden');
            document.getElementById('current-folder-title').textContent = '새 폴더 추가';
            document.getElementById('btn-add-folder-view').classList.add('active');
        } else if (this.state.activeView === 'config') {
            document.getElementById('config-view').classList.remove('hidden');
            document.getElementById('current-folder-title').textContent = '환경 설정';
            document.getElementById('btn-config-view').classList.add('active');
            // Load current font
            const settings = Storage.getSettings();
            document.getElementById('font-select').value = settings.fontMain;
        } else if (this.state.activeView === 'user-mgmt') {
            document.getElementById('user-mgmt-view').classList.remove('hidden');
            document.getElementById('current-folder-title').textContent = '계정 관리';
            document.getElementById('btn-user-mgmt-view').classList.add('active');
            this.renderUserList();
        }

        this.renderFolders();
        document.getElementById('display-username').textContent = this.state.currentUser.name;
        document.getElementById('user-avatar-initial').textContent = this.state.currentUser.name[0];
    },

    renderFolders() {
        const folders = Storage.getFolders();
        const list = document.getElementById('folder-list');
        list.innerHTML = '';

        folders.forEach(f => {
            const div = document.createElement('div');
            div.className = `folder-item ${this.state.activeFolderId === f.id ? 'active' : ''}`;
            div.innerHTML = `
                <span class="folder-name">${f.name}</span>
                <div class="folder-actions">
                    <button class="icon-btn btn-rename-folder" data-id="${f.id}">✎</button>
                    <button class="icon-btn btn-delete-folder" data-id="${f.id}">&times;</button>
                </div>
            `;
            div.onclick = (e) => {
                if (e.target.closest('.folder-actions')) return;
                this.state.activeFolderId = f.id;
                this.state.activeView = 'posts'; // Ensure view switches to posts
                document.getElementById('current-folder-title').textContent = f.name;
                this.renderMain();
            };
            list.appendChild(div);
        });
    },

    renderPosts() {
        const posts = Storage.getPosts().filter(p => p.folderId === this.state.activeFolderId);
        const list = document.getElementById('post-list');
        list.innerHTML = '';

        posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(p => {
            const card = document.createElement('div');
            card.className = 'post-card fade-in';
            
            // Format content with hashtags and links
            let content = p.content
                .replace(/#([\w가-힣]+)/g, '<span class="hashtag" onclick="App.filterByHashtag(\'$1\')">#$1</span>')
                .replace(/@post_(\d+)/g, '<a href="#" class="post-link" onclick="App.goToPost(\'$1\')">#문서_$1</a>');

            card.innerHTML = `
                <div class="post-meta">
                    <span>${p.authorName} • ID: ${p.id.split('_')[1]}</span>
                    <span>${new Date(p.createdAt).toLocaleString()}</span>
                </div>
                <div class="post-content">${content}</div>
                <div class="post-images">
                    ${p.images.map(img => `<img src="${img}" onclick="App.viewImage('${img}')">`).join('')}
                </div>
                <div style="text-align: right; display: flex; justify-content: flex-end; gap: 12px;">
                    ${(p.authorId === this.state.currentUser.id || this.state.currentUser.role === 'admin') 
                        ? `<button class="icon-btn" onclick="App.showEditPostModal('${p.id}')" style="font-size: 12px;">수정</button>
                           <button class="icon-btn" onclick="App.deletePost('${p.id}')" style="color: var(--danger); font-size: 12px;">삭제</button>` 
                        : ''}
                </div>
            `;
            list.appendChild(card);
        });
    },

    bindEvents() {
        // Home
        document.getElementById('btn-go-to-login').onclick = () => {
            this.state.showHome = false;
            this.renderScreen();
        };

        // Login
        document.getElementById('btn-login').onclick = () => {
            const u = document.getElementById('login-username').value;
            const p = document.getElementById('login-password').value;
            const res = Auth.login(u, p);
            if (res.success) {
                this.state.currentUser = res.user;
                this.renderScreen();
            } else {
                document.getElementById('login-message').textContent = res.message;
            }
        };

        // Sidebar View Switches
        document.getElementById('btn-add-folder-view').onclick = () => {
            this.state.activeView = 'add-folder';
            this.state.activeFolderId = null;
            this.renderMain();
        };
        document.getElementById('btn-config-view').onclick = () => {
            this.state.activeView = 'config';
            this.renderMain();
        };
        document.getElementById('btn-user-mgmt-view').onclick = () => {
            if (this.state.currentUser.role !== 'admin') {
                alert('관리자 권한이 필요합니다.');
                return;
            }
            this.state.activeView = 'user-mgmt';
            this.renderMain();
        };

        // Create Folder (In-page)
        document.getElementById('btn-create-folder-submit').onclick = () => {
            const name = document.getElementById('new-folder-name-input').value;
            if (!name) return;
            const folders = Storage.getFolders();
            const newFolder = { id: 'folder_' + Date.now(), name };
            folders.push(newFolder);
            Storage.saveFolders(folders);
            document.getElementById('new-folder-name-input').value = '';
            this.state.activeView = 'posts';
            this.state.activeFolderId = newFolder.id;
            document.getElementById('current-folder-title').textContent = newFolder.name;
            this.renderMain();
            alert('폴더가 생성되었습니다.');
        };

        // Save Config (In-page)
        document.getElementById('btn-save-config').onclick = () => {
            const font = document.getElementById('font-select').value;
            const settings = { fontMain: font };
            Storage.saveSettings(settings);
            this.applySettings();
            alert('설정이 저장되었습니다.');
        };

        // Create User (In-page)
        document.getElementById('btn-create-user').onclick = () => {
            const id = document.getElementById('new-user-id').value;
            const name = document.getElementById('new-user-name').value;
            if (!id || !name) return;
            const res = Auth.createUser(id, name, 'user');
            if (res.success) {
                document.getElementById('new-user-id').value = '';
                document.getElementById('new-user-name').value = '';
                this.renderUserList();
                alert('사용자가 생성되었습니다. 초기 비밀번호: 1234');
            } else {
                alert(res.message);
            }
        };

        // Logout
        document.getElementById('btn-logout').onclick = () => {
            Auth.logout();
            this.state.currentUser = null;
            this.state.activeFolderId = null;
            this.state.showHome = true;
            this.state.activeView = 'posts';
            this.renderScreen();
        };

        // Folders (rename only, add handled in-page)
        document.getElementById('btn-confirm-folder').onclick = () => {
            const name = document.getElementById('folder-name-input').value;
            if (!name) return;
            
            const folders = Storage.getFolders();
            const editingId = document.getElementById('folder-modal').dataset.editingId;

            if (editingId) {
                const idx = folders.findIndex(f => f.id === editingId);
                folders[idx].name = name;
            } else {
                folders.push({ id: 'f_' + Date.now(), name });
            }
            
            Storage.saveFolders(folders);
            this.closeModals();
            this.renderFolders();
        };

        // Delegation for folder actions
        document.getElementById('folder-list').onclick = (e) => {
            const id = e.target.dataset.id;
            if (e.target.classList.contains('btn-rename-folder')) {
                const f = Storage.getFolders().find(f => f.id === id);
                this.showFolderModal(f);
            } else if (e.target.classList.contains('btn-delete-folder')) {
                if (confirm('폴더와 모든 글을 삭제하시겠습니까?')) {
                    const folders = Storage.getFolders().filter(f => f.id !== id);
                    Storage.saveFolders(folders);
                    const posts = Storage.getPosts().filter(p => p.folderId !== id);
                    Storage.savePosts(posts);
                    if (this.state.activeFolderId === id) this.state.activeFolderId = null;
                    this.renderMain();
                }
            }
        };

        // Post Editor Toggle (floating button)
        document.getElementById('btn-new-post').onclick = () => {
            if (!this.state.activeFolderId) {
                alert('먼저 폴더를 선택해주세요.');
                return;
            }
            const editor = document.getElementById('post-editor-section');
            editor.classList.toggle('hidden');
            if (!editor.classList.contains('hidden')) {
                document.getElementById('post-input').focus();
            }
        };

        // Post Creation
        document.getElementById('image-upload').onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.state.pendingImages.push(event.target.result);
                    this.renderPendingImages();
                };
                reader.readAsDataURL(file);
            });
        };

        document.getElementById('btn-save-post').onclick = () => {
            const content = document.getElementById('post-input').value;
            if (!content && this.state.pendingImages.length === 0) return;

            const posts = Storage.getPosts();
            const newPost = {
                id: 'post_' + Date.now(),
                folderId: this.state.activeFolderId,
                authorId: this.state.currentUser.id,
                authorName: this.state.currentUser.username,
                content,
                images: [...this.state.pendingImages],
                createdAt: new Date().toISOString()
            };

            posts.push(newPost);
            Storage.savePosts(posts);

            // Clear editor and hide it
            document.getElementById('post-input').value = '';
            this.state.pendingImages = [];
            this.renderPendingImages();
            document.getElementById('post-editor-section').classList.add('hidden');
            this.renderPosts();
        };

        document.getElementById('btn-add-hashtag').onclick = () => {
            const input = document.getElementById('post-input');
            input.value += ' #';
            input.focus();
        };

        // Link Post
        document.getElementById('btn-add-link').onclick = () => {
            document.getElementById('link-modal').classList.remove('hidden');
            document.getElementById('link-post-id-input').focus();
        };

        document.getElementById('btn-confirm-link').onclick = () => {
            const postId = document.getElementById('link-post-id-input').value;
            if (!postId) return;
            
            const input = document.getElementById('post-input');
            input.value += ` @post_${postId} `;
            input.focus();
            
            document.getElementById('link-post-id-input').value = '';
            this.closeModals();
        };

        // Edit Post
        document.getElementById('btn-save-edit-post').onclick = () => {
            const postId = document.getElementById('edit-post-modal').dataset.postId;
            const content = document.getElementById('edit-post-input').value;
            const folderId = document.getElementById('edit-post-folder-select').value;
            
            const posts = Storage.getPosts();
            const idx = posts.findIndex(p => p.id === postId);
            if (idx === -1) return;

            posts[idx].content = content;
            posts[idx].folderId = folderId;
            posts[idx].updatedAt = new Date().toISOString();

            Storage.savePosts(posts);
            this.closeModals();
            this.renderMain();
            alert('게시글이 수정되었습니다.');
        };
        // Modals close buttons
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.onclick = () => this.closeModals();
        });
    },

    showFolderModal(folder) {
        const modal = document.getElementById('folder-modal');
        const input = document.getElementById('folder-name-input');
        const title = document.getElementById('folder-modal-title');
        
        if (folder) {
            modal.dataset.editingId = folder.id;
            input.value = folder.name;
            title.textContent = '폴더 이름 변경';
        } else {
            delete modal.dataset.editingId;
            input.value = '';
            title.textContent = '새 폴더 생성';
        }
        
        modal.classList.remove('hidden');
        input.focus();
    },

    showUserMgmt() {
        // No longer shows modal; in-page view is used
        this.state.activeView = 'user-mgmt';
        this.renderMain();
    },

    renderUserList() {
        return this.renderUserTable();
    },

    renderUserTable() {
        const users = Storage.getUsers();
        const table = document.getElementById('user-table');
        table.innerHTML = '';

        users.forEach(u => {
            const div = document.createElement('div');
            div.style = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--glass-border); font-size: 14px;';
            div.innerHTML = `
                <span>${u.username} ${u.isLocked ? '<b style="color:red">[잠금]</b>' : ''}</span>
                <div style="display: flex; gap: 8px;">
                    <button class="icon-btn" onclick="App.resetUser('${u.id}')" title="비밀번호 초기화">🔄</button>
                    <button class="icon-btn" onclick="App.unlockUser('${u.id}')" title="잠금 해제">🔓</button>
                    ${u.username !== 'rootuser' ? `<button class="icon-btn" onclick="App.deleteUser('${u.id}')" title="삭제">&times;</button>` : ''}
                </div>
            `;
            table.appendChild(div);
        });
    },

    renderPendingImages() {
        const container = document.getElementById('image-previews');
        container.innerHTML = '';
        this.state.pendingImages.forEach((src, idx) => {
            const img = document.createElement('img');
            img.src = src;
            img.className = 'image-preview';
            img.onclick = () => {
                this.state.pendingImages.splice(idx, 1);
                this.renderPendingImages();
            };
            container.appendChild(img);
        });
    },

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    },

    // Global helpers for inline events
    resetUser(id) {
        Auth.updateUser(id, { password: '1234', mustChangePassword: true });
        alert('비밀번호가 1234로 초기화되었습니다.');
        this.renderUserTable();
    },
    unlockUser(id) {
        Auth.updateUser(id, { isLocked: false, failedAttempts: 0 });
        alert('계정 잠금이 해제되었습니다.');
        this.renderUserTable();
    },
    deleteUser(id) {
        if (confirm('사용자를 삭제하시겠습니까?')) {
            Auth.deleteUser(id);
            this.renderUserTable();
        }
    },
    deletePost(id) {
        if (confirm('글을 삭제하시겠습니까?')) {
            const posts = Storage.getPosts().filter(p => p.id !== id);
            Storage.savePosts(posts);
            this.renderPosts();
        }
    },
    viewImage(src) {
        // Simple fullscreen view or just open in new tab for now
        const win = window.open();
        win.document.write(`<img src="${src}" style="max-width:100%; height:auto;">`);
    },
    goToPost(shortId) {
        const posts = Storage.getPosts();
        const post = posts.find(p => p.id.endsWith(shortId));
        if (post) {
            this.state.activeFolderId = post.folderId;
            const folder = Storage.getFolders().find(f => f.id === post.folderId);
            document.getElementById('current-folder-title').textContent = folder ? folder.name : '폴더';
            this.renderMain();
            // Scroll to post logic could be added here
            setTimeout(() => {
                alert(`이동한 글: ${post.content.substring(0, 20)}...`);
            }, 100);
        } else {
            alert('해당 게시글을 찾을 수 없습니다.');
        }
    },
    filterByHashtag(tag) {
        const posts = Storage.getPosts().filter(p => p.folderId === this.state.activeFolderId && p.content.includes('#' + tag));
        this.renderPostsWithFilter(posts, tag);
    },
    renderPostsWithFilter(posts, tag) {
        const list = document.getElementById('post-list');
        list.innerHTML = `<div style="margin-bottom: 16px; color: var(--primary);">#${tag} 검색 결과 (${posts.length}건) <button class="icon-btn" onclick="App.renderPosts()">[필터 해제]</button></div>`;
        
        posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(p => {
            const card = document.createElement('div');
            card.className = 'post-card fade-in';
            let content = p.content
                .replace(/#([\w가-힣]+)/g, '<span class="hashtag" onclick="App.filterByHashtag(\'$1\')">#$1</span>')
                .replace(/@post_(\d+)/g, '<a href="#" class="post-link" onclick="App.goToPost(\'$1\')">#문서_$1</a>');

            card.innerHTML = `
                <div class="post-meta">
                    <span>${p.authorName} • ID: ${p.id.split('_')[1]}</span>
                    <span>${new Date(p.createdAt).toLocaleString()}</span>
                </div>
                <div class="post-content">${content}</div>
                <div class="post-images">
                    ${p.images.map(img => `<img src="${img}" onclick="App.viewImage('${img}')">`).join('')}
                </div>
                <div style="text-align: right; display: flex; justify-content: flex-end; gap: 12px;">
                    ${(p.authorId === this.state.currentUser.id || this.state.currentUser.role === 'admin') 
                        ? `<button class="icon-btn" onclick="App.showEditPostModal('${p.id}')" style="font-size: 12px;">수정</button>
                           <button class="icon-btn" onclick="App.deletePost('${p.id}')" style="color: var(--danger); font-size: 12px;">삭제</button>` 
                        : ''}
                </div>
            `;
            list.appendChild(card);
        });
    },

    showEditPostModal(postId) {
        const posts = Storage.getPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const modal = document.getElementById('edit-post-modal');
        modal.dataset.postId = postId;
        document.getElementById('edit-post-input').value = post.content;

        // Render folder select options
        const folderSelect = document.getElementById('edit-post-folder-select');
        const folders = Storage.getFolders();
        folderSelect.innerHTML = folders.map(f => 
            `<option value="${f.id}" ${f.id === post.folderId ? 'selected' : ''}>${f.name}</option>`
        ).join('');

        modal.classList.remove('hidden');
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
