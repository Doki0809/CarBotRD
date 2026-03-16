// src/ConversationsView.jsx — Módulo de Mensajería Premium conectado a GHL
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Search, RefreshCw, ChevronLeft, Send, Mic, MicOff,
  Paperclip, Phone, Mail, MessageSquare, Wifi, WifiOff,
  Sparkles, Bot, BotOff, X, Check, CheckCheck, Clock, AlertCircle,
  Hash, Tag, Circle, ChevronDown, AtSign, Globe, Lock, Pin, Trash2
} from 'lucide-react';

// ─── CHANNEL CONFIG ──────────────────────────────────────────────────────────
const CHANNEL_CONFIG = {
  TYPE_WHATSAPP:    { label: 'WhatsApp',   icon: '📱', color: 'emerald', ghlType: 'WhatsApp' },
  TYPE_SMS:         { label: 'SMS',        icon: '💬', color: 'blue',    ghlType: 'SMS' },
  TYPE_LIVE_CHAT:   { label: 'Live Chat',  icon: '⚡',  color: 'amber',   ghlType: 'Live_Chat' },
  TYPE_FACEBOOK:    { label: 'Facebook',   icon: '📘', color: 'blue',    ghlType: 'Facebook' },
  TYPE_INSTAGRAM:   { label: 'Instagram',  icon: '📸', color: 'pink',    ghlType: 'IG' },
};

const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', active: 'bg-emerald-500', dot: 'bg-emerald-500' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-600',    border: 'border-blue-500/20',    active: 'bg-blue-500',    dot: 'bg-blue-500' },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-600',  border: 'border-violet-500/20',  active: 'bg-violet-500',  dot: 'bg-violet-500' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-600',   border: 'border-amber-500/20',   active: 'bg-amber-500',   dot: 'bg-amber-500' },
  pink:    { bg: 'bg-pink-500/10',    text: 'text-pink-600',    border: 'border-pink-500/20',    active: 'bg-pink-500',    dot: 'bg-pink-500' },
  slate:   { bg: 'bg-slate-500/10',   text: 'text-slate-600',   border: 'border-slate-500/20',   active: 'bg-slate-500',   dot: 'bg-slate-500' },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString('es', { weekday: 'short' });
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

function formatFullTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function getAvatarGradient(name) {
  const gradients = [
    'from-rose-400 to-pink-600',
    'from-violet-400 to-purple-600',
    'from-blue-400 to-cyan-600',
    'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-600',
    'from-red-400 to-rose-600',
    'from-indigo-400 to-blue-600',
  ];
  const idx = (name || '').charCodeAt(0) % gradients.length;
  return gradients[idx];
}

function detectChannels(messages) {
  const types = new Set();
  (messages || []).forEach(m => {
    if (m.messageType) types.add(m.messageType);
    if (m.type) types.add(m.type);
  });
  return [...types].filter(t => CHANNEL_CONFIG[t]);
}

