/* Generates a complete, self-contained HTML file from section data + theme */

import { SectionData } from './section-data';
import { Theme, DEFAULT_THEME } from './themes';

interface SectionEntry { typeId: string; data: SectionData }
function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// Compute dynamic navbar links from sections
function getNavLinks(sections: SectionEntry[]): { label: string; anchor: string }[] {
  const map: Record<string, string> = { hero: "Home", features: "Features", testimonials: "Testimonials", pricing: "Pricing", products: "Products", team: "Team", stats: "Stats", blog: "Blog", services: "Services", cta: "CTA", faq: "FAQ", gallery: "Gallery", contact: "Contact" };
  return sections.filter(s => map[s.typeId]).map(s => ({ label: map[s.typeId], anchor: s.typeId }));
}

function renderNavbar(d: SectionData, t: Theme, sections: SectionEntry[]) {
  const links = d.links === "auto" ? getNavLinks(sections) : (d.links as string[]).map(l => ({ label: l, anchor: l.toLowerCase() }));
  const navItems = links.map(l => `<a href="#${l.anchor}" style="color:${t.muted};text-decoration:none;font-size:14px;transition:color .2s">${esc(l.label)}</a>`).join('\n            ');
  return `<nav style="background:${t.bgAlt};padding:16px 40px;border-bottom:1px solid ${t.border};position:sticky;top:0;z-index:100;backdrop-filter:blur(12px)">
    <div style="display:flex;align-items:center;justify-content:space-between;max-width:1100px;margin:auto">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:32px;height:32px;border-radius:8px;background:${t.accent};display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:13px">${esc((d.brand as string)[0] || 'M')}</div>
        <span style="font-weight:600;color:${t.text};font-size:15px">${esc(d.brand)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:24px">
        ${navItems}
        <a href="#" style="padding:8px 16px;background:${t.accent};border-radius:8px;color:#fff;text-decoration:none;font-size:13px;font-weight:500">${esc(d.ctaText)}</a>
      </div>
    </div>
  </nav>`;
}

function renderHero(d: SectionData, t: Theme) {
  return `<section id="hero" style="background:linear-gradient(135deg,${t.gradient},${t.gradientEnd});padding:80px 40px;text-align:center;position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,${t.accentLight},transparent 60%)"></div>
    <div style="position:relative;z-index:1;max-width:700px;margin:auto">
      <span style="display:inline-block;padding:6px 14px;background:${t.accentLight};border:1px solid ${t.accent}33;border-radius:20px;font-size:13px;color:${t.accent};margin-bottom:20px">${esc(d.badge)}</span>
      <h1 style="font-size:42px;font-weight:800;color:${t.text};margin:0 0 16px">${esc(d.heading)} <span style="color:${t.accent}">${esc(d.headingHighlight)}</span></h1>
      <p style="font-size:17px;color:${t.muted};margin:0 0 32px;line-height:1.6">${esc(d.description)}</p>
      <div style="display:flex;gap:12px;justify-content:center">
        <a href="#" style="padding:12px 28px;background:${t.accent};border-radius:10px;color:#fff;text-decoration:none;font-weight:600;font-size:15px">${esc(d.primaryBtn)}</a>
        <a href="#" style="padding:12px 28px;border:1px solid ${t.border};border-radius:10px;color:${t.text};text-decoration:none;font-size:15px">${esc(d.secondaryBtn)}</a>
      </div>
    </div>
  </section>`;
}

function renderFeatures(d: SectionData, t: Theme) {
  const cards = (d.items as any[]).map(it => `<div style="padding:24px;background:${t.card};border:1px solid ${t.border};border-radius:14px;text-align:center"><div style="font-size:32px;margin-bottom:12px">${it.icon}</div><div style="font-weight:600;color:${t.text};font-size:15px;margin-bottom:6px">${esc(it.label)}</div><div style="font-size:13px;color:${t.muted}">${esc(it.desc)}</div></div>`).join('');
  return `<section id="features" style="background:${t.bg};padding:60px 40px"><div style="max-width:1100px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2><p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${cards}</div></div></section>`;
}

