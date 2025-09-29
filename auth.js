// auth.js

document.addEventListener('DOMContentLoaded', () => {
    // 🛑 ใช้ URL ฐานของ Render Backend
    const BASE_API_URL = 'https://mini-forumbackend.onrender.com/api/auth/'; 
    
    const form = document.getElementById('auth-form');
    const title = document.getElementById('auth-title');
    const submitButton = document.getElementById('submit-button');
    const toggleLink = document.getElementById('toggle-link');
    const usernameGroup = document.getElementById('username-group');
    const messageElement = document.getElementById('auth-message');

    let isRegisterMode = true;

    // ฟังก์ชันสลับระหว่าง Login และ Register
    const toggleMode = (isRegister) => {
        isRegisterMode = isRegister;
        title.textContent = isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
        submitButton.textContent = isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
        toggleLink.textContent = isRegister ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก';
        usernameGroup.style.display = isRegister ? 'block' : 'none';
        messageElement.textContent = '';
    };

    // ตั้งค่าเริ่มต้นเป็น Register
    toggleMode(true); 

    // สลับเมื่อคลิกลิงก์
    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMode(!isRegisterMode);
    });

    // จัดการการส่งฟอร์ม
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageElement.textContent = 'กำลังดำเนินการ...';
        messageElement.style.color = '#3498db';

        const formData = new FormData(form);
        const endpoint = isRegisterMode ? 'register' : 'login';
        const url = BASE_API_URL + endpoint;

        const data = {
            email: formData.get('email'),
            password: formData.get('password')
        };
        if (isRegisterMode) {
            data.username = formData.get('username');
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                // 🛑 จับ HTTP 404/401/409 Error จาก API
                throw new Error(result.error || `HTTP ${response.status} Error`);
            }

            // ถ้าสำเร็จ
            messageElement.textContent = isRegisterMode 
                ? 'สมัครสมาชิกสำเร็จ! โปรดเข้าสู่ระบบ' 
                : 'เข้าสู่ระบบสำเร็จ!';
            messageElement.style.color = '#2ecc71';
            form.reset();
            
            if (!isRegisterMode) {
                // 🆕 ถ้า Login สำเร็จ: บันทึก Token/Session ใน LocalStorage
                localStorage.setItem('forum_user_session', JSON.stringify(result.token));
                localStorage.setItem('user_data', JSON.stringify(result.user));
                
                // นำผู้ใช้ไปยังหน้าหลัก
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                // ถ้า Register สำเร็จ: สลับไปหน้า Login
                 toggleMode(false);
            }

        } catch (error) {
            messageElement.textContent = `ดำเนินการล้มเหลว: ${error.message}`;
            messageElement.style.color = 'red';
            console.error('Auth Error:', error);
        }
    });
});