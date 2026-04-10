// src/ConversationsView.jsx — Módulo de Mensajería Premium conectado a GHL
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabase.js';
import {
  MessageCircle, Search, RefreshCw, ChevronLeft, Send, Mic, MicOff,
  Paperclip, Phone, Mail, MessageSquare, Wifi, WifiOff,
  Sparkles, Bot, BotOff, X, Check, CheckCheck, Clock, AlertCircle,
  Hash, Tag, Circle, ChevronDown, AtSign, Globe, Lock, Pin, Trash2
} from 'lucide-react';
import { useI18n } from './i18n/I18nContext.jsx';

// ─── CHANNEL ICONS (SVG) ────────────────────────────────────────────────────
const WhatsAppIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.257-.154-2.938.873.873-2.938-.154-.257A8 8 0 1112 20z" fill="currentColor"/>
  </svg>
);

const SmsIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" fill="currentColor"/>
    <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" fill="currentColor"/>
  </svg>
);

const LiveChatIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2C6.48 2 2 5.58 2 10c0 2.24 1.12 4.27 2.94 5.7L4 22l4.71-2.36C9.77 19.88 10.87 20 12 20c5.52 0 10-3.58 10-8s-4.48-8-10-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <circle cx="8" cy="10" r="1" fill="currentColor"/>
    <circle cx="12" cy="10" r="1" fill="currentColor"/>
    <circle cx="16" cy="10" r="1" fill="currentColor"/>
  </svg>
);

const FacebookIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="currentColor"/>
  </svg>
);

const InstagramIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
    <circle cx="18" cy="6" r="1.5" fill="currentColor"/>
  </svg>
);

const LockIcon = ({ size = 12, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const RobotIcon = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="8" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="8" y="12" width="3" height="2.5" rx="0.8" fill="currentColor"/>
    <rect x="13" y="12" width="3" height="2.5" rx="0.8" fill="currentColor"/>
    <path d="M9.5 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 8V5M10 5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

// ─── CHANNEL CONFIG ──────────────────────────────────────────────────────────
const CHANNEL_CONFIG = {
  TYPE_WHATSAPP:    { label: 'WhatsApp',   Icon: WhatsAppIcon,  color: 'emerald', ghlType: 'WhatsApp' },
  TYPE_SMS:         { label: 'SMS',        Icon: SmsIcon,       color: 'blue',    ghlType: 'SMS' },
  TYPE_LIVE_CHAT:   { label: 'Live Chat',  Icon: LiveChatIcon,  color: 'amber',   ghlType: 'Live_Chat' },
  TYPE_FACEBOOK:    { label: 'Facebook',   Icon: FacebookIcon,  color: 'blue',    ghlType: 'Facebook' },
  TYPE_INSTAGRAM:   { label: 'Instagram',  Icon: InstagramIcon, color: 'pink',    ghlType: 'IG' },
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
function formatTime(dateStr, nowLabel) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return nowLabel || 'ahora';
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
          <div className={`rounded-2xl px-4 py-3 ${i % 2 === 0 ? 'bg-white/60 w-2/3' : 'bg-[#1a1a2e]/40 w-1/2'} h-10`} />
        </div>
      ))}
    </div>
  );
}

// ─── CONVERSATION ITEM ───────────────────────────────────────────────────────
function ConvItem({ conv, isActive, onClick, isPinned, selectMode, isSelected, onToggleSelect }) {
  const { t } = useI18n();
  const name = conv.fullName || conv.contactName || `${conv.firstName || ''} ${conv.lastName || ''}`.trim() || 'Sin nombre';
  const preview = conv.lastMessage?.body || conv.lastMessageBody || '...';
  const time = conv.lastMessageDate || conv.dateUpdated || conv.dateAdded;
  const unread = conv.unreadCount || 0;
  const gradient = getAvatarGradient(name);
  const initials = getInitials(name);

  // Channel icon from lastMessageType
  const channelKey = conv.lastMessageType;
  const channelCfg = channelKey ? CHANNEL_CONFIG[channelKey] : null;
  const ChannelIcon = channelCfg?.Icon;

  return (
    <motion.button
      onClick={selectMode ? () => onToggleSelect?.(conv.id) : onClick}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-150 text-left group relative
        ${isActive && !selectMode
          ? 'bg-white dark:bg-[#2a3942]'
          : isSelected
            ? 'bg-[#e0f2fe] dark:bg-[#1e3a5f]'
            : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
        }`}
    >
      {/* Selection checkbox or Avatar */}
      <div className="relative shrink-0">
        {selectMode ? (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors
            ${isSelected ? 'bg-[#25d366] border-[#25d366]' : 'bg-white dark:bg-[#2a3942] border-[#d1d5db] dark:border-[#667781]'}`}>
            {isSelected && <Check size={20} className="text-white" />}
          </div>
        ) : (
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-white text-xs font-black">{initials}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 border-b border-[#e9edef] dark:border-[#374045] pb-2.5">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1 min-w-0">
            {isPinned && <Pin size={10} className="text-[#667781] shrink-0" />}
            <span className="text-sm font-medium text-[#111827] dark:text-[#e9edef] truncate">{name}</span>
          </div>
          <span className={`text-[11px] shrink-0 ml-2 ${unread > 0 ? 'text-[#25d366]' : 'text-[#667781]'}`}>{formatTime(time, t('conversations_time_now'))}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {ChannelIcon && <ChannelIcon size={13} className={`shrink-0 ${channelCfg.color === 'emerald' ? 'text-emerald-500' : channelCfg.color === 'blue' ? 'text-blue-500' : channelCfg.color === 'pink' ? 'text-pink-500' : channelCfg.color === 'amber' ? 'text-amber-500' : 'text-[#667781]'}`} />}
            <p className={`text-[13px] truncate leading-tight ${unread > 0 ? 'text-[#111827] dark:text-[#e9edef] font-medium' : 'text-[#667781]'}`}>
              {preview}
            </p>
          </div>
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
            {cfg.Icon && <cfg.Icon size={14} className={isActive ? 'text-[#00a884]' : 'text-[#667781]'} />}
            <span>{cfg.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── AI TOGGLE (Floating Bubble) ─────────────────────────────────────────────
function AIToggle({ isOn, isLoading, onToggle }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative flex flex-col items-end gap-2">
      {/* Expanded label */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-sm text-xs font-bold whitespace-nowrap shadow-lg
              ${isOn
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              }`}
          >
            <div className={`w-2 h-2 rounded-full ${isOn ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]'}`} />
            <span>{isOn ? (t('conversations_bot_active_label') || 'Bot activo') : (t('conversations_bot_inactive_label') || 'Bot pausado')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating circle button */}
      <motion.button
        onClick={onToggle}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        disabled={isLoading}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.08 }}
        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-300
          ${isOn
            ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_16px_rgba(16,185,129,0.4)]'
            : 'bg-amber-500 border-amber-400 text-white shadow-[0_0_16px_rgba(245,158,11,0.3)]'
          }`}
        title={isOn ? (t('conversations_bot_active_label') || 'Bot activo') : (t('conversations_bot_inactive_label') || 'Bot pausado')}
      >
        {isLoading ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <RefreshCw size={16} />
          </motion.div>
        ) : (
          <RobotIcon size={18} className="text-white" />
        )}
        {/* Status dot */}
        <div className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#111b21]
          ${isOn ? 'bg-emerald-400' : 'bg-amber-400'}`}
        />
      </motion.button>
    </div>
  );
}