function renderTestimonials(d: SectionData, t: Theme) {
  const cards = (d.items as any[]).map(x => `<div style="padding:24px;background:${t.card};border:1px solid ${t.border};border-radius:14px"><div style="margin-bottom:12px;color:#eab308">★★★★★</div><p style="font-size:14px;color:${t.muted};font-style:italic;margin:0 0 16px">"${esc(x.text)}"</p><div style="display:flex;align-items:center;gap:10px"><div style="width:32px;height:32px;border-radius:50%;background:${t.accent}"></div><div><div style="font-size:13px;font-weight:600;color:${t.text}">${esc(x.name)}</div><div style="font-size:11px;color:${t.muted}">${esc(x.role)}</div></div></div></div>`).join('');
  return `<section id="testimonials" style="background:${t.bgAlt};padding:60px 40px"><div style="max-width:1100px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2><p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px">${cards}</div></div></section>`;
}

function renderPricing(d: SectionData, t: Theme) {
  const cards = (d.plans as any[]).map(p => {
    const feats = (p.features as string[]).map(f => `<div style="font-size:13px;color:${t.muted};padding:4px 0">✓ ${esc(f)}</div>`).join('');
    const border = p.popular ? `border:2px solid ${t.accent};background:${t.accentLight}` : `border:1px solid ${t.border};background:${t.card}`;
    return `<div style="padding:28px;border-radius:14px;text-align:center;${border}">${p.popular ? `<span style="font-size:10px;background:${t.accent};color:#fff;padding:3px 10px;border-radius:10px;font-weight:600">POPULAR</span>` : ''}<div style="font-size:15px;font-weight:600;color:${t.text};margin-top:8px">${esc(p.name)}</div><div style="font-size:36px;font-weight:800;color:${t.text};margin:8px 0 4px">${esc(p.price)}</div><div style="font-size:12px;color:${t.muted};margin-bottom:16px">${esc(p.period)}</div>${feats}</div>`;
  }).join('');
  return `<section id="pricing" style="background:${t.bg};padding:60px 40px"><div style="max-width:900px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2><p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${cards}</div></div></section>`;
}

function renderCTA(d: SectionData, t: Theme) {
  return `<section id="cta" style="background:linear-gradient(90deg,${t.accent},${t.accentHover});padding:64px 40px;text-align:center"><h2 style="font-size:30px;font-weight:700;color:#fff;margin:0 0 12px">${esc(d.title)}</h2><p style="font-size:16px;color:rgba(255,255,255,.8);margin:0 0 28px;max-width:500px;display:inline-block">${esc(d.description)}</p><br/><a href="#" style="display:inline-block;padding:14px 32px;background:#fff;border-radius:10px;color:${t.accent};text-decoration:none;font-weight:700;font-size:15px">${esc(d.btnText)}</a></section>`;
}

function renderFAQ(d: SectionData, t: Theme) {
  const items = (d.items as any[]).map(it => `<div style="padding:16px;background:${t.card};border:1px solid ${t.border};border-radius:10px"><div style="font-size:14px;font-weight:600;color:${t.text};margin-bottom:6px">${esc(it.q)}</div><div style="font-size:13px;color:${t.muted}">${esc(it.a)}</div></div>`).join('');
  return `<section id="faq" style="background:${t.bgAlt};padding:60px 40px"><div style="max-width:700px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2><p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p><div style="display:flex;flex-direction:column;gap:10px;text-align:left">${items}</div></div></section>`;
}

function renderGallery(d: SectionData, t: Theme) {
  const grads: Record<string, string> = { 'from-blue-500 to-purple-600': 'linear-gradient(135deg,#3b82f6,#9333ea)', 'from-green-500 to-teal-600': 'linear-gradient(135deg,#22c55e,#0d9488)', 'from-orange-500 to-red-600': 'linear-gradient(135deg,#f97316,#dc2626)', 'from-pink-500 to-rose-600': 'linear-gradient(135deg,#ec4899,#e11d48)', 'from-indigo-500 to-blue-600': 'linear-gradient(135deg,#6366f1,#2563eb)', 'from-yellow-500 to-amber-600': 'linear-gradient(135deg,#eab308,#d97706)' };
  const cells = (d.gradients as string[]).map(g => `<div style="aspect-ratio:1;border-radius:10px;background:${grads[g] || 'linear-gradient(135deg,#3b82f6,#8b5cf6)'};opacity:.85"></div>`).join('');
  return `<section id="gallery" style="background:${t.bg};padding:60px 40px"><div style="max-width:1100px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2><p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${cells}</div></div></section>`;
}

