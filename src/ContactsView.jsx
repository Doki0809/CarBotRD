import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, RefreshCw, ChevronLeft, ChevronDown, MoreVertical,
  Phone, Mail, MapPin, Calendar, Tag, Car, FileText, Trash2,
  ArrowUpRight, ExternalLink, SortAsc, Clock, X, User
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(firstName, lastName) {
  const f = (firstName || '').charAt(0).toUpperCase();
  const l = (lastName || '').charAt(0).toUpperCase();
  return f + l || '?';
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

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

const TAG_STYLES = {
  vendido:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  cotizado: 'bg-amber-100 text-amber-800 border-amber-200',
  default:  'bg-slate-100 text-slate-600 border-slate-200',
};

function tagStyle(tag) {
  const lower = (tag || '').toLowerCase();
  return TAG_STYLES[lower] || TAG_STYLES.default;
}

// Gradient palette for avatars (cycles by first letter)
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

// ─── ContactCard ──────────────────────────────────────────────────────────────

function ContactCard({ contact, linkedVehicles, onClick, index }) {
  const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Sin nombre';
  const tags = contact.tags || [];
  const hasTags = tags.length > 0;
  const primaryVehicle = linkedVehicles[0];
  const gradient = avatarGradient(contact.firstName || contact.lastName || '?');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1], delay: index * 0.04 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className="
        bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-5
        shadow-[0_4px_24px_rgba(0,0,0,0.05)]
        hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.10)]
        hover:bg-white/90
        transition-all duration-300 ease-[0.23,1,0.32,1]
        flex items-center gap-4
      ">
        {/* Avatar */}
        <div className={`
          w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient}
          flex items-center justify-center text-white font-black text-base
          shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-300
        `}>
          {initials(contact.firstName, contact.lastName)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-black text-slate-900 text-sm leading-tight truncate">{name}</p>
            <ArrowUpRight size={14} className="text-slate-300 group-hover:text-red-500 transition-colors flex-shrink-0 mt-0.5" />
          </div>

          {contact.phone && (
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{contact.phone}</p>
          )}

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {/* Vehicle brand badge */}
            {primaryVehicle && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                <Car size={9} />
                {primaryVehicle.make || primaryVehicle.marca || 'Vehículo'}
              </span>
            )}

            {/* Status tags (vendido, cotizado first) */}
            {tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${tagStyle(tag)}`}
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                +{tags.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Loading Skeletons ────────────────────────────────────────────────────────

function ContactSkeleton({ index }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white/60 backdrop-blur-xl border border-white/30 rounded-3xl p-5 flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-slate-100 rounded-full animate-pulse" />
        <div className="h-3 w-24 bg-slate-100 rounded-full animate-pulse" />
        <div className="flex gap-1.5">
          <div className="h-4 w-16 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-4 w-14 bg-slate-100 rounded-full animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── FolderSection ────────────────────────────────────────────────────────────

function FolderSection({ title, icon: Icon, count, children, collapseThreshold = 2 }) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = count > collapseThreshold;
  const showToggle = shouldCollapse;

  return (
    <div className="bg-white/50 backdrop-blur-lg border border-white/40 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center">
            <Icon size={14} className="text-slate-600" />
          </div>
          <span className="text-sm font-black text-slate-800">{title}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500">{count}</span>
        </div>
        {showToggle && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-wider"
          >
            {expanded ? 'Ver menos' : `Ver todos`}
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-50">
        {React.Children.toArray(children).slice(0, shouldCollapse && !expanded ? collapseThreshold : undefined)}
      </div>
    </div>
  );
}

// ─── VehicleItem ─────────────────────────────────────────────────────────────

function VehicleItem({ vehicle }) {
  const name = `${vehicle.year || ''} ${vehicle.make || vehicle.marca || ''} ${vehicle.model || vehicle.modelo || ''}`.trim() || 'Vehículo';
  const status = vehicle.status || vehicle.estado || '';

  const statusLabel = status === 'sold' || status === 'Vendido' ? 'Vendido'
    : status === 'quoted' || status === 'Cotizado' ? 'Cotizado'
    : 'Disponible';

  const statusColor = statusLabel === 'Vendido' ? 'text-emerald-600 bg-emerald-50'
    : statusLabel === 'Cotizado' ? 'text-amber-700 bg-amber-50'
    : 'text-blue-600 bg-blue-50';

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Car size={14} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
        {vehicle.vin && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{vehicle.vin}</p>}
      </div>
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusColor}`}>
        {statusLabel}
      </span>
    </div>
  );
}

// ─── DocumentItem ─────────────────────────────────────────────────────────────

