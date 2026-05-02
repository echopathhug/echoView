/**
 * Authentication and User Management Engine
 */

const Auth = {
    MAX_FAILED_ATTEMPTS: 5,

    login(username, password) {
        const users = Storage.getUsers();
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            return { success: false, message: '사용자를 찾을 수 없습니다.' };
        }

        const user = users[userIndex];

        if (user.isLocked) {
            return { success: false, message: '비밀번호 5회 오류로 계정이 잠겼습니다. 관리자에게 문의하세요.' };
        }

        if (user.password === password) {
            // Success
            user.failedAttempts = 0;
            Storage.saveUsers(users);
            
            // Check if password change is required
            if (user.mustChangePassword) {
                return { success: true, mustChangePassword: true, user };
            }

            Storage.setCurrentUser(user);
            return { success: true, mustChangePassword: false, user };
        } else {
            // Failure
            user.failedAttempts += 1;
            if (user.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
                user.isLocked = true;
            }
            Storage.saveUsers(users);
            
            const remaining = this.MAX_FAILED_ATTEMPTS - user.failedAttempts;
            return { 
                success: false, 
                message: user.isLocked 
                    ? '비밀번호 5회 오류로 계정이 잠겼습니다.' 
                    : `비밀번호가 틀렸습니다. (남은 횟수: ${remaining}회)` 
            };
        }
    },

    changePassword(userId, newPassword) {
        const users = Storage.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) return { success: false, message: '사용자를 찾을 수 없습니다.' };

        users[userIndex].password = newPassword;
        users[userIndex].mustChangePassword = false;
        Storage.saveUsers(users);
        Storage.setCurrentUser(users[userIndex]);

        return { success: true };
    },

    createUser(username, initialPassword = '1234') {
        const users = Storage.getUsers();
        if (users.find(u => u.username === username)) {
            return { success: false, message: '이미 존재하는 아이디입니다.' };
        }

        const newUser = {
            id: 'user_' + Date.now(),
            username,
            password: initialPassword,
            failedAttempts: 0,
            isLocked: false,
            mustChangePassword: true,
            role: 'user',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        Storage.saveUsers(users);
        return { success: true, user: newUser };
    },

    updateUser(userId, data) {
        const users = Storage.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index === -1) return { success: false };

        users[index] = { ...users[index], ...data };
        Storage.saveUsers(users);
        return { success: true };
    },

    deleteUser(userId) {
        let users = Storage.getUsers();
        users = users.filter(u => u.id !== userId);
        Storage.saveUsers(users);
        return { success: true };
    },

    logout() {
        Storage.clearCurrentUser();
    }
};

window.Auth = Auth;