function renderContact(d: SectionData, t: Theme) {
  const fields = (d.fields as string[]).map(f => `<input placeholder="${esc(f)}" style="width:100%;padding:10px 14px;background:${t.card};border:1px solid ${t.border};border-radius:8px;color:${t.text};font-size:14px;outline:none;box-sizing:border-box" />`).join('');
  return `<section id="contact" style="background:${t.bgAlt};padding:60px 40px"><div style="max-width:480px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2><p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p><form onsubmit="return false" style="display:flex;flex-direction:column;gap:10px;text-align:left">${fields}<textarea placeholder="${esc(d.messageLabel)}" rows="4" style="width:100%;padding:10px 14px;background:${t.card};border:1px solid ${t.border};border-radius:8px;color:${t.text};font-size:14px;outline:none;resize:vertical;box-sizing:border-box"></textarea><button style="padding:12px;background:${t.accent};border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:600;cursor:pointer">${esc(d.btnText)}</button></form></div></section>`;
}

function renderFooter(d: SectionData, t: Theme) {
  const cols = (d.columns as any[]).map(c => {
    const links = (c.links as string[]).map(l => `<a href="#" style="display:block;font-size:13px;color:${t.muted};text-decoration:none;margin-bottom:6px">${esc(l)}</a>`).join('');
    return `<div><div style="font-size:14px;font-weight:600;color:${t.text};margin-bottom:12px">${esc(c.title)}</div>${links}</div>`;
  }).join('');
  return `<footer style="background:${t.bgAlt};padding:40px 40px 24px;border-top:1px solid ${t.border}"><div style="max-width:1100px;margin:auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px;margin-bottom:24px"><div><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><div style="width:28px;height:28px;border-radius:6px;background:${t.accent};display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:11px">${esc((d.brand as string)[0] || 'M')}</div><span style="font-size:14px;font-weight:600;color:${t.text}">${esc(d.brand)}</span></div><p style="font-size:13px;color:${t.muted}">${esc(d.tagline)}</p></div>${cols}</div><div style="border-top:1px solid ${t.border};padding-top:16px"><span style="font-size:12px;color:${t.muted}">${esc(d.copyright)}</span></div></footer>`;
}

function renderCustom(d: SectionData, t: Theme) {
  return `<section style="background:${d.bgColor || t.bg};padding:60px 40px"><div style="max-width:900px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 16px">${esc(d.title)}</h2><p style="font-size:16px;color:${t.muted};line-height:1.7">${esc(d.body)}</p></div></section>`;
}

function renderAIGenerated(d: SectionData) {
  return d.htmlContent || '';
}

