/* ========= 🔧 ตั้งค่า API ========= */
// 🛑 สำคัญมาก: เปลี่ยน 'https://your-backend.onrender.com' เป็น URL Render ของคุณ
const BASE_API_URL = (window.BASE_API_URL_OVERRIDE ?? "https://mini-forumbackend.onrender.com").replace(/\/+$/,""); 
const DEFAULT_HEADERS = { "Content-Type": "application/json", "X-API-Version": "v1" };
let authToken = null; // Token ที่ใช้ในการยืนยันตัวตน (สำหรับฟังก์ชันสร้าง/แก้ไข/ลบ)

/* ========= 🧰 Utils & DOM Handlers ========= */
const $ = (s, el=document)=>el.querySelector(s);
const $$ = (s, el=document)=>[...el.querySelectorAll(s)];
const toastEl = $("#toast");
const toastBody = $("#toastBody");
// ใช้ window.bootstrap เพื่อให้แน่ใจว่า Bootstrap ถูกโหลดแล้ว
const toast = window.bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2800 });

function showToast(msg, variant="bg-primary"){
  toastEl.className = `toast text-white ${variant}`;
  toastBody.textContent = msg;
  toast.show();
}

function api(path, options={}){
  return fetch(`${BASE_API_URL}${path}`, {
    ...options,
    headers: { 
      ...DEFAULT_HEADERS, 
      ...(authToken?{Authorization:`Bearer ${authToken}`}:{}) , 
      ...(options.headers||{}) 
    }
  }).then(async res=>{
    const text = await res.text(); let data=null; try{ data = text?JSON.parse(text):null; }catch{}
    if(!res.ok){ 
      // 🛑 การจัดการ Error จาก Backend
      throw new Error(data?.error || data?.message || `HTTP ${res.status}`); 
    }
    return data;
  });
}

