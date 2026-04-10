import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, RefreshCw, ChevronLeft, ChevronDown, MoreVertical,
  Phone, Mail, MapPin, Calendar, Car, FileText, Trash2,
  ExternalLink, SortAsc, Clock, X, User, Tag, Pencil, Check, Plus,
  Send, FilePlus,
} from 'lucide-react';
import { useI18n } from './i18n/I18nContext.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(firstName, lastName) {
  const f = (firstName || '').charAt(0).toUpperCase();
  const l = (lastName || '').charAt(0).toUpperCase();
  return (f + l) || '?';
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return null;
  }
}

function extractCedula(contact) {
  if (contact.cedula) return contact.cedula;
  if (contact.identificationNumber) return contact.identificationNumber;
  const cf = contact.customFields || [];
  const CEDULA_KEYWORDS = ['cedula', 'c_dula', 'cdula', 'cedula_pasaporte', 'identification', 'id_number', 'pasaporte', 'passport', 'documento', 'dni'];
  // Check annotated fieldKey or key
  for (const f of cf) {
    if (!f.value) continue;
    const k = (f.fieldKey || f.key || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
      .replace(/[^a-z0-9_]/g, '_');
    if (CEDULA_KEYWORDS.some(kw => k === kw || k.startsWith(kw) || k.includes(kw))) {
      return f.value;
    }
  }
  return '';
}

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

const TAG_STYLES = {
  'compró':   'bg-emerald-100 text-emerald-700 border-emerald-200',
  'vendido':  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'cotizó':   'bg-amber-100 text-amber-800 border-amber-200',
  'cotizado': 'bg-amber-100 text-amber-800 border-amber-200',
  // social channels
  whatsapp:   'bg-green-50 text-green-700 border-green-200',
  instagram:  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  facebook:   'bg-blue-50 text-blue-700 border-blue-200',
  default:    'bg-slate-100 text-slate-600 border-slate-200',
};

// Tags that are internal/bot-related — hidden everywhere in the UI
const HIDDEN_TAGS = new Set([
  'stop bot', 'humano', 'bot', 'open ai', 'dnd',
  'do not disturb', 'unsubscribed', 'test',
]);

// Fixed curated filter pills shown at the top of the contacts list
const FILTER_PILL_TAGS = ['compró', 'vendido', 'cotizó', 'cotizado', 'cita', 'whatsapp', 'instagram', 'facebook', 'correo'];

// Priority order for tag display on cards/detail
const TAG_PRIORITY = ['compró', 'vendido', 'cotizó', 'cotizado', 'cita'];

function sortTags(tags) {
  return [...tags].sort((a, b) => {
    const ai = TAG_PRIORITY.indexOf(a.toLowerCase());
    const bi = TAG_PRIORITY.indexOf(b.toLowerCase());
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });
}

function visibleTags(tags) {
  return sortTags((tags || []).filter(tag => !HIDDEN_TAGS.has(tag.toLowerCase())));
}

function tagStyle(tag) {
  const lower = (tag || '').toLowerCase();
  return TAG_STYLES[lower] || TAG_STYLES.default;
}

const AVATAR_GRADIENTS = [
  'from-red-500 to-rose-700',
  'from-violet-500 to-purple-700',
  'from-blue-500 to-indigo-700',
  'from-teal-500 to-emerald-700',
  'from-orange-500 to-amber-700',
  'from-pink-500 to-fuchsia-700',
];

function avatarGradient(name) {
  const code = (name || 'A').charCodeAt(0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

// ─── TagPill ──────────────────────────────────────────────────────────────────

function TagPill({ tag, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-200 whitespace-nowrap ${
        selected
          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
          : `${tagStyle(tag)} hover:opacity-80`
      }`}
    >
      {tag}
    </button>
  );
}

// ─── InlineTag ────────────────────────────────────────────────────────────────

function InlineTag({ tag }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${tagStyle(tag)}`}>
      {tag}
    </span>
  );
}



// ─── Generar documento modal ─────────────────────────────────────────────────

function GenerateDocModal({ open, onOpen, onClose, onSelect, contactName }) {
  const { t } = useI18n();
  return (
    <>
      <motion.button
        onClick={onOpen}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center gap-4 p-5 rounded-[1.5rem] bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-[0_8px_28px_rgba(220,38,38,0.30)] hover:shadow-[0_14px_40px_rgba(220,38,38,0.45)] transition-all duration-300"
      >
        <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
          <FilePlus size={20} />
        </div>
        <div className="text-left">
          <p className="font-black text-sm tracking-tight">{t('contacts_generate_doc')}</p>
          <p className="text-white/70 text-xs font-medium mt-0.5">Contrato o cotización para {toTitleCase(contactName || 'este contacto')}</p>
        </div>
        <div className="ml-auto w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <ChevronLeft size={14} className="rotate-180" />
        </div>
      </motion.button>

      {open && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="w-[95%] max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden p-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 mt-2 px-4">
              <h3 className="text-xl font-black tracking-tight text-slate-800 text-center w-full ml-6">{t('contacts_generate_doc')}</h3>
              <button onClick={onClose} className="p-1 flex-shrink-0">
                <X size={20} className="text-slate-400 hover:text-red-500 transition-colors" />
              </button>
            </div>
            <div className="grid gap-4 px-2 pb-4">
              <button
                onClick={() => { onClose(); onSelect('cotizacion'); }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-100 bg-white hover:border-red-500 hover:shadow-xl hover:shadow-red-500/10 transition-all group overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 group-hover:bg-red-100 transition-colors" />
                <div className="p-4 bg-red-600 rounded-xl text-white shadow-lg shadow-red-600/30 group-hover:scale-110 transition-transform relative z-10">
                  <Send size={24} />
                </div>
                <div className="mt-4 text-center relative z-10">
                  <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight group-hover:text-red-700">{t('quotes')}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('send_tech_sheet')}</p>
                </div>
              </button>
              <button
                onClick={() => { onClose(); onSelect('contrato'); }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-100 bg-white hover:border-red-500 hover:shadow-xl hover:shadow-red-500/10 transition-all group overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 group-hover:bg-red-100 transition-colors" />
                <div className="p-4 bg-red-600 rounded-xl text-white shadow-lg shadow-red-600/30 group-hover:scale-110 transition-transform relative z-10">
                  <FilePlus size={24} />
                </div>
                <div className="mt-4 text-center relative z-10">
                  <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight group-hover:text-red-700">{t('contracts')}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('generate_legal_doc')}</p>
                </div>
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── 3-dot Menu ──────────────────────────────────────────────────────────────

function ContactMenu({ onGenerateDoc, onDelete }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200"
      >
        <MoreVertical size={20} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-full mt-1.5 w-56 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-white/50 z-50 overflow-hidden"
          >
            <button
              onClick={() => { setOpen(false); onGenerateDoc(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left"
            >
              <FilePlus size={15} className="text-red-500 flex-shrink-0" />
              {t('contacts_generate_doc')}
            </button>
            <div className="h-px bg-slate-100" />
            <button
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <Trash2 size={15} className="flex-shrink-0" />
              {t('contacts_delete_button')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ContactDetailView ────────────────────────────────────────────────────────


// Single data field row inside a section
function DataField({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-100/50 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.12em] mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-800 break-words leading-snug">{value}</p>
      </div>
    </div>
  );
}

// ─── EditField — must be top-level to avoid remount on every keystroke ────────

function EditField({ icon: Icon, label, field, type = 'text', form, setForm }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100/50 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 mt-1">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.12em] mb-1">{label}</p>
        <input
          type={type}
          value={form[field]}
          onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder={label}
          className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
        />
      </div>
    </div>
  );
}

// ─── ContactDetailView ────────────────────────────────────────────────────────

function toTitleCase(str) {
  return (str || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function ContactDetailView({ contact, linkedVehicles, linkedDocuments = [], linkedQuotes = [], onBack, onSellNewCar, onSellQuoted, onDeleteContact, onUpdateContact }) {
  const { t } = useI18n();
  const name = toTitleCase(`${contact.firstName || ''} ${contact.lastName || ''}`.trim()) || t('contacts_no_name');
  const tags = visibleTags(contact.tags);
  const gradient = avatarGradient(contact.firstName || contact.lastName || '?');

  const [editingData, setEditingData] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [docModalOpen, setDocModalOpen] = useState(false);
  const tagInputRef = useRef(null);

  const cedula = extractCedula(contact);
  const [form, setForm] = useState({
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    phone: contact.phone || '',
    email: contact.email || '',
    address1: contact.address1 || '',
    city: contact.city || '',
    dateOfBirth: contact.dateOfBirth || '',
    cedula,
  });
  const [localTags, setLocalTags] = useState(contact.tags || []);

  useEffect(() => {
    setForm({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      phone: contact.phone || '',
      email: contact.email || '',
      address1: contact.address1 || '',
      city: contact.city || '',
      dateOfBirth: contact.dateOfBirth || '',
      cedula: extractCedula(contact),
    });
    setLocalTags(contact.tags || []);
    setEditingData(false);
    setEditingTags(false);
  }, [contact.id]);

  const documents = linkedDocuments;
  const actionTag = tags.find(tag => ['compró', 'vendido', 'cotizó', 'cotizado'].includes(tag.toLowerCase()));
  const displayTags = visibleTags(localTags);
  const birthday = form.dateOfBirth ? formatDate(form.dateOfBirth) : null;
  const addressDisplay = [contact.address1, contact.city, contact.state, contact.country].filter(Boolean).join(', ');

  async function saveData() {
    setSaving(true);
    try {
      const raw = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address1: form.address1.trim(),
        city: form.city.trim(),
        dateOfBirth: form.dateOfBirth,
      };
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const update = Object.fromEntries(
        Object.entries(raw).filter(([k, v]) => {
          if (!v) return false;
          if (k === 'email') return emailRegex.test(v);
          return true;
        })
      );
      await onUpdateContact(contact.id, update);
      setEditingData(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveTags() {
    setSaving(true);
    try {
      await onUpdateContact(contact.id, { tags: localTags });
      setEditingTags(false);
    } finally {
      setSaving(false);
    }
  }

  function addTag() {
    const newTag = newTagInput.trim();
    if (newTag && !localTags.includes(newTag)) setLocalTags(prev => [...prev, newTag]);
    setNewTagInput('');
    tagInputRef.current?.focus();
  }

  function removeTag(tag) {
    setLocalTags(prev => prev.filter(existing => existing !== tag));
  }

  // Section header component
  function SectionHeader({ icon: Icon, title, iconColor = 'text-slate-500', iconBg = 'bg-slate-100', children }) {
    return (
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={14} className={iconColor} />
        </div>
        <span className="text-xs font-black text-slate-500 uppercase tracking-[0.14em]">{title}</span>
        <div className="flex-1 h-px bg-slate-100" />
        {children}
      </div>
    );
  }

  return (
    <div className="pb-24 px-6 pt-6">
      {/* ── Top nav ── */}
      <div className="flex items-center justify-between mb-8">
        <motion.button
          onClick={onBack}
          whileHover={{ x: -3 }}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors duration-200"
        >
          <ChevronLeft size={17} />
          {t('nav_contacts')}
        </motion.button>
        <ContactMenu onGenerateDoc={() => setDocModalOpen(true)} onDelete={onDeleteContact} />
      </div>

      {/* ── HERO — full width ── */}
      <div className="relative rounded-[2.5rem] overflow-hidden mb-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        {/* Vivid gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        {/* Subtle texture overlay — keeps depth without washing out color */}
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative px-8 pt-10 pb-8">
          {/* Top row: avatar + name + tags */}
          <div className="flex items-start gap-6 mb-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-[1.6rem] bg-white/25 backdrop-blur-xl flex items-center justify-center text-white font-black text-3xl shadow-[0_8px_32px_rgba(0,0,0,0.20)] border border-white/40">
                {initials(contact.firstName, contact.lastName)}
              </div>
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight drop-shadow-sm">{name}</h1>
              {contact.companyName && (
                <p className="text-white/70 font-medium text-sm mt-1">{contact.companyName}</p>
              )}
              {/* Tags row */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-[11px] font-black bg-white/25 backdrop-blur text-white border border-white/30">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action badge */}
            {actionTag && (
              <div className="flex-shrink-0 px-4 py-2 rounded-2xl bg-white/20 backdrop-blur border border-white/30 text-white text-xs font-black uppercase tracking-wider">
                {actionTag}
              </div>
            )}
          </div>

          {/* Contact pills */}
          <div className="flex flex-wrap gap-3">
            {contact.phone && (
              <a href={`tel:${contact.phone}`}
                className="group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/20 backdrop-blur border border-white/30 text-white hover:bg-white/35 transition-all duration-200 text-sm font-semibold tabular-nums"
              >
                <Phone size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`}
                className="group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/20 backdrop-blur border border-white/30 text-white hover:bg-white/35 transition-all duration-200 text-sm font-semibold"
              >
                <Mail size={14} className="opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                <span className="truncate max-w-[220px]">{contact.email}</span>
              </a>
            )}
            {contact.dateAdded && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-white/60 text-xs font-medium">
                <Calendar size={12} />
                {formatDate(contact.dateAdded)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Datos personales */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, ease: [0.23,1,0.32,1] }}
            className="bg-white/70 backdrop-blur-2xl border border-white/50 rounded-[1.8rem] shadow-[0_4px_32px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            <div className="px-6 pt-5 pb-4">
              <SectionHeader icon={User} title={t('contacts_personal_data')} iconBg="bg-blue-50" iconColor="text-blue-500">
                {editingData ? (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingData(false); setForm({ firstName: contact.firstName||'', lastName: contact.lastName||'', phone: contact.phone||'', email: contact.email||'', address1: contact.address1||'', city: contact.city||'', dateOfBirth: contact.dateOfBirth||'', cedula }); }}
                      className="px-3 py-1 rounded-xl text-[11px] font-black text-slate-500 hover:bg-slate-100 transition-colors">{t('cancel')}</button>
                    <button onClick={saveData} disabled={saving}
                      className="flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-black bg-slate-900 text-white hover:bg-slate-700 transition-colors disabled:opacity-50">
                      <Check size={10} />{saving ? t('saving') : t('save')}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingData(true)}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-black text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <Pencil size={11} />{t('edit')}
                  </button>
                )}
              </SectionHeader>

              {editingData ? (
                <div className="space-y-1">
                  <EditField icon={User} label={t('contacts_first_name')} field="firstName" form={form} setForm={setForm} />
                  <EditField icon={User} label={t('contacts_last_name')} field="lastName" form={form} setForm={setForm} />
                  <EditField icon={FileText} label={t('contacts_cedula')} field="cedula" form={form} setForm={setForm} />
                  <EditField icon={Phone} label={t('phone')} field="phone" type="tel" form={form} setForm={setForm} />
                  <EditField icon={Mail} label={t('email')} field="email" type="email" form={form} setForm={setForm} />
                  <EditField icon={MapPin} label={t('contacts_address')} field="address1" form={form} setForm={setForm} />
                  <EditField icon={MapPin} label={t('contacts_city')} field="city" form={form} setForm={setForm} />
                  <EditField icon={Calendar} label={t('contacts_birthday')} field="dateOfBirth" type="date" form={form} setForm={setForm} />
                </div>
              ) : (
                <div className="space-y-0">
                  <DataField icon={User} label={t('contacts_full_name')} value={name} />
                  {cedula && <DataField icon={FileText} label={t('contacts_cedula')} value={cedula} />}
                  <DataField icon={Phone} label={t('phone')} value={contact.phone} />
                  <DataField icon={Mail} label={t('email')} value={contact.email} />
                  {addressDisplay && <DataField icon={MapPin} label={t('contacts_address')} value={addressDisplay} />}
                  {birthday && <DataField icon={Calendar} label={t('contacts_birthday')} value={birthday} />}
                </div>
              )}
            </div>
          </motion.div>

          {/* Etiquetas */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.10, ease: [0.23,1,0.32,1] }}
            className="bg-white/70 backdrop-blur-2xl border border-white/50 rounded-[1.8rem] shadow-[0_4px_32px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            <div className="px-6 pt-5 pb-5">
              <SectionHeader icon={Tag} title={t('tags')} iconBg="bg-violet-50" iconColor="text-violet-500">
                {editingTags ? (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingTags(false); setLocalTags(contact.tags||[]); setNewTagInput(''); }}
                      className="px-3 py-1 rounded-xl text-[11px] font-black text-slate-500 hover:bg-slate-100 transition-colors">{t('cancel')}</button>
                    <button onClick={saveTags} disabled={saving}
                      className="flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-black bg-slate-900 text-white hover:bg-slate-700 transition-colors disabled:opacity-50">
                      <Check size={10} />{saving ? '...' : t('save')}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingTags(true)}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-black text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <Pencil size={11} />{t('edit')}
                  </button>
                )}
              </SectionHeader>

              {editingTags ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {localTags.map((tag, i) => (
                      <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border ${tagStyle(tag)}`}>
                        {tag}
                        <button onClick={() => removeTag(tag)} className="w-3.5 h-3.5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors">
                          <X size={8} />
                        </button>
                      </span>
                    ))}
                    {localTags.length === 0 && <p className="text-sm text-slate-400">{t('contacts_no_labels')}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <input ref={tagInputRef} value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      placeholder={t('contacts_new_label')}
                      className="flex-1 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
                    />
                    <button onClick={addTag} disabled={!newTagInput.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-black hover:bg-slate-700 transition-colors disabled:opacity-30">
                      <Plus size={12} />{t('contacts_add_label')}
                    </button>
                  </div>
                </div>
              ) : displayTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {displayTags.map((tag, i) => (
                    <motion.span key={i} whileHover={{ scale: 1.05 }} className={`px-3 py-1.5 rounded-full text-[11px] font-black border cursor-default ${tagStyle(tag)}`}>
                      {tag}
                    </motion.span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 font-medium">{t('contacts_no_assigned_labels')}</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-5">

          {/* Vehículos */}
          {linkedVehicles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07, ease: [0.23,1,0.32,1] }}
              className="bg-white/70 dark:bg-white/[0.06] backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[1.8rem] shadow-[0_4px_32px_rgba(0,0,0,0.06)] overflow-hidden"
            >
              <div className="px-6 pt-5 pb-2">
                <SectionHeader icon={Car} title={`${t('vehicle')} · ${linkedVehicles.length}`} iconBg="bg-emerald-50 dark:bg-emerald-500/10" iconColor="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="px-3 pb-4 space-y-2">
                {linkedVehicles.map((v, i) => {
                  const vName = `${v.year || ''} ${v.make || v.marca || ''} ${v.model || v.modelo || ''}`.trim() || t('vehicle');
                  const vStatusKey = v.status === 'sold' || v.estado === 'Vendido' ? 'status_sold'
                    : v.status === 'quoted' || v.estado === 'Cotizado' ? 'status_quoted' : 'status_available';
                  const vStatus = t(vStatusKey);
                  const statusCls = vStatusKey === 'status_sold' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : vStatusKey === 'status_quoted' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300';
                  const img = v.image || (v.images && v.images[0]) || (v.fotos && v.fotos[0]);
                  const isQuoted = vStatusKey === 'status_quoted';
                  const assocQuote = isQuoted
                    ? linkedQuotes.find(q => String(q.vehicleId) === String(v.id) && q.status !== 'deleted') || null
                    : null;

                  return (
                    <motion.div key={v.id || i} whileHover={{ scale: 1.01, y: -1 }}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isQuoted ? 'border-amber-200/60 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/10' : 'border-slate-100/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-md'}`}
                    >
                      <div className="flex items-center gap-4 p-4">
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-white/10">
                          {img
                            ? <img src={img} alt={vName} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Car size={22} className="text-slate-400 dark:text-slate-500" /></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 dark:text-white text-sm leading-tight truncate">{vName}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {v.color && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{v.color.toUpperCase()}</span>}
                            {(v.vin || v.chasis_vin) && (
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">VIN: {(v.vin || v.chasis_vin).slice(-4)}</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 ${statusCls}`}>{vStatus}</span>
                      </div>
                      {/* Vender ahora — only for quoted vehicles */}
                      {isQuoted && onSellQuoted && (
                        <div className="px-4 pb-4">
                          <motion.button
                            onClick={() => onSellQuoted(assocQuote || v)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-900 font-black text-xs uppercase tracking-wider transition-all shadow-[0_4px_12px_rgba(251,191,36,0.35)]"
                          >
                            <Car size={13} />
                            {t('contacts_sell_now')}
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Documentos */}
          {documents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, ease: [0.23,1,0.32,1] }}
              className="bg-white/70 dark:bg-white/[0.06] backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[1.8rem] shadow-[0_4px_32px_rgba(0,0,0,0.06)] overflow-hidden"
            >
              <div className="px-6 pt-5 pb-2">
                <SectionHeader icon={FileText} title={`${t('documents')} · ${documents.length}`} iconBg="bg-red-50 dark:bg-red-500/10" iconColor="text-red-500 dark:text-red-400" />
              </div>
              <div className="px-3 pb-4 space-y-2">
                {documents.map((doc, i) => {
                  const label = doc.label || doc.name || `${t('documents')} ${i + 1}`;
                  const url = typeof doc === 'string' ? doc : doc.url;
                  return (
                    <motion.a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.01, y: -1 }}
                      className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] hover:bg-red-50/60 dark:hover:bg-red-500/10 hover:shadow-md transition-all duration-200 border border-slate-100/80 dark:border-white/10 hover:border-red-200/60 dark:hover:border-red-500/20 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 dark:group-hover:bg-red-500/25 transition-colors">
                        <FileText size={20} className="text-red-500 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{label}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{t('contacts_open_pdf')}</p>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 group-hover:bg-red-500 flex items-center justify-center transition-all duration-200 shadow-sm flex-shrink-0">
                        <ExternalLink size={13} className="text-slate-400 group-hover:text-white transition-colors" />
                      </div>
                    </motion.a>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Generar documento — abre selector */}
          <GenerateDocModal
            open={docModalOpen}
            onOpen={() => setDocModalOpen(true)}
            onClose={() => setDocModalOpen(false)}
            onSelect={onSellNewCar}
            contactName={contact.firstName}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Table skeleton row ───────────────────────────────────────────────────────

function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
          <div className="h-3.5 w-28 bg-slate-100 rounded-full animate-pulse" />
        </div>
      </td>
      <td className="px-4 py-3.5"><div className="h-3 w-28 bg-slate-100 rounded-full animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-3 w-36 bg-slate-100 rounded-full animate-pulse" /></td>
      <td className="px-4 py-3.5">
        <div className="flex gap-1.5">
          <div className="h-4 w-14 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-4 w-12 bg-slate-100 rounded-full animate-pulse" />
        </div>
      </td>
      <td className="px-4 py-3.5"><div className="h-3 w-20 bg-slate-100 rounded-full animate-pulse" /></td>
      <td className="px-4 py-3.5" />
    </tr>
  );
}

// ─── ContactsListView ─────────────────────────────────────────────────────────

function ContactsListView({
  contacts, isLoading,
  onRefresh, onLoadMore, onSearch, hasMore, totalContacts,
  onSelectContact, sortMode, setSortMode,
  filterTag, setFilterTag,
  lastActivityMap = new Map(),
}) {
  const { t } = useI18n();
  const [localSearch, setLocalSearch] = useState('');
  const [serverResults, setServerResults] = useState(null); // null = not searching, [] = no results
  const [searching, setSearching] = useState(false);
  const [tappedId, setTappedId] = useState(null); // brief red highlight on tap
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced server search
  function handleSearchChange(value) {
    setLocalSearch(value);
    setServerResults(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) return;

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await onSearch(value.trim());
        setServerResults(results || []);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function clearSearch() {
    setLocalSearch('');
    setServerResults(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }

  // If we have server results, use those; otherwise filter the loaded contacts
  const isServerSearch = serverResults !== null;
  const baseList = isServerSearch ? serverResults : contacts;

  // Filter pills: fixed curated list, only shown if at least one contact has that tag
  const allTags = useMemo(() => {
    const presentTags = new Set();
    contacts.forEach(c => (c.tags || []).forEach(tag => presentTags.add(tag.toLowerCase())));
    return FILTER_PILL_TAGS.filter(tag => presentTags.has(tag.toLowerCase()));
  }, [contacts]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...baseList];
    if (filterTag) {
      list = list.filter(c => (c.tags || []).some(tag => tag.toLowerCase() === filterTag.toLowerCase()));
    }
    // Local filter only applies when NOT using server results
    if (!isServerSearch && localSearch) {
      const q = localSearch.toLowerCase();
      list = list.filter(c => {
        const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
        return fullName.includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q);
      });
    }
    if (sortMode === 'alpha') {
      list.sort((a, b) => {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      list.sort((a, b) => {
        const getActivity = (c) => {
          const byPhone = c.phone ? (lastActivityMap.get(normalizePhone(c.phone)) || 0) : 0;
          const byEmail = c.email ? (lastActivityMap.get(c.email.toLowerCase()) || 0) : 0;
          const docActivity = Math.max(byPhone, byEmail);
          const added = c.dateAdded ? new Date(c.dateAdded).getTime() : 0;
          return Math.max(docActivity, added);
        };
        return getActivity(b) - getActivity(a);
      });
    }
    return list;
  }, [baseList, filterTag, localSearch, isServerSearch, sortMode]);

  const displayedCount = contacts.length;
  const serverTotal = totalContacts || displayedCount;

  return (
    <div className="space-y-4 px-6 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('nav_contacts')}</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {isLoading && displayedCount === 0
              ? t('loading')
              : `${displayedCount.toLocaleString()} de ${serverTotal.toLocaleString()} contacto${serverTotal !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortMode(m => m === 'recent' ? 'alpha' : 'recent')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 text-xs font-black text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm transition-all duration-200"
          >
            {sortMode === 'recent' ? <Clock size={13} /> : <SortAsc size={13} />}
            {sortMode === 'recent' ? t('contacts_sort_recent') : t('contacts_sort_az')}
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 text-slate-500 hover:text-slate-900 hover:bg-white shadow-sm transition-all duration-200 disabled:opacity-40"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        {searching
          ? <RefreshCw size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 animate-spin pointer-events-none" />
          : <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        }
        <input
          ref={inputRef}
          value={localSearch}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder={t('contacts_search_all')}
          className="w-full pl-11 pr-10 py-3 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl text-sm text-slate-800 placeholder-slate-400 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
        />
        {localSearch && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {/* Server search indicator */}
      {isServerSearch && !searching && (
        <p className="text-xs text-slate-400 font-medium -mt-2 pl-1">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} en todos los contactos
        </p>
      )}

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <TagPill tag={t('all')} selected={!filterTag} onClick={() => setFilterTag(null)} />
          {allTags.map(tag => (
            <TagPill
              key={tag}
              tag={tag}
              selected={filterTag?.toLowerCase() === tag.toLowerCase()}
              onClick={() => setFilterTag(filterTag?.toLowerCase() === tag.toLowerCase() ? null : tag)}
            />
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Empty state */}
        {!isLoading && filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-slate-400" />
            </div>
            <p className="font-black text-slate-700 text-lg">
              {localSearch || filterTag ? t('contacts_no_results') : t('contacts_no_contacts')}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {localSearch || filterTag
                ? t('contacts_try_other_terms')
                : t('contacts_sync_hint')}
            </p>
            {(localSearch || filterTag) && (
              <button
                onClick={() => { setLocalSearch(''); setFilterTag(null); }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                {t('contacts_clear_filters')}
              </button>
            )}
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-[28%]">{t('name')}</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-[16%]">{t('phone')}</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-[22%]">{t('email')}</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-[20%]">{t('tags')}</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-[12%]">{t('date')}</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {isLoading && filtered.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} />)
                  : filtered.map((contact, i) => {
                    const name = toTitleCase(`${contact.firstName || ''} ${contact.lastName || ''}`.trim()) || t('contacts_no_name');
                    const tags = visibleTags(contact.tags);
                    const gradient = avatarGradient(contact.firstName || contact.lastName || '?');
                    const date = formatDate(contact.dateAdded);

                    return (
                      <motion.tr
                        key={contact.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.4) }}
                        onClick={() => {
                          setTappedId(contact.id);
                          setTimeout(() => onSelectContact(contact), 180);
                        }}
                        className={`border-b border-slate-100 cursor-pointer transition-all duration-200 group ${
                          tappedId === contact.id
                            ? 'bg-red-500/10 border-red-200'
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Name + avatar */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-[10px] flex-shrink-0`}>
                              {initials(contact.firstName, contact.lastName)}
                            </div>
                            <span className="text-sm font-bold text-slate-800 truncate max-w-[160px]">{name}</span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-slate-600 font-medium tabular-nums">
                            {contact.phone || <span className="text-slate-300">—</span>}
                          </span>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-slate-600 font-medium truncate block max-w-[180px]">
                            {contact.email || <span className="text-slate-300">—</span>}
                          </span>
                        </td>

                        {/* Tags */}
                        <td className="px-4 py-3.5">
                          {tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {tags.slice(0, 3).map((tag, ti) => (
                                <InlineTag key={ti} tag={tag} />
                              ))}
                              {tags.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  +{tags.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                            {date || <span className="text-slate-300">—</span>}
                          </span>
                        </td>

                        {/* Arrow */}
                        <td className="px-3 py-3.5">
                          <ChevronLeft size={14} className="rotate-180 text-slate-200 group-hover:text-slate-400 transition-colors" />
                        </td>
                      </motion.tr>
                    );
                  })}

                {/* Skeleton rows while loading more */}
                {isLoading && filtered.length > 0 &&
                  Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={`more-${i}`} />)
                }
              </tbody>
            </table>
          </div>
        )}

        {/* Load more footer */}
        {!isLoading && hasMore && filtered.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/40">
            <p className="text-xs text-slate-400 font-medium">
              Mostrando {displayedCount.toLocaleString()} de {serverTotal.toLocaleString()}
            </p>
            <button
              onClick={onLoadMore}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-700 transition-colors shadow-sm"
            >
              {t('loadMore')}
              <ChevronDown size={13} />
            </button>
          </div>
        )}

        {isLoading && hasMore && filtered.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-4 flex justify-center bg-slate-50/40">
            <RefreshCw size={14} className="animate-spin text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ContactsView (root) ──────────────────────────────────────────────────────

export default function ContactsView({
  contacts = [],
  inventory = [],
  contracts = [],
  quotes = [],
  isLoading = false,
  onRefresh,
  onLoadMore,
  onSearch,
  hasMore = false,
  totalContacts = 0,
  onUpdateContact,
  onDeleteContact,
  onSellNewCar,
  onSellQuoted,
  requestConfirmation,
  initialContactId = null,
  onInitialContactOpened,
}) {
  const { t } = useI18n();
  const [selectedContact, setSelectedContact] = useState(null);
  const [sortMode, setSortMode] = useState('recent');
  const [filterTag, setFilterTag] = useState(null);

  // Auto-open contact when navigated from another module (e.g. ConversationsView)
  useEffect(() => {
    if (!initialContactId || !contacts.length) return;
    const contact = contacts.find(c => c.id === initialContactId);
    if (contact) {
      setSelectedContact(contact);
      onInitialContactOpened?.();
    }
  }, [initialContactId, contacts]);

  // Expose global opener for cross-module navigation (fallback for already-loaded contacts)
  useEffect(() => {
    window.__openContact = (contactId) => {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) setSelectedContact(contact);
    };
    return () => { delete window.__openContact; };
  }, [contacts]);

  // Map: normalized phone/email → latest document createdAt timestamp
  const lastActivityMap = useMemo(() => {
    const map = new Map(); // key: phone or email → ms timestamp
    const allDocs = [...contracts, ...quotes];
    allDocs.forEach(doc => {
      const ts = doc.createdAt ? new Date(doc.createdAt).getTime() : 0;
      if (!ts) return;
      if (doc.phone) {
        const k = normalizePhone(doc.phone);
        if (k && (!map.has(k) || ts > map.get(k))) map.set(k, ts);
      }
      const em = (doc.email || '').toLowerCase();
      if (em) {
        if (!map.has(em) || ts > map.get(em)) map.set(em, ts);
      }
    });
    return map;
  }, [contracts, quotes]);

  useEffect(() => {
    if (!isLoading && contacts.length === 0 && onRefresh) {
      onRefresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedContact]);

  const { linkedVehicles, linkedDocuments, linkedQuotes } = useMemo(() => {
    if (!selectedContact) return { linkedVehicles: [], linkedDocuments: [], linkedQuotes: [] };
    const phone = normalizePhone(selectedContact.phone);
    const email = (selectedContact.email || '').toLowerCase();
    const linked = contracts.filter(c =>
      (phone && normalizePhone(c.phone) === phone) ||
      (email && (c.email || '').toLowerCase() === email)
    );
    // Also match via quotes (stored separately from contracts)
    const linkedQ = quotes.filter(q =>
      (phone && normalizePhone(q.phone) === phone) ||
      (email && (q.email || '').toLowerCase() === email)
    );
    const allVehicleIds = [...new Set([
      ...linked.map(c => c.vehicleId),
      ...linkedQ.map(q => q.vehicleId),
    ].filter(Boolean))];
    const vehicleIds = allVehicleIds;
    const vehicles = inventory.filter(v => vehicleIds.includes(String(v.id)));

    // Collect document URLs from linked Firestore contracts
    const docMap = new Map(); // url → label, dedup by url
    linked.forEach(c => {
      const urls = c.ghlDocumentUrls || (c.documentUrl ? [c.documentUrl] : []);
      urls.forEach((u, i) => {
        if (u && !docMap.has(u)) {
          const vehicle = vehicles.find(v => String(v.id) === String(c.vehicleId));
          const vehicleName = vehicle
            ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim()
            : '';
          const docLabel = c.documentType === 'cotizacion' ? t('quotes') : t('contracts');
          docMap.set(u, { url: u, label: vehicleName ? `${docLabel} — ${vehicleName}` : `${docLabel} ${i + 1}` });
        }
      });
    });
    // Also include any URLs stored directly on the GHL contact (for backwards compat)
    (selectedContact.ghlDocumentUrls || []).forEach((u, i) => {
      if (u && !docMap.has(u)) {
        docMap.set(u, { url: u, label: `${t('documents')} ${i + 1}` });
      }
    });

    return { linkedVehicles: vehicles, linkedDocuments: [...docMap.values()], linkedQuotes: linkedQ };
  }, [selectedContact, contracts, quotes, inventory, t]);

  function handleDeleteContact() {
    if (!selectedContact) return;
    const name = toTitleCase(`${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim());
    requestConfirmation({
      title: t('contacts_delete_button'),
      message: `¿Seguro que deseas borrar a ${name || 'este contacto'}? Esta acción no se puede deshacer.`,
      isDestructive: true,
      confirmText: t('contacts_delete_button'),
      onConfirm: async () => {
        await onDeleteContact(selectedContact.id);
        setSelectedContact(null);
      },
    });
  }

  function handleSellNewCar(docType = 'contrato') {
    if (!selectedContact) return;
    onSellNewCar({
      name: selectedContact.firstName || '',
      lastname: selectedContact.lastName || '',
      phone: selectedContact.phone || '',
      email: selectedContact.email || '',
      cedula: extractCedula(selectedContact),
    }, docType);
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-2 sm:p-3">
      <AnimatePresence mode="wait">
        {selectedContact ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="h-full overflow-y-auto"
          >
            <ContactDetailView
              contact={selectedContact}
              linkedVehicles={linkedVehicles}
              linkedDocuments={linkedDocuments}
              linkedQuotes={linkedQuotes}
              onBack={() => setSelectedContact(null)}
              onSellNewCar={handleSellNewCar}
              onSellQuoted={onSellQuoted}
              onDeleteContact={handleDeleteContact}
              onUpdateContact={async (id, data) => {
                await onUpdateContact(id, data);
                // Reflect changes in selectedContact locally
                setSelectedContact(prev => prev ? { ...prev, ...data } : prev);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="h-full overflow-y-auto"
          >
            <ContactsListView
              contacts={contacts}
              isLoading={isLoading}
              onRefresh={onRefresh}
              onLoadMore={onLoadMore}
              hasMore={hasMore}
              totalContacts={totalContacts}
              onSelectContact={setSelectedContact}
              onSearch={onSearch}
              sortMode={sortMode}
              setSortMode={setSortMode}
              filterTag={filterTag}
              setFilterTag={setFilterTag}
              lastActivityMap={lastActivityMap}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
