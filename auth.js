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
                Storage.setCurrentUser(user);
                return { success: true, mustChangePassword: true, user };
            }

            Storage.setCurrentUser(user);
            return { success: true, mustChangePassword: false, user };
        } else {
            // Failure
            user.failedAttempts += 1;
            
            if (user.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
                if (user.username !== 'rootuser' && user.email) {
                    const tempPassword = Math.random().toString(36).slice(-6);
                    user.password = tempPassword;
                    user.mustChangePassword = true;
                    user.failedAttempts = 0;
                    user.isLocked = false;
                    Storage.saveUsers(users);
                    
                    console.log(`[Email 전송 시뮬레이션] To: ${user.email}, 임시 비밀번호: ${tempPassword}`);
                    return {
                        success: false,
                        message: `비밀번호 5회 오류로 등록된 이메일(${user.email})로 임시 비밀번호가 발송되었습니다.`,
                        isTempPasswordSent: true,
                        tempPassword: tempPassword,
                        email: user.email
                    };
                } else {
                    user.isLocked = true;
                    Storage.saveUsers(users);
                    return { 
                        success: false, 
                        message: '비밀번호 5회 오류로 계정이 잠겼습니다.' + (user.username === 'rootuser' ? '' : ' 관리자에게 문의하세요.')
                    };
                }
            }
            
            Storage.saveUsers(users);
            
            const remaining = this.MAX_FAILED_ATTEMPTS - user.failedAttempts;
            return { 
                success: false, 
                message: `비밀번호가 틀렸습니다. (남은 횟수: ${remaining}회)` 
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

    resetPassword(username) {
        const users = Storage.getUsers();
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            return { success: false, message: '사용자를 찾을 수 없습니다.' };
        }

        const user = users[userIndex];
        
        if (user.username === 'rootuser') {
             return { success: false, message: '관리자 계정은 이 기능을 사용할 수 없습니다.' };
        }

        if (!user.email) {
            return { success: false, message: '등록된 이메일이 없어 임시 비밀번호를 발급할 수 없습니다.' };
        }

        const tempPassword = Math.random().toString(36).slice(-6);
        
        user.password = tempPassword;
        user.mustChangePassword = true;
        user.failedAttempts = 0;
        user.isLocked = false;
        
        Storage.saveUsers(users);

        console.log(`[Email 전송 시뮬레이션] To: ${user.email}, 임시 비밀번호: ${tempPassword}`);
        
        return { success: true, email: user.email, tempPassword };
    },

    createUser(username, name, email, role = 'user', initialPassword = '1234') {
        const users = Storage.getUsers();
        if (users.find(u => u.username === username)) {
            return { success: false, message: '이미 존재하는 아이디입니다.' };
        }

        const newUser = {
            id: 'user_' + Date.now(),
            username,
            name: name || username,
            email: email || '',
            password: initialPassword,
            failedAttempts: 0,
            isLocked: false,
            mustChangePassword: true,
            role,
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
