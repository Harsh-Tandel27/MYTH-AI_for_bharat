"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, Trash2, GripVertical, Plus, Download, Menu, Star, Zap, MessageSquare, DollarSign, HelpCircle, Phone, Layout, ChevronUp, Image, Rocket, Loader2, ExternalLink, Copy, Check, Code, Sparkles, X, Bot, Palette, PenLine, Wand2, Save, FolderOpen, Clock, MoreVertical, Edit3, Globe, ShoppingBag, Users, BarChart3, FileText, Briefcase, ImageIcon, Database } from "lucide-react";
import Link from "next/link";
import { DEFAULT_SECTION_DATA, SECTION_TYPE_META, type SectionData } from "./section-data";
import { generateFullHTML } from "./generate-html";
import { THEMES, type Theme, DEFAULT_THEME } from "./themes";

interface SavedProject {
  id: string;
  name: string;
  themeId: string;
  sections: { id: string; typeId: string; data: Record<string, any> }[] | null;
  createdAt: string;
  updatedAt: string;
}

/* ───── Types ───── */
interface DroppedSection { uid: string; typeId: string; data: SectionData }

const ICONS: Record<string, React.ReactNode> = {
  navbar: <Menu className="h-5 w-5" />, hero: <Zap className="h-5 w-5" />, features: <Layout className="h-5 w-5" />,
  testimonials: <MessageSquare className="h-5 w-5" />, pricing: <DollarSign className="h-5 w-5" />,
  products: <ShoppingBag className="h-5 w-5" />, team: <Users className="h-5 w-5" />, stats: <BarChart3 className="h-5 w-5" />,
  blog: <FileText className="h-5 w-5" />, services: <Briefcase className="h-5 w-5" />,
  "data-ai": <Database className="h-5 w-5" />,
  cta: <Star className="h-5 w-5" />, faq: <HelpCircle className="h-5 w-5" />, gallery: <Image className="h-5 w-5" />,
  contact: <Phone className="h-5 w-5" />, footer: <ChevronUp className="h-5 w-5" />,
  chatbot: <Bot className="h-5 w-5" />, custom: <PenLine className="h-5 w-5" />, "ai-generated": <Wand2 className="h-5 w-5" />,
};

const SIDEBAR_SECTION_IDS = ["navbar","hero","features","testimonials","pricing","products","team","stats","blog","services","cta","faq","gallery","contact","footer"];

/* ───── Editable Text ───── */
function ET({ value, onChange, className, tag }: { value: string; onChange: (v: string) => void; className?: string; tag?: string }) {
  const ref = useRef<HTMLElement>(null);
  const handleBlur = () => { if (ref.current) { const t = ref.current.innerText.trim(); if (t !== value) onChange(t); } };
  const Tag = (tag || "span") as any;
  return <Tag ref={ref} contentEditable suppressContentEditableWarning onBlur={handleBlur} className={`${className||""} outline-none focus:ring-1 focus:ring-[#3b82f6]/50 rounded px-0.5 cursor-text`}>{value}</Tag>;
}