function DocumentItem({ doc }) {
  const label = doc.label || doc.name || doc.id || 'Documento';
  const url = typeof doc === 'string' ? doc : doc.url;

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
        <FileText size={14} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{label}</p>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100/60 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── 3-dot Menu ──────────────────────────────────────────────────────────────

function ContactMenu({ onSellNewCar, onDelete }) {
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
              onClick={() => { setOpen(false); onSellNewCar(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left"
            >
              <Car size={15} className="text-red-500 flex-shrink-0" />
              Vender nuevo auto
            </button>
            <div className="h-px bg-slate-100" />
            <button
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <Trash2 size={15} className="flex-shrink-0" />
              Borrar contacto
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ContactDetailView ────────────────────────────────────────────────────────

function ContactDetailView({ contact, linkedVehicles, onBack, onSellNewCar, onDeleteContact }) {
  const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Sin nombre';
  const tags = contact.tags || [];
  const gradient = avatarGradient(contact.firstName || contact.lastName || '?');

  // Build document list from customFields or direct ghlDocumentUrls
  const documents = useMemo(() => {
    const urls = contact.ghlDocumentUrls || [];
    if (Array.isArray(urls)) {
      return urls.map((u, i) => (typeof u === 'string' ? { url: u, label: `Documento ${i + 1}` } : u));
    }
    return [];
  }, [contact]);

  // Birthday formatting
  const birthday = contact.dateOfBirth
    ? formatDate(contact.dateOfBirth)
    : null;

  // Address
  const addressParts = [contact.address1, contact.city, contact.state, contact.country].filter(Boolean);
  const address = addressParts.join(', ');

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="max-w-2xl mx-auto space-y-4"
    >
      {/* Back + Menu header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          Contactos
        </button>
        <ContactMenu
          onSellNewCar={onSellNewCar}
          onDelete={onDeleteContact}
        />
      </div>

      {/* Hero card */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className={`
            w-16 h-16 rounded-3xl bg-gradient-to-br ${gradient}
            flex items-center justify-center text-white font-black text-xl
            shadow-lg flex-shrink-0
          `}>
            {initials(contact.firstName, contact.lastName)}
          </div>

          {/* Name & tags */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-slate-900 leading-tight">{name}</h1>
            {contact.companyName && (
              <p className="text-sm text-slate-500 font-medium mt-0.5">{contact.companyName}</p>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${tagStyle(tag)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact info card */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl px-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <InfoRow icon={Phone} label="Teléfono" value={contact.phone} />
        <InfoRow icon={Mail} label="Correo" value={contact.email} />
        {address && <InfoRow icon={MapPin} label="Dirección" value={address} />}
        {birthday && <InfoRow icon={Calendar} label="Cumpleaños" value={birthday} />}
        {contact.source && <InfoRow icon={User} label="Fuente" value={contact.source} />}
      </div>

      {/* Vehicles section */}
      {linkedVehicles.length > 0 && (
        <FolderSection
          title="Vehículos"
          icon={Car}
          count={linkedVehicles.length}
          collapseThreshold={2}
        >
          {linkedVehicles.map((v, i) => <VehicleItem key={v.id || i} vehicle={v} />)}
        </FolderSection>
      )}

      {/* Documents section */}
      {documents.length > 0 && (
        <FolderSection
          title="Documentos"
          icon={FileText}
          count={documents.length}
          collapseThreshold={2}
        >
          {documents.map((doc, i) => <DocumentItem key={i} doc={doc} />)}
        </FolderSection>
      )}

      {/* Created date */}
      {contact.dateAdded && (
        <p className="text-center text-[10px] text-slate-400 font-medium pb-4">
          Contacto creado el {formatDate(contact.dateAdded)}
        </p>
      )}
    </motion.div>
  );
}

// ─── ContactsListView ─────────────────────────────────────────────────────────

function ContactsListView({
  contacts, contracts, inventory, isLoading,
  onRefresh, onSelectContact, searchTerm, sortMode, setSortMode,
  filterTag, setFilterTag,
}) {
  const [localSearch, setLocalSearch] = useState('');
  const inputRef = useRef(null);

  const effectiveSearch = searchTerm || localSearch;

  // Unique tags across all contacts
  const allTags = useMemo(() => {
    const tagSet = new Set();
    contacts.forEach(c => (c.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [contacts]);

  // Link vehicles to contacts
  function getLinkedVehicles(contact) {
    const phone = normalizePhone(contact.phone);
    const email = (contact.email || '').toLowerCase();
    const linked = contracts.filter(c =>
      (phone && normalizePhone(c.phone) === phone) ||
      (email && (c.email || '').toLowerCase() === email)
    );
    const vehicleIds = [...new Set(linked.map(c => c.vehicleId).filter(Boolean))];
    return inventory.filter(v => vehicleIds.includes(String(v.id)));
  }

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...contacts];

    // Tag filter
    if (filterTag) {
      list = list.filter(c => (c.tags || []).some(t => t.toLowerCase() === filterTag.toLowerCase()));
    }

    // Search
    if (effectiveSearch) {
      const q = effectiveSearch.toLowerCase();
      list = list.filter(c => {
        const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        return fullName.includes(q) || phone.includes(q) || email.includes(q);
      });
    }

    // Sort
    if (sortMode === 'alpha') {
      list.sort((a, b) => {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      // Recent: by dateAdded desc
      list.sort((a, b) => {
        const dateA = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
        const dateB = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
        return dateB - dateA;
      });
    }

    return list;
  }, [contacts, filterTag, effectiveSearch, sortMode]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Contactos</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {isLoading ? 'Cargando...' : `${contacts.length} en GoHighLevel`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort toggle */}
          <button
            onClick={() => setSortMode(m => m === 'recent' ? 'alpha' : 'recent')}
            title={sortMode === 'recent' ? 'Ordenar A-Z' : 'Ordenar por reciente'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 text-xs font-black text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm transition-all duration-200"
          >
            {sortMode === 'recent' ? <Clock size={13} /> : <SortAsc size={13} />}
            {sortMode === 'recent' ? 'Reciente' : 'A–Z'}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 text-slate-500 hover:text-slate-900 hover:bg-white shadow-sm transition-all duration-200 disabled:opacity-40"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o correo..."
          className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl text-sm text-slate-800 placeholder-slate-400 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
        />
        {localSearch && (
          <button
            onClick={() => setLocalSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <TagPill
            tag="Todos"
            selected={!filterTag}
            onClick={() => setFilterTag(null)}
          />
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

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <ContactSkeleton key={i} index={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-slate-400" />
          </div>
          <p className="font-black text-slate-700 text-lg">
            {effectiveSearch || filterTag ? 'Sin resultados' : 'Sin contactos'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {effectiveSearch || filterTag
              ? 'Intenta con otros términos o limpia los filtros'
              : 'Conecta GoHighLevel para ver tus contactos aquí'}
          </p>
          {(effectiveSearch || filterTag) && (
            <button
              onClick={() => { setLocalSearch(''); setFilterTag(null); }}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((contact, i) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              linkedVehicles={getLinkedVehicles(contact)}
              onClick={() => onSelectContact(contact)}
              index={i}
            />
          ))}
          {filtered.length > 0 && (
            <p className="text-center text-[10px] text-slate-400 font-medium pt-2 pb-4">
              {filtered.length} contacto{filtered.length !== 1 ? 's' : ''}
              {filterTag || effectiveSearch ? ' encontrados' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ContactsView (root) ──────────────────────────────────────────────────────

export default function ContactsView({
  contacts = [],
  inventory = [],
  contracts = [],
  isLoading = false,
  onRefresh,
  onUpdateContact,
  onDeleteContact,
  onSellNewCar,
  showToast,
  requestConfirmation,
  userProfile,
  searchTerm = '',
}) {
  const [selectedContact, setSelectedContact] = useState(null);
  const [sortMode, setSortMode] = useState('recent');
  const [filterTag, setFilterTag] = useState(null);

  // Auto-fetch on mount if no contacts loaded yet
  useEffect(() => {
    if (!isLoading && contacts.length === 0 && onRefresh) {
      onRefresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to top on navigation between list and detail
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedContact]);

  // Compute linked vehicles for selected contact
  const linkedVehicles = useMemo(() => {
    if (!selectedContact) return [];
    const phone = normalizePhone(selectedContact.phone);
    const email = (selectedContact.email || '').toLowerCase();
    const linked = contracts.filter(c =>
      (phone && normalizePhone(c.phone) === phone) ||
      (email && (c.email || '').toLowerCase() === email)
    );
    const vehicleIds = [...new Set(linked.map(c => c.vehicleId).filter(Boolean))];
    return inventory.filter(v => vehicleIds.includes(String(v.id)));
  }, [selectedContact, contracts, inventory]);

  function handleDeleteContact() {
    if (!selectedContact) return;
    const name = `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim();
    requestConfirmation({
      title: 'Borrar contacto',
      message: `¿Seguro que deseas borrar a ${name || 'este contacto'} de GoHighLevel? Esta acción no se puede deshacer.`,
      isDestructive: true,
      confirmText: 'Borrar',
      onConfirm: async () => {
        await onDeleteContact(selectedContact.id);
        setSelectedContact(null);
      },
    });
  }

  function handleSellNewCar() {
    if (!selectedContact) return;
    onSellNewCar({
      // Pass contact info so GenerateContractModal can pre-fill client fields
      name: selectedContact.firstName || '',
      lastname: selectedContact.lastName || '',
      phone: selectedContact.phone || '',
      email: selectedContact.email || '',
      cedula: selectedContact.customFields?.find?.(f =>
        (f.key || '').toLowerCase().includes('cedula')
      )?.value || '',
    });
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">
      <AnimatePresence mode="wait">
        {selectedContact ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          >
            <ContactDetailView
              contact={selectedContact}
              linkedVehicles={linkedVehicles}
              onBack={() => setSelectedContact(null)}
              onSellNewCar={handleSellNewCar}
              onDeleteContact={handleDeleteContact}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          >
            <ContactsListView
              contacts={contacts}
              contracts={contracts}
              inventory={inventory}
              isLoading={isLoading}
              onRefresh={onRefresh}
              onSelectContact={setSelectedContact}
              searchTerm={searchTerm}
              sortMode={sortMode}
              setSortMode={setSortMode}
              filterTag={filterTag}
              setFilterTag={setFilterTag}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
