/* ========= 🔧 ตั้งค่า API ========= */
// ตั้งให้เป็น URL Render ของ backend คุณ เช่น https://mini-forumbackend.onrender.com
const BASE_API_URL = (window.BASE_API_URL_OVERRIDE ?? "https://your-backend.onrender.com").replace(/\/+$/,"");
const DEFAULT_HEADERS = { "Content-Type": "application/json", "X-API-Version": "v1" };
let authToken = null;

/* ========= 🧰 Utils ========= */
const $ = (s, el=document)=>el.querySelector(s);
const $$ = (s, el=document)=>[...el.querySelectorAll(s)];
const toastEl = $("#toast");
const toastBody = $("#toastBody");
const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2800 });

function showToast(msg, variant="bg-primary"){
  toastEl.className = `toast text-white ${variant}`;
  toastBody.textContent = msg;
  toast.show();
}

function api(path, options={}){
  return fetch(`${BASE_API_URL}${path}`, {
    ...options,
    headers: { ...DEFAULT_HEADERS, ...(authToken?{Authorization:`Bearer ${authToken}`}:{}) , ...(options.headers||{}) }
  }).then(async res=>{
    const text = await res.text(); let data=null; try{ data = text?JSON.parse(text):null; }catch{}
    if(!res.ok){ throw new Error(data?.error || data?.message || `HTTP ${res.status}`); }
    return data;
  });
}

/* ========= 📦 Loaders ========= */
async function loadThreads({page=1,q="",category=""}={}){
  const params = new URLSearchParams();
  if(page) params.set("page", page);
  if(q) params.set("q", q);
  if(category) params.set("category", category.replace(/^#/, ""));
  const data = await api(`/api/threads?${params.toString()}`, { method:"GET" });
  renderThreads(data?.items||[]);
  renderPager(data?.page||1, data?.total_pages||1);
  $("#statThreads").textContent = data?.total_items ?? "—";
}
async function loadCategories(){
  const items = await api(`/api/categories`, { method:"GET" });
  renderCategories(Array.isArray(items)?items:[]);
}
async function loadStats(){
  try{
    const s = await api(`/api/stats`, { method:"GET" });
    $("#statUsers").textContent = s?.users ?? "—";
    $("#statComments").textContent = s?.comments ?? "—";
  }catch{}
}

/* ========= 🧑‍🎤 Auth ========= */
async function fetchMe(){
  try{ const me = await api(`/api/auth/me`, {method:"GET"}); setLoggedIn(me); }
  catch{ setLoggedOut(); }
}
function setLoggedIn(me){
  authToken = localStorage.getItem("token") || authToken;
  $("#navAuthButtons").hidden = true;
  $("#navUserDropdown").hidden = false;
  $("#navDisplayName").textContent = me?.name || "ผู้ใช้";
  $("#navAvatar").src = me?.avatar || "https://api.dicebear.com/7.x/identicon/svg?seed=user";
}
function setLoggedOut(){
  authToken = null; localStorage.removeItem("token");
  $("#navAuthButtons").hidden = false; $("#navUserDropdown").hidden = true;
}
async function login(email,password){
  const data = await api(`/api/auth/login`, {method:"POST", body:JSON.stringify({email,password})});
  authToken = data?.token || null; if(authToken) localStorage.setItem("token", authToken);
  setLoggedIn(data?.user); showToast("เข้าสู่ระบบสำเร็จ","bg-success");
}
async function register(name,email,password){
  const data = await api(`/api/auth/register`, {method:"POST", body:JSON.stringify({name,email,password})});
  if(data?.token){ authToken=data.token; localStorage.setItem("token",authToken); setLoggedIn(data?.user); }
  showToast("สมัครสมาชิกสำเร็จ","bg-success");
}

/* ========= ✍️ Threads ========= */
async function createThread({title,body,categories}){
  const payload = {
    title, body,
    categories: (categories||"").split(/\s+/).filter(Boolean).map(s=>s.replace(/^#/,""))
  };
  const data = await api(`/api/threads`, { method:"POST", body:JSON.stringify(payload) });
  showToast("สร้างกระทู้แล้ว","bg-success");
  return data;
}

/* ========= 🖼️ Render ========= */
function renderCategories(items){
  const wrap = $("#categoriesBar"); wrap.innerHTML = "";
  wrap.append(elCategoryButton({name:"ทั้งหมด", value:""}));
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

/* ========= 🧯 DOM ========= */
document.addEventListener("DOMContentLoaded", async ()=>{
  authToken = localStorage.getItem("token") || null;
  await Promise.allSettled([fetchMe(), loadCategories(), loadThreads(), loadStats()]);

  $("#searchForm").addEventListener("submit",(e)=>{ e.preventDefault(); loadThreads({page:1, q:$("#searchInput").value.trim()}); });
  $("#btnLogout").addEventListener("click",()=>{ setLoggedOut(); showToast("ออกจากระบบแล้ว","bg-secondary"); });
  $("#btnOpenProfile").addEventListener("click",()=>showToast("หน้าโปรไฟล์จะมาเร็วๆ นี้","bg-primary"));

  $("#loginForm").addEventListener("submit", async e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget);
    try{ await login(fd.get("email"), fd.get("password")); bootstrap.Modal.getOrCreateInstance("#authModal").hide(); }
    catch(err){ console.error(err); showToast(`เข้าสู่ระบบไม่สำเร็จ: ${err.message}`,"bg-danger"); }
  });

  $("#registerForm").addEventListener("submit", async e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget);
    try{ await register(fd.get("name"), fd.get("email"), fd.get("password")); bootstrap.Modal.getOrCreateInstance("#authModal").hide(); }
    catch(err){ console.error(err); showToast(`สมัครไม่สำเร็จ: ${err.message}`,"bg-danger"); }
  });

  $("#newThreadForm").addEventListener("submit", async e=>{
    e.preventDefault(); if(!authToken){ showToast("กรุณาเข้าสู่ระบบก่อนโพสต์","bg-warning"); return; }
    const fd=new FormData(e.currentTarget);
    try{
      await createThread({ title:fd.get("title"), body:fd.get("body"), categories:fd.get("categories")||"" });
      e.currentTarget.reset(); bootstrap.Modal.getOrCreateInstance("#newThreadModal").hide(); loadThreads({page:1});
    }catch(err){ console.error(err); showToast(`โพสต์ไม่สำเร็จ: ${err.message}`,"bg-danger"); }
  });
});

/* ========= 🔒 Helper ========= */
function escapeHTML(s){ return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