/* ───── Editable Section Previews ───── */
function EditableSectionPreview({ section, onUpdate, allSections, setImageSelector, aiEditLoading, setAiEditLoading }: { section: DroppedSection; onUpdate: (d: SectionData) => void; allSections: DroppedSection[]; setImageSelector: (v: any) => void; aiEditLoading: boolean; setAiEditLoading: (v: boolean) => void }) {
  const d = section.data;
  const set = (k: string, v: any) => onUpdate({ ...d, [k]: v });
  const setItem = (arr: string, idx: number, key: string, val: any) => { const items = [...(d[arr] as any[])]; items[idx] = { ...items[idx], [key]: val }; onUpdate({ ...d, [arr]: items }); };

  switch (section.typeId) {
    case "navbar": {
      const autoLinks = d.links === "auto";
      const displayLinks = autoLinks
        ? allSections.filter(s => ["hero","features","testimonials","pricing","cta","faq","gallery","contact"].includes(s.typeId)).map(s => SECTION_TYPE_META[s.typeId]?.label || s.typeId)
        : (d.links as string[]);
      return (
        <div className="w-full bg-[#0c0c0c] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"><span className="text-white font-bold text-xs">{(d.brand as string)[0]}</span></div>
              <ET value={d.brand} onChange={v => set("brand", v)} className="text-sm font-semibold text-[var(--foreground)]" />
            </div>
            <div className="flex items-center gap-4">
              {displayLinks.map((item, i) => <span key={i} className="text-xs text-[var(--muted-foreground)]">{item}</span>)}
              <ET value={d.ctaText} onChange={v => set("ctaText", v)} className="px-3 py-1.5 bg-[#3b82f6] rounded-lg text-xs text-white font-medium inline-block" />
            </div>
          </div>
          {autoLinks && <div className="mt-2 text-[9px] text-blue-400/60">Links auto-update from sections</div>}
        </div>
      );
    }
    case "hero":
      return (
        <div className="w-full bg-gradient-to-br from-[#0a0a1a] via-[#0c0c1f] to-[#0f0f2e] border border-[var(--border)] rounded-xl p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.12),transparent_60%)]" />
          <div className="relative z-10">
            <ET value={d.badge} onChange={v => set("badge", v)} className="inline-block px-3 py-1 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-full text-xs text-[#3b82f6] mb-4" />
            <div className="text-2xl font-bold text-[var(--foreground)] mb-3">
              <ET value={d.heading} onChange={v => set("heading", v)} className="inline" />{" "}
              <ET value={d.headingHighlight} onChange={v => set("headingHighlight", v)} className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 inline" />
            </div>
            <ET value={d.description} onChange={v => set("description", v)} tag="p" className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto mb-5 block" />
            <div className="flex items-center justify-center gap-3">
              <ET value={d.primaryBtn} onChange={v => set("primaryBtn", v)} className="px-5 py-2 bg-[#3b82f6] rounded-lg text-sm text-white font-medium inline-block" />
              <ET value={d.secondaryBtn} onChange={v => set("secondaryBtn", v)} className="px-5 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] inline-block" />
            </div>
          </div>
        </div>
      );
    case "features":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-5"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          <div className="grid grid-cols-3 gap-3">{(d.items as any[]).map((f:any,i:number)=>(
            <div key={i} className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-center">
              <div className="text-2xl mb-2">{f.icon}</div>
              <ET value={f.label} onChange={v=>setItem("items",i,"label",v)} className="text-xs font-medium text-[var(--foreground)] block" />
              <ET value={f.desc} onChange={v=>setItem("items",i,"desc",v)} tag="p" className="text-[10px] text-[var(--muted-foreground)] mt-1 block" />
            </div>
          ))}</div>
        </div>
      );
    case "testimonials":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-5"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          <div className="grid grid-cols-2 gap-3">{(d.items as any[]).map((t:any,i:number)=>(
            <div key={i} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
              <div className="flex items-center gap-1 mb-2">{[...Array(5)].map((_,j)=><Star key={j} className="h-3 w-3 fill-yellow-500 text-yellow-500" />)}</div>
              <ET value={t.text} onChange={v=>setItem("items",i,"text",v)} tag="p" className="text-xs text-[var(--muted-foreground)] italic mb-3 block" />
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" /><div><ET value={t.name} onChange={v=>setItem("items",i,"name",v)} className="text-xs font-medium text-[var(--foreground)] block leading-tight" /><ET value={t.role} onChange={v=>setItem("items",i,"role",v)} className="text-[10px] text-[var(--muted-foreground)] block" /></div></div>
            </div>
          ))}</div>
        </div>
      );
    case "pricing":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-5"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          <div className="grid grid-cols-3 gap-3">{(d.plans as any[]).map((p:any,i:number)=>(
            <div key={i} className={`p-4 rounded-xl border text-center ${p.popular?"bg-[#3b82f6]/10 border-[#3b82f6]/40":"bg-[var(--card)] border-[var(--border)]"}`}>
              {p.popular&&<span className="text-[9px] bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-medium">POPULAR</span>}
              <ET value={p.name} onChange={v=>{const pl=[...(d.plans as any[])];pl[i]={...pl[i],name:v};set("plans",pl)}} className="text-xs font-medium text-[var(--foreground)] mt-1 block" />
              <ET value={p.price} onChange={v=>{const pl=[...(d.plans as any[])];pl[i]={...pl[i],price:v};set("plans",pl)}} className="text-xl font-bold text-[var(--foreground)] my-1 block" />
              <div className="text-[10px] text-[var(--muted-foreground)] mb-2">{p.period}</div>
              {(p.features as string[]).map((f:string,j:number)=><div key={j} className="text-[10px] text-[var(--muted-foreground)]">✓ {f}</div>)}
            </div>
          ))}</div>
        </div>
      );
    case "cta":
      return (
        <div className="w-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-xl p-8 text-center">
          <ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-xl font-bold text-white mb-2 block" />
          <ET value={d.description} onChange={v=>set("description",v)} tag="p" className="text-sm text-white/80 mb-5 max-w-md mx-auto block" />
          <ET value={d.btnText} onChange={v=>set("btnText",v)} className="inline-block px-6 py-2.5 bg-white rounded-lg text-sm font-semibold text-[#3b82f6]" />
        </div>
      );
    case "faq":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-5"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          <div className="space-y-2">{(d.items as any[]).map((it:any,i:number)=>(
            <div key={i} className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
              <ET value={it.q} onChange={v=>setItem("items",i,"q",v)} className="text-xs font-medium text-[var(--foreground)] mb-1 block" />
              <ET value={it.a} onChange={v=>setItem("items",i,"a",v)} className="text-[10px] text-[var(--muted-foreground)] block" />
            </div>
          ))}</div>
        </div>
      );
    case "gallery":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-5"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          <div className="grid grid-cols-3 gap-2">{(d.gradients as string[]).map((g,i)=><div key={i} className={`aspect-square rounded-lg bg-gradient-to-br ${g} opacity-80`}/>)}</div>
        </div>
      );
    case "contact":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-5"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          <div className="max-w-sm mx-auto space-y-2">
            {(d.fields as string[]).map((f,i)=><div key={i} className="h-8 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 flex items-center"><span className="text-[10px] text-[var(--muted-foreground)]">{f}</span></div>)}
            <div className="h-16 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 pt-2"><span className="text-[10px] text-[var(--muted-foreground)]">{d.messageLabel}</span></div>
            <ET value={d.btnText} onChange={v=>set("btnText",v)} className="h-8 bg-[#3b82f6] rounded-lg flex items-center justify-center text-xs text-white font-medium w-full block text-center" />
          </div>
        </div>
      );
    case "footer":
      return (
        <div className="w-full bg-[#060606] border border-[var(--border)] rounded-xl p-6">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"><span className="text-white font-bold text-[9px]">{(d.brand as string)[0]}</span></div><ET value={d.brand} onChange={v=>set("brand",v)} className="text-xs font-semibold text-[var(--foreground)]" /></div>
              <ET value={d.tagline} onChange={v=>set("tagline",v)} tag="p" className="text-[10px] text-[var(--muted-foreground)] block" />
            </div>
            {(d.columns as any[]).map((col:any,ci:number)=>(
              <div key={ci}>
                <ET value={col.title} onChange={v=>{const c=[...(d.columns as any[])];c[ci]={...c[ci],title:v};set("columns",c)}} className="text-xs font-medium text-[var(--foreground)] block mb-2" />
                {(col.links as string[]).map((l:string,li:number)=><ET key={li} value={l} onChange={v=>{const c=[...(d.columns as any[])];const lk=[...c[ci].links];lk[li]=v;c[ci]={...c[ci],links:lk};set("columns",c)}} className="text-[10px] text-[var(--muted-foreground)] block mb-1" />)}
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] pt-3"><ET value={d.copyright} onChange={v=>set("copyright",v)} className="text-[10px] text-[var(--muted-foreground)]" /></div>
        </div>
      );
    case "chatbot":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><Bot className="h-5 w-5 text-white" /></div>
            <div><ET value={d.botName} onChange={v=>set("botName",v)} className="text-sm font-bold text-[var(--foreground)] block" /><span className="text-[10px] text-[var(--muted-foreground)]">Floating Gemini Chatbot</span></div>
          </div>
          <div className="space-y-2 text-xs">
            <div><span className="text-[var(--muted-foreground)]">System Prompt:</span><ET value={d.systemPrompt} onChange={v=>set("systemPrompt",v)} tag="p" className="text-[var(--foreground)] mt-1 block bg-[var(--card)] p-2 rounded border border-[var(--border)]" /></div>
            <div><span className="text-[var(--muted-foreground)]">API Key:</span><input type="password" value={d.apiKey||""} onChange={e=>set("apiKey",e.target.value)} placeholder="Enter Gemini API key..." className="mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)] text-xs outline-none focus:border-[#3b82f6]/50" /></div>
            <div><span className="text-[var(--muted-foreground)]">Welcome:</span><ET value={d.welcomeMessage} onChange={v=>set("welcomeMessage",v)} className="text-[var(--foreground)] ml-1" /></div>
          </div>
          {!d.apiKey && <div className="mt-3 text-[10px] text-amber-400/80">⚠ Add API key for chatbot to work in preview/deploy</div>}
        </div>
      );
    case "custom":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6 text-center">
          <ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-3 block" />
          <ET value={d.body} onChange={v=>set("body",v)} tag="p" className="text-sm text-[var(--muted-foreground)] block leading-relaxed" />
        </div>
      );
    case "products":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-5"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          <div className="grid grid-cols-2 gap-3">{(d.items as any[]).map((p:any,i:number)=>(
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="relative group cursor-pointer" onClick={() => setImageSelector({ uid: section.uid, key: "image", index: i })}>
                <img src={p.image} alt={p.name} className="w-full h-28 object-cover group-hover:opacity-80 transition-opacity" onError={(e:any)=>{e.target.style.display='none'}} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ImageIcon className="h-5 w-5 text-white" /></div>
                {p.badge && <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#f97316] text-white text-[9px] font-semibold rounded-full">{p.badge}</span>}
              </div>
              <div className="p-3">
                <ET value={p.name} onChange={v=>setItem("items",i,"name",v)} className="text-xs font-semibold text-[var(--foreground)] block mb-0.5" />
                <ET value={p.price} onChange={v=>setItem("items",i,"price",v)} className="text-sm font-bold text-[#f97316] block mb-1" />
                <ET value={p.desc} onChange={v=>setItem("items",i,"desc",v)} tag="p" className="text-[10px] text-[var(--muted-foreground)] block" />
              </div>
            </div>
          ))}</div>
        </div>
      );
    case "team":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-5"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          <div className="grid grid-cols-3 gap-3">{(d.items as any[]).map((m:any,i:number)=>(
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
              <div className="relative mx-auto w-16 h-16 mb-3 group cursor-pointer" onClick={() => setImageSelector({ uid: section.uid, key: "image", index: i })}>
                <img src={m.image} alt={m.name} className="w-16 h-16 rounded-full object-cover mx-auto group-hover:opacity-80 transition-opacity" onError={(e:any)=>{e.target.style.display='none'}} />
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ImageIcon className="h-4 w-4 text-white" /></div>
              </div>
              <ET value={m.name} onChange={v=>setItem("items",i,"name",v)} className="text-xs font-semibold text-[var(--foreground)] block" />
              <ET value={m.role} onChange={v=>setItem("items",i,"role",v)} className="text-[10px] text-[#3b82f6] block mb-1" />
              <ET value={m.bio} onChange={v=>setItem("items",i,"bio",v)} className="text-[10px] text-[var(--muted-foreground)] block" />
            </div>
          ))}</div>
        </div>
      );
    case "stats":
      return (
        <div className="w-full bg-gradient-to-r from-[#0a0a1a] via-[#0c0c1f] to-[#0f0f2e] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-5"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          <div className="grid grid-cols-4 gap-3">{(d.items as any[]).map((s:any,i:number)=>(
            <div key={i} className="bg-[var(--card)]/50 border border-[var(--border)] rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{s.icon}</div>
              <ET value={s.value} onChange={v=>setItem("items",i,"value",v)} className="text-xl font-bold text-[var(--foreground)] block mb-0.5" />
              <ET value={s.label} onChange={v=>setItem("items",i,"label",v)} className="text-[10px] text-[var(--muted-foreground)] block" />
            </div>
          ))}</div>
        </div>
      );
    case "blog":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-5"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          <div className="grid grid-cols-3 gap-3">{(d.items as any[]).map((b:any,i:number)=>(
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="relative group cursor-pointer" onClick={() => setImageSelector({ uid: section.uid, key: "image", index: i })}>
                <img src={b.image} alt={b.title} className="w-full h-24 object-cover group-hover:opacity-80 transition-opacity" onError={(e:any)=>{e.target.style.display='none'}} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ImageIcon className="h-4 w-4 text-white" /></div>
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#a855f7]/80 text-white text-[9px] font-semibold rounded-full">{b.tag}</span>
              </div>
              <div className="p-3">
                <ET value={b.title} onChange={v=>setItem("items",i,"title",v)} className="text-xs font-semibold text-[var(--foreground)] block mb-1" />
                <ET value={b.excerpt} onChange={v=>setItem("items",i,"excerpt",v)} tag="p" className="text-[10px] text-[var(--muted-foreground)] block mb-2 line-clamp-2" />
                <span className="text-[9px] text-[var(--muted-foreground)]">{b.date}</span>
              </div>
            </div>
          ))}</div>
        </div>
      );
    case "services":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-5"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          <div className="grid grid-cols-2 gap-3">{(d.items as any[]).map((s:any,i:number)=>(
            <div key={i} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
              <div className="text-2xl mb-3">{s.icon}</div>
              <ET value={s.title} onChange={v=>setItem("items",i,"title",v)} className="text-sm font-semibold text-[var(--foreground)] block mb-1" />
              <ET value={s.desc} onChange={v=>setItem("items",i,"desc",v)} tag="p" className="text-[10px] text-[var(--muted-foreground)] block mb-2" />
              <ET value={s.btnText} onChange={v=>setItem("items",i,"btnText",v)} className="text-[10px] text-[#3b82f6] font-medium" />
            </div>
          ))}</div>
        </div>
      );
    case "data-ai": {
      const toSlug = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          <div className="text-center mb-4"><ET value={d.title} onChange={v=>set("title",v)} tag="h3" className="text-lg font-bold text-[var(--foreground)] mb-1 block" /><ET value={d.subtitle} onChange={v=>set("subtitle",v)} tag="p" className="text-xs text-[var(--muted-foreground)] block" /></div>
          {/* Config Panel */}
          <div className="space-y-4 mb-4">
            <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-[#f59e0b]" />
                <span className="text-[10px] text-[var(--muted-foreground)] font-semibold uppercase tracking-wider">Dynamic AI Feed</span>
              </div>
              {d.design ? (
                 <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-[10px] text-green-400 flex items-center justify-between mb-2">
                   <span>UI designed by AI!</span>
                   <button onClick={()=>set("design",null)} className="hover:underline">Reset</button>
                 </div>
              ) : (
                 <div className="text-[10px] text-[var(--muted-foreground)] mb-2 truncate">Connect a Google Sheet to start</div>
              )}
              <input type="text" value={d.sheetUrl||""} onChange={e=>set("sheetUrl",e.target.value)} placeholder="Paste Google Sheets URL..." className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[#f59e0b]/50 mb-3" />
              <button 
                disabled={aiEditLoading}
                onClick={async()=>{
                  try{
                    set("previewData",null); setAiEditLoading(true);
                    const url = d.sheetUrl || "";
                    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if(!match) { alert("Invalid URL"); return; }
                    const csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`;
                    const res = await fetch(csvUrl);
                    const text = await res.text();
                    const lines = text.split("\n").filter(l=>l.trim());
                    if(lines.length<2) return;
                    
                    const parseCSVLine = (line:string) => {
                      const result:string[] = []; let current = ""; let inQuotes = false;
                      for(let i=0;i<line.length;i++){
                        if(line[i]==='"' && line[i+1]==='"') { current+='"'; i++; }
                        else if(line[i]==='"') inQuotes=!inQuotes;
                        else if(line[i]===',' && !inQuotes) { result.push(current); current=""; }
                        else current+=line[i];
                      }
                      result.push(current); return result;
                    };
                    const rawHeaders = parseCSVLine(lines[0]).map(h=>h.trim());
                    const slugs = rawHeaders.map(h => toSlug(h));

                    const rows = lines.slice(1).slice(0, 4).map(l=>{
                      const vals = parseCSVLine(l);
                      const obj:any = {}; 
                      slugs.forEach((slug,i)=> {
                        if (slug) obj[slug] = vals[i] || "";
                      }); 
                      return obj;
                    });
                    set("previewData",rows);

                    if (!d.design) {
                      const dRes = await fetch("/api/dragdrop/ai-design", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ headers: slugs, sampleRows: rows })
                      });
                      const design = await dRes.json();
                      if (design.cardHtml) set("design", design);
                    }
                  }catch(e:any){ alert(e.message); }
                  finally{ setAiEditLoading(false); }
                }} className="w-full py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black text-[11px] font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {aiEditLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Sparkles className="h-3.5 w-3.5"/>}
                  Fetch Data & Design UI with AI
                </button>
            </div>
          </div>

          {d.previewData && (d.previewData as any[]).length > 0 ? (
            <div className={d.design?.containerStyle || "grid grid-cols-2 gap-3"}>
              {(d.previewData as any[]).map((row:any,i:number) => {
                if (d.design?.cardHtml) {
                  let html = d.design.cardHtml;
                  Object.keys(row).forEach(key => {
                    const val = String(row[key] || '').replace(/\$/g, '$$$$');
                    html = html.replace(new RegExp(`{{${key}}}`, 'g'), val);
                  });
                  return <div key={i} dangerouslySetInnerHTML={{ __html: html }} className="overflow-hidden" />;
                }
                return (
                  <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden p-3">
                    <div className="text-xs font-semibold">{row[Object.keys(row)[0]]}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-[var(--border)] rounded-xl text-[var(--muted-foreground)] text-xs">
              <Database className="h-10 w-10 mx-auto mb-3 opacity-20" />
              Connect your Google Sheet to generate a live AI-powered UI
            </div>
          )}
        </div>
      );
    }
    case "ai-generated":
      return (
        <div className="w-full bg-[#0a0a0a] border border-[var(--border)] rounded-xl p-6">
          {d.htmlContent ? (
            <div dangerouslySetInnerHTML={{ __html: d.htmlContent }} />
          ) : (
            <div className="text-center text-[var(--muted-foreground)] text-sm py-8">AI section — generating...</div>
          )}
        </div>
      );
    default: return null;
  }
}

/* ───── Main Page ───── */
export default function DragDropPage() {
  const { user, isLoaded } = useUser();
  const [sections, setSections] = useState<DroppedSection[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [dragOverCanvas, setDragOverCanvas] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  // AI edit state
  const [aiEditUid, setAiEditUid] = useState<string | null>(null);
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [aiEditLoading, setAiEditLoading] = useState(false);
  // AI component state
  const [showAiComponentModal, setShowAiComponentModal] = useState(false);
  const [aiComponentPrompt, setAiComponentPrompt] = useState("");
  const [aiComponentLoading, setAiComponentLoading] = useState(false);
  // Project persistence state
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveProjectName, setSaveProjectName] = useState("");
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);
  const [editorActive, setEditorActive] = useState(false);

  // Asset/Image state
  const [uploadedImages, setUploadedImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800",
  ]);
  const [imageSelector, setImageSelector] = useState<{ uid: string; key: string; index?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      if (b64) setUploadedImages(prev => [b64, ...prev]);
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (url: string) => {
    if (!imageSelector) return;
    const { uid, key, index } = imageSelector;
    const section = sections.find(s => s.uid === uid);
    if (!section) return;
    
    const d = { ...section.data };
    if (typeof index === 'number') {
      const items = [...(d.items as any[])];
      items[index] = { ...items[index], [key]: url };
      d.items = items;
    } else {
      d[key] = url;
    }
    updateSectionData(uid, d);
    setImageSelector(null);
  };

  /* ── Project persistence ── */
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/dragdrop/projects");
      const json = await res.json();
      if (json.success) setSavedProjects(json.projects || []);
    } catch (e) { console.error("Failed to fetch projects", e); }
    finally { setLoadingProjects(false); }
  }, []);

  useEffect(() => { if (isLoaded && user) fetchProjects(); }, [isLoaded, user, fetchProjects]);

  const saveProject = async (name?: string) => {
    const projectName = name || currentProjectName || "Untitled Project";
    setSaving(true);
    try {
      const sectionData = sections.map(s => ({ id: s.uid, typeId: s.typeId, data: s.data }));
      if (currentProjectId) {
        // Update existing project
        await fetch(`/api/dragdrop/projects/${currentProjectId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: projectName, themeId: theme.id, sections: sectionData }),
        });
      } else {
        // Create new project
        const res = await fetch("/api/dragdrop/projects", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: projectName, themeId: theme.id, sections: sectionData }),
        });
        const json = await res.json();
        if (json.success) { setCurrentProjectId(json.project.id); setCurrentProjectName(projectName); }
      }
      await fetchProjects();
    } catch (e: any) { alert("Save failed: " + e.message); }
    finally { setSaving(false); setShowSaveModal(false); }
  };

  const loadProject = async (project: SavedProject) => {
    const projectSections: DroppedSection[] = (project.sections || []).map(s => ({
      uid: s.id, typeId: s.typeId, data: s.data as SectionData,
    }));
    setSections(projectSections);
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    const projectTheme = THEMES.find(t => t.id === project.themeId) || DEFAULT_THEME;
    setTheme(projectTheme);
    setEditorActive(true);
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await fetch(`/api/dragdrop/projects/${id}`, { method: "DELETE" });
      setSavedProjects(prev => prev.filter(p => p.id !== id));
      if (currentProjectId === id) { setCurrentProjectId(null); setCurrentProjectName(""); setSections([]); setEditorActive(false); }
    } catch (e: any) { alert("Delete failed: " + e.message); }
  };

  const startNewProject = () => {
    setSections([]); setCurrentProjectId(null); setCurrentProjectName("");
    setTheme(DEFAULT_THEME); setDeployedUrl(null); setEditorActive(true);
  };

  const backToProjects = () => {
    setEditorActive(false); setPreviewMode(false); setShowCode(false); setDeployedUrl(null);
  };

  /* Drag from sidebar → canvas */
  const handleDragStart = (e: React.DragEvent, typeId: string) => { e.dataTransfer.setData("sectionType", typeId); e.dataTransfer.effectAllowed = "copy"; };
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOverCanvas(false);
    const typeId = e.dataTransfer.getData("sectionType");
    if (!typeId) return;
    const uid = `${typeId}-${Date.now()}`;
    const data = JSON.parse(JSON.stringify(DEFAULT_SECTION_DATA[typeId] || {}));
    setSections(prev => [...prev, { uid, typeId, data }]);
  };
  const handleCanvasDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOverCanvas(true); };
  const handleCanvasDragLeave = () => setDragOverCanvas(false);
  const removeSection = (uid: string) => { setSections(prev=>prev.filter(s=>s.uid!==uid)); if(aiEditUid===uid) setAiEditUid(null); };
  const moveSection = (uid: string, dir: "up"|"down") => setSections(prev=>{ const idx=prev.findIndex(s=>s.uid===uid); if(idx===-1)return prev; const ni=dir==="up"?idx-1:idx+1; if(ni<0||ni>=prev.length)return prev; const c=[...prev]; [c[idx],c[ni]]=[c[ni],c[idx]]; return c; });
  const updateSectionData = (uid: string, data: SectionData) => setSections(prev=>prev.map(s=>s.uid===uid?{...s,data}:s));
  const clearAll = () => { setSections([]); setDeployedUrl(null); setCurrentProjectId(null); setCurrentProjectName(""); };

  const getHTML = useCallback(() => generateFullHTML(sections.map(s=>({typeId:s.typeId,data:s.data})), theme), [sections, theme]);
  const exportHTML = () => { const b=new Blob([getHTML()],{type:"text/html"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="website.html"; a.click(); };
  const copyCode = () => { navigator.clipboard.writeText(getHTML()); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  /* AI Edit — per section */
  const handleAiEdit = async (uid: string) => {
    if (!aiEditPrompt.trim()) return;
    const section = sections.find(s=>s.uid===uid);
    if (!section) return;
    setAiEditLoading(true);
    try {
      const res = await fetch("/api/dragdrop/ai-edit", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ sectionType: section.typeId, currentData: section.data, prompt: aiEditPrompt }) });
      const json = await res.json();
      if (json.success) { updateSectionData(uid, json.data); setAiEditUid(null); setAiEditPrompt(""); }
      else alert("AI edit failed: " + (json.error || "Unknown error"));
    } catch (e:any) { alert("Error: " + e.message); }
    finally { setAiEditLoading(false); }
  };

  /* AI Component generation */
  const handleAiComponent = async () => {
    if (!aiComponentPrompt.trim()) return;
    setAiComponentLoading(true);
    try {
      const res = await fetch("/api/dragdrop/ai-component", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ prompt: aiComponentPrompt }) });
      const json = await res.json();
      if (json.success) {
        const uid = `ai-generated-${Date.now()}`;
        setSections(prev=>[...prev,{ uid, typeId:"ai-generated", data:{ title:"AI Generated", htmlContent:json.html, prompt:aiComponentPrompt } }]);
        setShowAiComponentModal(false); setAiComponentPrompt("");
      } else alert("Failed: " + (json.error||"Unknown"));
    } catch(e:any){ alert("Error: "+e.message); }
    finally { setAiComponentLoading(false); }
  };

  /* Deploy */
  const deployWebsite = async () => {
    setDeploying(true); setDeployedUrl(null);
    try {
      const sbRes = await fetch("/api/dragdrop/create-sandbox",{method:"POST"});
      const sbData = await sbRes.json();
      if (!sbData.success) throw new Error(sbData.error);
      const depRes = await fetch("/api/dragdrop/deploy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({html:getHTML()})});
      const depData = await depRes.json();
      if (!depData.success) throw new Error(depData.error);
      setDeployedUrl(depData.url);
    } catch(e:any){ alert("Deploy failed: "+e.message); }
    finally { setDeploying(false); }
  };

  /* Auth */
  if (!isLoaded) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold text-[var(--foreground)] mb-4">Access Denied</h1><p className="text-[var(--muted-foreground)] mb-6">Please sign in.</p><Link href="/sign-in" className="px-6 py-3 bg-[#3b82f6] text-white rounded-lg">Sign In</Link></div></div>;

  /* ── Projects Gallery (Home Screen) ── */
  if (!editorActive) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08)_0%,transparent_70%)] pointer-events-none" />
        <header className="relative z-50 bg-[var(--card)]/60 backdrop-blur-xl border-b border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"><ArrowLeft className="h-4 w-4" /><span className="text-sm">Dashboard</span></Link>
              <span className="text-[var(--border)]">|</span>
              <span className="text-sm font-semibold text-[var(--foreground)]">Drag & Drop Builder</span>
            </div>
            <button onClick={startNewProject} className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors flex items-center gap-2">
              <Plus className="h-4 w-4" />New Project
            </button>
          </div>
        </header>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Your Web Projects</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Create, edit, and deploy beautiful websites with drag & drop</p>
          </div>

          {loadingProjects ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 text-[#3b82f6] animate-spin" /></div>
          ) : savedProjects.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-[var(--border)] rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center mx-auto mb-5">
                <Globe className="h-7 w-7 text-[var(--muted-foreground)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No projects yet</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-5">Create your first website by clicking the button above</p>
              <button onClick={startNewProject} className="px-5 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedProjects.map(project => {
                const projectTheme = THEMES.find(t => t.id === project.themeId);
                const sectionCount = project.sections?.length || 0;
                const sectionTypes = project.sections?.map(s => s.typeId) || [];
                return (
                  <div key={project.id} className="group bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[#3b82f6]/40 transition-all duration-200 hover:shadow-lg hover:shadow-[#3b82f6]/5">
                    {/* Preview strip with theme colors */}
                    <div className="h-28 relative overflow-hidden" style={{ background: projectTheme ? `linear-gradient(135deg, ${projectTheme.gradient}, ${projectTheme.gradientEnd})` : 'linear-gradient(135deg, #1a1a2e, #16162a)' }}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex gap-1.5 flex-wrap justify-center px-4">
                          {sectionTypes.slice(0, 6).map((t, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-[9px] font-medium bg-white/10 text-white/70 backdrop-blur-sm">{SECTION_TYPE_META[t]?.label || t}</span>
                          ))}
                          {sectionTypes.length > 6 && <span className="px-2 py-0.5 rounded text-[9px] font-medium bg-white/10 text-white/70">+{sectionTypes.length - 6}</span>}
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => deleteProject(project.id)} className="p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white/70 hover:text-red-400 hover:bg-red-500/20 transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] truncate flex-1">{project.name}</h3>
                        {projectTheme && <div className="w-3 h-3 rounded-full ml-2 flex-shrink-0" style={{ background: projectTheme.accent }} title={projectTheme.name} />}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)] mb-3">
                        <span className="flex items-center gap-1"><Layout className="h-3 w-3" />{sectionCount} sections</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => loadProject(project)} className="flex-1 py-2 bg-[#3b82f6] text-white rounded-lg text-xs font-medium hover:bg-[#2563eb] transition-colors flex items-center justify-center gap-1.5">
                          <Edit3 className="h-3 w-3" />Open & Edit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Preview Mode ── */
  if (previewMode) {
    const html = getHTML();
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        <div className="sticky top-0 z-50 bg-[var(--card)]/80 backdrop-blur-xl border-b border-[var(--border)] px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--foreground)]"><Eye className="inline h-4 w-4 mr-2 text-[#3b82f6]" />Preview</span>
          <div className="flex items-center gap-2">
            <button onClick={exportHTML} className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"><Download className="inline h-3 w-3 mr-1" />Export</button>
            <button onClick={()=>setShowCode(!showCode)} className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"><Code className="inline h-3 w-3 mr-1" />{showCode?"Hide":"View"} Code</button>
            <button onClick={deployWebsite} disabled={deploying} className="px-4 py-1.5 text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium">
              {deploying?<><Loader2 className="inline h-3 w-3 mr-1 animate-spin"/>Deploying...</>:<><Rocket className="inline h-3 w-3 mr-1"/>Deploy</>}
            </button>
            <button onClick={()=>{setPreviewMode(false);setShowCode(false)}} className="px-4 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]">← Editor</button>
          </div>
        </div>
        {deployedUrl && (
          <div className="mx-6 mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
            <Check className="h-5 w-5 text-green-400" /><span className="text-sm text-green-300 flex-1">Deployed!</span>
            <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-400 hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3"/>{deployedUrl.slice(0,50)}...</a>
          </div>
        )}
        {showCode ? (
          <div className="flex-1 relative"><button onClick={copyCode} className="absolute top-4 right-6 z-10 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs text-[var(--muted-foreground)]">{copied?<><Check className="inline h-3 w-3 mr-1"/>Copied</>:<><Copy className="inline h-3 w-3 mr-1"/>Copy</>}</button><pre className="overflow-auto p-6 bg-[#0a0a0a] text-xs text-[var(--muted-foreground)] font-mono leading-relaxed whitespace-pre-wrap h-[calc(100vh-60px)]">{html}</pre></div>
        ) : (
          <iframe ref={iframeRef} srcDoc={html} className="flex-1 w-full bg-white" style={{minHeight:"calc(100vh - 60px)"}} sandbox="allow-scripts allow-same-origin" />
        )}
      </div>
    );
  }

  /* ── Editor Mode ── */
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1)_0%,transparent_70%)] pointer-events-none" />
      {/* AI Component Modal */}
      {showAiComponentModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={()=>setShowAiComponentModal(false)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-[var(--foreground)]"><Wand2 className="inline h-5 w-5 mr-2 text-[#f43f5e]" />AI Component Generator</h3><button onClick={()=>setShowAiComponentModal(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><X className="h-5 w-5"/></button></div>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">Describe the section you want. AI will generate it for you.</p>
            <textarea value={aiComponentPrompt} onChange={e=>setAiComponentPrompt(e.target.value)} placeholder="e.g. A team members section with 4 cards showing photos, names, roles, and social links..." rows={4} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--foreground)] outline-none focus:border-[#3b82f6]/50 resize-none mb-4" />
            <button onClick={handleAiComponent} disabled={aiComponentLoading||!aiComponentPrompt.trim()} className="w-full py-2.5 bg-gradient-to-r from-[#f43f5e] to-[#ec4899] text-white rounded-lg font-medium text-sm disabled:opacity-50">
              {aiComponentLoading?<><Loader2 className="inline h-4 w-4 mr-1 animate-spin"/>Generating...</>:<><Sparkles className="inline h-4 w-4 mr-1"/>Generate Section</>}
            </button>
          </div>
        </div>
      )}

      {/* Save Project Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowSaveModal(false)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-1"><Save className="inline h-5 w-5 mr-2 text-[#3b82f6]" />Save Project</h3>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">Give your project a name to save it.</p>
            <input value={saveProjectName} onChange={e => setSaveProjectName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && saveProjectName.trim()) saveProject(saveProjectName.trim()); }} placeholder="My Website" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--foreground)] outline-none focus:border-[#3b82f6]/50 mb-4" autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2.5 border border-[var(--border)] rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Cancel</button>
              <button onClick={() => saveProject(saveProjectName.trim())} disabled={!saveProjectName.trim() || saving} className="flex-1 py-2.5 bg-[#3b82f6] text-white rounded-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-50 bg-[var(--card)]/60 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={backToProjects} className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:block text-sm">Projects</span></button>
            <span className="text-[var(--border)]">|</span>
            {currentProjectName ? (
              <span className="text-sm font-semibold text-[var(--foreground)]">{currentProjectName}</span>
            ) : (
              <span className="text-sm font-semibold text-[var(--foreground)]">New Project</span>
            )}
            {sections.length>0 && <span className="text-[10px] px-2 py-0.5 bg-[#3b82f6]/10 text-[#3b82f6] rounded-full">{sections.length} sections</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* Theme Selector */}
            <div className="relative group">
              <button className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[#8b5cf6]/40 transition-colors"><Palette className="inline h-3 w-3 mr-1" />{theme.name}</button>
              <div className="absolute top-full right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-2 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                {THEMES.map(t=>(
                  <button key={t.id} onClick={()=>setTheme(t)} className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors ${theme.id===t.id?"bg-[#3b82f6]/10 text-[#3b82f6]":"text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)]"}`}>
                    <div className="w-4 h-4 rounded-full border border-[var(--border)]" style={{background:t.accent}} />
                    {t.emoji} {t.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Save button */}
            <button onClick={() => { if (currentProjectId) saveProject(); else { setSaveProjectName(""); setShowSaveModal(true); } }} disabled={!sections.length || saving} className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:text-green-400 hover:border-green-500/30 transition-colors disabled:opacity-30">
              {saving ? <Loader2 className="inline h-3 w-3 mr-1 animate-spin" /> : <Save className="inline h-3 w-3 mr-1" />}{currentProjectId ? "Save" : "Save As"}
            </button>
            <button onClick={clearAll} disabled={!sections.length} className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-30"><Trash2 className="inline h-3 w-3 mr-1" />Clear</button>
            <button onClick={exportHTML} disabled={!sections.length} className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors disabled:opacity-30"><Download className="inline h-3 w-3 mr-1" />Export</button>
            <button onClick={()=>setPreviewMode(true)} disabled={!sections.length} className="px-4 py-1.5 text-xs bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-40 font-medium"><Eye className="inline h-3 w-3 mr-1" />Preview & Deploy</button>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen?"w-72":"w-0"} transition-all duration-300 overflow-hidden border-r border-[var(--border)] bg-[var(--card)]/30 backdrop-blur-lg flex-shrink-0`}>
          <div className="p-4 w-72 h-full overflow-y-auto">
            <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Sections</h2>
            <p className="text-[10px] text-[var(--muted-foreground)] mb-3">Drag to canvas. Click text to edit inline.</p>
            <div className="space-y-1.5">
              {SIDEBAR_SECTION_IDS.map(id=>{const m=SECTION_TYPE_META[id]; return (
                <div key={id} draggable onDragStart={e=>handleDragStart(e,id)} className="group flex items-center gap-3 p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl cursor-grab active:cursor-grabbing hover:border-[#3b82f6]/40 hover:bg-[#3b82f6]/5 transition-all">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:m.color+"18",color:m.color}}>{ICONS[id]}</div>
                  <div className="min-w-0 flex-1"><span className="text-sm font-medium text-[var(--foreground)] block">{m.label}</span><span className="text-[10px] text-[var(--muted-foreground)] block truncate">{m.description}</span></div>
                  <Plus className="h-3.5 w-3.5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )})}
            </div>
            {/* Assets section */}
            <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mt-5 mb-3">Assets</h2>
            <div className="space-y-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-[var(--background)] border-2 border-dashed border-[var(--border)] rounded-xl text-[10px] text-[var(--muted-foreground)] hover:border-[#3b82f6]/40 hover:text-[#3b82f6] transition-all flex flex-col items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                <span>Upload New Asset</span>
              </button>
              <div className="grid grid-cols-4 gap-2">
                {uploadedImages.slice(0, 8).map((url, i) => (
                  <div key={i} className="aspect-square bg-[var(--background)] border border-[var(--border)] rounded-lg overflow-hidden group relative">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={()=>setUploadedImages(prev=>prev.filter((_,idx)=>idx!==i))} className="absolute top-0 right-0 p-0.5 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-lg"><X className="h-2 w-2"/></button>
                  </div>
                ))}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
            </div>
            
            {/* Special sections */}
            <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mt-5 mb-3">Advanced</h2>
            <div className="space-y-1.5">
              {/* Chatbot */}
              <div draggable onDragStart={e=>handleDragStart(e,"chatbot")} className="group flex items-center gap-3 p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl cursor-grab active:cursor-grabbing hover:border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/5 transition-all">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:"#8b5cf618",color:"#8b5cf6"}}><Bot className="h-5 w-5"/></div>
                <div className="min-w-0 flex-1"><span className="text-sm font-medium text-[var(--foreground)] block">AI Chatbot</span><span className="text-[10px] text-[var(--muted-foreground)] block">Floating Gemini chat</span></div>
                <Plus className="h-3.5 w-3.5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* Custom */}
              <div draggable onDragStart={e=>handleDragStart(e,"custom")} className="group flex items-center gap-3 p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl cursor-grab active:cursor-grabbing hover:border-[#a855f7]/40 hover:bg-[#a855f7]/5 transition-all">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:"#a855f718",color:"#a855f7"}}><PenLine className="h-5 w-5"/></div>
                <div className="min-w-0 flex-1"><span className="text-sm font-medium text-[var(--foreground)] block">Custom</span><span className="text-[10px] text-[var(--muted-foreground)] block">Freeform content</span></div>
                <Plus className="h-3.5 w-3.5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* AI Component */}
              <button onClick={()=>setShowAiComponentModal(true)} className="group w-full flex items-center gap-3 p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl hover:border-[#f43f5e]/40 hover:bg-[#f43f5e]/5 transition-all text-left">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:"#f43f5e18",color:"#f43f5e"}}><Wand2 className="h-5 w-5"/></div>
                <div className="min-w-0 flex-1"><span className="text-sm font-medium text-[var(--foreground)] block">AI Component</span><span className="text-[10px] text-[var(--muted-foreground)] block">Generate with AI</span></div>
                <Sparkles className="h-3.5 w-3.5 text-[#f43f5e] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              {/* Data AI */}
              <div draggable onDragStart={e=>handleDragStart(e,"data-ai")} className="group flex items-center gap-3 p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl cursor-grab active:cursor-grabbing hover:border-[#f59e0b]/40 hover:bg-[#f59e0b]/5 transition-all">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:"#f59e0b18",color:"#f59e0b"}}><Database className="h-5 w-5"/></div>
                <div className="min-w-0 flex-1"><span className="text-sm font-medium text-[var(--foreground)] block">Data AI</span><span className="text-[10px] text-[var(--muted-foreground)] block">Live Google Sheets data</span></div>
                <Plus className="h-3.5 w-3.5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </aside>
        <button onClick={()=>setSidebarOpen(!sidebarOpen)} className="absolute top-1/2 -translate-y-1/2 z-20 w-5 h-10 bg-[var(--card)] border border-[var(--border)] rounded-r-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]" style={{left:sidebarOpen?"288px":"0px"}}>{sidebarOpen?"‹":"›"}</button>

        {/* Canvas */}
        <main className="flex-1 overflow-y-auto">
          <div className={`min-h-full p-6 md:p-10 transition-colors duration-200 ${dragOverCanvas?"bg-[#3b82f6]/5":""}`} onDrop={handleCanvasDrop} onDragOver={handleCanvasDragOver} onDragLeave={handleCanvasDragLeave}>
            <div className="max-w-4xl mx-auto">
              <AnimatePresence mode="popLayout">
                {sections.map((section, index) => {
                  const meta = SECTION_TYPE_META[section.typeId];
                  return (
                    <motion.div key={section.uid} layout initial={{opacity:0,y:30,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,scale:0.9,y:-20}} transition={{duration:0.3}} className="group mb-4">
                      {/* Section toolbar */}
                      <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium" style={{backgroundColor:(meta?.color??"#333")+"18",color:meta?.color}}>{ICONS[section.typeId]}{meta?.label}</div>
                        <div className="flex-1" />
                        {/* AI Edit button */}
                        <button onClick={()=>{setAiEditUid(aiEditUid===section.uid?null:section.uid);setAiEditPrompt("")}} className="p-1 rounded text-[var(--muted-foreground)] hover:text-[#8b5cf6] transition-colors" title="AI Edit"><Sparkles className="h-3.5 w-3.5" /></button>
                        <button onClick={()=>moveSection(section.uid,"up")} disabled={index===0} className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-20">↑</button>
                        <button onClick={()=>moveSection(section.uid,"down")} disabled={index===sections.length-1} className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-20">↓</button>
                        <button onClick={()=>removeSection(section.uid)} className="p-1 rounded text-[var(--muted-foreground)] hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      {/* AI Edit input */}
                      {aiEditUid===section.uid && (
                        <div className="mb-2 flex gap-2">
                          <input value={aiEditPrompt} onChange={e=>setAiEditPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleAiEdit(section.uid)}} placeholder="e.g. Change heading to 'Welcome to Acme'" className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[#8b5cf6]/50" autoFocus />
                          <button onClick={()=>handleAiEdit(section.uid)} disabled={aiEditLoading||!aiEditPrompt.trim()} className="px-3 py-1.5 bg-[#8b5cf6] text-white rounded-lg text-xs font-medium disabled:opacity-50">
                            {aiEditLoading?<Loader2 className="h-3 w-3 animate-spin"/>:<>Apply</>}
                          </button>
                        </div>
                      )}
                      <EditableSectionPreview section={section} onUpdate={data=>updateSectionData(section.uid,data)} allSections={sections} setImageSelector={setImageSelector} aiEditLoading={aiEditLoading} setAiEditLoading={setAiEditLoading} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {sections.length===0 && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className={`flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-2xl transition-colors ${dragOverCanvas?"border-[#3b82f6] bg-[#3b82f6]/5":"border-[var(--border)]"}`}>
                  <div className="w-16 h-16 rounded-2xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center mb-5"><GripVertical className="h-7 w-7 text-[var(--muted-foreground)]" /></div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Drag sections here</h3>
                  <p className="text-sm text-[var(--muted-foreground)] text-center max-w-md">Drag website sections from the sidebar. Click any text to edit inline. Use ✨ for AI edits.</p>
                </motion.div>
              )}
              {sections.length>0 && (
                <div className={`mt-2 py-6 border-2 border-dashed rounded-xl flex items-center justify-center transition-colors ${dragOverCanvas?"border-[#3b82f6] bg-[#3b82f6]/5":"border-[var(--border)]/50"}`}><span className="text-xs text-[var(--muted-foreground)]"><Plus className="inline h-3 w-3 mr-1"/>Drop a section here</span></div>
              )}
            </div>
          </div>
        </main>
      </div>
      {/* Image Selector Modal */}
      {imageSelector && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setImageSelector(null)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)]"><ImageIcon className="inline h-5 w-5 mr-2 text-[#3b82f6]" />Media Library</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Select an image or upload a new one</p>
              </div>
              <button onClick={()=>setImageSelector(null)} className="p-2 hover:bg-[var(--background)] rounded-full transition-colors"><X className="h-5 w-5"/></button>
            </div>
            
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <input 
                  type="text" 
                  placeholder="Paste image URL and press Enter..." 
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[#3b82f6]/50 transition-all font-medium" 
                  onKeyDown={(e: any) => { if(e.key === 'Enter' && e.target.value) { handleImageSelect(e.target.value); e.target.value = ''; } }} 
                />
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-[#3b82f6] text-white rounded-xl text-sm font-semibold hover:bg-[#2563eb] transition-all flex items-center gap-2 shadow-lg shadow-[#3b82f6]/20">
                <Plus className="h-5 w-5" />
                Upload File
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-4 p-1 custom-scrollbar">
              {uploadedImages.length === 0 && (
                <div className="col-span-full py-20 text-center text-[var(--muted-foreground)]">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No assets uploaded yet</p>
                </div>
              )}
              {uploadedImages.map((url, i) => (
                <div key={i} onClick={() => handleImageSelect(url)} className="aspect-square bg-[var(--background)] border border-[var(--border)] rounded-xl overflow-hidden cursor-pointer hover:border-[#3b82f6] group transition-all relative ring-0 hover:ring-4 ring-[#3b82f6]/10">
                  <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-[#3b82f6]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Check className="h-8 w-8 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

