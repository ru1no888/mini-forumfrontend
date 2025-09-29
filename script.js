// script.js

document.addEventListener('DOMContentLoaded', () => {
    // 🛑 สิ่งที่ต้องระวัง: URL ของ API
    // ใช้ตัวแปร BASE_API_URL เพื่อให้ง่ายต่อการแก้ไข URL ของ Render ในอนาคต
    const BASE_API_URL = 'https://mini-forumbackend.onrender.com'; // 
    const API_THREAD_PATH = '/api/threads'; // Endpoint คงที่
    const threadListElement = document.getElementById('thread-list');

    // ฟังก์ชันสำหรับดึงและแสดงข้อมูลกระทู้
    async function fetchAndRenderThreads() {
        // 🛑 สิ่งที่ต้องระวัง: การจัดการ Error (B. การจัดการ Error)
        try {
            // ดึงข้อมูลจาก Backend API
            const response = await fetch(BASE_API_URL + API_THREAD_PATH);
            
            // 🛑 สิ่งที่ต้องระวัง: Async Logic - ตรวจสอบ Response Status
            if (!response.ok) {
                // หาก API ส่งสถานะที่ไม่ใช่ 2xx ให้แสดง Error ชัดเจน
                throw new Error(`API Request Failed: HTTP status ${response.status}`);
            }

            // แปลงข้อมูลที่ได้เป็น JSON
            const threads = await response.json();

            // ล้างข้อความ "กำลังโหลด"
            threadListElement.innerHTML = ''; 

            if (threads.length === 0) {
                threadListElement.innerHTML = '<p class="text-center">ยังไม่มีกระทู้ในฟอรัมนี้</p>';
                return;
            }

            // วนลูปและสร้าง Element สำหรับแต่ละกระทู้
            threads.forEach(thread => {
                // 🛑 สิ่งที่ต้องระวัง: JSON Schema - ตรวจสอบว่า Field ที่ต้องการมีอยู่
                // ป้องกันโค้ดพังหาก Backend เปลี่ยนชื่อ Field (เช่น users(username))
                const username = thread.users ? thread.users.username : 'Unknown User';
                const categoryName = thread.categories ? thread.categories.name : 'Uncategorized';
                
                const date = new Date(thread.createdAt).toLocaleDateString('th-TH', { 
                    year: 'numeric', month: 'short', day: 'numeric' 
                });
                
                const article = document.createElement('article');
                article.className = 'thread-item';
                
                article.innerHTML = `
                    <div class="thread-details">
                        <h3><a href="thread.html?id=${thread.id}">${thread.title}</a></h3>
                        <p class="thread-meta">
                            ในหมวด: <strong>${categoryName}</strong> | โดย: ${username} | เมื่อ: ${date}
                        </p>
                    </div>
                    <div class="thread-stats">
                        <span class="stat-box">ตอบ: <span>${thread.reply_count || 0}</span></span>
                        <span class="stat-box">เข้าชม: <span>${thread.view_count || 0}</span></span>
                    </div>
                `;
                
                threadListElement.appendChild(article);
            });

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
            // แจ้งผู้ใช้ว่าไม่สามารถเชื่อมต่อได้ (อาจเกิดจาก Render Free Tier Sleep)
            threadListElement.innerHTML = `
                <p class="loading-message" style="color: red; text-align: center;">
                    ⚠️ ไม่สามารถเชื่อมต่อกับ Server ได้ (API Down/URL ผิด): ${error.message}
                </p>`;
        }
    }

    fetchAndRenderThreads();
});