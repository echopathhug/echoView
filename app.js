/**
 * Main Application Logic
 * Async version for Firebase integration
 */

const App = {
    state: {
        activeFolderId: null,
        pendingImages: [],
        currentUser: null,
        showHome: true,
        activeView: 'posts' // 'posts', 'add-folder', 'config', 'user-mgmt'
    },

    async init() {
        await Storage.init();
        this.state.currentUser = Storage.getCurrentUser();
        await this.applySettings();
        await this.renderScreen();
        this.bindEvents();
    },

    async applySettings() {
        const settings = await Storage.getSettings();
        const font = settings.font || "'Inter', sans-serif";
        document.documentElement.style.setProperty('--font-main', font);
        
        const fontSelect = document.getElementById('font-select');
        if (fontSelect) fontSelect.value = font;
    },

    async renderScreen() {
        const screens = ['home-screen', 'login-screen', 'change-pw-screen', 'main-screen'];
        screens.forEach(s => document.getElementById(s).classList.add('hidden'));

        if (this.state.currentUser) {
            if (this.state.currentUser.mustChangePassword) {
                document.getElementById('change-pw-screen').classList.remove('hidden');
            } else {
                document.getElementById('main-screen').classList.remove('hidden');
                await this.renderMain();
            }
        } else {
            if (this.state.showHome) {
                document.getElementById('home-screen').classList.remove('hidden');
            } else {
                document.getElementById('login-screen').classList.remove('hidden');
            }
        }
    },

    async renderMain() {
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
                await this.renderPosts();
                // 에디터 hidden 상태에 따라 글쓰기 버튼 active 토글
                const editorOpen = !document.getElementById('post-editor-section').classList.contains('hidden');
                if (editorOpen) document.getElementById('btn-write-post-view').classList.add('active');
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
            const settings = await Storage.getSettings();
            const font = settings.font || "'Inter', sans-serif";
            document.getElementById('font-select').value = font;
        } else if (this.state.activeView === 'user-mgmt') {
            document.getElementById('user-mgmt-view').classList.remove('hidden');
            document.getElementById('current-folder-title').textContent = '계정 관리';
            document.getElementById('btn-user-mgmt-view').classList.add('active');
            await this.renderUserList();
        }

        await this.renderFolders();
        const displayName = this.state.currentUser.name || this.state.currentUser.username;
        document.getElementById('display-username').textContent = displayName;
        document.getElementById('user-avatar-initial').textContent = displayName[0];
    },

    async renderFolders() {
        const folders = await Storage.getFolders();
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
            div.onclick = async (e) => {
                if (e.target.closest('.folder-actions')) return;
                this.state.activeFolderId = f.id;
                this.state.activeView = 'posts'; // Ensure view switches to posts
                document.getElementById('current-folder-title').textContent = f.name;
                await this.renderMain();
            };
            list.appendChild(div);
        });
    },

    async renderPosts() {
        const allPosts = await Storage.getPosts();
        const posts = allPosts.filter(p => p.folderId === this.state.activeFolderId);
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
                    ${(p.images || []).map(img => `<img src="${img}" onclick="App.viewImage('${img}')">`).join('')}
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
        document.getElementById('btn-go-to-login').onclick = async () => {
            this.state.showHome = false;
            await this.renderScreen();
        };

        // Login
        document.getElementById('btn-login').onclick = async () => {
            const u = document.getElementById('login-username').value;
            const p = document.getElementById('login-password').value;
            const res = await Auth.login(u, p);
            if (res.success) {
                this.state.currentUser = res.user;
                await this.renderScreen();
            } else {
                if (res.isTempPasswordSent) {
                    alert(`비밀번호 5회 오류로 등록된 이메일(${res.email})로 임시 비밀번호가 발송되었습니다.`);
                }
                document.getElementById('login-message').textContent = res.message;
            }
        };

        // Forgot Password
        document.getElementById('btn-show-forgot-pw').onclick = () => {
            document.getElementById('forgot-pw-modal').classList.remove('hidden');
        };

        document.getElementById('btn-send-temp-pw').onclick = async () => {
            const username = document.getElementById('forgot-pw-username-input').value;
            if (!username) return;
            const res = await Auth.resetPassword(username);
            if (res.success) {
                alert(`입력하신 계정의 이메일(${res.email})로 임시 비밀번호가 발송되었습니다.`);
                document.getElementById('forgot-pw-modal').classList.add('hidden');
                document.getElementById('forgot-pw-username-input').value = '';
            } else {
                alert(res.message);
            }
        };

        // Change Password (first login)
        document.getElementById('btn-change-pw').onclick = async () => {
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
            await Auth.changePassword(this.state.currentUser.id, p1);
            this.state.currentUser = Storage.getCurrentUser();
            await this.renderScreen();
        };

        // Sidebar View Switches
        document.getElementById('btn-write-post-view').onclick = async () => {
            if (!this.state.activeFolderId) {
                alert('먼저 왼쪽에서 폴더를 선택해주세요.');
                return;
            }
            this.state.activeView = 'posts';
            await this.renderMain();
            const editor = document.getElementById('post-editor-section');
            editor.classList.remove('hidden');
            document.getElementById('post-input').focus();
        };
        document.getElementById('btn-add-folder-view').onclick = async () => {
            this.state.activeView = 'add-folder';
            this.state.activeFolderId = null;
            await this.renderMain();
        };
        document.getElementById('btn-config-view').onclick = async () => {
            this.state.activeView = 'config';
            await this.renderMain();
        };
        document.getElementById('btn-user-mgmt-view').onclick = async () => {
            if (this.state.currentUser.role !== 'admin') {
                alert('관리자 권한이 필요합니다.');
                return;
            }
            this.state.activeView = 'user-mgmt';
            await this.renderMain();
        };

        // Create Folder (In-page)
        document.getElementById('btn-create-folder-submit').onclick = async () => {
            const name = document.getElementById('new-folder-name-input').value;
            if (!name) return;
            const newFolder = { id: 'folder_' + Date.now(), name };
            await Storage.saveFolder(newFolder);
            document.getElementById('new-folder-name-input').value = '';
            this.state.activeView = 'posts';
            this.state.activeFolderId = newFolder.id;
            document.getElementById('current-folder-title').textContent = newFolder.name;
            await this.renderMain();
            alert('폴더가 생성되었습니다.');
        };

        // Save Config (In-page)
        document.getElementById('btn-save-config').onclick = async () => {
            const font = document.getElementById('font-select').value;
            await Storage.saveSettings({ font });
            await this.applySettings();
            alert('설정이 저장되었습니다.');
        };

        // Create User (In-page)
        document.getElementById('btn-create-user').onclick = async () => {
            const id = document.getElementById('new-user-id').value;
            const name = document.getElementById('new-user-name').value;
            const email = document.getElementById('new-user-email').value;
            if (!id || !name) return;
            const res = await Auth.createUser(id, name, email, 'user');
            if (res.success) {
                document.getElementById('new-user-id').value = '';
                document.getElementById('new-user-name').value = '';
                document.getElementById('new-user-email').value = '';
                await this.renderUserList();
                alert('사용자가 생성되었습니다. 초기 비밀번호: 1234');
            } else {
                alert(res.message);
            }
        };

        // Edit User Info (Modal Save)
        document.getElementById('btn-save-user-info').onclick = async () => {
            const modal = document.getElementById('edit-user-modal');
            const userId = modal.dataset.editingUserId;
            if (!userId) return;

            const name = document.getElementById('edit-user-name-input').value.trim();
            const email = document.getElementById('edit-user-email-input').value.trim();
            
            if (!name) {
                alert('이름을 입력해주세요.');
                return;
            }

            await Auth.updateUser(userId, { name, email });
            await this.renderUserList();
            this.closeModals();
            alert('사용자 정보가 변경되었습니다.');
        };

        // Logout
        document.getElementById('btn-logout').onclick = async () => {
            Auth.logout();
            this.state.currentUser = null;
            this.state.activeFolderId = null;
            this.state.showHome = true;
            this.state.activeView = 'posts';
            await this.renderScreen();
        };

        // Folders (rename only, add handled in-page)
        document.getElementById('btn-confirm-folder').onclick = async () => {
            const name = document.getElementById('folder-name-input').value;
            if (!name) return;
            
            const editingId = document.getElementById('folder-modal').dataset.editingId;

            if (editingId) {
                const folders = await Storage.getFolders();
                const f = folders.find(f => f.id === editingId);
                if (f) {
                    f.name = name;
                    await Storage.saveFolder(f);
                }
            } else {
                await Storage.saveFolder({ id: 'f_' + Date.now(), name });
            }
            
            this.closeModals();
            await this.renderFolders();
        };

        // Delegation for folder actions
        document.getElementById('folder-list').onclick = async (e) => {
            const id = e.target.dataset.id;
            if (e.target.classList.contains('btn-rename-folder')) {
                const folders = await Storage.getFolders();
                const f = folders.find(f => f.id === id);
                this.showFolderModal(f);
            } else if (e.target.classList.contains('btn-delete-folder')) {
                if (confirm('폴더와 모든 글을 삭제하시겠습니까?')) {
                    const allPosts = await Storage.getPosts();
                    const folderPosts = allPosts.filter(p => p.folderId === id);
                    for (const p of folderPosts) {
                        await Storage.deletePost(p.id);
                    }
                    await Storage.deleteFolder(id);
                    if (this.state.activeFolderId === id) this.state.activeFolderId = null;
                    await this.renderMain();
                }
            }
        };

        // Post Editor Toggle - 기존 FAB 대신 사이드바 버튼으로 처리됨
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

        document.getElementById('btn-save-post').onclick = async () => {
            const content = document.getElementById('post-input').value;
            if (!content && this.state.pendingImages.length === 0) return;

            const newPost = {
                id: 'post_' + Date.now(),
                folderId: this.state.activeFolderId,
                authorId: this.state.currentUser.id,
                authorName: this.state.currentUser.name || this.state.currentUser.username,
                content,
                images: [...this.state.pendingImages],
                createdAt: new Date().toISOString()
            };

            await Storage.savePost(newPost);

            // Clear editor and hide it
            document.getElementById('post-input').value = '';
            this.state.pendingImages = [];
            this.renderPendingImages();
            document.getElementById('post-editor-section').classList.add('hidden');
            document.getElementById('btn-write-post-view').classList.remove('active');
            await this.renderPosts();
        };

        document.getElementById('btn-cancel-post').onclick = () => {
            // Clear editor and hide it without saving
            document.getElementById('post-input').value = '';
            this.state.pendingImages = [];
            this.renderPendingImages();
            document.getElementById('post-editor-section').classList.add('hidden');
            document.getElementById('btn-write-post-view').classList.remove('active');
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
        document.getElementById('btn-save-edit-post').onclick = async () => {
            const postId = document.getElementById('edit-post-modal').dataset.postId;
            const content = document.getElementById('edit-post-input').value;
            const folderId = document.getElementById('edit-post-folder-select').value;
            
            const posts = await Storage.getPosts();
            const post = posts.find(p => p.id === postId);
            if (!post) return;

            post.content = content;
            post.folderId = folderId;
            post.updatedAt = new Date().toISOString();

            await Storage.savePost(post);
            this.closeModals();
            await this.renderMain();
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

    async showUserMgmt() {
        this.state.activeView = 'user-mgmt';
        await this.renderMain();
    },

    async renderUserList() {
        return await this.renderUserTable();
    },

    async renderUserTable() {
        const users = await Storage.getUsers();
        const table = document.getElementById('user-table');
        table.innerHTML = '';

        users.forEach(u => {
            const div = document.createElement('div');
            div.style = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--glass-border); font-size: 14px;';
            div.innerHTML = `
                <div>
                    <span>${u.name || u.username} <small style="color: var(--text-muted);">(${u.username})</small> ${u.isLocked ? '<b style="color:red">[잠금]</b>' : ''}</span>
                    ${u.email ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${u.email}</div>` : ''}
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="icon-btn" onclick="App.showEditUserModal('${u.id}', '${u.name || u.username}', '${u.email || ''}')" title="정보 변경">✏️</button>
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
    async resetUser(id) {
        await Auth.updateUser(id, { password: '1234', mustChangePassword: true });
        alert('비밀번호가 1234로 초기화되었습니다.');
        await this.renderUserTable();
    },
    async unlockUser(id) {
        await Auth.updateUser(id, { isLocked: false, failedAttempts: 0 });
        alert('계정 잠금이 해제되었습니다.');
        await this.renderUserTable();
    },
    async deleteUser(id) {
        if (confirm('사용자를 삭제하시겠습니까?')) {
            await Auth.deleteUser(id);
            await this.renderUserTable();
        }
    },
    showEditUserModal(id, currentName, currentEmail) {
        const modal = document.getElementById('edit-user-modal');
        modal.dataset.editingUserId = id;
        document.getElementById('edit-user-name-input').value = currentName;
        document.getElementById('edit-user-email-input').value = currentEmail;
        modal.classList.remove('hidden');
    },
    async deletePost(id) {
        if (confirm('글을 삭제하시겠습니까?')) {
            await Storage.deletePost(id);
            await this.renderPosts();
        }
    },
    viewImage(src) {
        // Simple fullscreen view or just open in new tab for now
        const win = window.open();
        win.document.write(`<img src="${src}" style="max-width:100%; height:auto;">`);
    },
    async goToPost(shortId) {
        const posts = await Storage.getPosts();
        const post = posts.find(p => p.id.endsWith(shortId));
        if (post) {
            this.state.activeFolderId = post.folderId;
            const folders = await Storage.getFolders();
            const folder = folders.find(f => f.id === post.folderId);
            document.getElementById('current-folder-title').textContent = folder ? folder.name : '폴더';
            await this.renderMain();
            // Scroll to post logic could be added here
            setTimeout(() => {
                alert(`이동한 글: ${post.content.substring(0, 20)}...`);
            }, 100);
        } else {
            alert('해당 게시글을 찾을 수 없습니다.');
        }
    },
    async filterByHashtag(tag) {
        const posts = await Storage.getPosts();
        const filtered = posts.filter(p => p.folderId === this.state.activeFolderId && p.content.includes('#' + tag));
        await this.renderPostsWithFilter(filtered, tag);
    },
    async renderPostsWithFilter(posts, tag) {
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
                    ${(p.images || []).map(img => `<img src="${img}" onclick="App.viewImage('${img}')">`).join('')}
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

    async showEditPostModal(postId) {
        const posts = await Storage.getPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const modal = document.getElementById('edit-post-modal');
        modal.dataset.postId = postId;
        document.getElementById('edit-post-input').value = post.content;

        // Render folder select options
        const folderSelect = document.getElementById('edit-post-folder-select');
        const folders = await Storage.getFolders();
        folderSelect.innerHTML = folders.map(f => 
            `<option value="${f.id}" ${f.id === post.folderId ? 'selected' : ''}>${f.name}</option>`
        ).join('');

        modal.classList.remove('hidden');
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
