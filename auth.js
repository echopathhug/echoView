/**
 * Authentication and User Management Engine
 * Async version for Firebase integration
 */

const Auth = {
    MAX_FAILED_ATTEMPTS: 5,

    async login(username, password) {
        const users = await Storage.getUsers();
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
            await Storage.saveUser(user);
            
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
                    await Storage.saveUser(user);
                    
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
                    await Storage.saveUser(user);
                    return { 
                        success: false, 
                        message: '비밀번호 5회 오류로 계정이 잠겼습니다.' + (user.username === 'rootuser' ? '' : ' 관리자에게 문의하세요.')
                    };
                }
            }
            
            await Storage.saveUser(user);
            
            const remaining = this.MAX_FAILED_ATTEMPTS - user.failedAttempts;
            return { 
                success: false, 
                message: `비밀번호가 틀렸습니다. (남은 횟수: ${remaining}회)` 
            };
        }
    },

    async changePassword(userId, newPassword) {
        const users = await Storage.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) return { success: false, message: '사용자를 찾을 수 없습니다.' };

        const user = users[userIndex];
        user.password = newPassword;
        user.mustChangePassword = false;
        await Storage.saveUser(user);
        Storage.setCurrentUser(user);

        return { success: true };
    },

    async resetPassword(username) {
        const users = await Storage.getUsers();
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
        
        await Storage.saveUser(user);

        console.log(`[Email 전송 시뮬레이션] To: ${user.email}, 임시 비밀번호: ${tempPassword}`);
        
        return { success: true, email: user.email, tempPassword };
    },

    async createUser(username, name, email, role = 'user', initialPassword = '1234') {
        const users = await Storage.getUsers();
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

        await Storage.saveUser(newUser);
        return { success: true, user: newUser };
    },

    async updateUser(userId, data) {
        const users = await Storage.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) return { success: false };

        const updatedUser = { ...users[userIndex], ...data };
        await Storage.saveUser(updatedUser);
        return { success: true };
    },

    async deleteUser(userId) {
        await Storage.deleteUser(userId);
        return { success: true };
    },

    logout() {
        Storage.clearCurrentUser();
    }
};

window.Auth = Auth;
