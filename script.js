// script.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. กำหนด URL ของ API Endpoint
    const API_URL = 'http://localhost:3000/api/threads';
    const threadListElement = document.getElementById('thread-list');

    // ฟังก์ชันสำหรับดึงและแสดงข้อมูลกระทู้
    async function fetchAndRenderThreads() {
        try {
            // 2. ดึงข้อมูลจาก Backend API
            const response = await fetch(API_URL);
            
            // ตรวจสอบสถานะ response
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 3. แปลงข้อมูลที่ได้เป็น JSON
            const threads = await response.json();

            // 4. ล้างข้อความ "กำลังโหลด"
            threadListElement.innerHTML = ''; 

            if (threads.length === 0) {
                threadListElement.innerHTML = '<p>ไม่มีกระทู้ในฟอรัมนี้</p>';
                return;
            }

            // 5. วนลูปและสร้าง Element สำหรับแต่ละกระทู้
            threads.forEach(thread => {
                const article = document.createElement('article');
                article.className = 'thread-item';

                // จัดรูปแบบวันที่ให้สวยงาม (toLocaleDateString)
                const date = new Date(thread.createdAt).toLocaleDateString('th-TH', { 
                    year: 'numeric', month: 'short', day: 'numeric' 
                });
                
                // สร้างโครงสร้าง HTML สำหรับกระทู้
                article.innerHTML = `
                    <h3><a href="thread.html?id=${thread.id}">${thread.title}</a></h3>
                    <p class="thread-meta">
                        หมวดหมู่: **${thread.categoryName}** | โดย: ${thread.username} | เมื่อ: ${date}
                    </p>
                    <p class="thread-stats">
                        ตอบกลับ: 0 | เข้าชม: 0 
                        </p>
                `;
                
                threadListElement.appendChild(article);
            });

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
            threadListElement.innerHTML = `<p style="color: red;">ไม่สามารถเชื่อมต่อกับ Server ได้: ${error.message}</p>`;
        }
    }

    // เรียกใช้ฟังก์ชันเมื่อหน้าเว็บโหลดเสร็จ
    fetchAndRenderThreads();
});