function renderChatbot(d: SectionData, t: Theme) {
  if (!d.apiKey) return '<!-- Chatbot: no API key provided -->';
  const pos = d.position === 'bottom-left' ? 'left:24px' : 'right:24px';
  return `
<!-- Floating Gemini Chatbot Widget -->
<div id="chatbot-toggle" onclick="toggleChat()" style="position:fixed;bottom:24px;${pos};width:56px;height:56px;border-radius:50%;background:${d.accentColor || t.accent};cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.4);z-index:9999;transition:transform .2s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/></svg>
</div>
<div id="chatbot-panel" style="display:none;position:fixed;bottom:92px;${pos};width:380px;max-height:500px;background:${t.card};border:1px solid ${t.border};border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.5);z-index:9999;overflow:hidden;flex-direction:column">
  <div style="padding:16px;border-bottom:1px solid ${t.border};display:flex;align-items:center;gap:10px">
    <div style="width:32px;height:32px;border-radius:50%;background:${d.accentColor || t.accent};display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/></svg></div>
    <div><div style="font-size:14px;font-weight:600;color:${t.text}">${esc(d.botName)}</div><div style="font-size:11px;color:${t.muted}">Powered by Gemini</div></div>
    <div style="margin-left:auto;cursor:pointer;color:${t.muted}" onclick="toggleChat()">✕</div>
  </div>
  <div id="chat-messages" style="flex:1;padding:16px;overflow-y:auto;max-height:340px;display:flex;flex-direction:column;gap:8px">
    <div style="background:${t.accentLight};color:${t.text};padding:10px 14px;border-radius:12px 12px 12px 4px;font-size:13px;max-width:85%;align-self:flex-start">${esc(d.welcomeMessage)}</div>
  </div>
  <div style="padding:12px;border-top:1px solid ${t.border};display:flex;gap:8px">
    <input id="chat-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendChat()" style="flex:1;padding:8px 12px;background:${t.bgAlt};border:1px solid ${t.border};border-radius:8px;color:${t.text};font-size:13px;outline:none" />
    <button onclick="sendChat()" style="padding:8px 14px;background:${d.accentColor || t.accent};border:none;border-radius:8px;color:#fff;font-size:13px;cursor:pointer;font-weight:500">Send</button>
  </div>
</div>
<script>
function toggleChat(){var p=document.getElementById('chatbot-panel');p.style.display=p.style.display==='none'?'flex':'none'}
async function sendChat(){
  var input=document.getElementById('chat-input'),msg=input.value.trim();if(!msg)return;input.value='';
  var msgs=document.getElementById('chat-messages');
  msgs.innerHTML+='<div style="background:${t.border};color:${t.text};padding:10px 14px;border-radius:12px 12px 4px 12px;font-size:13px;max-width:85%;align-self:flex-end">'+msg.replace(/</g,'&lt;')+'</div>';
  msgs.innerHTML+='<div id="typing" style="color:${t.muted};font-size:12px;padding:6px">Thinking...</div>';
  msgs.scrollTop=msgs.scrollHeight;
   try{
    var r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${esc(d.apiKey)}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system_instruction:{parts:[{text:${JSON.stringify(d.systemPrompt)}}]},contents:[{parts:[{text:msg}]}]})});
    var data=await r.json();
    if(data.error){document.getElementById('typing')?.remove();msgs.innerHTML+='<div style="color:#ef4444;font-size:12px;padding:6px">API Error: '+data.error.message+'</div>';msgs.scrollTop=msgs.scrollHeight;return;}
    var reply=data.candidates?.[0]?.content?.parts?.[0]?.text||'Sorry, I could not respond.';
    document.getElementById('typing')?.remove();
    msgs.innerHTML+='<div style="background:${t.accentLight};color:${t.text};padding:10px 14px;border-radius:12px 12px 12px 4px;font-size:13px;max-width:85%;align-self:flex-start">'+reply.replace(/</g,'&lt;')+'</div>';
  }catch(e){document.getElementById('typing')?.remove();msgs.innerHTML+='<div style="color:#ef4444;font-size:12px;padding:6px">Error: '+e.message+'</div>';}
  msgs.scrollTop=msgs.scrollHeight;
}
</script>`;
}

function renderProducts(d: SectionData, t: Theme) {
  const cards = (d.items as any[]).map(p => {
    const badge = p.badge ? `<span style="position:absolute;top:12px;left:12px;padding:4px 10px;background:${t.accent};color:#fff;font-size:11px;font-weight:600;border-radius:20px">${esc(p.badge)}</span>` : '';
    return `<div style="background:${t.card};border:1px solid ${t.border};border-radius:14px;overflow:hidden;transition:transform .2s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
      <div style="position:relative"><img src="${esc(p.image)}" alt="${esc(p.name)}" style="width:100%;height:200px;object-fit:cover" onerror="this.style.background='${t.bgAlt}';this.style.height='200px'" />${badge}</div>
      <div style="padding:16px"><div style="font-size:15px;font-weight:600;color:${t.text};margin-bottom:4px">${esc(p.name)}</div><div style="font-size:20px;font-weight:700;color:${t.accent};margin-bottom:8px">${esc(p.price)}</div><div style="font-size:13px;color:${t.muted};margin-bottom:12px">${esc(p.desc)}</div><a href="#" style="display:inline-block;padding:8px 18px;background:${t.accent};border-radius:8px;color:#fff;text-decoration:none;font-size:13px;font-weight:500">${esc(d.btnText || 'Shop Now')}</a></div>
    </div>`;
  }).join('');
  return `<section id="products" style="background:${t.bg};padding:60px 40px"><div style="max-width:1100px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2><p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px;text-align:left">${cards}</div></div></section>`;
}