// 🔒 Helper สำหรับป้องกัน XSS
function escapeHTML(s){ 
  return String(s??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;"); 
}


/* ========= 🧑‍🎤 Auth (ระบบล็อกอิน/สมัครสมาชิก) ========= */
// 🆕 Logic ถูกรวมไว้ในฟังก์ชันเหล่านี้เท่านั้น

function setLoggedIn(me){
  authToken = localStorage.getItem("token") || authToken;
  $("#navAuthButtons").hidden = true; // ซ่อนปุ่มเข้าสู่ระบบ
  $("#navUserDropdown").hidden = false; // แสดง Dropdown ผู้ใช้
  $("#navDisplayName").textContent = me?.name || "ผู้ใช้";
  $("#navAvatar").src = me?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${me?.name || 'user'}`;
}

function setLoggedOut(){
  authToken = null; localStorage.removeItem("token"); localStorage.removeItem("user_data");
  $("#navAuthButtons").hidden = false; 
  $("#navUserDropdown").hidden = true;
}

async function fetchMe(){
  try{ 
    // พยายามดึงข้อมูลผู้ใช้ปัจจุบัน (ใช้ token ที่มีอยู่)
    const me = await api(`/api/auth/me`, {method:"GET"}); 
    setLoggedIn(me); 
  }catch{ 
    setLoggedOut(); // ถ้า Token หมดอายุ
  }
}

async function login(email,password){
  // 🛑 เรียก API Login
  const data = await api(`/api/auth/login`, {method:"POST", body:JSON.stringify({email,password})});
  
  // บันทึก Token และข้อมูลผู้ใช้
  authToken = data?.token || null; 
  if(authToken) localStorage.setItem("token", authToken);
  localStorage.setItem("user_data", JSON.stringify(data?.user));
  
  setLoggedIn(data?.user); 
  showToast("เข้าสู่ระบบสำเร็จ","bg-success");
}

async function register(name,email,password){
  // 🛑 เรียก API Register
  const data = await api(`/api/auth/register`, {method:"POST", body:JSON.stringify({name,email,password})});
  
  showToast("สมัครสมาชิกสำเร็จ","bg-success");
  
  // Optional: ล็อกอินทันทีหลังสมัคร
  if(data?.token){ 
     authToken=data.token; 
     localStorage.setItem("token",authToken); 
     localStorage.setItem("user_data", JSON.stringify(data?.user));
     setLoggedIn(data?.user); 
  }
}

// 🆕 Logout Function (จากโค้ดที่คุณส่งมา)
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    showToast("ออกจากระบบแล้ว", "bg-secondary");
    // ไม่ต้องเรียก API เพิ่มเติมสำหรับ MVP
    window.location.reload();
}

/* ========= 📦 Loaders (สำหรับดึงข้อมูล) ========= */
async function loadThreads({page=1,q="",category=""}={}){
  const params = new URLSearchParams();
  if(page) params.set("page", page);
  if(q) params.set("q", q);
  if(category) params.set("category", category.replace(/^#/, ""));
  
  // 🛑 เรียก API GET /api/threads
  const data = await api(`/api/threads?${params.toString()}`, { method:"GET" });
  
  renderThreads(data?.items||[]);
  renderPager(data?.page||1, data?.total_pages||1);
  $("#statThreads").textContent = data?.total_items ?? "—";
}
async function loadCategories(){
  // 🛑 API /api/categories (ต้องสร้างใน server.js)
  const items = await api(`/api/categories`, { method:"GET" });
  renderCategories(Array.isArray(items)?items:[]);
}
async function loadStats(){
  try{
    // 🛑 API /api/stats (ต้องสร้างใน server.js)
    const s = await api(`/api/stats`, { method:"GET" });
    $("#statUsers").textContent = s?.users ?? "—";
    $("#statComments").textContent = s?.comments ?? "—";
  }catch{}
}

/* ========= ✍️ Threads (สร้างกระทู้) ========= */
async function createThread({title,body,categories}){
  // 🛑 API /api/threads (POST)
  const payload = {
    title, body,
    categories: (categories||"").split(/\s+/).filter(Boolean).map(s=>s.replace(/^#/,""))
  };
  const data = await api(`/api/threads`, { method:"POST", body:JSON.stringify(payload) });
  showToast("สร้างกระทู้แล้ว","bg-success");
  return data;
}

/* ========= 🖼️ Render (สร้าง UI Element) ========= */
function renderCategories(items){
  const wrap = $("#categoriesBar"); wrap.innerHTML = "";
  wrap.append(elCategoryButton({name:"ทั้งหมด", value:""}));
  // ⚠️ API Categories ต้องคืนค่า {name, slug/value}
  items.forEach(cat=>wrap.append(elCategoryButton({ name:cat?.name||"#ทั่วไป", value:cat?.slug||cat?.name||"" })));
}
function elCategoryButton({name,value}){
  const btn = document.createElement("button");
  btn.className = "btn btn-sm btn-outline-secondary";
  btn.textContent = name.startsWith("#")?name:`#${name}`;
  btn.onclick = ()=>loadThreads({page:1, category:value||name});
  return btn;
}
function renderThreads(items){
  const list = $("#threadsList"); list.innerHTML = "";
  if(!items.length){ list.innerHTML = `<div class="text-center text-secondary py-5">ยังไม่มีกระทู้</div>`; return; }
  for(const t of items){
    const card = document.createElement("article"); card.className="thread-card p-3";
    const avatar = t?.author?.avatar || "https://api.dicebear.com/7.x/thumbs/svg?seed=user";
    const name = t?.author?.name || "ผู้ใช้";
    const when = new Date(t?.created_at || Date.now()).toLocaleString();
    const cats = (t?.categories||[]).map(c=>typeof c==="string"?c:(c.name||c.slug)).filter(Boolean);
    card.innerHTML = `
      <div class="d-flex align-items-start gap-3">
        <img src="${avatar}" class="rounded-circle flex-shrink-0" width="44" height="44" alt="avatar">
        <div class="flex-grow-1">
          <h5 class="mb-1">${escapeHTML(t?.title || "(ไม่มีหัวข้อ)")}</h5>
          <div class="text-secondary small mb-2">โดย <strong>${escapeHTML(name)}</strong> · ${when}</div>
          <div class="mb-2 text-truncate-2">${escapeHTML((t?.body||"").slice(0,240))}</div>
          <div class="d-flex flex-wrap gap-2">
            ${cats.map(c=>`<span class="badge rounded-pill badge-hash">#${escapeHTML(c)}</span>`).join("")}
          </div>
        </div>
        <div class="text-nowrap text-secondary small"><i class="bi bi-chat-left"></i> ${t?.replies_count ?? 0}</div>
      </div>`;
    card.querySelectorAll(".badge").forEach(b=>b.addEventListener("click",e=>{
      const text = e.currentTarget.textContent.trim(); loadThreads({page:1, category:text.replace(/^#/,"")});
    }));
    list.append(card);
  }
}
function renderPager(current,total){
  const pager=$("#pager"); pager.innerHTML=""; if(total<=1) return;
  const li=(p,label=p,dis=false,act=false)=>{ const li=document.createElement("li");
    li.className=`page-item ${dis?"disabled":""} ${act?"active":""}`; const a=document.createElement("a");
    a.className="page-link"; a.href="#"; a.textContent=label; a.onclick=e=>{e.preventDefault();loadThreads({page:p});};
    li.append(a); return li; };
  pager.append(li(current-1,"«",current<=1));
  for(let i=1;i<=total;i++) pager.append(li(i,String(i),false,i===current));
  pager.append(li(current+1,"»",current>=total));
}


/* ========= 🧯 DOM (จัดการเหตุการณ์) ========= */
document.addEventListener("DOMContentLoaded", async ()=>{
  // 1. โหลดสถานะผู้ใช้และข้อมูลเริ่มต้น
  authToken = localStorage.getItem("token") || null;
  // ดึงข้อมูลผู้ใช้ถ้ามี Token และโหลดข้อมูลหลักของหน้า
  await Promise.allSettled([fetchMe(), loadCategories(), loadThreads(), loadStats()]);

  // 2. จัดการฟอร์มค้นหา
  $("#searchForm").addEventListener("submit",(e)=>{ 
    e.preventDefault(); 
    loadThreads({page:1, q:$("#searchInput").value.trim()}); 
  });
  
  // 3. จัดการปุ่ม Logout
  $("#btnLogout").addEventListener("click",logout);
  
  // 4. จัดการปุ่ม Profile (MVP)
  $("#btnOpenProfile").addEventListener("click",()=>showToast("หน้าโปรไฟล์จะมาเร็วๆ นี้","bg-primary"));

  // 5. จัดการฟอร์ม Login
  $("#loginForm").addEventListener("submit", async e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget);
    try{ 
      await login(fd.get("email"), fd.get("password")); 
      // ปิด Modal หลัง Login สำเร็จ
      window.bootstrap.Modal.getOrCreateInstance("#authModal").hide(); 
    }catch(err){ 
      console.error(err); 
      showToast(`เข้าสู่ระบบไม่สำเร็จ: ${err.message}`,"bg-danger"); 
    }
  });

  // 6. จัดการฟอร์ม Register
  $("#registerForm").addEventListener("submit", async e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget);
    try{ 
      await register(fd.get("name"), fd.get("email"), fd.get("password")); 
      // ปิด Modal หลังสมัครสำเร็จ
      window.bootstrap.Modal.getOrCreateInstance("#authModal").hide(); 
    }catch(err){ 
      console.error(err); 
      showToast(`สมัครไม่สำเร็จ: ${err.message}`,"bg-danger"); 
    }
  });

  // 7. จัดการฟอร์ม สร้างกระทู้
  $("#newThreadForm").addEventListener("submit", async e=>{
    e.preventDefault(); 
    if(!authToken){ showToast("กรุณาเข้าสู่ระบบก่อนโพสต์","bg-warning"); return; }
    const fd=new FormData(e.currentTarget);
    try{
      await createThread({ 
        title:fd.get("title"), 
        body:fd.get("body"), 
        categories:fd.get("categories")||"" 
      });
      e.currentTarget.reset(); 
      window.bootstrap.Modal.getOrCreateInstance("#newThreadModal").hide(); 
      loadThreads({page:1});
    }catch(err){ 
      console.error(err); 
      showToast(`โพสต์ไม่สำเร็จ: ${err.message}`,"bg-danger"); 
    }
  });
});