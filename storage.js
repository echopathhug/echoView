/**
 * Storage Utility for Family Board
 * Handles persistence using Firebase Firestore
 */

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyAp3vt2Rmtakj084xj-86yD4O3kqIR8uYA",
    authDomain: "echoview20260503.firebaseapp.com",
    projectId: "echoview20260503",
    storageBucket: "echoview20260503.firebasestorage.app",
    messagingSenderId: "29972941442",
    appId: "1:29972941442:web:153657916311fd1a2d829b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const Storage = {
    // Initial data setup
    async init() {
        // Ensure rootuser exists
        const rootSnap = await db.collection('users').doc('rootuser').get();
        if (!rootSnap.exists) {
            await db.collection('users').doc('rootuser').set({
                id: 'rootuser',
                username: 'rootuser',
                name: '관리자',
                email: '',
                password: '1234',
                failedAttempts: 0,
                isLocked: false,
                mustChangePassword: true,
                role: 'admin',
                createdAt: new Date().toISOString()
            });
        }
        
        // Ensure global settings exist
        const settingsSnap = await db.collection('settings').doc('global').get();
        if (!settingsSnap.exists) {
            await db.collection('settings').doc('global').set({ font: "'Inter', sans-serif" });
        }

        // Ensure notice folder exists
        const noticeSnap = await db.collection('folders').doc('folder_notice').get();
        if (!noticeSnap.exists) {
            await db.collection('folders').doc('folder_notice').set({
                id: 'folder_notice',
                name: '📢 공지사항',
                createdAt: new Date().toISOString()
            });
        }
    },

    // Current Session (Local)
    getCurrentUser() {
        const data = sessionStorage.getItem('family_board_current_user');
        return data ? JSON.parse(data) : null;
    },
    setCurrentUser(user) {
        sessionStorage.setItem('family_board_current_user', JSON.stringify(user));
    },
    clearCurrentUser() {
        sessionStorage.removeItem('family_board_current_user');
    },

    // Users
    async getUsers() {
        const snap = await db.collection('users').get();
        return snap.docs.map(doc => doc.data());
    },
    async saveUser(user) {
        await db.collection('users').doc(user.id).set(user);
    },
    async deleteUser(id) {
        await db.collection('users').doc(id).delete();
    },

    // Folders
    async getFolders() {
        const snap = await db.collection('folders').get();
        return snap.docs.map(doc => doc.data());
    },
    async saveFolder(folder) {
        await db.collection('folders').doc(folder.id).set(folder);
    },
    async deleteFolder(id) {
        await db.collection('folders').doc(id).delete();
    },

    // Posts
    async getPosts() {
        const snap = await db.collection('posts').get();
        return snap.docs.map(doc => doc.data());
    },
    async savePost(post) {
        await db.collection('posts').doc(post.id).set(post);
    },
    async deletePost(id) {
        await db.collection('posts').doc(id).delete();
    },

    // Settings
    async getSettings() {
        const snap = await db.collection('settings').doc('global').get();
        return snap.exists ? snap.data() : { font: "'Inter', sans-serif" };
    },
    async saveSettings(settings) {
        await db.collection('settings').doc('global').set(settings);
    },

    // App File (Sharing Center)
    async getAppFile() {
        const snap = await db.collection('settings').doc('app').get();
        return snap.exists ? snap.data() : null;
    },
    async saveAppFile(data) {
        // data: { fileName, base64, uploadedAt }
        await db.collection('settings').doc('app').set(data);
    }
};

window.Storage = Storage;
