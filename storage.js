/**
 * Storage Utility for Family Board
 * Handles persistence using localStorage
 */

const STORAGE_KEYS = {
    USERS: 'family_board_users',
    FOLDERS: 'family_board_folders',
    POSTS: 'family_board_posts',
    CURRENT_USER: 'family_board_current_user',
    SETTINGS: 'family_board_settings'
};

const Storage = {
    // Initial data setup
    init() {
        let users = this.getUsers();
        
        // Ensure rootuser exists
        if (!users.find(u => u.username === 'rootuser')) {
            const defaultRoot = {
                id: 'rootuser',
                username: 'rootuser',
                name: '관리자',
                password: '1234',
                failedAttempts: 0,
                isLocked: false,
                mustChangePassword: true,
                role: 'admin',
                createdAt: new Date().toISOString()
            };
            users.push(defaultRoot);
            this.saveUsers(users);
        }

        if (!localStorage.getItem(STORAGE_KEYS.FOLDERS)) {
            this.saveFolders([]);
        }
        if (!localStorage.getItem(STORAGE_KEYS.POSTS)) {
            this.savePosts([]);
        }
        if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
            this.saveSettings({ font: "'Inter', sans-serif" });
        }
    },

    // Users
    getUsers() {
        const data = localStorage.getItem(STORAGE_KEYS.USERS);
        return data ? JSON.parse(data) : [];
    },
    saveUsers(users) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    },

    // Current Session
    getCurrentUser() {
        const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        return data ? JSON.parse(data) : null;
    },
    setCurrentUser(user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    },
    clearCurrentUser() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    },

    // Folders
    getFolders() {
        const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
        return data ? JSON.parse(data) : [];
    },
    saveFolders(folders) {
        localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    },

    // Posts
    getPosts() {
        const data = localStorage.getItem(STORAGE_KEYS.POSTS);
        return data ? JSON.parse(data) : [];
    },
    savePosts(posts) {
        localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
    },

    // Settings
    getSettings() {
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? JSON.parse(data) : { font: "'Inter', sans-serif" };
    },
    saveSettings(settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
};

// Export for use in other scripts
window.Storage = Storage;
