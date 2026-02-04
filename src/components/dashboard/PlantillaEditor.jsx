import React, { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, FileText, Printer, Save,
  Type, PlusSquare, Trash2, Undo, Redo, Download,
  Image as ImageIcon, Move, Layers, ArrowUpRight, ArrowDownLeft, X,
  Maximize2, Minimize2, MoreVertical, BringToFront, SendToBack,
  AlignJustify, Indent, Outdent, Highlighter, Baseline, ArrowUpDown,
  WrapText, Layout, Copy, Scissors, Check, FileUp, Loader2, File, ArrowLeft, Braces
} from 'lucide-react';

// --- Selector de Color Personalizado (Diseño Office) ---
const CustomColorPicker = ({ icon: Icon, title, onSelect, indicatorColor, type }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const themeColors = [
    '#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646'
  ];

  const shades = [
    ['#f2f2f2', '#d9d9d9', '#bfbfbf', '#a6a6a6', '#7f7f7f'],
    ['#7f7f7f', '#595959', '#3f3f3f', '#262626', '#0c0c0c'],
    ['#ddd9c3', '#c4bd97', '#938953', '#494429', '#1d1b10'],
    ['#c6d9f0', '#8db3e2', '#548dd4', '#17365d', '#0f243e'],
    ['#dbe5f1', '#b8cce4', '#95b3d7', '#366092', '#244061'],
    ['#f2dcdb', '#e5b9b7', '#d99694', '#953734', '#632423'],
    ['#ebf1dd', '#d7e3bc', '#c3d69b', '#76923c', '#4f6128'],
    ['#e5e0ec', '#ccc1d9', '#b2a2c7', '#5f497a', '#3f3151'],
    ['#dbeef3', '#b7dde8', '#92cddc', '#31859b', '#205867'],
    ['#fdeada', '#fbd5b5', '#fac08f', '#e36c09', '#974806'],
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const toggleDropdown = (e) => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 240)
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        onMouseDown={(e) => e.preventDefault()}
        className="p-1.5 rounded hover:bg-gray-100 flex flex-col items-center group relative transition-all"
        title={title}
      >
        <Icon size={18} className="text-gray-700" />
        <div
          className="h-1 w-5 mt-0.5 rounded-full transition-transform"
          style={{ backgroundColor: indicatorColor || (type === 'text' ? '#000' : '#ffff00') }}
        />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed bg-[#262626] border border-gray-600 shadow-2xl rounded p-2 z-[9999] w-[230px] animate-in fade-in zoom-in duration-100"
          style={{ top: coords.top, left: coords.left }}
        >
          <button
            onClick={() => { onSelect(type === 'text' ? '#000000' : 'transparent'); setIsOpen(false); }}
            className="w-full text-left px-2 py-1.5 hover:bg-[#3d3d3d] text-white text-xs mb-2 border border-blue-500/50 rounded flex items-center justify-center gap-2 transition-colors"
          >
            <div className={`w-4 h-4 border border-gray-400 ${type === 'text' ? 'bg-black' : 'bg-white font-bold text-red-500 text-[10px] flex items-center justify-center'}`}>
              {type !== 'text' && '/'}
            </div>
            <span>Automático</span>
          </button>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 px-1">Colores del tema</div>
          <div className="flex gap-1 mb-1 px-0.5">
            {themeColors.map((color, i) => (
              <div
                key={i}
                onClick={() => { onSelect(color); setIsOpen(false); }}
                className="w-[18px] h-[18px] border border-gray-500 hover:scale-110 hover:border-white transition-all cursor-pointer"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-1 px-0.5">
            {shades.map((column, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-1">
                {column.map((color, i) => (
                  <div
                    key={i}
                    onClick={() => { onSelect(color); setIsOpen(false); }}
                    className="w-[18px] h-[15px] border border-gray-600/50 hover:scale-110 hover:border-white transition-all cursor-pointer"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Variables del Sistema ---
// --- Variables del Sistema (Globales) ---
const VARIABLE_GROUPS = [
  {
    title: "👤 Cliente",
    vars: [
      { label: "Nombre", value: "{{nombre}}" },
      { label: "Apellido", value: "{{apellido}}" },
      { label: "Cédula", value: "{{cedula}}" },
      { label: "Teléfono", value: "{{telefono}}" },
      { label: "Dirección", value: "{{direccion}}" },
    ]
  },
  {
    title: "🚗 Vehículo Principal",
    vars: [
      { label: "Marca", value: "{{marca}}" },
      { label: "Modelo", value: "{{modelo}}" },
      { label: "Edición", value: "{{edicion}}" },
      { label: "Año", value: "{{año}}" },
      { label: "Color", value: "{{color}}" },
      { label: "Chasis (VIN)", value: "{{chasis}}" },
      { label: "Tipo de Vehículo", value: "{{tipo_vehiculo}}" },
      { label: "Placa", value: "{{placa}}" },
      { label: "Precio Venta", value: "{{precio}}" },
      { label: "Inicial", value: "{{inicial}}" },
    ]
  },
  {
    title: "⚙️ Detalles Extra",
    vars: [
      { label: "Millaje", value: "{{millaje}}" },
      { label: "Carfax", value: "{{carfax}}" },
      { label: "Condición", value: "{{condicion}}" },
      { label: "Asientos", value: "{{asientos}}" },
      { label: "Motor", value: "{{motor}}" },
      { label: "Transmisión", value: "{{transmision}}" },
      { label: "Combustible", value: "{{combustible}}" },
    ]
  },
  {
    title: "📄 Documento",
    vars: [
      { label: "Fecha", value: "{{fecha}}" },
      { label: "Banco", value: "{{banco}}" },
      { label: "Firma Cliente", value: "{{firma_cliente}}" },
      { label: "Firma Vendedor", value: "{{firma_vendedor}}" },
    ]
  },
];

const FONT_FAMILY_style = `
@import url('https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&display=swap');
body, .page-content { font-family: 'Calibri', 'Carlito', sans-serif; }
.page-content p { margin: 0; min-height: 11pt; line-height: 1.0; }
.page-content ::selection { background: rgba(180, 180, 180, 0.5); }
`;

// --- Componente de Botón de Herramienta ---
// --- Componente de Botón de Herramienta ---
const ToolbarButton = ({ icon: Icon, cmd, val, onClick, active, title, color, onMouseDown }) => (
  <button
    onMouseDown={onMouseDown || ((e) => { e.preventDefault(); })}
    onClick={(e) => { e.preventDefault(); onClick ? onClick() : null; }}
    className={`p-1.5 rounded flex-shrink-0 relative transition-colors ${active ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-700'}`}
    title={title}
  >
    <Icon size={18} strokeWidth={2} style={{ color: color }} />
  </button>
);

// --- Componente de Imagen Individual (Flotante) ---
const DraggableImage = ({ image, isSelected, onSelect, onUpdate, onDelete, onContextMenuReq }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, direction: '' });

  const handleMouseDown = (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    onSelect(image.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: image.x, y: image.y });
  };

  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;
    setIsResizing(true);
    setInitialPos({ x: image.x, y: image.y });
    setResizeStart({ x: e.clientX, y: e.clientY, w: image.width, h: image.height, direction });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        onUpdate(image.id, { x: initialPos.x + dx, y: initialPos.y + dy });
      }
      if (isResizing) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        let newX = initialPos.x;
        let newY = initialPos.y;
        let newWidth = resizeStart.w;
        let newHeight = resizeStart.h;

        if (resizeStart.direction.includes('e')) newWidth = Math.max(20, resizeStart.w + dx);
        if (resizeStart.direction.includes('w')) {
          newWidth = Math.max(20, resizeStart.w - dx);
          newX = initialPos.x + (resizeStart.w - newWidth);
        }
        if (resizeStart.direction.includes('s')) newHeight = Math.max(20, resizeStart.h + dy);
        if (resizeStart.direction.includes('n')) {
          newHeight = Math.max(20, resizeStart.h - dy);
          newY = initialPos.y + (resizeStart.h - newHeight);
        }

        onUpdate(image.id, { x: newX, y: newY, width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, initialPos, image.id, onUpdate]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(image.id); onContextMenuReq(e, image); }}
      style={{
        position: 'absolute', left: image.x, top: image.y, width: image.width, height: image.height,
        zIndex: image.zIndex === 'back' ? 5 : 20,
        cursor: isDragging ? 'move' : 'pointer',
        border: isSelected ? '1px solid #2563EB' : '1px solid transparent',
        boxShadow: isSelected ? '0 0 0 1px rgba(37, 99, 235, 0.2)' : 'none'
      }}
      className="group"
    >
      <img src={image.src} alt="Uploaded" className="w-full h-full object-fill select-none pointer-events-none block" />
      {isSelected && (
        <>
          <div onMouseDown={(e) => handleResizeStart(e, 'nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 cursor-nw-resize z-30" />
          <div onMouseDown={(e) => handleResizeStart(e, 'n')} className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-blue-600 cursor-n-resize z-30" />
          <div onMouseDown={(e) => handleResizeStart(e, 'ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 cursor-ne-resize z-30" />
          <div onMouseDown={(e) => handleResizeStart(e, 'w')} className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border border-blue-600 cursor-w-resize z-30" />
          <div onMouseDown={(e) => handleResizeStart(e, 'e')} className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border border-blue-600 cursor-e-resize z-30" />
          <div onMouseDown={(e) => handleResizeStart(e, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 cursor-sw-resize z-30" />
          <div onMouseDown={(e) => handleResizeStart(e, 's')} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-blue-600 cursor-s-resize z-30" />
          <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 cursor-se-resize z-30" />
          <div
            onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); onContextMenuReq({ clientX: rect.right, clientY: rect.bottom }, image); }}
            className="absolute -bottom-10 right-0 bg-white p-1.5 rounded shadow-lg border border-gray-300 cursor-pointer hover:bg-gray-100 z-50 flex items-center justify-center"
            title="Opciones de diseño"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <WrapText size={18} className="text-gray-700" />
          </div>
        </>
      )}
    </div>
  );
};

// --- Componente de Página ---
const Page = ({ id, content, backgroundImage, images, pageNumber, isActive, onFocus, onUpdate, onRemove, showRemove, onContextMenuReq, selectedImageId, onSelectImage, inputRef, onPaste, onExtractImage, onSelectionChange, onImageUpdate, onImageDelete, onOverflow, onUnderflow }) => {
  const pageRef = useRef(null);

  useEffect(() => {
    // Sincronización estricta: si el contenido prop cambia, forzamos al DOM
    if (pageRef.current && content !== pageRef.current.innerHTML) {
      pageRef.current.innerHTML = content;
    }
  }, [content]);

  const checkUnderflow = () => {
    if (!pageRef.current) return;
    if (pageRef.current.scrollHeight < pageRef.current.clientHeight - 20) onUnderflow();
  };

  const handleInput = () => {
    if (pageRef.current) {
      const isOverflowing = pageRef.current.scrollHeight > pageRef.current.clientHeight;

      if (isOverflowing) {
        let contentToMove = [];
        // Movemos nodos desde el final hacia el principio hasta que quepa
        // Limite de seguridad para evitar loops infinitos (100 intentos)
        let attempts = 0;
        while (pageRef.current.scrollHeight > pageRef.current.clientHeight && pageRef.current.lastChild && attempts < 100) {
          const lastNode = pageRef.current.lastChild;
          contentToMove.unshift(lastNode.outerHTML || lastNode.textContent);
          lastNode.remove();
          attempts++;
        }

        if (contentToMove.length > 0) {
          // LLamamos a una nueva prop consolidada para evitar multiples setPages
          if (onOverflow) {
            onOverflow(pageRef.current.innerHTML, contentToMove.join(''));
          } else {
            // Fallback si no está la prop nueva
            onUpdate(pageRef.current.innerHTML);
          }
        }
      } else {
        onUpdate(pageRef.current.innerHTML);
        checkUnderflow();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') setTimeout(checkUnderflow, 10);
    setTimeout(() => onSelectionChange && onSelectionChange(), 50);
  };
  const handleMouseUp = () => onSelectionChange && onSelectionChange();

  const handleContentClick = (e) => {
    onFocus(pageNumber - 1);
    onSelectImage(null);
    onSelectionChange && onSelectionChange();
    if (e.target === e.currentTarget || e.target.classList.contains('page-content')) {
      pageRef.current.focus();
    }
  };

  return (
    <div className="relative group mb-8 z-0">
      <div className="absolute -left-16 top-4 text-gray-400 text-xs font-medium select-none">Pág. {pageNumber}</div>
      <div
        className={`bg-white w-[215.9mm] h-[279.4mm] shadow-md relative transition-all ${isActive ? 'ring-2 ring-blue-100 shadow-xl' : ''}`}
        onClick={handleContentClick}
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {images && images.map(img => (
          <DraggableImage
            key={img.id}
            image={img}
            isSelected={selectedImageId === img.id}
            onSelect={onSelectImage}
            onUpdate={onImageUpdate}
            onDelete={onImageDelete}
            onContextMenuReq={onContextMenuReq}
          />
        ))}
        <div
          id={`page-editor-${pageNumber - 1}`}
          ref={(el) => { pageRef.current = el; if (inputRef) inputRef.current = el; }}
          className="absolute top-[25mm] left-[25mm] right-[25mm] bottom-[25mm] outline-none cursor-text page-content"
          contentEditable
          suppressContentEditableWarning={true}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={handleMouseUp}
          onMouseUp={handleMouseUp}
          onBlur={handleMouseUp}
          onPaste={onPaste}
          onFocus={() => onFocus(pageNumber - 1)}
          style={{
            lineHeight: '1.0',
            fontSize: '11pt',
            fontFamily: '"Calibri", "Carlito", sans-serif',
            color: '#000',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            zIndex: 10,
            pointerEvents: 'auto',
            overflow: 'hidden',
            minHeight: '100%'
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: FONT_FAMILY_style }} />
      </div>
      {showRemove && (
        <button onClick={onRemove} className="absolute -right-12 top-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
      )}
    </div>
  );
};

// --- App Principal ---
const safeParseArray = (jsonString, defaultValue) => {
  if (!jsonString) return defaultValue;
  // Si ya es un array, devolverlo directamente (Evita error en JSON.parse)
  if (Array.isArray(jsonString)) return jsonString;
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const getProcessedContent = (content, contractData = {}) => {
  // Datos por defecto para testing (se pueden sobrescribir con contractData)
  const datosReales = {
    nombre: "VICTOR MANUEL TEJADA BELTRE",
    cedula: "402-3350767-8",
    telefono: "829-XXX-XXXX",
    marca: "HYUNDAI",
    modelo: "ACCENT",
    ano: "2019",
    color: "BLANCO",
    chasis: "3KPC24A3XKE056920",
    placa: contractData.plate || contractData.placa || "G123456",
    tipo_vehiculo: contractData.vehicle_type || contractData.tipo_vehiculo || "Automóvil",
    precio: "RD$715,000",
    inicial: "RD$200,000",
    banco: "BANCO CARIBE",
    fecha: new Date().toLocaleDateString(),
    ...contractData // Sobrescribe con datos externos si se pasan
  };

  let processed = content;

  // 1. Reemplazamos los placeholders con los datos reales
  Object.keys(datosReales).forEach(key => {
    // Regex que maneja espacios dentro de los corchetes: {{ nombre }} o {{nombre}}
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    processed = processed.replace(regex, datosReales[key]);
  });

  // 2. LIMPIEZA QUIRÚRGICA DE ESTILOS (Para PDF Profesional)
  // Quitamos clases del editor y atributos de edición
  processed = processed.replace(/class=["']variable-chip["']/gi, 'style="color: #000000; display: inline;"');
  processed = processed.replace(/contenteditable=["']false["']/gi, '');

  // Limpiamos SOLO las propiedades visuales del editor (fondo gris, bordes, padding del chip)
  // Preservamos negrita, cursiva, subrayado y colores de texto del usuario
  processed = processed.replace(/style=["']([^"']*)["']/gi, (match, styleString) => {
    const cleanStyles = styleString
      .replace(/background-color:\s*#f3f4f6;?/gi, 'background-color: transparent;')
      .replace(/border:\s*1px\s*solid\s*#e5e7eb;?/gi, 'border: none;')
      .replace(/padding:\s*2px\s*6px;?/gi, 'padding: 0;')
      .replace(/border-radius:\s*4px;?/gi, 'border-radius: 0;')
      .replace(/box-shadow:[^;]*;?/gi, 'box-shadow: none;')
      .replace(/margin:\s*[^;]*;?/gi, 'margin: 0;');

    return `style="${cleanStyles.trim()}"`;
  });

  // Limpiar estilos vacíos
  processed = processed.replace(/style=["']\s*["']/gi, '');

  return processed;
};

// --- Componente de Vista Previa y Impresión ---
const PreviewModal = ({ pages, images, onClose, contractData = {} }) => {
  const handlePrint = () => {
    // Solo imprimimos páginas que tengan contenido real (texto visible o imagen)
    // Usamos una regex simple para quitar tags HTML y ver si queda texto
    const paginasValidas = pages.filter(p => {
      const textContent = p.content.replace(/<[^>]*>/g, '').trim();
      // También verificamos si hay imágenes flotantes en esa página
      const tieneImagenesFlotantes = images.some(img => img.pageId === p.id);
      return textContent.length > 0 || p.backgroundImage || tieneImagenesFlotantes;
    });

    if (paginasValidas.length === 0) return;

    const printWindow = window.open('', '_blank');

    // Estilos CSS Ultra-Precisos para Impresión (Carta)
    const styles = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Carlito:wght@400;700&display=swap');
        
        @page { 
          size: letter; /* Formato Carta Legal */
          margin: 0; 
        }
        
        body { 
          margin: 0; padding: 0; 
          -webkit-print-color-adjust: exact; /* Fuerza a imprimir el fondo PDF */
        }

        .print-page {
          width: 215.9mm; /* 8.5in */
          height: 279.4mm; /* 11in */
          position: relative;
          overflow: hidden;
          page-break-after: always;
          background-color: white;
        }

        .print-page:last-child {
          page-break-after: auto;
        }

        .print-bg {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          z-index: 1;
          object-fit: fill; /* Estira la plantilla al tamaño carta completo */
        }

        .print-content {
          position: absolute;
          top: 25mm; left: 25mm; right: 25mm; bottom: 25mm;
          z-index: 10;
          /* Forzamos el interlineado y fuente para que no se amontone */
          font-family: 'Carlito', 'Calibri', sans-serif;
          line-height: 1.15 !important; 
          font-size: 11pt;
          color: black;
          word-wrap: break-word;
        }

        /* Asegura que los párrafos dentro del contenido mantengan su espacio */
        .print-content p {
          margin: 0;
          min-height: 1.15em;
        }
        
        .print-floating-img { position: absolute; }
      </style>
    `;

    const content = paginasValidas.map(page => `
      <div class="print-page">
        ${page.backgroundImage ? `<img src="${page.backgroundImage}" class="print-bg" />` : ''}
        
        ${images.filter(img => img.pageId === page.id).map(img => `
          <img src="${img.src}" class="print-floating-img" style="left:${img.x}px; top:${img.y}px; width:${img.width}px; height:${img.height}px; z-index:20;">
        `).join('')}

        <div class="print-content">
          ${getProcessedContent(page.content, contractData)}
        </div>
      </div>
    `).join('');

    printWindow.document.write(styles + content);
    printWindow.document.close();
    printWindow.focus();
    // Esperar a que carguen imágenes
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[10000] flex flex-col backdrop-blur-sm animate-in fade-in duration-200">
      <header className="bg-white border-b border-gray-700 px-6 py-3 flex justify-between items-center shrink-0 print:hidden">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Printer size={20} className="text-blue-600" />
          Vista Previa de Impresión
        </h2>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <Printer size={18} /> Imprimir / Guardar PDF
          </button>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto p-4 md:p-8 flex flex-col items-center bg-gray-500/50 print:bg-white print:p-0 print:overflow-visible">
        <div className="print:hidden mb-4 text-white text-sm font-medium bg-black/30 px-4 py-2 rounded-full backdrop-blur-md">
          Esta vista simula cómo quedará tu documento final.
        </div>

        <div className="print:w-full">
          {pages.map((page) => (
            <div
              key={page.id}
              className="bg-white shadow-lg relative shrink-0 mx-auto"
              style={{
                width: '215.9mm', height: '279.4mm',
                marginBottom: '-50mm', // Compensa el espacio vacío del scale(0.8)
                backgroundImage: page.backgroundImage ? `url(${page.backgroundImage})` : 'none',
                backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
                transform: 'scale(0.8)', transformOrigin: 'top center'
              }}
            >
              {/* Fotos flotantes */}
              {images.filter(img => img.pageId === page.id).map(img => (
                <img key={img.id} src={img.src} style={{ position: 'absolute', left: img.x, top: img.y, width: img.width, height: img.height, zIndex: img.zIndex === 'back' ? 0 : 20 }} />
              ))}
              {/* Texto superpuesto */}
              <div
                className="absolute top-[25mm] left-[25mm] right-[25mm] bottom-[25mm]"
                style={{ lineHeight: '1.0', fontSize: '11pt', fontFamily: 'Calibri, sans-serif', whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: getProcessedContent(page.content, contractData) }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PlantillaEditor = ({ initialData, onSave, onDelete, onCancel, contractData = {} }) => {
  const [docTitle, setDocTitle] = useState(initialData?.titulo || initialData?.name || 'Documento sin título');
  const [templateName, setTemplateName] = useState(initialData?.templateName || '');
  const [templateType, setTemplateType] = useState(initialData?.templateType || 'CONTRATO');
  const [pages, setPages] = useState(safeParseArray(initialData?.paginas || initialData?.pages, [{ id: Date.now(), content: "", backgroundImage: null }]));
  const [images, setImages] = useState(safeParseArray(initialData?.imagenes || initialData?.images, []));
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, imageId: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  console.log("PlantillaEditor mounting");
  console.log("Pages:", pages);
  console.log("Images:", images);

  const [currentStyles, setCurrentStyles] = useState({
    fontName: 'Calibri',
    fontSize: '11',
    lineHeight: '1.0'
  });

  const pageRefs = useRef([]);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const textColorRef = useRef(null);
  const highlightColorRef = useRef(null);
  const selectionRange = useRef(null);

  const detectStyles = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentNode;
    if (node) {
      const computed = window.getComputedStyle(node);
      let fontName = computed.fontFamily.split(',')[0].replace(/['"]/g, '');
      if (fontName.toLowerCase().includes('sans') || fontName.toLowerCase() === 'carlito') fontName = 'Calibri';
      let fontSizePx = parseFloat(computed.fontSize);
      let fontSizePt = Math.round(fontSizePx * 0.75);
      let lineHeightVal = "1.0";
      const lh = computed.lineHeight;
      if (lh !== 'normal') {
        const lhPx = parseFloat(lh);
        if (!isNaN(lhPx) && fontSizePx > 0) {
          const ratio = lhPx / fontSizePx;
          const closest = [1.0, 1.15, 1.5, 2.0, 2.5].reduce((prev, curr) => Math.abs(curr - ratio) < Math.abs(prev - ratio) ? curr : prev);
          lineHeightVal = closest.toString();
        }
      }
      setCurrentStyles({ fontName, fontSize: fontSizePt.toString(), lineHeight: lineHeightVal });
    }
  };

  // --- Efecto de Reseteo: Si cambia la data inicial (ej: abres otra plantilla), forzamos reinicio ---
  // --- Efecto de Reseteo: Si cambia la data inicial (ej: abres otra plantilla), forzamos reinicio ---
  useEffect(() => {
    if (initialData) {
      setDocTitle(initialData.titulo || initialData.name || 'Documento Personalizado');
      setTemplateName(initialData.templateName || initialData.template || '');
      setTemplateType(initialData.templateType || (initialData.category === 'quote' ? 'COTIZACIÓN' : 'CONTRATO'));

      // Handle page content: prioritize specific pages, then templateContent, then default
      let loadedPages = safeParseArray(initialData.paginas || initialData.pages, null);
      if (!loadedPages && initialData.templateContent) {
        // If we have raw HTML content but no pages structure, wrap it in a page
        loadedPages = [{ id: Date.now(), content: initialData.templateContent, backgroundImage: initialData.backgroundImage || null }];
      }
      setPages(loadedPages || [{ id: Date.now(), content: "", backgroundImage: null }]);

      setImages(safeParseArray(initialData.imagenes || initialData.images, []));
      setActivePageIndex(0);
    }
  }, [initialData]);

  useEffect(() => {
    // Importar PDF.js
    const scriptPdf = document.createElement('script');
    scriptPdf.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    scriptPdf.async = true;
    document.body.appendChild(scriptPdf);

    const linkFont = document.createElement('link');
    linkFont.href = "https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    scriptPdf.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    };

    const closeMenu = () => {
      setContextMenu({ ...contextMenu, visible: false });
    };
    document.addEventListener('click', closeMenu);
    return () => {
      if (document.body.contains(scriptPdf)) document.body.removeChild(scriptPdf);
      document.removeEventListener('click', closeMenu);
    };
  }, []);

  // --- Función Maestra: insertarElemento (Con Soporte para Chips) ---
  const insertarElemento = (tipo) => {
    // 1. OBLIGATORIO: Recuperar el foco en la hoja exacta
    // Si activePageIndex es null o indefinido, usamos la 0 por defecto
    const pageToUse = activePageIndex >= 0 ? activePageIndex : 0;
    const activePageId = `page-editor-${pageToUse}`;
    const editor = document.getElementById(activePageId);

    if (!editor) {
      console.error("No se encontró el editor con ID:", activePageId);
      return;
    }

    // Forzamos al navegador a mirar el editor
    editor.focus();

    // 2. Recuperar o Crear Selección
    let sel = window.getSelection();

    // Si la selección no está dentro del editor, forzamos a que esté al final
    if (sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    let range = sel.getRangeAt(0);
    range.deleteContents(); // Borra si tenías algo seleccionado

    // 3. Lógica de Decisión: ¿Qué insertamos?
    let nodoAInsertar;

    if (tipo === 'firma_cliente') {
      // === DISEÑO DE FIRMA CLIENTE ===
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "display: inline-block; min-width: 250px; text-align: center; margin-top: 40px; vertical-align: bottom;";
      wrapper.contentEditable = "false";

      wrapper.innerHTML = `
        <div style="border-top: 2px solid black; margin-bottom: 5px; width: 100%;"></div>
        <div style="font-weight: bold; font-size: 11pt; color: black; text-transform: uppercase;">
          {{nombre}} {{apellido}}
        </div>
        <div style="font-size: 9pt; font-weight: normal; margin-top: 2px;">EL CLIENTE</div>
      `;
      nodoAInsertar = wrapper;

    } else if (tipo === 'firma_vendedor') {
      // === DISEÑO DE FIRMA VENDEDOR ===
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "display: inline-block; min-width: 250px; text-align: center; margin-top: 40px; vertical-align: bottom;";
      wrapper.contentEditable = "false";

      wrapper.innerHTML = `
        <div style="border-top: 2px solid black; margin-bottom: 5px; width: 100%;"></div>
        <div style="font-weight: bold; font-size: 11pt; color: black; text-transform: uppercase;">
          DURÁN FERNÁNDEZ AUTO S.R.L.
        </div>
        <div style="font-size: 9pt; font-weight: normal; margin-top: 2px;">EL VENDEDOR</div>
      `;
      nodoAInsertar = wrapper;

    } else {
      // === VARIABLE NORMAL (Texto plano editable) ===
      const cleanType = tipo.replace(/[{}]/g, '');
      // Insertamos texto normal para que sea totalmente editable como pidió el usuario
      const textNode = document.createTextNode(`{{${cleanType}}}`);
      nodoAInsertar = textNode;
    }

    // 4. Inserción Final
    range.insertNode(nodoAInsertar);

    // 5. Mover el cursor DESPUÉS del elemento insertado
    // Insertamos un espacio en blanco común para poder seguir escribiendo cómodamente
    const dummySpace = document.createTextNode("\u00A0");
    range.setStartAfter(nodoAInsertar);
    range.insertNode(dummySpace);
    range.setStartAfter(dummySpace);

    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    // 6. Guardar estado
    updatePageContent(pageToUse, editor.innerHTML);
    saveSelection();
  };


  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      selectionRange.current = sel.getRangeAt(0).cloneRange();
    }
  };
  const restoreSelection = () => {
    const sel = window.getSelection();
    if (selectionRange.current) { sel.removeAllRanges(); sel.addRange(selectionRange.current); }
  };
  const handleContextMenuReq = (e, image) => {
    const menuX = Math.min(e.clientX, window.innerWidth - 250);
    const menuY = Math.min(e.clientY, window.innerHeight - 300);
    setContextMenu({ visible: true, x: menuX, y: menuY, imageId: image.id });
  };
  const updateImage = (id, newProps) => setImages(prev => prev.map(img => img.id === id ? { ...img, ...newProps } : img));
  const deleteImage = (id) => { setImages(prev => prev.filter(img => img.id !== id)); setSelectedImageId(null); setContextMenu({ ...contextMenu, visible: false }); };
  const handleExtractImage = (imageProps) => { const newImage = { id: Date.now(), pageId: pages[activePageIndex].id, src: imageProps.src, x: imageProps.x, y: imageProps.y, width: imageProps.width, height: imageProps.height, zIndex: 'front' }; setImages(prev => [...prev, newImage]); setSelectedImageId(newImage.id); };
  const convertImageToInline = (id) => {
    const img = images.find(i => i.id === id); if (!img) return;
    restoreSelection();
    document.execCommand('insertHTML', false, `<img src="${img.src}" style="width:${img.width}px; height:auto; display: inline-block; vertical-align: bottom;" />`);
    deleteImage(id);
    if (pageRefs.current[activePageIndex]) updatePageContent(activePageIndex, pageRefs.current[activePageIndex].innerHTML);
    setContextMenu({ ...contextMenu, visible: false });
  };
  const handleImageAction = (action) => {
    if (!contextMenu.imageId) return;
    if (action === 'delete') deleteImage(contextMenu.imageId);
    else if (action === 'inline') convertImageToInline(contextMenu.imageId);
    else updateImage(contextMenu.imageId, action);
    setContextMenu({ ...contextMenu, visible: false });
  };
  const handleImageUpload = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { const newImage = { id: Date.now(), pageId: pages[activePageIndex].id, src: event.target.result, x: 100, y: 100, width: 200, height: 200, zIndex: 'front' }; setImages([...images, newImage]); setSelectedImageId(newImage.id); }; reader.readAsDataURL(file); } e.target.value = null; };
  const handlePaste = (e, pageId) => {
    if (e.clipboardData?.items) {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            const newImage = { id: Date.now(), pageId: pageId, src: event.target.result, x: 100, y: 100, width: 200, height: 200, zIndex: 'front' };
            setImages(prev => [...prev, newImage]);
            setSelectedImageId(newImage.id);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    }
  };
  const handlePageOverflow = (pageIndex, currentContent, contentToMove) => {
    setPages(prev => {
      const newPages = [...prev];
      // Actualizamos la página actual (sin lo que desborda)
      if (newPages[pageIndex]) {
        newPages[pageIndex].content = currentContent;
      }

      // Manejamos el desborde en la siguiente página
      if (pageIndex + 1 < newPages.length) {
        newPages[pageIndex + 1].content = contentToMove + (newPages[pageIndex + 1].content || "");
      } else {
        // Usamos crypto.randomUUID si está disponible, o un generador robusto
        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `page-${Date.now()}-${Math.random()}`;
        newPages.push({ id: newId, content: contentToMove, backgroundImage: null });
      }
      return newPages;
    });

    // Mover el foco a la siguiente hoja
    setTimeout(() => {
      const nextPageIndex = pageIndex + 1;
      setActivePageIndex(nextPageIndex);
      const nextEditor = document.getElementById(`page-editor-${nextPageIndex}`);
      if (nextEditor) {
        nextEditor.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(nextEditor);
        range.collapse(nextPageIndex === pages.length ? true : false); // Al principio si es nueva, o al principio del bloque si ya existía
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 50);
  };
  const handlePageUnderflow = (pageIndex) => {
    if (pageIndex + 1 >= pages.length) return;
    const currentPageEl = pageRefs.current[pageIndex];
    const nextPageEl = pageRefs.current[pageIndex + 1];
    if (!currentPageEl || !nextPageEl) return;
    let movedSomething = false;
    while (nextPageEl.firstChild) { const firstNode = nextPageEl.firstChild; currentPageEl.appendChild(firstNode); if (currentPageEl.scrollHeight > currentPageEl.clientHeight) { nextPageEl.insertBefore(firstNode, nextPageEl.firstChild); break; } else { movedSomething = true; } }
    if (movedSomething) { setPages(prev => { const newPages = [...prev]; newPages[pageIndex].content = currentPageEl.innerHTML; newPages[pageIndex + 1].content = nextPageEl.innerHTML; const cleanContent = newPages[pageIndex + 1].content.replace(/<[^>]*>/g, '').trim(); const hasImages = images.some(img => img.pageId === newPages[pageIndex + 1].id); if (!cleanContent && !hasImages && !newPages[pageIndex + 1].backgroundImage) newPages.splice(pageIndex + 1, 1); return newPages; }); }
  };

  const updatePageContent = (index, newContent) => { setPages(prev => { const copy = [...prev]; if (copy[index]) copy[index].content = newContent; return copy; }); const text = pages.map(p => (p.content || "").replace(/<[^>]*>/g, ' ')).join(' '); setWordCount(text.trim().split(/\s+/).filter(w => w.length).length); };
  const executeCommand = (cmd, val = null) => {
    restoreSelection(); // Recupera el texto sombreado
    document.execCommand(cmd, false, val);

    // Refrescar el contenido y mantener el foco
    if (pageRefs.current[activePageIndex]) {
      pageRefs.current[activePageIndex].focus();
      updatePageContent(activePageIndex, pageRefs.current[activePageIndex].innerHTML);
    }
    detectStyles(); // Mantengo esto para que se actualice el estado de los botones
  };
  const applyLineHeight = (val) => {
    restoreSelection();
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      let node = sel.anchorNode;
      if (node.nodeType === 3) node = node.parentNode;

      const block = node.closest('p, div, li') || node;
      block.style.lineHeight = val;

      // Actualizamos el estado para que el selector visual cambie
      setCurrentStyles(prev => ({ ...prev, lineHeight: val }));

      if (pageRefs.current[activePageIndex]) {
        updatePageContent(activePageIndex, pageRefs.current[activePageIndex].innerHTML);
      }
    }
  };

  // Función para aplicar tamaño de letra corregida (Estilo directo)
  const applyFontSize = (size) => {
    restoreSelection();
    // Forzamos un span con el tamaño exacto en la selección actual
    const span = document.createElement("span");
    span.style.fontSize = `${size}pt`;
    span.style.lineHeight = "normal"; // Esto ayuda a que el interlineado no se rompa al agrandar letra

    const sel = window.getSelection();
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      if (!sel.isCollapsed) {
        const selectedText = range.extractContents();
        span.appendChild(selectedText);
        range.insertNode(span);
      }
    }
    updatePageContent(activePageIndex, pageRefs.current[activePageIndex].innerHTML);
  };

  // Función de alineación con foco garantizado
  const handleAlign = (cmd) => {
    restoreSelection();
    document.execCommand(cmd, false, null);
    if (pageRefs.current[activePageIndex]) {
      pageRefs.current[activePageIndex].focus();
      updatePageContent(activePageIndex, pageRefs.current[activePageIndex].innerHTML);
    }
  };
  const addPage = () => setPages([...pages, { id: Date.now(), content: '', backgroundImage: null }]);
  const removePage = (index) => { if (pages.length > 1) setPages(prev => prev.filter((_, i) => i !== index)); };
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Sincronización Final Forzada: 
      // Capturamos el contenido actual de cada hoja del DOM para asegurar que no se pierda nada
      const updatedPages = pages.map((p, index) => {
        const editorEl = document.getElementById(`page-editor-${index}`);
        return {
          ...p,
          content: editorEl ? editorEl.innerHTML : p.content,
          id: p.id || crypto.randomUUID()
        };
      });

      // Construir contenido combinado para compatibilidad legacy
      const combinedContent = updatedPages.map(p => p.content).join('<div style="page-break-after: always;"></div>');

      const payload = {
        titulo: docTitle,
        name: docTitle,
        templateName: templateName,
        templateType: templateType,
        category: templateType === 'COTIZACIÓN' ? 'quote' : 'contract',
        // CRITICAL FIX: Usar 'paginas' y 'imagenes' (Español) para compatibilidad con el resto de la App
        paginas: updatedPages,
        pages: updatedPages,
        imagenes: images.map(img => ({
          ...img,
          id: img.id || crypto.randomUUID()
        })),
        images: images.map(img => ({
          ...img,
          id: img.id || crypto.randomUUID()
        })),
        // Fondo principal (de la primera página para legacy)
        backgroundImage: updatedPages[0]?.backgroundImage || null,
        content: combinedContent,
        fecha: new Date().toISOString()
      };

      console.log("📝 PlantillaEditor: handleSave triggered");
      console.log("📦 Payload prepared:", payload);

      if (onSave) {
        console.log("🚀 Calling parent onSave...");
        await onSave({ ...initialData, ...payload });
        // También actualizamos el estado local para reflejar la sincronización
        setPages(updatedPages);
      } else {
        console.warn("⚠️ No onSave prop found, saving to localStorage");
        localStorage.setItem('doc_full_v44', JSON.stringify({
          paginas: updatedPages,
          imagenes: images,
          title: docTitle,
          templateName,
          templateType
        }));
        alert("¡Guardado localmente!");
      }
    } catch (error) {
      console.error("❌ Error saving in Editor:", error);
      alert("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      alert("Por favor sube solo archivos PDF.");
      return;
    }
    setIsLoading(true);
    try {
      if (!window.pdfjsLib) throw new Error("PDF.js no cargado");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
      const newPdfPages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // Escala alta para nitidez de fondo
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        newPdfPages.push({ id: Date.now() + i * 100, content: "", backgroundImage: canvas.toDataURL('image/png') });
      }

      // MODO ANEXAR (APPEND)
      setPages(prev => {
        const isFirstPageEmpty = prev.length === 1 && !prev[0].content && !prev[0].backgroundImage;
        if (isFirstPageEmpty) {
          setTimeout(() => setActivePageIndex(0), 50);
          return newPdfPages;
        } else {
          setTimeout(() => setActivePageIndex(prev.length), 50); // Ir a la primera página nueva
          return [...prev, ...newPdfPages];
        }
      });

    } catch (err) { console.error(err); alert(`Error: ${err.message}`); } finally { setIsLoading(false); e.target.value = null; }
  };

  const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

  return (
    <div className="flex flex-col h-screen bg-[#F3F4F6] overflow-hidden font-sans text-gray-800 print:hidden">
      <header className="bg-white border-b border-gray-300 px-6 py-2.5 shrink-0 z-50 shadow-sm">
        {/* Centered Compact Layout */}
        <div className="flex items-center justify-center gap-4">
          {/* Left: Back button + Icon + Title */}
          <div className="flex items-center gap-2 mr-auto">
            {onCancel && (
              <button onClick={onCancel} className="text-gray-500 hover:text-gray-700" title="Volver">
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="text-blue-600 p-1.5 bg-blue-50 rounded"><FileText size={22} /></div>
            <input
              value={docTitle}
              onChange={e => setDocTitle(e.target.value)}
              className="text-base font-semibold outline-none w-40"
              placeholder="Contrato prueba v2"
            />
          </div>

          {/* Center: Type Selector - Compact CarBot Style */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">TIPO</span>
            <div className="flex gap-0 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setTemplateType('CONTRATO')}
                className={`px-5 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-all ${templateType === 'CONTRATO'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                CONTRATO
              </button>
              <button
                onClick={() => setTemplateType('COTIZACIÓN')}
                className={`px-5 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-all ${templateType === 'COTIZACIÓN'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                COTIZACIÓN
              </button>
            </div>
          </div>

          {/* Right: Action Buttons - Compact CarBot Style */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => pdfInputRef.current.click()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all border border-gray-200"
              title="Subir documento PDF"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              <span>Subir PDF</span>
            </button>
            <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />

            <button
              onClick={onCancel}
              className="px-4 py-1.5 bg-white text-gray-600 rounded-xl font-bold uppercase text-xs hover:bg-gray-50 transition-all border border-gray-200"
            >
              CANCELAR
            </button>

            {initialData?.id && onDelete && (
              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
                    onDelete(initialData.id);
                  }
                }}
                className="px-4 py-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-xl font-bold uppercase text-xs transition-all"
              >
                ELIMINAR
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`bg-red-600 text-white px-4 py-1.5 rounded-xl font-bold uppercase flex items-center gap-1.5 transition-all text-xs hover:bg-red-700 shadow-md ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSaving ? 'GUARDANDO...' : 'GUARDAR'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-300 px-4 py-2 flex gap-4 overflow-x-auto shrink-0 z-40 items-center h-14 shadow-sm">
        <div className="flex gap-1 pr-2 border-r border-gray-200">
          <ToolbarButton icon={Undo} onClick={() => executeCommand('undo')} title="Deshacer" />
          <ToolbarButton icon={Redo} onClick={() => executeCommand('redo')} title="Rehacer" />
        </div>
        <div className="flex gap-2 px-2 border-r border-gray-200 items-center">
          <select onMouseDown={saveSelection} onChange={e => executeCommand('fontName', e.target.value)} value={currentStyles.fontName} className="h-9 border border-gray-300 rounded px-2 text-sm bg-white shrink-0 w-32 cursor-pointer hover:border-blue-400 focus:border-blue-500 outline-none">
            <option value="Calibri">Calibri</option> <option value="Arial">Arial</option> <option value="Times New Roman">Times New Roman</option> <option value="Verdana">Verdana</option>
          </select>
          <div className="relative flex items-center">
            <select onMouseDown={saveSelection} onChange={e => applyFontSize(e.target.value)} value={currentStyles.fontSize} className="h-9 border border-gray-300 rounded px-2 text-sm bg-white shrink-0 w-20 cursor-pointer hover:border-blue-400 focus:border-blue-500 outline-none appearance-none pr-6">
              {fontSizes.map(s => <option key={s} value={s}>{s}pt</option>)}
            </select>
            <span className="absolute right-2 text-gray-500 pointer-events-none text-xs">▼</span>
          </div>
        </div>
        <div className="flex gap-1 px-2 border-r border-gray-200 bg-white rounded p-1">
          <ToolbarButton icon={Bold} onClick={() => executeCommand('bold')} onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} title="Negrita (Ctrl+B)" />
          <ToolbarButton icon={Italic} onClick={() => executeCommand('italic')} onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} title="Cursiva (Ctrl+I)" />
          <ToolbarButton icon={Underline} onClick={() => executeCommand('underline')} onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} title="Subrayado (Ctrl+U)" />
        </div>
        <div className="flex gap-2 px-2 border-r border-gray-200">
          <CustomColorPicker
            icon={Baseline}
            title="Color de fuente"
            type="text"
            indicatorColor={currentStyles.foreColor}
            onSelect={(color) => executeCommand('foreColor', color)}
          />
          <CustomColorPicker
            icon={Highlighter}
            title="Color de resaltado"
            type="highlight"
            indicatorColor={currentStyles.hiliteColor}
            onSelect={(color) => executeCommand('hiliteColor', color)}
          />
        </div>
        <div className="flex gap-1 px-2 border-r border-gray-200">
          <ToolbarButton icon={AlignLeft} onClick={() => handleAlign('justifyLeft')} title="Alinear izquierda (Ctrl+L)" />
          <ToolbarButton icon={AlignCenter} onClick={() => handleAlign('justifyCenter')} title="Centrar (Ctrl+E)" />
          <ToolbarButton icon={AlignRight} onClick={() => handleAlign('justifyRight')} title="Alinear derecha (Ctrl+R)" />
          <ToolbarButton icon={AlignJustify} onClick={() => handleAlign('justifyFull')} title="Justificar (Ctrl+J)" />
          <div className="flex items-center gap-1 bg-white border rounded px-2 h-9">
            <select
              onMouseDown={saveSelection}
              onChange={(e) => applyLineHeight(e.target.value)}
              value={currentStyles.lineHeight}
              className="outline-none text-sm bg-transparent cursor-pointer font-medium w-12 appearance-none"
            >
              <option value="1.0">1.0</option>
              <option value="1.15">1.15</option>
              <option value="1.5">1.5</option>
              <option value="2.0">2.0</option>
              <option value="2.5">2.5</option>
            </select>
            <ArrowUpDown size={14} className="text-gray-400" />
          </div>
          <div className="flex items-center justify-center p-1.5 text-gray-500"><ArrowUpDown size={16} /></div>
        </div>
        <div className="flex gap-1 px-2 border-r border-gray-200">
          <ToolbarButton icon={List} onClick={() => executeCommand('insertUnorderedList')} title="Viñetas" />
          <ToolbarButton icon={ListOrdered} onClick={() => executeCommand('insertOrderedList')} title="Numeración" />
        </div>
        <div className="flex gap-1 px-2 border-r border-gray-200">
          <ToolbarButton icon={Outdent} onClick={() => executeCommand('outdent')} title="Reducir sangría" />
          <ToolbarButton icon={Indent} onClick={() => executeCommand('indent')} title="Aumentar sangría" />
        </div>
        <div className="flex gap-2 items-center pl-2">
          <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-sm font-medium transition-colors" title="Insertar Imagen">
            <ImageIcon size={18} /><span>Imagen</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

          <button onMouseDown={(e) => e.preventDefault()} onClick={() => setShowSidebar(!showSidebar)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${showSidebar ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} title="Panel de Variables">
            <Braces size={18} /><span>Variables</span>
          </button>

          <div className="h-6 w-px bg-gray-300 mx-1" />
          <button onClick={addPage} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-sm font-medium transition-colors">
            <PlusSquare size={18} /><span>Página</span>
          </button>
        </div>
      </div>

      <div className="flex flex-grow overflow-hidden">
        <main className="flex-grow overflow-y-auto bg-[#F3F4F6] pt-8 pb-20 flex flex-col items-center" onClick={() => setSelectedImageId(null)}>
          {pages.map((page, index) => (
            <Page
              key={page.id} id={page.id} content={page.content} backgroundImage={page.backgroundImage} images={images.filter(img => img.pageId === page.id)} pageNumber={index + 1}
              isActive={activePageIndex === index}
              onUpdate={(val) => updatePageContent(index, val)}
              onFocus={(idx) => setActivePageIndex(idx)}
              onRemove={() => removePage(index)} showRemove={pages.length > 1}
              onOverflow={(currentContent, movedContent) => handlePageOverflow(index, currentContent, movedContent)}
              onUnderflow={() => handlePageUnderflow(index)} onContextMenuReq={handleContextMenuReq}
              inputRef={el => pageRefs.current[index] = el} selectedImageId={selectedImageId} onSelectImage={setSelectedImageId}
              onImageUpdate={updateImage}
              onImageDelete={deleteImage}
              onPaste={(e) => handlePaste(e, page.id)}
              onExtractImage={handleExtractImage}
              onSelectionChange={() => { detectStyles(); saveSelection(); }}
            />
          ))}
          <div className="h-20 text-gray-400 text-xs flex items-center justify-center">Fin del documento - Jean Carlos</div>
        </main>

        {showSidebar && (
          <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto shrink-0 z-30 shadow-sm flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Braces size={18} className="text-blue-600" />
                Variables Disponibles
              </h3>
              <button onClick={() => setShowSidebar(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="flex-grow p-1">
              {VARIABLE_GROUPS.map((group, gIndex) => (
                <div key={gIndex} className="mb-4">
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 mx-1 rounded-t border-b border-gray-100 flex items-center gap-2">
                    {group.title}
                  </div>
                  <div className="bg-white border border-gray-100 border-t-0 mx-1 rounded-b shadow-sm overflow-hidden">
                    {group.vars.map((v, i) => (
                      <button
                        key={`${gIndex}-${i}`}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Mantiene el foco en el documento
                          restoreSelection(); // Restaurar selección si existe

                          // Usar la nueva función maestra
                          if (v.value === '{{firma_cliente}}') {
                            insertarElemento('firma_cliente');
                          } else if (v.value === '{{firma_vendedor}}') {
                            insertarElemento('firma_vendedor');
                          } else {
                            insertarElemento(v.value);
                          }
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm text-gray-600 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <span className="font-medium">{v.label}</span>
                        <code className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 group-hover:bg-white group-hover:border-blue-200 group-hover:text-blue-600 transition-colors ml-2">
                          {v.value.replace(/[{}]/g, '')}
                        </code>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-blue-50 border-t border-blue-100">
              <p className="text-[10px] text-blue-600 leading-tight">
                <strong>Tip:</strong> Haz clic en una variable para insertarla en la posición del cursor.
              </p>
            </div>
          </aside>
        )}
      </div>

      {/* MENÚ CONTEXTUAL GLOBAL */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white shadow-2xl rounded-lg border border-gray-200 z-[9999] w-64 text-sm text-gray-700 font-sans overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 font-semibold text-gray-600 flex justify-between items-center select-none">
            <span>Ajuste de texto</span>
            <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => setContextMenu({ ...contextMenu, visible: false })} />
          </div>
          <div className="p-1">
            <button onClick={() => handleImageAction('inline')} className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 font-medium text-blue-700 bg-blue-50/50">
              <AlignLeft size={18} /> <span>En línea con el texto</span>
            </button>
            <div className="h-px bg-gray-200 my-1 mx-2" />
            <p className="px-4 py-1 text-xs text-gray-500 font-semibold uppercase select-none">Con ajuste de texto</p>
            <button onClick={() => handleImageAction({ zIndex: 'front' })} className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3"><Layout size={18} /> <span>Cuadrado</span></button>
            <button onClick={() => handleImageAction({ zIndex: 'front' })} className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3"><Maximize2 size={18} /> <span>Estrecho</span></button>
            <button onClick={() => handleImageAction({ zIndex: 'front' })} className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3"><Minimize2 size={18} /> <span>Transparente</span></button>
            <div className="h-px bg-gray-200 my-1 mx-2" />
            <button onClick={() => handleImageAction({ zIndex: 'back' })} className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3"><SendToBack size={18} /> <span>Detrás del texto</span></button>
            <button onClick={() => handleImageAction({ zIndex: 'front' })} className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3"><BringToFront size={18} /> <span>Delante del texto</span></button>
            <div className="h-px bg-gray-200 my-1 mx-2" />
            <button onClick={() => handleImageAction('delete')} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-3"><Trash2 size={18} /> <span>Eliminar imagen</span></button>
          </div>
        </div>
      )}

      <footer className="bg-white border-t px-6 py-1.5 flex justify-between text-sm text-gray-500 shrink-0 z-50">
        <span>Página {activePageIndex + 1} de {pages.length}</span><span>{wordCount} palabras</span>
      </footer>

      {showPreview && (
        <PreviewModal pages={pages} images={images} onClose={() => setShowPreview(false)} contractData={contractData} />
      )}
    </div>
  );
};

export default PlantillaEditor;