function renderTeam(d: SectionData, t: Theme) {
  const cards = (d.items as any[]).map(m => `<div style="background:${t.card};border:1px solid ${t.border};border-radius:14px;padding:28px;text-align:center;transition:transform .2s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
    <img src="${esc(m.image)}" alt="${esc(m.name)}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;margin:0 auto 16px;border:3px solid ${t.border}" onerror="this.style.background='linear-gradient(135deg,${t.accent},${t.accentHover})';this.alt=''" />
    <div style="font-size:16px;font-weight:600;color:${t.text};margin-bottom:4px">${esc(m.name)}</div>
    <div style="font-size:13px;color:${t.accent};margin-bottom:8px">${esc(m.role)}</div>
    <div style="font-size:13px;color:${t.muted}">${esc(m.bio)}</div>
  </div>`).join('');
  return `<section id="team" style="background:${t.bgAlt};padding:60px 40px"><div style="max-width:1100px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2><p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px">${cards}</div></div></section>`;
}

function renderStats(d: SectionData, t: Theme) {
  const items = (d.items as any[]).map(s => `<div style="text-align:center;padding:24px">
    <div style="font-size:32px;margin-bottom:8px">${s.icon}</div>
    <div style="font-size:36px;font-weight:800;color:${t.text};margin-bottom:4px">${esc(s.value)}</div>
    <div style="font-size:14px;color:${t.muted}">${esc(s.label)}</div>
  </div>`).join('');
  return `<section id="stats" style="background:linear-gradient(135deg,${t.gradient},${t.gradientEnd});padding:60px 40px"><div style="max-width:1100px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2><p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">${items}</div></div></section>`;
}

function renderBlog(d: SectionData, t: Theme) {
  const cards = (d.items as any[]).map(b => `<div style="background:${t.card};border:1px solid ${t.border};border-radius:14px;overflow:hidden;transition:transform .2s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
    <div style="position:relative"><img src="${esc(b.image)}" alt="${esc(b.title)}" style="width:100%;height:180px;object-fit:cover" onerror="this.style.background='${t.bgAlt}';this.style.height='180px'" /><span style="position:absolute;top:12px;left:12px;padding:4px 10px;background:${t.accent}cc;color:#fff;font-size:11px;font-weight:600;border-radius:20px">${esc(b.tag)}</span></div>
    <div style="padding:16px"><div style="font-size:15px;font-weight:600;color:${t.text};margin-bottom:8px">${esc(b.title)}</div><div style="font-size:13px;color:${t.muted};margin-bottom:12px;line-height:1.5">${esc(b.excerpt)}</div><div style="font-size:12px;color:${t.muted}">${esc(b.date)}</div></div>
  </div>`).join('');
  return `<section id="blog" style="background:${t.bg};padding:60px 40px"><div style="max-width:1100px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2><p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;text-align:left">${cards}</div>${d.btnText ? `<div style="margin-top:36px"><a href="#" style="display:inline-block;padding:12px 28px;border:1px solid ${t.border};border-radius:10px;color:${t.text};text-decoration:none;font-size:14px;font-weight:500">${esc(d.btnText)}</a></div>` : ''}</div></section>`;
}

function renderServices(d: SectionData, t: Theme) {
  const cards = (d.items as any[]).map(s => `<div style="background:${t.card};border:1px solid ${t.border};border-radius:14px;padding:28px;transition:transform .2s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
    <div style="font-size:36px;margin-bottom:16px">${s.icon}</div>
    <div style="font-size:17px;font-weight:600;color:${t.text};margin-bottom:8px">${esc(s.title)}</div>
    <div style="font-size:14px;color:${t.muted};margin-bottom:16px;line-height:1.5">${esc(s.desc)}</div>
    <a href="#" style="font-size:13px;color:${t.accent};text-decoration:none;font-weight:500">${esc(s.btnText)} →</a>
  </div>`).join('');
  return `<section id="services" style="background:${t.bgAlt};padding:60px 40px"><div style="max-width:1100px;margin:auto;text-align:center"><h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2><p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px;text-align:left">${cards}</div></div></section>`;
}

