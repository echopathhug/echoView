/**
 * Main Application Logic
 */

const App = {
    state: {
        activeFolderId: null,
        pendingImages: [],
        currentUser: null,
        showHome: true // New state to track if we should show home
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
        const user = this.state.currentUser;
        document.getElementById('display-username').textContent = user.username;
        document.getElementById('user-avatar-initial').textContent = user.username[0].toUpperCase();
        
        this.renderFolders();
        if (this.state.activeFolderId) {
            this.renderPosts();
            document.getElementById('folder-content').classList.remove('hidden');
        } else {
            document.getElementById('folder-content').classList.add('hidden');
        }
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

        // Change PW
        document.getElementById('btn-change-pw').onclick = () => {
            const p1 = document.getElementById('new-password').value;
            const p2 = document.getElementById('confirm-password').value;
            if (p1 !== p2) {
                document.getElementById('change-pw-message').textContent = '비밀번호가 일치하지 않습니다.';
                return;
            }
            if (p1.length < 4) {
                document.getElementById('change-pw-message').textContent = '최소 4자 이상 입력해주세요.';
                return;
            }
            Auth.changePassword(this.state.currentUser.id, p1);
            this.state.currentUser = Storage.getCurrentUser();
            this.renderScreen();
        };

        // Logout
        document.getElementById('btn-logout').onclick = () => {
            Auth.logout();
            this.state.currentUser = null;
            this.state.activeFolderId = null;
            this.renderScreen();
        };

        // Folders
        document.getElementById('btn-add-folder').onclick = () => {
            this.showFolderModal(null);
        };

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

            // Clear editor
            document.getElementById('post-input').value = '';
            this.state.pendingImages = [];
            this.renderPendingImages();
            this.renderPosts();
        };

        document.getElementById('btn-add-hashtag').onclick = () => {
            const input = document.getElementById('post-input');
            input.value += ' #';
            input.focus();
        };

        // Modals
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.onclick = () => this.closeModals();
        });

        document.getElementById('btn-user-mgmt').onclick = () => {
            this.showUserMgmt();
        };

        document.getElementById('btn-create-user').onclick = () => {
            const id = document.getElementById('new-user-id').value;
            if (!id) return;
            const res = Auth.createUser(id);
            if (!res.success) alert(res.message);
            else {
                document.getElementById('new-user-id').value = '';
                this.renderUserTable();
            }
        };

        // Configuration
        document.getElementById('btn-config').onclick = () => {
            document.getElementById('config-modal').classList.remove('hidden');
            const settings = Storage.getSettings();
            document.getElementById('font-select').value = settings.font;
        };

        document.getElementById('btn-save-config').onclick = () => {
            const font = document.getElementById('font-select').value;
            Storage.saveSettings({ font });
            this.applySettings();
            this.closeModals();
            alert('설정이 저장되었습니다.');
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
        document.getElementById('user-mgmt-modal').classList.remove('hidden');
        this.renderUserTable();
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