// ─── MEDIA CONTENT ───────────────────────────────────────────────────────────
function MediaContent({ msg }) {
  const { t } = useI18n();
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
              {t('conversations_video_unsupported')}
            </video>
          );
        }
        if (isAudio) {
          return (
            <audio key={i} src={url} controls className="w-[220px] h-10 rounded-xl" style={{ accentColor: '#00a884' }}>
              {t('conversations_audio_unsupported')}
            </audio>
          );
        }
        // Generic file
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/10 rounded-xl text-[12px] text-[#111827] dark:text-[#e9edef] hover:bg-black/10 dark:hover:bg-white/15 transition-colors">
            <Paperclip size={13} className="shrink-0" />
            <span className="truncate max-w-[180px]">{att.name || t('conversations_file_attachment')}</span>
          </a>
        );
      })}
    </div>
  );
}

// ─── AI MESSAGE DETECTION ─────────────────────────────────────────────────────
function isAIMessage(msg) {
  // GHL workflow/bot messages: source is 'workflow', 'automation', or 'ai'
  const src = (msg.source || '').toLowerCase();
  if (src === 'workflow' || src === 'automation' || src === 'ai') return true;
  // Messages with automationId or no userId on outbound are likely bot
  if (msg.automationId) return true;
  // User-created field from our system
  if (msg.meta?.isAI || msg.isAI) return true;
  return false;
}