function renderDataAI(d: SectionData, t: Theme) {
  const match = (d.sheetUrl || "").match(/\/d\/([a-zA-Z0-9_-]+)/);
  const sheetId = match ? match[1] : '';
  const sectionId = `data-ai-${Math.random().toString(36).slice(2, 7)}`;
  const design = d.design as any;

  return `
<section id="data-ai" style="background:${t.bg};padding:60px 40px">
  <div style="max-width:1100px;margin:auto;text-align:center">
    <h2 style="font-size:28px;font-weight:700;color:${t.text};margin:0 0 8px">${esc(d.title)}</h2>
    <p style="font-size:14px;color:${t.muted};margin:0 0 36px">${esc(d.subtitle)}</p>
    <div id="${sectionId}-container" class="${design?.containerStyle || 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'}">
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:${t.muted};font-size:14px">Loading live data...</div>
    </div>
  </div>
</section>

<script>
(async function() {
  const container = document.getElementById('${sectionId}-container');
  const sheetId = '${sheetId}';
  if (!sheetId) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#ef4444">Invalid Google Sheets URL</div>';
    return;
  }

  try {
    const res = await fetch(\`https://docs.google.com/spreadsheets/d/\${sheetId}/gviz/tq?tqx=out:csv\`);
    const text = await res.text();
    const lines = text.split('\\n').filter(l => l.trim());
    if (lines.length < 2) throw new Error('No data found');

    const parseCSV = (line) => {
      const result = []; let curr = ''; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"' && line[i+1] === '"') { curr += '"'; i++; }
        else if (line[i] === '"') inQ = !inQ;
        else if (line[i] === ',' && !inQ) { result.push(curr); curr = ''; }
        else curr += line[i];
      }
      result.push(curr); return result;
    };

    const toSlug = (s) => s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const headers = parseCSV(lines[0]).map(h => toSlug(h.trim()));
    const data = lines.slice(1).map(l => {
      const vals = parseCSV(l);
      const obj = {}; headers.forEach((h, i) => { if(h) obj[h] = vals[i] || ''; });
      return obj;
    });

    const cardHtml = ${JSON.stringify(design?.cardHtml || '')};
    const curr = ${JSON.stringify(d.currency || '$')};
    const btn = ${JSON.stringify(d.btnText || 'View')};

    container.innerHTML = data.map(row => {
      if (cardHtml) {
        let html = cardHtml;
        Object.keys(row).forEach(key => {
          const val = String(row[key] || '').replace(/\\$/g, '$$$$');
          html = html.replace(new RegExp(\`{{\${key}}}\`, 'g'), val);
        });
        return html;
      }
      return \`
        <div style="background:${t.card};border:1px solid ${t.border};border-radius:14px;overflow:hidden;padding:16px">
          <div style="font-size:15px;font-weight:600;color:${t.text};margin-bottom:4px">\${row[Object.keys(row)[0]] || ''}</div>
        </div>
      \`;
    }).join('');
  } catch (e) {
    console.error('Data AI Error:', e);
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#ef4444;padding:20px;border:1px solid #ef444433;border-radius:12px">Failed to load live data: ' + e.message + '</div>';
  }
})();
</script>
`;
}

const RENDERERS: Record<string, (d: SectionData, t: Theme, sections?: SectionEntry[]) => string> = {
  navbar: (d, t, s) => renderNavbar(d, t, s || []),
  hero: renderHero, features: renderFeatures, testimonials: renderTestimonials,
  pricing: renderPricing, products: renderProducts, team: renderTeam,
  stats: renderStats, blog: renderBlog, services: renderServices,
  data: (d, t) => renderDataAI(d, t), // Alias for backward compatibility if needed
  "data-ai": renderDataAI,
  cta: renderCTA, faq: renderFAQ, gallery: renderGallery,
  contact: renderContact, footer: renderFooter, custom: renderCustom,
  "ai-generated": (d) => renderAIGenerated(d),
  chatbot: renderChatbot,
};

export function generateFullHTML(sections: SectionEntry[], theme?: Theme): string {
  const t = theme || DEFAULT_THEME;
  const body = sections.map(s => RENDERERS[s.typeId]?.(s.data, t, sections) ?? '').join('\n\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>My Website</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com"></script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; background: ${t.bg}; color: ${t.text}; -webkit-font-smoothing: antialiased; }
a:hover { opacity: .85; }
img { max-width: 100%; display: block; }
html { scroll-behavior: smooth; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