// ─── SKELETON ────────────────────────────────────────────────────────────────
function ConvSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl animate-pulse">
          <div className="w-11 h-11 rounded-full bg-[#e9edef] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#e9edef] rounded-full w-3/4" />
            <div className="h-2.5 bg-[#d1d7db] rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MsgSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4 overflow-hidden bg-[#e8eaed]">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} animate-pulse`}>
          <div className={`rounded-2xl px-4 py-3 ${i % 2 === 0 ? 'bg-white/60 w-2/3' : 'bg-[#d9fdd3]/50 w-1/2'} h-10`} />
        </div>
      ))}
    </div>
  );
}

// ─── CONVERSATION ITEM ───────────────────────────────────────────────────────
function ConvItem({ conv, isActive, onClick, isPinned }) {
  const name = conv.fullName || conv.contactName || `${conv.firstName || ''} ${conv.lastName || ''}`.trim() || 'Sin nombre';
  const preview = conv.lastMessage?.body || conv.lastMessageBody || '...';
  const time = conv.lastMessageDate || conv.dateUpdated || conv.dateAdded;
  const unread = conv.unreadCount || 0;
  const gradient = getAvatarGradient(name);
  const initials = getInitials(name);

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-150 text-left group relative
        ${isActive
          ? 'bg-white'
          : 'hover:bg-[#f5f6f6]'
        }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-white text-xs font-black">{initials}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 border-b border-[#e9edef] pb-2.5">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1 min-w-0">
            {isPinned && <Pin size={10} className="text-[#667781] shrink-0" />}
            <span className="text-sm font-medium text-[#111827] truncate">{name}</span>
          </div>
          <span className={`text-[11px] shrink-0 ml-2 ${unread > 0 ? 'text-[#25d366]' : 'text-[#667781]'}`}>{formatTime(time)}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-[13px] truncate leading-tight ${unread > 0 ? 'text-[#111827] font-medium' : 'text-[#667781]'}`}>
            {preview}
          </p>
          {unread > 0 && !isActive && (
            <span className="ml-2 min-w-[20px] h-5 px-1 bg-[#25d366] text-black text-[11px] font-bold rounded-full flex items-center justify-center shrink-0">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ─── CHANNEL SELECTOR ────────────────────────────────────────────────────────
function ChannelSelector({ channels, active, onChange }) {
  if (!channels.length) return null;

  return (
    <div className="flex items-center gap-1 p-1 bg-[#e9edef] rounded-xl">
      {channels.map(ch => {
        const cfg = CHANNEL_CONFIG[ch];
        if (!cfg) return null;
        const isActive = active === ch;
        return (
          <motion.button
            key={ch}
            onClick={() => onChange(ch)}
            whileTap={{ scale: 0.96 }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200
              ${isActive
                ? 'bg-white text-[#00a884]'
                : 'text-[#667781] hover:text-[#111827] hover:bg-[#f5f6f6]'
              }`}
          >
            <span className="text-sm leading-none">{cfg.icon}</span>
            <span>{cfg.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── AI TOGGLE ───────────────────────────────────────────────────────────────
function AIToggle({ isOn, isLoading, onToggle }) {
  return (
    <motion.button
      onClick={onToggle}
      disabled={isLoading}
      whileTap={{ scale: 0.95 }}
      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 font-bold text-xs
        ${isOn
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-700'
        }`}
    >
      {/* Glow dot */}
      <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isOn ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-amber-500'}`} />
      {isLoading ? (
        <span className="animate-pulse">...</span>
      ) : (
        <>
          {isOn ? <Bot size={13} /> : <BotOff size={13} />}
          <span>Bot {isOn ? 'Activo' : 'Inactivo'}</span>
        </>
      )}
    </motion.button>
  );
}

// ─── MEDIA CONTENT ───────────────────────────────────────────────────────────
function MediaContent({ msg }) {
  // GHL returns attachments as array or single mediaUrl
  const attachments = msg.attachments || (msg.mediaUrl ? [{ url: msg.mediaUrl }] : []);
  if (!attachments.length) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {attachments.map((att, i) => {
        const url = att.url || att.mediaUrl || att;
        if (!url || typeof url !== 'string') return null;
        const lower = url.toLowerCase().split('?')[0];
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)/.test(lower) || att.type?.startsWith('image');
        const isVideo = /\.(mp4|mov|webm|avi|mkv)/.test(lower) || att.type?.startsWith('video');
        const isAudio = /\.(mp3|ogg|wav|m4a|aac|oga|opus)/.test(lower) || att.type?.startsWith('audio') || msg.messageType === 'Audio' || msg.contentType === 'audio/ogg';

        if (isImage) {
          return (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt="imagen"
                className="max-w-[220px] max-h-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onError={e => { e.target.style.display = 'none'; }}
              />
            </a>
          );
        }
        if (isVideo) {
          return (
            <video key={i} src={url} controls className="max-w-[240px] rounded-xl" style={{ maxHeight: 180 }}>
              Tu navegador no soporta video.
            </video>
          );
        }
        if (isAudio) {
          return (
            <audio key={i} src={url} controls className="w-[220px] h-10 rounded-xl" style={{ accentColor: '#00a884' }}>
              Tu navegador no soporta audio.
            </audio>
          );
        }
        // Generic file
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-black/5 rounded-xl text-[12px] text-[#111827] hover:bg-black/10 transition-colors">
            <Paperclip size={13} className="shrink-0" />
            <span className="truncate max-w-[180px]">{att.name || 'Archivo adjunto'}</span>
          </a>
        );
      })}
    </div>
  );
}

// ─── MESSAGE BUBBLE ──────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn }) {
  const time = formatFullTime(msg.dateAdded || msg.createdAt);
  const body = msg.body || msg.message || msg.text || '';
  const status = msg.status;
  const isNote = msg.type === 'Note' || msg.messageType === 'Note';
  // GHL attachments or media
  const hasMedia = (msg.attachments?.length > 0) || msg.mediaUrl;
  // Sticker: GHL sends type=Sticker or messageType=Sticker
  const isSticker = msg.type === 'Sticker' || msg.messageType === 'Sticker';

  const bubbleClass = isNote
    ? 'bg-amber-50 border-l-2 border-amber-400 text-amber-900 rounded-lg'
    : isOwn
      ? 'bg-[#fde8e8] text-[#1a0a0a] rounded-tl-2xl rounded-bl-2xl rounded-br-2xl rounded-tr-sm'
      : 'bg-white text-[#111827] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl rounded-tl-sm';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
      className={`flex ${isNote ? 'justify-center' : isOwn ? 'justify-end' : 'justify-start'} group`}
    >
      <div className={`${isNote ? 'max-w-[85%] sm:max-w-[80%]' : 'max-w-[80%] sm:max-w-[72%]'} min-w-0 ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {isNote && (
          <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest text-center w-full px-1">
            🔒 Nota interna
          </span>
        )}
        {/* Sticker — no bubble background */}
        {isSticker && hasMedia ? (
          <div className="p-1">
            <MediaContent msg={msg} />
          </div>
        ) : hasMedia && !body ? (
          /* Media-only message — thin bubble wrapping */
          <div className={`p-1.5 ${bubbleClass}`}>
            <MediaContent msg={msg} />
          </div>
        ) : hasMedia && body ? (
          /* Media + caption */
          <div className={`px-3 pt-2 pb-2 ${bubbleClass} flex flex-col gap-2`}>
            <MediaContent msg={msg} />
            <span className="text-[13.5px] leading-relaxed break-words">{body}</span>
          </div>
        ) : (
          /* Text-only */
          <div className={`px-3 py-2 text-[13.5px] leading-relaxed break-words ${bubbleClass}`}>
            {body || <span className="text-[#667781] italic text-[12px]">Mensaje sin texto</span>}
          </div>
        )}
        <div className={`flex items-center gap-1 px-1 ${isOwn || isNote ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] text-[#667781]">{time}</span>
          {isOwn && !isNote && (
            status === 'delivered' ? <CheckCheck size={11} className="text-[#53bdeb]" /> :
            status === 'sent' ? <Check size={11} className="text-[#667781]" /> :
            status === 'failed' ? <AlertCircle size={11} className="text-red-400" /> :
            <Check size={11} className="text-[#667781]" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── DATE DIVIDER ────────────────────────────────────────────────────────────
function DateDivider({ date }) {
  return (
    <div className="flex items-center justify-center my-3">
      <span className="text-[11px] text-[#667781] bg-[#e9edef] px-3 py-1 rounded-full">
        {new Date(date).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>
    </div>
  );
}

// ─── COMPOSER ────────────────────────────────────────────────────────────────
function Composer({ onSend, activeChannel, disabled, dealerId, conversationId }) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [isInternal, setIsInternal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionAnchor, setMentionAnchor] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]); // [{ url, type, name }]
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const cfg = CHANNEL_CONFIG[activeChannel] || CHANNEL_CONFIG.TYPE_WHATSAPP;

  // Load team members once when entering internal mode
  useEffect(() => {
    if (!isInternal || !dealerId || teamMembers.length > 0) return;
    fetch(`/api/ghl-conversations?dealerId=${dealerId}&teamMembers=1`)
      .then(r => r.ok ? r.json() : { members: [] })
      .then(d => setTeamMembers(d.members || []))
      .catch(() => {});
  }, [isInternal, dealerId, teamMembers.length]);

  // Cleanup recording timer on unmount
  useEffect(() => () => { clearInterval(recordingTimerRef.current); }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && pendingAttachments.length === 0) || disabled) return;
    onSend(trimmed, isInternal, pendingAttachments);
    setText('');
    setPendingAttachments([]);
    setMentionQuery(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') { setMentionQuery(null); return; }
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'Enter') { e.preventDefault(); insertMention(filteredMembers[0]); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setText(val);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match && isInternal) {
      setMentionQuery(match[1]);
      setMentionAnchor(cursor - match[0].length);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (member) => {
    const before = text.slice(0, mentionAnchor);
    const after = text.slice(textareaRef.current?.selectionStart || mentionAnchor + (mentionQuery?.length || 0) + 1);
    setText(`${before}@${member.name} ${after}`);
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  // ── Upload file to GHL via proxy ──────────────────────────────────
  const uploadFile = async (file) => {
    if (!dealerId || !conversationId) return null;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      const r = await fetch(
        `/api/ghl-conversations?dealerId=${dealerId}&conversationId=${conversationId}&upload=1`,
        { method: 'POST', body: formData }
      );
      if (!r.ok) throw new Error('Error subiendo archivo');
      const data = await r.json();
      return data.url || null;
    } catch (err) {
      console.error('[Composer] uploadFile error:', err);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  // ── Paperclip: open file picker ───────────────────────────────────
  const handleAttachClick = () => {
    if (disabled || isInternal) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = await uploadFile(file);
    if (url) {
      setPendingAttachments(prev => [...prev, {
        url,
        type: file.type || 'application/octet-stream',
        name: file.name,
      }]);
    }
  };

  // ── Voice recording ───────────────────────────────────────────────
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Prefer opus/webm, fallback to browser default
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `voice_note_${Date.now()}.${ext}`, { type: blob.type });
        const url = await uploadFile(file);
        if (url) {
          // Send immediately as audio message
          onSend('', false, [{ url, type: blob.type, name: file.name }]);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSecs(0);
      recordingTimerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
    } catch (err) {
      console.error('[Composer] startRecording error:', err);
    }
  };

  const stopRecording = () => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSecs(0);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  const handleMicClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const filteredMembers = mentionQuery !== null
    ? teamMembers.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  const voiceSupported = activeChannel === 'TYPE_WHATSAPP' && !isInternal;
  const canSend = (text.trim() || pendingAttachments.length > 0) && !disabled && !uploadingFile;

  return (
    <div className="px-3 pt-2 bg-[#f0f2f5] shrink-0" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Pending attachments preview */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2 pb-2">
          {pendingAttachments.map((att, i) => (
            <div key={i} className="relative group">
              {att.type.startsWith('image') ? (
                <img src={att.url} alt="" className="w-16 h-16 rounded-xl object-cover border border-[#e9edef]" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#e9edef] flex flex-col items-center justify-center gap-1">
                  <Paperclip size={16} className="text-[#667781]" />
                  <span className="text-[9px] text-[#667781] truncate max-w-[56px] px-1">{att.name}</span>
                </div>
              )}
              <button
                onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full items-center justify-center text-xs hidden group-hover:flex"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`rounded-2xl overflow-hidden transition-colors duration-200
        ${isRecording
          ? 'bg-red-50 border border-red-200'
          : isInternal
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-white'
        }`}
      >
        {/* Mode indicator bar */}
        {!isRecording && (
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <div className="flex items-center gap-2">
              {isInternal ? (
                <>
                  <span className="text-sm">🔒</span>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Nota interna · Solo tu equipo</span>
                </>
              ) : (
                <>
                  <span className="text-sm">{cfg.icon}</span>
                  <span className="text-[10px] font-medium text-[#667781] uppercase tracking-widest">via {cfg.label}</span>
                </>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsInternal(v => !v)}
              title={isInternal ? 'Cambiar a mensaje normal' : 'Nota interna (solo equipo)'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200
                ${isInternal
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#f0f2f5] text-[#667781] hover:text-[#111827]'
                }`}
            >
              <Lock size={10} />
              Interno
            </motion.button>
          </div>
        )}

        {/* Recording indicator row */}
        {isRecording && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[13px] font-semibold text-red-600 flex-1">
              Grabando... {Math.floor(recordingSecs / 60).toString().padStart(2, '0')}:{(recordingSecs % 60).toString().padStart(2, '0')}
            </span>
            <span className="text-[11px] text-[#667781]">Toca 🎤 para enviar</span>
          </div>
        )}

        {/* Input row */}
        {!isRecording && (
          <div className="flex items-end gap-2 px-3 pb-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleInput}
              onKeyDown={handleKey}
              disabled={disabled || uploadingFile}
              rows={1}
              placeholder={
                uploadingFile
                  ? 'Subiendo archivo...'
                  : disabled
                    ? 'Selecciona una conversación...'
                    : isInternal
                      ? '@ para etiquetar a los usuarios...'
                      : `Mensaje por ${cfg.label}...`
              }
              className={`flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed py-1 max-h-[120px] font-normal transition-colors duration-200
                ${isInternal
                  ? 'text-amber-900 placeholder:text-amber-300'
                  : 'text-[#111827] placeholder:text-[#667781]'
                }`}
            />

            <div className="flex items-center gap-1 shrink-0 pb-0.5">
              {/* Attach — hide on internal */}
              {!isInternal && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAttachClick}
                  disabled={disabled || uploadingFile}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    uploadingFile
                      ? 'text-[#00a884] animate-pulse'
                      : 'text-[#667781] hover:text-[#111827]'
                  }`}
                >
                  <Paperclip size={16} />
                </motion.button>
              )}

              {/* Voice note */}
              {voiceSupported && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleMicClick}
                  disabled={disabled}
                  className="text-[#667781] hover:text-[#111827] w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                >
                  <Mic size={16} />
                </motion.button>
              )}

              {/* Send */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!canSend}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
                  ${canSend
                    ? isInternal
                      ? 'bg-[#ffd700] text-black shadow-[0_4px_12px_rgba(255,215,0,0.3)] hover:bg-[#ffe040]'
                      : 'bg-[#00a884] text-white shadow-[0_4px_12px_rgba(0,168,132,0.35)] hover:bg-[#00c49a]'
                    : 'text-[#667781]'
                  }`}
              >
                <Send size={15} />
              </motion.button>
            </div>
          </div>
        )}

        {/* Recording action row */}
        {isRecording && (
          <div className="flex items-center justify-between px-3 pb-3">
            <button
              onClick={() => {
                clearInterval(recordingTimerRef.current);
                setIsRecording(false);
                setRecordingSecs(0);
                mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
                mediaRecorderRef.current = null;
              }}
              className="text-xs text-[#667781] px-3 py-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={stopRecording}
              className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(239,68,68,0.35)] hover:bg-red-600 transition-colors"
            >
              <Mic size={18} />
            </motion.button>
          </div>
        )}

        {/* @ Mention dropdown */}
        {mentionQuery !== null && filteredMembers.length > 0 && (
          <div className="mx-3 mb-2 bg-white border border-[#e9edef] rounded-xl overflow-hidden">
            {filteredMembers.map(member => (
              <button
                key={member.id}
                onMouseDown={e => { e.preventDefault(); insertMention(member); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f5f6f6] transition-colors text-left"
              >
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(member.name)} flex items-center justify-center shrink-0`}>
                  {member.avatar
                    ? <img src={member.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                    : <span className="text-white text-[10px] font-black">{getInitials(member.name)}</span>
                  }
                </div>
                <div>
                  <p className="text-xs font-bold text-[#111827]">{member.name}</p>
                  {member.email && <p className="text-[10px] text-[#667781]">{member.email}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CONTACT HEADER ──────────────────────────────────────────────────────────
function ConvHeader({ conv, onBack, channels, activeChannel, onChannelChange, onShowContactInfo, onPin, onAddTag, onDelete, dealerId, isPinned }) {
  const name = conv?.fullName || conv?.contactName || `${conv?.firstName || ''} ${conv?.lastName || ''}`.trim() || 'Sin nombre';
  const gradient = getAvatarGradient(name);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="bg-[#f0f2f5] shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Back (mobile) */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="sm:hidden w-8 h-8 rounded-xl flex items-center justify-center text-[#667781] hover:text-[#111827] transition-colors shrink-0"
        >
          <ChevronLeft size={20} />
        </motion.button>

        {/* Avatar — click opens right info panel */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onShowContactInfo}
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 cursor-pointer`}
          title="Ver info del contacto"
        >
          <span className="text-white text-xs font-black">{getInitials(name)}</span>
        </motion.div>

        {/* Info — click opens right info panel */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onShowContactInfo}>
          <h2 className="text-[15px] font-semibold text-[#111827] truncate leading-tight">{name}</h2>
          {conv?.phone && (
            <p className="text-[12px] text-[#667781] truncate leading-tight">{conv.phone}</p>
          )}
        </div>

        {/* Actions menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setMenuOpen(v => !v); setTagMenuOpen(false); }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#667781] hover:text-[#111827] hover:bg-[#e9edef] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className="absolute right-0 top-11 w-52 bg-white border border-[#e9edef] rounded-2xl shadow-lg overflow-hidden z-50"
              >
                <button
                  onClick={() => { onPin?.(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-[#111827] hover:bg-[#f5f6f6] transition-colors text-left"
                >
                  <Pin size={15} className={isPinned ? 'text-red-500' : 'text-[#667781]'} />
                  {isPinned ? 'Desfijar conversación' : 'Fijar conversación'}
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Channel Selector */}
      {channels.length > 1 && (
        <div className="px-4 pb-2">
          <ChannelSelector channels={channels} active={activeChannel} onChange={onChannelChange} />
        </div>
      )}
    </div>
  );
}

// ─── CHAT WATERMARK ──────────────────────────────────────────────────────────
const ICONS = [
  // Car (side view)
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 30h32M10 30l4-10h20l4 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 30v4h4v-4M38 30v4h4v-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><circle cx="14" cy="34" r="3" stroke="currentColor" strokeWidth="2.5"/><circle cx="34" cy="34" r="3" stroke="currentColor" strokeWidth="2.5"/><path d="M18 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  // Motorcycle
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="34" r="5" stroke="currentColor" strokeWidth="2.5"/><circle cx="38" cy="34" r="5" stroke="currentColor" strokeWidth="2.5"/><path d="M15 34h8l4-12h6l3 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M27 22l-3-6h-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M33 28h5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  // Tractor
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="36" r="7" stroke="currentColor" strokeWidth="2.5"/><circle cx="36" cy="38" r="4" stroke="currentColor" strokeWidth="2.5"/><path d="M21 36h11V24l-6-8H10v20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M32 38v-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M10 20h8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  // Robot / AI
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="18" width="24" height="20" rx="4" stroke="currentColor" strokeWidth="2.5"/><rect x="18" y="24" width="4" height="4" rx="1" fill="currentColor"/><rect x="26" y="24" width="4" height="4" rx="1" fill="currentColor"/><path d="M20 32h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M24 18v-4M20 14h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M6 24h6M36 24h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  // AI brain / circuit
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="2.5"/><path d="M24 14v4M24 30v4M14 24h4M30 24h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.5"/><path d="M17 17l3 3M28 28l3 3M17 31l3-3M28 20l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  // Gear / settings
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 30a6 6 0 100-12 6 6 0 000 12z" stroke="currentColor" strokeWidth="2.5"/><path d="M19.8 8.4L18 12l-4-1-2 3.5 3 3A10 10 0 0014 20l-4 1v4l4 1c.2 1 .6 2 1 2.8l-3 3L14 35l4-1c.8.7 1.8 1.3 2.8 1.7L22 40h4l1.2-4.3c1-.4 2-1 2.8-1.7l4 1 2-3.5-3-3c.4-.9.8-1.8 1-2.8l4-1v-4l-4-1a10 10 0 00-1-2.8l3-3L34 12l-4 1-1.8-3.6-4.2.4-4.2-.4z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/></svg>,
  // Chat bubble
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 12a4 4 0 014-4h24a4 4 0 014 4v16a4 4 0 01-4 4H28l-6 6v-6H12a4 4 0 01-4-4V12z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M16 20h16M16 26h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  // SUV / Truck
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 32h36v-6l-5-10H10L6 26v6z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M13 16h8v10M21 16h10v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="14" cy="36" r="3" stroke="currentColor" strokeWidth="2.5"/><circle cx="34" cy="36" r="3" stroke="currentColor" strokeWidth="2.5"/><path d="M4 32h2M42 32h2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
];

function ChatWatermark({ dealerLogo }) {
  const cols = 8;
  const rows = 11;
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const rotations = [-18, -12, -20, -15, -10, -22, -16, -14];

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0, overflow: 'hidden', opacity: 0.22 }}>
      {Array.from({ length: cols * rows }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        // Offset alternating rows for denser brick pattern
        const xOffset = row % 2 === 1 ? cellW * 0.5 : 0;
        const x = col * cellW + cellW / 2 + xOffset;
        const y = row * cellH + cellH / 2;
        const rotate = rotations[i % rotations.length];

        // Pattern: logo pair every 5 cells, icons fill the rest
        const isLogoPair = i % 5 === 0;
        const iconIdx = i % ICONS.length;

        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${x}%`, top: `${y}%`,
            transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {isLogoPair ? (
              <>
                <img src="/logo.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain', filter: 'grayscale(100%)' }} />
                {dealerLogo && <img src={dealerLogo} alt="" style={{ width: 48, height: 28, objectFit: 'contain', filter: 'grayscale(100%)' }} />}
              </>
            ) : (
              <div style={{ width: 24, height: 24, color: '#334155' }}>
                {ICONS[iconIdx]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MESSAGES AREA ───────────────────────────────────────────────────────────
function MessagesArea({ messages, isLoading, loadingMore, onLoadMore, onScrollChange }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const lastScrollTop = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Only auto-scroll if already near bottom (< 200px away)
    if (distFromBottom < 200) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Track scroll to notify parent
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = distFromBottom < 80;
    const scrollingUp = el.scrollTop < lastScrollTop.current;
    lastScrollTop.current = el.scrollTop;
    onScrollChange?.({ isAtBottom, scrollingUp, scrollToBottom: () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) });
  }, [onScrollChange]);

  if (isLoading) return <MsgSkeleton />;

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  (messages || []).forEach(msg => {
    const d = msg.dateAdded || msg.createdAt;
    const dateKey = d ? new Date(d).toDateString() : null;
    if (dateKey && dateKey !== lastDate) {
      grouped.push({ type: 'divider', date: d, key: `div-${d}` });
      lastDate = dateKey;
    }
    grouped.push({ type: 'message', msg, key: msg.id || msg._id || Math.random() });
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scroll-smooth"
      style={{ WebkitOverflowScrolling: 'touch', background: 'transparent' }}
    >
      {/* Load more */}
      {onLoadMore && (
        <div className="flex justify-center mb-2">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs text-[#667781] hover:text-[#111827] font-medium px-4 py-1.5 rounded-full bg-[#e9edef] hover:bg-[#d1d7db] transition-all"
          >
            {loadingMore ? 'Cargando...' : '↑ Mensajes anteriores'}
          </button>
        </div>
      )}

      {grouped.length === 0 && (
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#f0f2f5] flex items-center justify-center mx-auto">
              <MessageCircle size={20} className="text-[#667781]" />
            </div>
            <p className="text-xs text-[#667781] font-medium">Sin mensajes aún</p>
          </div>
        </div>
      )}

      {grouped.map(item =>
        item.type === 'divider'
          ? <DateDivider key={item.key} date={item.date} />
          : <MessageBubble
              key={item.key}
              msg={item.msg}
              isOwn={item.msg.direction === 'outbound' || item.msg.fromName === 'You' || item.msg.type === 'outbound'}
            />
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
function EmptyState({ onRefresh }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-16 h-16 rounded-full bg-[#f0f2f5] flex items-center justify-center mb-4"
      >
        <MessageCircle size={28} className="text-[#667781]" />
      </motion.div>
      <p className="text-sm font-semibold text-[#111827] mb-1">Sin conversaciones</p>
      <p className="text-xs text-[#667781] mb-4">Las conversaciones de GHL aparecerán aquí</p>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-4 py-2 bg-[#00a884] text-white text-xs font-bold rounded-xl hover:bg-[#00c49a] transition-colors"
      >
        <RefreshCw size={13} />
        Actualizar
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ConversationsView({ dealerId, showToast, userProfile, onNavigateToContact, onlyAssignedData = false, ghlUserId = '', initialConversations = [], isLoadingConversations = false, onRefreshConversations, contracts = [], onChatOpen, onChatClose }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingMoreMsgs, setLoadingMoreMsgs] = useState(false);
  const [lastMessageId, setLastMessageId] = useState(null);
  const [hasMoreMsgs, setHasMoreMsgs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiOn, setAiOn] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);
  const [sending, setSending] = useState(false);
  const [showDetail, setShowDetailRaw] = useState(false); // mobile: show chat panel
  const [showContactInfo, setShowContactInfo] = useState(false); // right panel: contact info
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showComposer, setShowComposer] = useState(true);
  const scrollToBottomRef = useRef(null);

  // Notify parent when chat opens/closes so it can hide header+nav on mobile
  const setShowDetail = useCallback((val) => {
    setShowDetailRaw(val);
    if (val) onChatOpen?.();
    else onChatClose?.();
  }, [onChatOpen, onChatClose]);

  const handleScrollChange = useCallback(({ isAtBottom: atBottom, scrollingUp, scrollToBottom }) => {
    setIsAtBottom(atBottom);
    scrollToBottomRef.current = scrollToBottom;
    // Show composer when scrolling down or at bottom; hide only when actively scrolling up and not at bottom
    if (atBottom) setShowComposer(true);
    else if (scrollingUp) setShowComposer(false);
    else setShowComposer(true);
  }, []);
  const [pinnedConvIds, setPinnedConvIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('carbot_pinned_convs') || '[]'); } catch { return []; }
  });

  const effectiveDealerId = dealerId || userProfile?.supabaseDealerId;

  const selectedConv = useMemo(
    () => conversations.find(c => c.id === selectedConvId) || null,
    [conversations, selectedConvId]
  );

  const detectedChannels = useMemo(() => detectChannels(messages), [messages]);

  // Set default channel when channels detected
  useEffect(() => {
    if (detectedChannels.length > 0 && !activeChannel) {
      // Prefer WhatsApp → SMS → first available
      const preferred = ['TYPE_WHATSAPP', 'TYPE_SMS'];
      const found = preferred.find(p => detectedChannels.includes(p)) || detectedChannels[0];
      setActiveChannel(found);
    }
  }, [detectedChannels, activeChannel]);

  // Sync when parent passes updated conversations
  useEffect(() => {
    if (initialConversations.length > 0) setConversations(initialConversations);
  }, [initialConversations]);

  // ── Fetch conversations (fallback if no pre-loaded data) ──────────
  const fetchConversations = useCallback(async () => {
    if (!effectiveDealerId) return;
    // If parent already has data, use that — only fetch if empty
    if (initialConversations.length > 0) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ dealerId: effectiveDealerId, limit: '100' });
      if (onlyAssignedData && ghlUserId) params.set('assignedUserId', ghlUserId);
      const r = await fetch(`/api/ghl-conversations?${params}`);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('[ConversationsView] fetchConversations error:', err);
      showToast?.('Error cargando conversaciones', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveDealerId, onlyAssignedData, ghlUserId, initialConversations.length]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Fetch messages ────────────────────────────────────────────────
  const fetchMessages = useCallback(async (convId, append = false) => {
    if (!effectiveDealerId || !convId) return;
    if (!append) setMessagesLoading(true);
    else setLoadingMoreMsgs(true);
    try {
      const params = new URLSearchParams({ dealerId: effectiveDealerId, conversationId: convId, messages: '1' });
      if (append && lastMessageId) params.set('lastMessageId', lastMessageId);
      const r = await fetch(`/api/ghl-conversations?${params}`);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      // GHL returns { messages: { messages: [...], nextPage, lastMessageId } }
      const wrapper = data.messages || {};
      const raw = Array.isArray(wrapper) ? wrapper : (wrapper.messages || []);
      // GHL returns newest-first — reverse so oldest is at top, newest at bottom
      const list = [...raw].reverse();
      const nextPage = wrapper.nextPage || false;
      if (append) {
        // prepend older messages at top
        setMessages(prev => [...list, ...prev]);
      } else {
        setMessages(list);
        const conv = conversations.find(c => c.id === convId);
        setAiOn(conv?.aiResponseEnabled ?? false);
      }
      setHasMoreMsgs(!!nextPage);
      if (raw.length > 0) setLastMessageId(raw[raw.length - 1]?.id || null);
    } catch (err) {
      console.error('[ConversationsView] fetchMessages error:', err);
    } finally {
      setMessagesLoading(false);
      setLoadingMoreMsgs(false);
    }
  }, [effectiveDealerId, lastMessageId, conversations]);

  const handleSelectConv = (convId) => {
    setSelectedConvId(convId);
    setMessages([]);
    setLastMessageId(null);
    setActiveChannel(null);
    // Only open full-screen mobile chat on small screens (< 640px = sm breakpoint)
    if (window.innerWidth < 640) setShowDetail(true);
    fetchMessages(convId);
    // Mark conversation as read in GHL and clear local badge
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
    fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&conversationId=${convId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unreadCount: 0 }),
    }).catch(() => {});
  };

  // ── Polling: nuevos mensajes cada 5s ─────────────────────────────
  const pollingRef = useRef(null);
  const selectedConvIdRef = useRef(selectedConvId);
  const messagesRef = useRef(messages);
  selectedConvIdRef.current = selectedConvId;
  messagesRef.current = messages;

  const pollNewMessages = useCallback(async () => {
    const convId = selectedConvIdRef.current;
    if (!convId || !effectiveDealerId) return;
    try {
      const params = new URLSearchParams({ dealerId: effectiveDealerId, conversationId: convId, messages: '1' });
      const r = await fetch(`/api/ghl-conversations?${params}`);
      if (!r.ok) return;
      const data = await r.json();
      const wrapper = data.messages || {};
      const raw = Array.isArray(wrapper) ? wrapper : (wrapper.messages || []);
      const list = [...raw].reverse();
      if (!list.length) return;
      // Only add messages that aren't already in state (by id)
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = list.filter(m => m.id && !existingIds.has(m.id) && !m.id.startsWith('temp-'));
        if (!newMsgs.length) return prev;
        // Remove pending temp messages that were confirmed, append real new ones
        return [...prev.filter(m => !m.id?.startsWith('temp-')), ...newMsgs];
      });
    } catch (_) {}
  }, [effectiveDealerId]);

  useEffect(() => {
    if (!selectedConvId) return;
    pollingRef.current = setInterval(pollNewMessages, 5000);
    return () => clearInterval(pollingRef.current);
  }, [selectedConvId, pollNewMessages]);

  // ── Send message ──────────────────────────────────────────────────
  const handleSend = async (text, isInternal = false, attachments = []) => {
    if (!selectedConvId || (!text.trim() && attachments.length === 0) || sending) return;
    const ghlType = isInternal ? 'Note' : (CHANNEL_CONFIG[activeChannel]?.ghlType || 'WhatsApp');

    // Optimistic update
    const tempMsg = {
      id: `temp-${Date.now()}`,
      body: text,
      type: ghlType,
      direction: 'outbound',
      dateAdded: new Date().toISOString(),
      status: 'sending',
      ...(attachments.length > 0 ? { attachments } : {}),
    };
    setMessages(prev => [...prev, tempMsg]);
    setSending(true);

    try {
      const payload = {
        conversationId: selectedConvId,
        type: ghlType,
        message: text,
        ...(attachments.length > 0 ? { attachments: attachments.map(a => ({ url: a.url, type: a.type })) } : {}),
      };
      const r = await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Error al enviar');
      }
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, status: 'sent' } : m));
      setConversations(prev => prev.map(c =>
        c.id === selectedConvId
          ? { ...c, lastMessageBody: text || '📎 Archivo', lastMessageDate: new Date().toISOString() }
          : c
      ));
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, status: 'failed' } : m));
      showToast?.('Error al enviar mensaje', 'error');
    } finally {
      setSending(false);
    }
  };

  // ── Toggle AI bot ─────────────────────────────────────────────────
  const handleToggleAI = async () => {
    if (!selectedConvId || aiLoading) return;
    setAiLoading(true);
    const newState = !aiOn;
    try {
      const r = await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&conversationId=${selectedConvId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiResponseEnabled: newState }),
      });
      if (!r.ok) throw new Error('Error actualizando IA');
      setAiOn(newState);
      setConversations(prev => prev.map(c =>
        c.id === selectedConvId ? { ...c, aiResponseEnabled: newState } : c
      ));
      showToast?.(newState ? 'Bot activado' : 'Bot pausado', 'success');
    } catch (err) {
      showToast?.('Error al cambiar estado del bot', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Filter + sort conversations (pinned first) ────────────────────
  const filteredConvs = useMemo(() => {
    let list = conversations;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c => {
        const name = (c.fullName || c.contactName || `${c.firstName || ''} ${c.lastName || ''}`).toLowerCase();
        return name.includes(q) || (c.phone || '').includes(q) || (c.email || '').includes(q);
      });
    }
    return [...list].sort((a, b) => {
      const aPinned = pinnedConvIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedConvIds.includes(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [conversations, searchTerm, pinnedConvIds]);

  // ─── RENDER ───────────────────────────────────────────────────────
  return (
    <div className="flex bg-[#f0f2f5] overflow-hidden flex-1 h-full" style={{ minHeight: 0 }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <div
        className={`w-full sm:w-80 flex flex-col border-r border-[#e9edef] bg-[#f0f2f5] sm:shrink-0
          ${showDetail ? 'hidden sm:flex' : 'flex'}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Sidebar Header */}
        <div className="px-4 pt-4 pb-3 bg-[#f0f2f5] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[17px] font-semibold text-[#111827]">Mensajes</h1>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { onRefreshConversations?.(); fetchConversations(); }}
              disabled={isLoading || isLoadingConversations}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#667781] hover:text-[#111827] hover:bg-[#e9edef] transition-all"
            >
              <RefreshCw size={15} className={(isLoading || isLoadingConversations) ? 'animate-spin' : ''} />
            </motion.button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667781]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar conversación..."
              className="w-full pl-9 pr-4 py-2 bg-white rounded-lg text-[13px] text-[#111827] placeholder:text-[#667781] outline-none focus:bg-[#f5f6f6] transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667781] hover:text-[#111827]">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {isLoading ? (
            <ConvSkeleton />
          ) : filteredConvs.length === 0 ? (
            <EmptyState onRefresh={() => { onRefreshConversations?.(); fetchConversations(); }} />
          ) : (
            <div>
              {filteredConvs.map(conv => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === selectedConvId}
                  isPinned={pinnedConvIds.includes(conv.id)}
                  onClick={() => { handleSelectConv(conv.id); setShowContactInfo(false); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CHAT PANEL — Desktop ──────────────────────────────────── */}
      <div className="hidden sm:flex flex-col flex-1 min-w-0 relative overflow-hidden" style={{ background: '#e8eaed' }}>
        {/* Watermark background pattern */}
        <ChatWatermark dealerLogo={userProfile?.dealer_logo} />

        {selectedConv ? (
          /* ── Active chat ── */
          <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden">
            <ConvHeader
              conv={selectedConv}
              onBack={() => setShowDetail(false)}
              channels={detectedChannels}
              activeChannel={activeChannel}
              onChannelChange={setActiveChannel}
              onShowContactInfo={() => setShowContactInfo(v => !v)}
              dealerId={effectiveDealerId}
              isPinned={pinnedConvIds.includes(selectedConvId)}
              onPin={() => {
                if (!selectedConvId) return;
                setPinnedConvIds(prev => {
                  const isPinned = prev.includes(selectedConvId);
                  const next = isPinned ? prev.filter(id => id !== selectedConvId) : [...prev, selectedConvId];
                  localStorage.setItem('carbot_pinned_convs', JSON.stringify(next));
                  showToast?.(isPinned ? 'Conversación desfijada' : 'Conversación fijada', 'success');
                  return next;
                });
              }}
              onAddTag={async (tag) => {
                if (!selectedConv?.contactId) return;
                try {
                  await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&contactId=${selectedConv.contactId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ addTag: tag }),
                  });
                  showToast(`Etiqueta "${tag}" agregada`, 'success');
                } catch (_) { showToast('Error al agregar etiqueta', 'error'); }
              }}
              onDelete={async () => {
                if (!selectedConvId) return;
                try {
                  await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&conversationId=${selectedConvId}`, { method: 'DELETE' });
                  setConversations(prev => prev.filter(c => c.id !== selectedConvId));
                  setSelectedConvId(null);
                  showToast('Conversación eliminada', 'success');
                } catch (_) { showToast('Error al eliminar conversación', 'error'); }
              }}
            />
            {/* Messages — flex-1 scrolls independently */}
            <div className="flex-1 relative min-h-0 overflow-hidden flex flex-col">
              <MessagesArea
                messages={messages}
                isLoading={messagesLoading}
                loadingMore={loadingMoreMsgs}
                onLoadMore={hasMoreMsgs ? () => fetchMessages(selectedConvId, true) : null}
                onScrollChange={handleScrollChange}
              />
              {/* Scroll-to-bottom button */}
              <AnimatePresence>
                {!isAtBottom && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={() => scrollToBottomRef.current?.()}
                    className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-white shadow-lg border border-[#e9edef] flex items-center justify-center text-[#667781] hover:text-[#111827]"
                  ><ChevronDown size={20} /></motion.button>
                )}
              </AnimatePresence>
            </div>
            {/* Composer — always visible at bottom */}
            <Composer
              onSend={handleSend}
              activeChannel={activeChannel || 'TYPE_WHATSAPP'}
              disabled={sending}
              dealerId={effectiveDealerId}
              conversationId={selectedConvId}
            />
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="relative z-10 flex flex-col flex-1 items-center justify-center text-center p-8">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-24 h-24 rounded-full bg-[#e9edef] flex items-center justify-center mb-6">
              <MessageCircle size={36} className="text-[#667781]" />
            </motion.div>
            <p className="text-[17px] font-semibold text-[#111827] mb-2">CarBot Messenger</p>
            <p className="text-sm text-[#667781]">Selecciona una conversación para comenzar</p>
          </div>
        )}
      </div>

      {/* ── CHAT PANEL — Mobile (portal over everything) ──────────── */}
      {showDetail && selectedConv && createPortal(
        <AnimatePresence>
          <motion.div
            key={selectedConvId}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.3 }}
            onDragEnd={(_, info) => { if (info.offset.x > 80 || info.velocity.x > 400) setShowDetail(false); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', flexDirection: 'column',
              background: '#e8eaed', overflow: 'hidden',
            }}
          >
            <ConvHeader
              conv={selectedConv}
              onBack={() => setShowDetail(false)}
              channels={detectedChannels}
              activeChannel={activeChannel}
              onChannelChange={setActiveChannel}
              onShowContactInfo={() => setShowContactInfo(v => !v)}
              dealerId={effectiveDealerId}
              isPinned={pinnedConvIds.includes(selectedConvId)}
              onPin={() => {
                if (!selectedConvId) return;
                setPinnedConvIds(prev => {
                  const isPinned = prev.includes(selectedConvId);
                  const next = isPinned ? prev.filter(id => id !== selectedConvId) : [...prev, selectedConvId];
                  localStorage.setItem('carbot_pinned_convs', JSON.stringify(next));
                  showToast?.(isPinned ? 'Conversación desfijada' : 'Conversación fijada', 'success');
                  return next;
                });
              }}
              onAddTag={async (tag) => {
                if (!selectedConv?.contactId) return;
                try {
                  await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&contactId=${selectedConv.contactId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ addTag: tag }),
                  });
                  showToast(`Etiqueta "${tag}" agregada`, 'success');
                } catch (_) { showToast('Error al agregar etiqueta', 'error'); }
              }}
              onDelete={async () => {
                if (!selectedConvId) return;
                try {
                  await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&conversationId=${selectedConvId}`, { method: 'DELETE' });
                  setConversations(prev => prev.filter(c => c.id !== selectedConvId));
                  setSelectedConvId(null); setShowDetail(false);
                  showToast('Conversación eliminada', 'success');
                } catch (_) { showToast('Error al eliminar conversación', 'error'); }
              }}
            />

            <MessagesArea messages={messages} isLoading={messagesLoading} loadingMore={loadingMoreMsgs}
              onLoadMore={hasMoreMsgs ? () => fetchMessages(selectedConvId, true) : null}
              onScrollChange={handleScrollChange}
            />

            {/* Floating buttons */}
            <div style={{ position: 'absolute', bottom: 80, right: 16, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <AnimatePresence>
                {!isAtBottom && (
                  <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={() => scrollToBottomRef.current?.()}
                    style={{ width: 40, height: 40, borderRadius: '50%', background: 'white', border: '1px solid #e9edef', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                  ><ChevronDown size={20} color="#667781" /></motion.button>
                )}
              </AnimatePresence>
            </div>

            <Composer onSend={handleSend} activeChannel={activeChannel || 'TYPE_WHATSAPP'} disabled={sending} dealerId={effectiveDealerId} conversationId={selectedConvId} />
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* ── PANEL DERECHO: INFO DEL CONTACTO ─────────────────────── */}
      <AnimatePresence>
        {showContactInfo && selectedConv && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed sm:relative inset-0 sm:inset-auto z-40 sm:z-auto w-full sm:w-80 flex flex-col border-l border-[#e9edef] bg-white overflow-hidden sm:shrink-0"
          >
            {/* Panel header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowContactInfo(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#667781] hover:text-[#111827] hover:bg-[#e9edef] transition-all"
              >
                <X size={18} />
              </motion.button>
              <h3 className="text-[15px] font-semibold text-[#111827]">Info del contacto</h3>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto">
              {/* Avatar grande */}
              <div className="flex flex-col items-center py-8 px-4 bg-white">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${getAvatarGradient(
                  selectedConv.fullName || selectedConv.contactName || `${selectedConv.firstName || ''} ${selectedConv.lastName || ''}`.trim() || 'Sin nombre'
                )} flex items-center justify-center mb-3 shadow-lg`}>
                  <span className="text-white text-3xl font-black">
                    {getInitials(selectedConv.fullName || selectedConv.contactName || `${selectedConv.firstName || ''} ${selectedConv.lastName || ''}`.trim() || 'Sin nombre')}
                  </span>
                </div>
                <h2 className="text-[18px] font-semibold text-[#111827] text-center">
                  {selectedConv.fullName || selectedConv.contactName || `${selectedConv.firstName || ''} ${selectedConv.lastName || ''}`.trim() || 'Sin nombre'}
                </h2>
                {selectedConv.phone && (
                  <p className="text-[13px] text-[#667781] mt-1">{selectedConv.phone}</p>
                )}
              </div>

              {/* Detalles */}
              <div className="px-4 pb-4 space-y-1">
                {selectedConv.email && (
                  <div className="flex items-center gap-3 py-3 border-b border-[#e9edef]">
                    <Mail size={16} className="text-[#667781] shrink-0" />
                    <div>
                      <p className="text-[13px] text-[#111827]">{selectedConv.email}</p>
                      <p className="text-[11px] text-[#667781]">Email</p>
                    </div>
                  </div>
                )}
                {selectedConv.phone && (
                  <div className="flex items-center gap-3 py-3 border-b border-[#e9edef]">
                    <Phone size={16} className="text-[#667781] shrink-0" />
                    <div>
                      <p className="text-[13px] text-[#111827]">{selectedConv.phone}</p>
                      <p className="text-[11px] text-[#667781]">Teléfono</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {(selectedConv.tags || []).length > 0 && (
                  <div className="py-3 border-b border-[#e9edef]">
                    <p className="text-[11px] text-[#667781] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Tag size={10} />
                      Etiquetas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedConv.tags || []).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0f2f5] text-[#374151] text-[11px]">
                          <Hash size={9} className="text-[#667781]" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