// ─── MESSAGE BUBBLE ──────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, teamMembers = [] }) {
  const { t } = useI18n();
  const time = formatFullTime(msg.dateAdded || msg.createdAt);
  const body = msg.body || msg.message || msg.text || '';
  const status = msg.status;
  const isNote = msg.type === 'Note' || msg.messageType === 'Note';
  const isAI = isOwn && isAIMessage(msg);
  // GHL attachments or media
  const hasMedia = (msg.attachments?.length > 0) || msg.mediaUrl;
  // Sticker: GHL sends type=Sticker or messageType=Sticker
  const isSticker = msg.type === 'Sticker' || msg.messageType === 'Sticker';

  // Resolve team member who sent this outbound message
  const sender = isOwn && !isNote && !isAI && msg.userId
    ? teamMembers.find(m => m.id === msg.userId)
    : null;

  const bubbleClass = isNote
    ? 'bg-amber-50 border-l-2 border-amber-400 text-amber-900 rounded-lg dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-600'
    : isAI
      ? 'bg-[#e0e7ff] text-[#1e1b4b] rounded-tl-2xl rounded-bl-2xl rounded-br-2xl rounded-tr-sm shadow-sm dark:bg-[#312e81] dark:text-[#e0e7ff] border border-indigo-200/50 dark:border-indigo-600/30'
      : isOwn
        ? 'bg-[#b71c1c] text-white rounded-tl-2xl rounded-bl-2xl rounded-br-2xl rounded-tr-sm shadow-sm dark:bg-[#7f1d1d] dark:text-[#fecaca]'
        : 'bg-white text-[#111827] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl rounded-tl-sm shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]';

  return (
    <div
      className={`flex ${isNote ? 'justify-center' : isOwn ? 'justify-end' : 'justify-start'} group`}
    >
      <div className={`${isNote ? 'max-w-[85%] sm:max-w-[80%]' : 'max-w-[80%] sm:max-w-[72%]'} min-w-0 ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {isNote && (
          <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest text-center w-full px-1 flex items-center justify-center gap-1">
            <LockIcon size={10} className="text-amber-600" /> {t('conversations_note_internal')}
          </span>
        )}
        {/* AI label */}
        {isAI && !isNote && (
          <span className="flex items-center gap-1 px-1 justify-end">
            <RobotIcon size={11} className="text-indigo-500 dark:text-indigo-300" />
            <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-300 uppercase tracking-widest">Bot</span>
          </span>
        )}
        {/* Team member label */}
        {sender && !isAI && !isNote && (
          <span className="flex items-center gap-1.5 px-1 justify-end">
            {sender.avatar ? (
              <img src={sender.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-[#c62828] text-white text-[8px] font-bold flex items-center justify-center">
                {(sender.name || '?')[0].toUpperCase()}
              </span>
            )}
            <span className="text-[10px] font-medium text-[#c62828] dark:text-[#ef9a9a]">{sender.name}</span>
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
            {body || <span className="text-[#667781] italic text-[12px]">{t('conversations_no_text')}</span>}
          </div>
        )}
        <div className={`flex items-center gap-1 px-1 ${isOwn || isNote ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] text-[#667781]">{time}</span>
          {isAI && <RobotIcon size={10} className="text-indigo-400" />}
          {isOwn && !isNote && (
            status === 'delivered' ? <CheckCheck size={11} className="text-[#53bdeb]" /> :
            status === 'sent' ? <Check size={11} className="text-[#667781]" /> :
            status === 'failed' ? <AlertCircle size={11} className="text-red-400" /> :
            <Check size={11} className="text-[#667781]" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DATE DIVIDER ────────────────────────────────────────────────────────────
function DateDivider({ date }) {
  return (
    <div className="flex items-center justify-center my-3">
      <span className="text-[11px] text-[#667781] bg-white/80 dark:bg-[#202c33]/90 dark:text-[#8696a0] px-3 py-1 rounded-full shadow-sm">
        {new Date(date).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>
    </div>
  );
}

// ─── COMPOSER ────────────────────────────────────────────────────────────────
function Composer({ onSend, activeChannel, disabled, dealerId, conversationId, userProfile }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [isInternal, setIsInternal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionAnchor, setMentionAnchor] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]); // [{ url, type, name }]
  const [slashMode, setSlashMode] = useState(null); // null | 'menu' | 'vehicles'
  const [slashQuery, setSlashQuery] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState(new Set());
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const cfg = CHANNEL_CONFIG[activeChannel] || CHANNEL_CONFIG.TYPE_WHATSAPP;

  // Dealer catalog URL — read from Supabase via userProfile, fallback to generated slug
  const rawDealerName = userProfile?.dealerName || userProfile?.nombre || userProfile?.dealer_name || '';
  const catalogUrl = useMemo(() => {
    if (userProfile?.catalogo_url) return userProfile.catalogo_url;
    if (!rawDealerName) return '';
    const s = rawDealerName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\./g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `https://carbotsystem.com/inventario/${s}/catalogo`;
  }, [rawDealerName, userProfile?.catalogo_url]);
  const dealerName = rawDealerName;

  // Fetch vehicles for slash commands (direct Supabase query)
  const fetchVehicles = useCallback(async () => {
    if (!dealerId || vehicles.length > 0) return;
    setVehiclesLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('id, titulo_vehiculo, color, precio, estado, fotos, detalles')
        .eq('dealer_id', dealerId)
        .in('estado', ['Disponible', 'Cotizado'])
        .order('titulo_vehiculo', { ascending: true });
      if (error) throw error;
      const list = (data || []).map(v => {
        const d = v.detalles || {};
        const make = d.make || '';
        const model = d.model || '';
        const year = d.year || '';
        const edition = d.edition || d.edicion || '';
        const title = v.titulo_vehiculo || `${year} ${make} ${model} ${edition}`.trim();
        return {
          id: v.id,
          nombre: title.toUpperCase(),
          marca: make.toUpperCase(),
          precio: v.precio ? `RD$ ${Number(v.precio).toLocaleString()}` : '',
          img: (v.fotos && v.fotos[0]) || null,
          estado: v.estado,
        };
      });
      setVehicles(list);
    } catch (err) {
      console.error('[Composer] fetchVehicles error:', err);
    } finally {
      setVehiclesLoading(false);
    }
  }, [dealerId, vehicles.length]);

  // Filter vehicles by slash query (brand, model, etc.)
  const filteredVehicles = useMemo(() => {
    if (!slashQuery.trim()) return vehicles;
    const q = slashQuery.toLowerCase();
    return vehicles.filter(v => {
      const searchStr = `${v.nombre || ''} ${v.marca || ''}`.toLowerCase();
      return searchStr.includes(q);
    });
  }, [vehicles, slashQuery]);

  // Paste catalog link into text input (user can edit before sending)
  const insertCatalog = () => {
    const msg = catalogUrl
      ? `Este es nuestro catalogo, aqui puedes ver todo nuestro inventario.\n\n${catalogUrl}`
      : '';
    if (!msg) return;
    setText(msg);
    setSlashMode(null);
    setSlashQuery('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  // Paste selected vehicles into text input (user can edit before sending)
  const insertSelectedVehicles = () => {
    if (selectedVehicles.size === 0) return;
    const baseUrl = catalogUrl || `https://carbotsystem.com/inventario/catalogo`;
    const selected = vehicles.filter(v => selectedVehicles.has(v.id));
    const lines = selected.map(v => {
      const vehicleUrl = `${baseUrl}?dealer=${dealerId}&vehicleID=${v.id}`;
      return `Mira aqui los detalles y fotos de: ${v.nombre || 'Vehiculo'}\n\n${vehicleUrl}`;
    });
    setText(lines.join('\n\n'));
    setSlashMode(null);
    setSlashQuery('');
    setSelectedVehicles(new Set());
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const toggleVehicleSelection = (id) => {
    setSelectedVehicles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    if (e.key === 'Escape') {
      if (slashMode) { setSlashMode(null); setSlashQuery(''); setText(''); return; }
      setMentionQuery(null);
      return;
    }
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'Enter') { e.preventDefault(); insertMention(filteredMembers[0]); return; }
    }
    if (slashMode) {
      if (e.key === 'Enter') { e.preventDefault(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setText(val);

    // Slash command detection
    if (val === '/') {
      setSlashMode('menu');
      setSlashQuery('');
      fetchVehicles();
      return;
    }
    if (val.startsWith('/') && val.length > 1) {
      const cmd = val.slice(1).toLowerCase();
      if (cmd === 'catalogo') {
        insertCatalog();
        return;
      }
      // Any other text after / is a vehicle search query
      setSlashMode('vehicles');
      setSlashQuery(cmd);
      fetchVehicles();
      return;
    }
    if (!val.startsWith('/') && slashMode) {
      setSlashMode(null);
      setSlashQuery('');
    }
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
          ? 'bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-800'
          : isInternal
            ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
            : 'bg-white dark:bg-[#2a3942] dark:border-[#3b4a54]'
        }`}
      >
        {/* Mode indicator bar */}
        {!isRecording && (
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <div className="flex items-center gap-2">
              {isInternal ? (
                <>
                  <LockIcon size={14} className="text-amber-600" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{t('conversations_internal_mode')}</span>
                </>
              ) : (
                <>
                  {cfg.Icon && <cfg.Icon size={14} className="text-[#667781]" />}
                  <span className="text-[10px] font-medium text-[#667781] uppercase tracking-widest">via {cfg.label}</span>
                </>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsInternal(v => !v)}
              title={isInternal ? t('conversations_switch_normal') : t('conversations_switch_internal')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200
                ${isInternal
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                  : 'bg-[#f0f2f5] text-[#667781] hover:text-[#111827] dark:bg-[#202c33] dark:text-[#8696a0] dark:hover:text-[#e9edef]'
                }`}
            >
              <Lock size={10} />
              {t('conversations_internal_label')}
            </motion.button>
          </div>
        )}

        {/* Recording indicator row */}
        {isRecording && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[13px] font-semibold text-red-600 flex-1">
              {t('conversations_recording')} {Math.floor(recordingSecs / 60).toString().padStart(2, '0')}:{(recordingSecs % 60).toString().padStart(2, '0')}
            </span>
            <span className="text-[11px] text-[#667781]">{t('conversations_mic_hint')}</span>
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
                  ? t('conversations_uploading')
                  : disabled
                    ? t('conversations_select_conv')
                    : isInternal
                      ? t('conversations_mention_hint')
                      : `Mensaje por ${cfg.label}...`
              }
              className={`flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed py-1 max-h-[120px] font-normal transition-colors duration-200
                ${isInternal
                  ? 'text-amber-900 placeholder:text-amber-300 dark:text-amber-200 dark:placeholder:text-amber-600'
                  : 'text-[#111827] placeholder:text-[#667781] dark:text-[#e9edef] dark:placeholder:text-[#8696a0]'
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
              {t('cancel')}
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

        {/* Slash command popup */}
        {slashMode === 'menu' && (
          <div className="mx-3 mb-2 bg-white dark:bg-[#2a3942] border border-[#e9edef] dark:border-[#374045] rounded-xl overflow-hidden shadow-lg">
            <div className="px-3 py-2 border-b border-[#e9edef] dark:border-[#374045]">
              <span className="text-[10px] font-bold text-[#667781] uppercase tracking-wider">Comandos rapidos</span>
            </div>
            <button
              onMouseDown={e => { e.preventDefault(); insertCatalog(); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-[#374045] transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Globe size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#111827] dark:text-[#e9edef]">/catalogo</p>
                <p className="text-[11px] text-[#667781]">Enviar link del catalogo completo</p>
              </div>
            </button>
            <button
              onMouseDown={e => { e.preventDefault(); setSlashMode('vehicles'); setText('/'); fetchVehicles(); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-[#374045] transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Hash size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#111827] dark:text-[#e9edef]">/vehiculo</p>
                <p className="text-[11px] text-[#667781]">Buscar y enviar vehiculos especificos</p>
              </div>
            </button>
          </div>
        )}

        {/* Slash vehicle selector */}
        {slashMode === 'vehicles' && (
          <div className="mx-3 mb-2 bg-white dark:bg-[#2a3942] border border-[#e9edef] dark:border-[#374045] rounded-xl overflow-hidden shadow-lg max-h-[320px] flex flex-col">
            <div className="px-3 py-2 border-b border-[#e9edef] dark:border-[#374045] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-[#667781] uppercase tracking-wider">
                {slashQuery ? `Buscando: "${slashQuery}"` : 'Selecciona vehiculos'}
                {` (${filteredVehicles.length})`}
              </span>
              <div className="flex items-center gap-2">
                {selectedVehicles.size > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onMouseDown={e => { e.preventDefault(); insertSelectedVehicles(); }}
                    className="px-3 py-1 bg-[#00a884] text-white text-[11px] font-bold rounded-lg hover:bg-[#00c49a] transition-colors"
                  >
                    Enviar ({selectedVehicles.size})
                  </motion.button>
                )}
                <button onMouseDown={e => { e.preventDefault(); setSlashMode(null); setSlashQuery(''); setText(''); setSelectedVehicles(new Set()); }}
                  className="text-[#667781] hover:text-[#111827] dark:hover:text-[#e9edef]">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {vehiclesLoading ? (
                <div className="p-4 text-center text-[#667781] text-[12px]">Cargando inventario...</div>
              ) : filteredVehicles.length === 0 ? (
                <div className="p-4 text-center text-[#667781] text-[12px]">No se encontraron vehiculos{slashQuery ? ` para "${slashQuery}"` : ''}</div>
              ) : (
                filteredVehicles.map(v => {
                  const name = v.nombre || 'Vehiculo';
                  const price = v.precio || '';
                  const isSelected = selectedVehicles.has(v.id);
                  return (
                    <button
                      key={v.id}
                      onMouseDown={e => { e.preventDefault(); toggleVehicleSelection(v.id); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 transition-colors text-left
                        ${isSelected ? 'bg-[#e0f2fe] dark:bg-[#1e3a5f]' : 'hover:bg-[#f5f6f6] dark:hover:bg-[#374045]'}`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors
                        ${isSelected ? 'bg-[#00a884] border-[#00a884]' : 'border-[#d1d5db] dark:border-[#667781]'}`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      {v.img ? (
                        <img src={v.img} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-200 dark:bg-gray-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                          <Hash size={14} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#111827] dark:text-[#e9edef] truncate">{name}</p>
                        <p className="text-[11px] text-[#667781]">{price}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
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
  const { t } = useI18n();
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
          title={t('conversations_view_contact')}
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
            onClick={() => setMenuOpen(v => !v)}
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
                  {isPinned ? t('conversations_unpin') : t('conversations_pin')}
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
  const isDark = document.documentElement.classList.contains('dark');
  const cols = 8;
  const rows = 11;
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const rotations = [-18, -12, -20, -15, -10, -22, -16, -14];

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0, overflow: 'hidden', opacity: isDark ? 0.06 : 0.22 }}>
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
                <img src="/logo.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain', filter: isDark ? 'grayscale(100%) invert(1) brightness(0.8)' : 'grayscale(100%)' }} />
                {dealerLogo && <img src={dealerLogo} alt="" style={{ width: 48, height: 28, objectFit: 'contain', filter: isDark ? 'grayscale(100%) invert(1) brightness(0.8)' : 'grayscale(100%)' }} />}
              </>
            ) : (
              <div style={{ width: 24, height: 24, color: 'var(--text-tertiary)' }}>
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
function MessagesArea({ messages, isLoading, loadingMore, onLoadMore, onScrollChange, teamMembers = [] }) {
  const { t } = useI18n();
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
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scroll-smooth chat-bg"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Load more */}
      {onLoadMore && (
        <div className="flex justify-center mb-2">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs text-[#667781] hover:text-[#111827] font-medium px-4 py-1.5 rounded-full bg-[#e9edef] hover:bg-[#d1d7db] transition-all"
          >
            {loadingMore ? t('loading') : `↑ ${t('conversations_load_more')}`}
          </button>
        </div>
      )}

      {grouped.length === 0 && (
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#f0f2f5] flex items-center justify-center mx-auto">
              <MessageCircle size={20} className="text-[#667781]" />
            </div>
            <p className="text-xs text-[#667781] font-medium">{t('conversations_no_messages')}</p>
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
              teamMembers={teamMembers}
            />
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
function EmptyState({ onRefresh }) {
  const { t } = useI18n();
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
      <p className="text-sm font-semibold text-[#111827] mb-1">{t('noConversations')}</p>
      <p className="text-xs text-[#667781] mb-4">{t('conversations_ghl_hint')}</p>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-4 py-2 bg-[#00a884] text-white text-xs font-bold rounded-xl hover:bg-[#00c49a] transition-colors"
      >
        <RefreshCw size={13} />
        {t('refresh')}
      </button>
    </div>
  );
}

// ─── TAGS SECTION (CONTACT INFO PANEL) ────────────────────────────────────────
function TagsSection({ tags, availableTags, onAddTag, onRemoveTag }) {
  const { t } = useI18n();
  const [showPicker, setShowPicker] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const currentTags = tags || [];
  const filteredAvailable = availableTags.filter(t =>
    !currentTags.includes(t.name) &&
    (!newTagInput || t.name.toLowerCase().includes(newTagInput.toLowerCase()))
  );

  const handleAddTag = (tagName) => {
    if (!tagName.trim()) return;
    onAddTag(tagName.trim());
    setNewTagInput('');
    setShowPicker(false);
  };

  return (
    <div className="py-3 border-b border-[#e9edef] dark:border-[#374045]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-[#667781] uppercase tracking-widest flex items-center gap-1.5">
          <Tag size={10} />
          {t('tags') || 'Etiquetas'}
        </p>
        <div className="relative" ref={pickerRef}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowPicker(v => !v)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[#667781] hover:text-[#00a884] hover:bg-[#e9edef] dark:hover:bg-[#374045] transition-all"
            title="Agregar etiqueta"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </motion.button>

          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-8 w-56 bg-white dark:bg-[#2a3942] border border-[#e9edef] dark:border-[#374045] rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-2 border-b border-[#e9edef] dark:border-[#374045]">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddTag(newTagInput); }}
                    placeholder="Buscar o crear etiqueta..."
                    className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-[#f5f6f6] dark:bg-[#1a2429] text-[#111827] dark:text-[#e9edef] placeholder-[#667781] border-none outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {filteredAvailable.length > 0 ? (
                    filteredAvailable.map(tag => (
                      <button
                        key={tag.id || tag.name}
                        onClick={() => handleAddTag(tag.name)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#111827] dark:text-[#e9edef] hover:bg-[#f5f6f6] dark:hover:bg-[#374045] transition-colors text-left"
                      >
                        <Hash size={10} className="text-[#667781] shrink-0" />
                        {tag.name}
                      </button>
                    ))
                  ) : newTagInput.trim() ? (
                    <button
                      onClick={() => handleAddTag(newTagInput)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#00a884] hover:bg-[#f5f6f6] dark:hover:bg-[#374045] transition-colors text-left"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Crear "{newTagInput.trim()}"
                    </button>
                  ) : (
                    <p className="px-3 py-2 text-[11px] text-[#667781]">No hay etiquetas disponibles</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {currentTags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0f2f5] dark:bg-[#374045] text-[#374151] dark:text-[#e9edef] text-[11px] group">
              <Hash size={9} className="text-[#667781]" />
              {tag}
              <button
                onClick={() => onRemoveTag(tag)}
                className="ml-0.5 opacity-0 group-hover:opacity-100 text-[#667781] hover:text-red-500 transition-all"
                title="Eliminar etiqueta"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ConversationsView({ dealerId, showToast, userProfile, onNavigateToContact, onlyAssignedData = false, ghlUserId = '', initialConversations = [], isLoadingConversations = false, onRefreshConversations, contracts = [], onChatOpen, onChatClose }) {
  const { t } = useI18n();
  const [conversations, setConversations] = useState(initialConversations);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingMoreMsgs, setLoadingMoreMsgs] = useState(false);
  const [lastMessageId, setLastMessageId] = useState(null);
  const [hasMoreMsgs, setHasMoreMsgs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedConvIds, setSelectedConvIds] = useState(new Set());
  const [aiOn, setAiOn] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [detectedBots, setDetectedBots] = useState(null); // null = not loaded, [] = no bots, [...] = bots found
  const [activeChannel, setActiveChannel] = useState(null);
  const [sending, setSending] = useState(false);
  const [showDetail, setShowDetailRaw] = useState(false); // mobile: show chat panel
  const [showContactInfo, setShowContactInfo] = useState(false); // right panel: contact info
  const [teamMembers, setTeamMembers] = useState([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showComposer, setShowComposer] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);
  const [availableTagsLoaded, setAvailableTagsLoaded] = useState(false);
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

  // Fetch team members for sender labels on outbound messages
  useEffect(() => {
    if (!effectiveDealerId) return;
    fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&teamMembers=1`)
      .then(r => r.ok ? r.json() : { members: [] })
      .then(d => setTeamMembers(d.members || []))
      .catch(() => {});
  }, [effectiveDealerId]);

  // Fetch available GHL tags for this location (lazy — on first contact info open)
  const fetchAvailableTags = useCallback(async () => {
    if (availableTagsLoaded || !effectiveDealerId) return;
    try {
      const r = await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&tags=1`);
      const d = r.ok ? await r.json() : { tags: [] };
      setAvailableTags(d.tags || []);
    } catch (_) {}
    setAvailableTagsLoaded(true);
  }, [effectiveDealerId, availableTagsLoaded]);

  // ── Auto-detect conversation AI bots for this dealer ────────────
  // Disabled: GHL does not expose a public API for per-conversation bot control.
  // The endpoint /conversations-ai/employeeConfigs/ is internal and requires Firebase session tokens.
  // Re-enable when GHL publishes this capability via OAuth scopes.
  // useEffect(() => { ... }, [effectiveDealerId]);

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
      showToast?.(t('conversations_error_load'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveDealerId, onlyAssignedData, ghlUserId, initialConversations.length, t]);

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
        // Bot status is fetched separately in handleSelectConv via botStatus=1 endpoint
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

    // Fetch real bot status from GHL conversation-ai endpoint
    if (dealerHasBot) {
      fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&conversationId=${convId}&botStatus=1`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.hasConfig) {
            setAiOn(data.status === 'active');
          } else {
            setAiOn(false);
          }
        })
        .catch(() => {});
    }
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
        ...(text ? { message: text } : {}),
        ...(attachments.length > 0 ? { attachments: attachments.map(a => a.url || a) } : {}),
      };
      const r = await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || t('conversations_error_send'));
      }
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, status: 'sent' } : m));
      setConversations(prev => prev.map(c =>
        c.id === selectedConvId
          ? { ...c, lastMessageBody: text || 'Archivo adjunto', lastMessageDate: new Date().toISOString() }
          : c
      ));
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, status: 'failed' } : m));
      showToast?.(t('conversations_error_send'), 'error');
    } finally {
      setSending(false);
    }
  };

  // ── Toggle AI bot ─────────────────────────────────────────────────
  // Auto-detected from GHL API OR Supabase has_bot field
  const dealerHasBot = detectedBots === null
    ? (userProfile?.has_bot === true)
    : (detectedBots.length > 0 || userProfile?.has_bot === true);
  const botName = (detectedBots?.[0]?.name) || userProfile?.bot_name || 'Bot';

  const handleToggleAI = async () => {
    if (!selectedConvId || aiLoading || !dealerHasBot) return;
    setAiLoading(true);
    const newState = !aiOn;
    try {
      const r = await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&conversationId=${selectedConvId}&botStatus=1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newState ? 'active' : 'inactive' }),
      });
      const data = await r.json().catch(() => ({}));
      console.log('[Bot Toggle] Response:', r.status, JSON.stringify(data));
      if (!r.ok) throw new Error(data.error || t('conversations_error_ai'));
      setAiOn(newState);
      showToast?.(newState ? t('conversations_bot_activated') : t('conversations_bot_paused'), 'success');
    } catch (err) {
      console.error('[Bot Toggle] Error:', err);
      showToast?.(err.message || t('conversations_error_bot'), 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Selection mode handlers ────────────────────────────────────────
  const toggleSelectConv = useCallback((convId) => {
    setSelectedConvIds(prev => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedConvIds(new Set());
  }, []);

  const handleMarkSelectedRead = useCallback(async () => {
    const ids = [...selectedConvIds];
    if (!ids.length) return;
    // Optimistic update
    setConversations(prev => prev.map(c => ids.includes(c.id) ? { ...c, unreadCount: 0 } : c));
    // Fire API calls in parallel
    await Promise.allSettled(ids.map(convId =>
      fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&conversationId=${convId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unreadCount: 0 }),
      })
    ));
    showToast?.(t('conversations_marked_read') || `${ids.length} conversaciones marcadas como leidas`, 'success');
    exitSelectMode();
  }, [selectedConvIds, effectiveDealerId, showToast, exitSelectMode, t]);

  const handleMarkAllRead = useCallback(async () => {
    const unreadConvs = conversations.filter(c => (c.unreadCount || 0) > 0);
    if (!unreadConvs.length) return;
    // Optimistic update
    setConversations(prev => prev.map(c => ({ ...c, unreadCount: 0 })));
    // Fire API calls in parallel
    await Promise.allSettled(unreadConvs.map(c =>
      fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&conversationId=${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unreadCount: 0 }),
      })
    ));
    showToast?.(t('conversations_all_marked_read') || `${unreadConvs.length} conversaciones marcadas como leidas`, 'success');
  }, [conversations, effectiveDealerId, showToast, t]);

  const handleDeleteSelected = useCallback(async () => {
    const ids = [...selectedConvIds];
    if (!ids.length) return;
    // Remove from local state
    setConversations(prev => prev.filter(c => !ids.includes(c.id)));
    // Fire delete calls (GHL uses DELETE method)
    await Promise.allSettled(ids.map(convId =>
      fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&conversationId=${convId}`, {
        method: 'DELETE',
      })
    ));
    showToast?.(t('conversations_deleted') || `${ids.length} conversaciones eliminadas`, 'success');
    exitSelectMode();
    if (ids.includes(selectedConvId)) {
      setSelectedConvId(null);
      setMessages([]);
    }
  }, [selectedConvIds, effectiveDealerId, showToast, exitSelectMode, selectedConvId, t]);

  // ── Compute available channels from conversations ──────────────────
  const availableChannels = useMemo(() => {
    const counts = {};
    const unreadCounts = {};
    conversations.forEach(c => {
      const type = c.lastMessageType;
      if (type && CHANNEL_CONFIG[type]) {
        counts[type] = (counts[type] || 0) + 1;
        if ((c.unreadCount || 0) > 0) {
          unreadCounts[type] = (unreadCounts[type] || 0) + 1;
        }
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, unread: unreadCounts[type] || 0, ...CHANNEL_CONFIG[type] }));
  }, [conversations]);

  const totalUnread = useMemo(() =>
    conversations.filter(c => (c.unreadCount || 0) > 0).length
  , [conversations]);

  // ── Filter + sort conversations (channel filter + search + pinned first) ──
  const filteredConvs = useMemo(() => {
    let list = conversations;
    // Channel filter
    if (channelFilter === 'UNREAD') {
      list = list.filter(c => (c.unreadCount || 0) > 0);
    } else if (channelFilter !== 'ALL') {
      list = list.filter(c => c.lastMessageType === channelFilter);
    }
    // Search filter
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
  }, [conversations, searchTerm, pinnedConvIds, channelFilter]);

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
        <div className="px-4 pt-4 pb-3 bg-[#f0f2f5] dark:bg-[#111b21] shrink-0">
          {selectMode ? (
            /* Selection mode toolbar */
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.9 }} onClick={exitSelectMode}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#667781] hover:text-[#111827] dark:hover:text-[#e9edef] hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-all">
                  <X size={16} />
                </motion.button>
                <span className="text-[14px] font-medium text-[#111827] dark:text-[#e9edef]">{selectedConvIds.size} {t('conversations_selected') || 'seleccionadas'}</span>
              </div>
              <div className="flex items-center gap-1">
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleMarkSelectedRead}
                  disabled={selectedConvIds.size === 0}
                  title={t('conversations_mark_read') || 'Marcar como leidas'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#667781] hover:text-[#25d366] hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-all disabled:opacity-30">
                  <CheckCheck size={16} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleDeleteSelected}
                  disabled={selectedConvIds.size === 0}
                  title={t('conversations_delete') || 'Eliminar'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#667781] hover:text-red-500 hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-all disabled:opacity-30">
                  <Trash2 size={16} />
                </motion.button>
              </div>
            </div>
          ) : (
            /* Normal header */
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-[17px] font-semibold text-[#111827] dark:text-[#e9edef]">{t('nav_messages')}</h1>
              <div className="flex items-center gap-1">
                {/* Mark all as read */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleMarkAllRead}
                  title={t('conversations_mark_all_read') || 'Marcar todo como leido'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#667781] hover:text-[#25d366] hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-all"
                >
                  <CheckCheck size={15} />
                </motion.button>
                {/* Select mode */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectMode(true)}
                  title={t('conversations_select') || 'Seleccionar'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#667781] hover:text-[#111827] dark:hover:text-[#e9edef] hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-all"
                >
                  <Check size={15} />
                </motion.button>
                {/* Refresh */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { onRefreshConversations?.(); fetchConversations(); }}
                  disabled={isLoading || isLoadingConversations}
                  title={t('conversations_refresh') || 'Actualizar'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#667781] hover:text-[#111827] dark:hover:text-[#e9edef] hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-all"
                >
                  <RefreshCw size={15} className={(isLoading || isLoadingConversations) ? 'animate-spin' : ''} />
                </motion.button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667781]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('conversations_search_placeholder')}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-lg text-[13px] text-[#111827] placeholder:text-[#667781] outline-none focus:bg-[#f5f6f6] transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667781] hover:text-[#111827]">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Channel filter chips */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setChannelFilter('ALL')}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all
                ${channelFilter === 'ALL'
                  ? 'bg-[#25d366] text-white'
                  : 'bg-white dark:bg-[#2a3942] text-[#667781] hover:bg-[#e9edef] dark:hover:bg-[#374045]'
                }`}
            >
              {t('conversations_filter_all')}
            </button>
            <button
              onClick={() => setChannelFilter('UNREAD')}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all
                ${channelFilter === 'UNREAD'
                  ? 'bg-[#25d366] text-white'
                  : 'bg-white dark:bg-[#2a3942] text-[#667781] hover:bg-[#e9edef] dark:hover:bg-[#374045]'
                }`}
            >
              {t('conversations_filter_unread')}
              {totalUnread > 0 && (
                <span className={`ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center
                  ${channelFilter === 'UNREAD' ? 'bg-white/25 text-white' : 'bg-[#25d366] text-white'}`}>
                  {totalUnread}
                </span>
              )}
            </button>
            {availableChannels.map(ch => {
              const ChIcon = ch.Icon;
              return (
                <button
                  key={ch.type}
                  onClick={() => setChannelFilter(ch.type)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all
                    ${channelFilter === ch.type
                      ? `${COLOR_MAP[ch.color]?.active || 'bg-[#25d366]'} text-white`
                      : 'bg-white dark:bg-[#2a3942] text-[#667781] hover:bg-[#e9edef] dark:hover:bg-[#374045]'
                    }`}
                >
                  <ChIcon size={11} className={channelFilter === ch.type ? 'text-white' : ''} />
                  {ch.label}
                  {ch.unread > 0 && (
                    <span className={`ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center
                      ${channelFilter === ch.type ? 'bg-white/25 text-white' : 'bg-[#25d366] text-white'}`}>
                      {ch.unread}
                    </span>
                  )}
                </button>
              );
            })}
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
                  selectMode={selectMode}
                  isSelected={selectedConvIds.has(conv.id)}
                  onToggleSelect={toggleSelectConv}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CHAT PANEL — Desktop ──────────────────────────────────── */}
      <div className="hidden sm:flex flex-col flex-1 min-w-0 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        {selectedConv ? (
          /* ── Active chat ── */
          <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden">
            <ConvHeader
              conv={selectedConv}
              onBack={() => setShowDetail(false)}
              channels={detectedChannels}
              activeChannel={activeChannel}
              onChannelChange={setActiveChannel}
              onShowContactInfo={() => { setShowContactInfo(v => !v); fetchAvailableTags(); }}
              dealerId={effectiveDealerId}
              isPinned={pinnedConvIds.includes(selectedConvId)}
              onPin={() => {
                if (!selectedConvId) return;
                setPinnedConvIds(prev => {
                  const isPinned = prev.includes(selectedConvId);
                  const next = isPinned ? prev.filter(id => id !== selectedConvId) : [...prev, selectedConvId];
                  localStorage.setItem('carbot_pinned_convs', JSON.stringify(next));
                  showToast?.(isPinned ? t('conversations_unpinned') : t('conversations_pinned'), 'success');
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
                  setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, tags: [...(c.tags || []), tag] } : c));
                  showToast(`Etiqueta "${tag}" agregada`, 'success');
                } catch (_) { showToast(t('conversations_error_tag'), 'error'); }
              }}
              onRemoveTag={async (tag) => {
                if (!selectedConv?.contactId) return;
                try {
                  await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&contactId=${selectedConv.contactId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ removeTag: tag }),
                  });
                  setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, tags: (c.tags || []).filter(t => t !== tag) } : c));
                  showToast(`Etiqueta "${tag}" eliminada`, 'success');
                } catch (_) { showToast(t('conversations_error_tag'), 'error'); }
              }}
              onDelete={async () => {
                if (!selectedConvId) return;
                try {
                  await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&conversationId=${selectedConvId}`, { method: 'DELETE' });
                  setConversations(prev => prev.filter(c => c.id !== selectedConvId));
                  setSelectedConvId(null);
                  showToast(t('conversations_deleted'), 'success');
                } catch (_) { showToast(t('conversations_error_delete'), 'error'); }
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
                teamMembers={teamMembers}
              />
              {/* Floating controls */}
              <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
                {/* AI Bot toggle — disabled until GHL exposes public API for per-conversation bot control */}
                {/* {dealerHasBot && <AIToggle isOn={aiOn} isLoading={aiLoading} onToggle={handleToggleAI} />} */}
                {/* Scroll-to-bottom button */}
                <AnimatePresence>
                  {!isAtBottom && (
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      onClick={() => scrollToBottomRef.current?.()}
                      className="w-10 h-10 rounded-full bg-white shadow-lg border border-[#e9edef] flex items-center justify-center text-[#667781] hover:text-[#111827]"
                    ><ChevronDown size={20} /></motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {/* Composer — always visible at bottom */}
            <Composer
              onSend={handleSend}
              activeChannel={activeChannel || 'TYPE_WHATSAPP'}
              disabled={sending}
              dealerId={effectiveDealerId}
              conversationId={selectedConvId}
              userProfile={userProfile}
            />
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="relative z-10 flex flex-col flex-1 items-center justify-center text-center p-8">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-6">
              <img src="/logo.png" alt="CarBot" className="w-24 h-24 drop-shadow-lg" />
            </motion.div>
            <p className="text-[17px] font-semibold text-[#111827] mb-2">{t('conversations_messenger')}</p>
            <p className="text-sm text-[#667781]">{t('conversations_select_to_start')}</p>
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
              background: 'var(--bg-primary)', overflow: 'hidden',
            }}
          >
            <ConvHeader
              conv={selectedConv}
              onBack={() => setShowDetail(false)}
              channels={detectedChannels}
              activeChannel={activeChannel}
              onChannelChange={setActiveChannel}
              onShowContactInfo={() => { setShowContactInfo(v => !v); fetchAvailableTags(); }}
              dealerId={effectiveDealerId}
              isPinned={pinnedConvIds.includes(selectedConvId)}
              onPin={() => {
                if (!selectedConvId) return;
                setPinnedConvIds(prev => {
                  const isPinned = prev.includes(selectedConvId);
                  const next = isPinned ? prev.filter(id => id !== selectedConvId) : [...prev, selectedConvId];
                  localStorage.setItem('carbot_pinned_convs', JSON.stringify(next));
                  showToast?.(isPinned ? t('conversations_unpinned') : t('conversations_pinned'), 'success');
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
                  setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, tags: [...(c.tags || []), tag] } : c));
                  showToast(`Etiqueta "${tag}" agregada`, 'success');
                } catch (_) { showToast(t('conversations_error_tag'), 'error'); }
              }}
              onRemoveTag={async (tag) => {
                if (!selectedConv?.contactId) return;
                try {
                  await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&contactId=${selectedConv.contactId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ removeTag: tag }),
                  });
                  setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, tags: (c.tags || []).filter(t => t !== tag) } : c));
                  showToast(`Etiqueta "${tag}" eliminada`, 'success');
                } catch (_) { showToast(t('conversations_error_tag'), 'error'); }
              }}
              onDelete={async () => {
                if (!selectedConvId) return;
                try {
                  await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&conversationId=${selectedConvId}`, { method: 'DELETE' });
                  setConversations(prev => prev.filter(c => c.id !== selectedConvId));
                  setSelectedConvId(null); setShowDetail(false);
                  showToast(t('conversations_deleted'), 'success');
                } catch (_) { showToast(t('conversations_error_delete'), 'error'); }
              }}
            />

            <MessagesArea messages={messages} isLoading={messagesLoading} loadingMore={loadingMoreMsgs}
              onLoadMore={hasMoreMsgs ? () => fetchMessages(selectedConvId, true) : null}
              onScrollChange={handleScrollChange}
              teamMembers={teamMembers}
            />

            {/* Floating buttons */}
            <div style={{ position: 'absolute', bottom: 80, right: 16, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {/* AI Bot toggle — disabled until GHL exposes public API for per-conversation bot control */}
              {/* {dealerHasBot && <AIToggle isOn={aiOn} isLoading={aiLoading} onToggle={handleToggleAI} />} */}
              <AnimatePresence>
                {!isAtBottom && (
                  <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={() => scrollToBottomRef.current?.()}
                    style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-card)' }}
                  ><ChevronDown size={20} color="#667781" /></motion.button>
                )}
              </AnimatePresence>
            </div>

            <Composer onSend={handleSend} activeChannel={activeChannel || 'TYPE_WHATSAPP'} disabled={sending} dealerId={effectiveDealerId} conversationId={selectedConvId} userProfile={userProfile} />
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
              <h3 className="text-[15px] font-semibold text-[#111827]">{t('conversations_contact_info')}</h3>
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
                      <p className="text-[11px] text-[#667781]">{t('email')}</p>
                    </div>
                  </div>
                )}
                {selectedConv.phone && (
                  <div className="flex items-center gap-3 py-3 border-b border-[#e9edef]">
                    <Phone size={16} className="text-[#667781] shrink-0" />
                    <div>
                      <p className="text-[13px] text-[#111827]">{selectedConv.phone}</p>
                      <p className="text-[11px] text-[#667781]">{t('phone')}</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                <TagsSection
                  tags={selectedConv.tags || []}
                  availableTags={availableTags}
                  onAddTag={async (tag) => {
                    if (!selectedConv?.contactId) return;
                    try {
                      await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&contactId=${selectedConv.contactId}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ addTag: tag }),
                      });
                      setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, tags: [...(c.tags || []), tag] } : c));
                      showToast(`Etiqueta "${tag}" agregada`, 'success');
                    } catch (_) { showToast('Error al agregar etiqueta', 'error'); }
                  }}
                  onRemoveTag={async (tag) => {
                    if (!selectedConv?.contactId) return;
                    try {
                      await fetch(`/api/ghl-conversations?dealerId=${effectiveDealerId}&contactId=${selectedConv.contactId}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ removeTag: tag }),
                      });
                      setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, tags: (c.tags || []).filter(t => t !== tag) } : c));
                      showToast(`Etiqueta "${tag}" eliminada`, 'success');
                    } catch (_) { showToast('Error al eliminar etiqueta', 'error'); }
                  }}
                />

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
