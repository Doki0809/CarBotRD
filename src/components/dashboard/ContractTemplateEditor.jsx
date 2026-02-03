import React, { useState, useRef, useEffect } from 'react';
import {
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, FileText, Printer, Save,
    Type, PlusSquare, Trash2, Undo, Redo, Download,
    Image as ImageIcon, Move, Layers, ArrowUpRight, ArrowDownLeft, X,
    Maximize2, Minimize2, MoreVertical, BringToFront, SendToBack,
    AlignJustify, Indent, Outdent, Highlighter, Baseline, ArrowUpDown,
    Check, ArrowLeft, Upload, Layout, Braces
} from 'lucide-react';
import mammoth from 'mammoth';

// --- Constantes de Colores Estilo Google Docs ---
const THEME_COLORS = [
    // Fila 1 (Base)
    ['#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'],
    // Fila 2
    ['#F2F2F2', '#7F7F7F', '#D0CECE', '#D6DCE4', '#D9E2F3', '#FBE5D5', '#EDEDED', '#FFF2CC', '#DEEAF6', '#E2EFDA'],
    // Fila 3
    ['#D8D8D8', '#595959', '#AEAAAA', '#ADB9CA', '#B4C6E7', '#F7CBAC', '#DBDBDB', '#FEE599', '#BDD7EE', '#C5E0B3'],
    // Fila 4
    ['#BFBFBF', '#404040', '#757070', '#8496B0', '#8EA9DB', '#F4B083', '#C9C9C9', '#FFD966', '#9CC2E5', '#A8D08D'],
    // Fila 5
    ['#A5A5A5', '#262626', '#3A3838', '#323F4F', '#2F5496', '#C55A11', '#7B7B7B', '#BF9000', '#2E75B5', '#538135'],
    // Fila 6
    ['#7F7F7F', '#0D0D0D', '#171616', '#222B35', '#1F3864', '#833C0B', '#525252', '#7F6000', '#1E4E79', '#375623'],
];

// --- Variables del Sistema ---
const VARIABLE_GROUPS = [
    {
        title: "👤 Datos del Cliente",
        vars: [
            { label: "Nombre", value: "{{nombre}}" },
            { label: "Apellido", value: "{{apellido}}" },
            { label: "Cédula", value: "{{cédula}}" },
            { label: "Teléfono", value: "{{teléfono}}" },
            { label: "Dirección", value: "{{dirección}}" },
        ]
    },
    {
        title: "🚗 Ficha Técnica",
        vars: [
            { label: "Marca", value: "{{marca}}" },
            { label: "Modelo", value: "{{modelo}}" },
            { label: "Versión", value: "{{versión}}" },
            { label: "Año", value: "{{año}}" },
            { label: "Color", value: "{{color}}" },
            { label: "Chasis (VIN)", value: "{{chasis}}" },
            { label: "Placa", value: "{{placa}}" },
            { label: "Motor", value: "{{motor}}" },
            { label: "Millaje", value: "{{millaje}}" },
        ]
    },
    {
        title: "💰 Negocio y Precios",
        vars: [
            { label: "Precio Venta", value: "{{precio_venta}}" },
            { label: "Precio Financiación", value: "{{precio_financiacion}}" },
            { label: "Inicial", value: "{{inicial}}" },
            { label: "Cuotas", value: "{{cuotas}}" },
            { label: "Tasa", value: "{{tasa}}" },
            { label: "Banco", value: "{{banco}}" },
            { label: "Fecha", value: "{{fecha}}" },
        ]
    },
    {
        title: "✍️ Firmas y Sellos",
        vars: [
            { label: "Firma Cliente", value: "{{firma_cliente}}" },
            { label: "Firma Vendedor", value: "{{firma_vendedor}}" },
        ]
    },
];

const ColorPickerPopup = ({ isOpen, onClose, onSelect, position, type }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed z-[99999] bg-white border border-gray-300 shadow-xl rounded-lg p-3 w-64 select-none animate-in fade-in zoom-in-95 duration-100"
            style={{ top: position.top + 10, left: position.left }}
        >
            <div className="fixed inset-0 z-[-1]" onClick={onClose}></div>

            {/* Botón Automático */}
            <button
                onClick={() => { onSelect(type === 'highlight' ? 'transparent' : '#000000'); onClose(); }}
                className="w-full text-center py-2 mb-3 border border-gray-200 rounded hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
            >
                Automático
            </button>

            {/* Label Tema */}
            <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Colores del tema</div>

            {/* Grid de Colores */}
            <div className="grid grid-cols-10 gap-1">
                {THEME_COLORS.map((row, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                        {row.map((color, colIndex) => (
                            <button
                                key={`${rowIndex}-${colIndex}`}
                                onClick={() => { onSelect(color); onClose(); }}
                                className="w-5 h-5 rounded-full border border-gray-100 hover:scale-125 hover:border-gray-400 hover:shadow-md transition-all focus:outline-none ring-offset-1 focus:ring-2 ring-blue-500"
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </React.Fragment>
                ))}
            </div>

            {/* Opcional: Input personalizado extra */}
            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">Personalizado</span>
                <label className="w-6 h-6 rounded-full border border-gray-200 cursor-pointer overflow-hidden relative group">
                    <span className="absolute inset-0 bg-gradient-to-br from-red-500 via-green-500 to-blue-500 opacity-80 group-hover:opacity-100" />
                    <input type="color" className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" onChange={(e) => { onSelect(e.target.value); onClose(); }} />
                </label>
            </div>
        </div>
    );
};

// --- Componente de Imagen Individual ---
const DraggableImage = ({ image, isSelected, onSelect, onUpdate, onDelete, onInline, onContextMenuReq }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    // Estado para guardar posiciones iniciales (Drag & Resize)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, direction: '' });

    // Iniciar Arrastre
    const handleMouseDown = (e) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        onSelect(image.id);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setInitialPos({ x: image.x, y: image.y });
    };

    // Iniciar Redimensionado
    const handleResizeStart = (e, direction) => {
        e.stopPropagation();
        e.preventDefault(); // Evitar selección de texto al arrastrar handle
        if (e.button !== 0) return;
        setIsResizing(true);
        // Guardamos la posición y tamaño inicial para calcular los deltas
        setInitialPos({ x: image.x, y: image.y });
        setResizeStart({ x: e.clientX, y: e.clientY, w: image.width, h: image.height, direction });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            // Lógica de Mover
            if (isDragging) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                onUpdate(image.id, { x: initialPos.x + dx, y: initialPos.y + dy });
            }

            // Lógica de Redimensionar (4 Direcciones)
            if (isResizing) {
                const dx = e.clientX - resizeStart.x;
                const dy = e.clientY - resizeStart.y;

                let newX = initialPos.x;
                let newY = initialPos.y;
                let newWidth = resizeStart.w;
                let newHeight = resizeStart.h;

                // Este: Solo ancho
                if (resizeStart.direction.includes('e')) {
                    newWidth = Math.max(20, resizeStart.w + dx);
                }
                // Oeste: Ancho y Posición X
                if (resizeStart.direction.includes('w')) {
                    newWidth = Math.max(20, resizeStart.w - dx);
                    newX = initialPos.x + (resizeStart.w - newWidth);
                }
                // Sur: Solo alto
                if (resizeStart.direction.includes('s')) {
                    newHeight = Math.max(20, resizeStart.h + dy);
                }
                // Norte: Alto y Posición Y
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
                // Borde azul sólido si está seleccionada, transparente si no
                border: isSelected ? '1px solid #2563EB' : '1px solid transparent',
                boxShadow: isSelected ? '0 0 0 1px rgba(37, 99, 235, 0.2)' : 'none'
            }}
            className="group"
        >
            <img src={image.src} alt="Uploaded" className="w-full h-full object-cover select-none pointer-events-none block" />

            {isSelected && (
                <>
                    {/* Tiradores Cuadrados (Estilo Word) */}
                    <div onMouseDown={(e) => handleResizeStart(e, 'nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 cursor-nw-resize z-30" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'n')} className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-blue-600 cursor-n-resize z-30" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 cursor-ne-resize z-30" />

                    <div onMouseDown={(e) => handleResizeStart(e, 'w')} className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border border-blue-600 cursor-w-resize z-30" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'e')} className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border border-blue-600 cursor-e-resize z-30" />

                    <div onMouseDown={(e) => handleResizeStart(e, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 cursor-sw-resize z-30" />
                    <div onMouseDown={(e) => handleResizeStart(e, 's')} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-blue-600 cursor-s-resize z-30" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 cursor-se-resize z-30" />

                    {/* Botón de Opciones Flotante */}
                    <div
                        onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); onContextMenuReq({ clientX: rect.right, clientY: rect.bottom }, image); }}
                        className="absolute -bottom-10 right-0 bg-white p-1.5 rounded shadow-lg border border-gray-300 cursor-pointer hover:bg-gray-100 z-50 flex items-center justify-center"
                        title="Opciones de diseño"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <Layout size={18} className="text-gray-700" />
                    </div>
                </>
            )}
        </div>
    );
};

// --- Componente de Página ---
const Page = ({ id, content, images, pageNumber, isActive, onFocus, onUpdate, onRemove, showRemove, onOverflow, onUnderflow, onImageUpdate, onContextMenuReq, selectedImageId, onSelectImage, inputRef, onPaste }) => {
    const pageRef = useRef(null);

    useEffect(() => {
        if (pageRef.current && content !== pageRef.current.innerHTML) {
            if (Math.abs(pageRef.current.innerHTML.length - content.length) > 5 || content === '') {
                pageRef.current.innerHTML = content;
            }
        }
    }, [content]);

    const checkUnderflow = () => {
        if (!pageRef.current) return;
        if (pageRef.current.scrollHeight < pageRef.current.clientHeight - 20) onUnderflow();
    };

    const handleInput = () => {
        if (pageRef.current) {
            if (pageRef.current.scrollHeight > pageRef.current.clientHeight) {
                let lastNode = pageRef.current.lastChild;
                while (lastNode && lastNode.nodeType === 3 && !lastNode.textContent.trim()) {
                    lastNode.remove();
                    lastNode = pageRef.current.lastChild;
                }
                if (lastNode) {
                    const contentToMove = lastNode.outerHTML || lastNode.textContent;
                    lastNode.remove();
                    onUpdate(pageRef.current.innerHTML);
                    onOverflow(contentToMove);
                }
            } else if (pageRef.current.scrollHeight < pageRef.current.clientHeight) {
                checkUnderflow();
            }
            onUpdate(pageRef.current.innerHTML);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') setTimeout(checkUnderflow, 10);
    };

    return (
        <div className="relative group mb-8 z-0">
            <div className="absolute -left-16 top-4 text-gray-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity select-none">Pág. {pageNumber}</div>
            <div
                className={`bg-white w-[210mm] h-[297mm] shadow-md relative transition-all ${isActive ? 'ring-2 ring-blue-100 shadow-xl' : ''}`}
                onClick={(e) => {
                    onFocus(pageNumber - 1);
                    onSelectImage(null);
                    if (e.target === e.currentTarget && pageRef.current) pageRef.current.focus();
                }}
            >
                {images && images.map(img => (
                    <DraggableImage key={img.id} image={img} isSelected={selectedImageId === img.id} onSelect={onSelectImage} onUpdate={onImageUpdate} onContextMenuReq={onContextMenuReq} />
                ))}

                <div
                    ref={(el) => { pageRef.current = el; if (inputRef) inputRef.current = el; }}
                    className="absolute top-[25mm] left-[25mm] right-[25mm] bottom-[25mm] outline-none cursor-text page-content"
                    contentEditable
                    suppressContentEditableWarning={true}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onPaste={onPaste}
                    onFocus={() => onFocus(pageNumber - 1)}
                    style={{ lineHeight: '1.5', fontSize: '11pt', color: '#000', whiteSpace: 'pre-wrap', wordBreak: 'break-word', zIndex: 10, pointerEvents: 'none', overflow: 'hidden' }}
                />
                <style>{`.page-content * { pointer-events: auto; position: relative; } .page-content ul { list-style-type: disc; margin-left: 20px; } .page-content ol { list-style-type: decimal; margin-left: 20px; } .page-content img { max-width: 100%; height: auto; }`}</style>
            </div>
            {showRemove && (
                <button onClick={onRemove} className="absolute -right-12 top-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
            )}
        </div>
    );
};

// --- App Principal ---
const ContractTemplateEditor = ({ initialData, onSave, onCancel }) => {
    const [docTitle, setDocTitle] = useState(initialData?.titulo || initialData?.name || 'Documento sin título');
    const [pages, setPages] = useState(() => {
        const rawPages = initialData?.pages || initialData?.paginas;
        if (rawPages) {
            try {
                return typeof rawPages === 'string' ? JSON.parse(rawPages) : rawPages;
            } catch (e) {
                console.error("Error parsing pages:", e);
            }
        }
        return [{ id: Date.now(), content: "<p>Empieza a escribir...</p>" }];
    });

    const [images, setImages] = useState(() => {
        const rawImages = initialData?.images || initialData?.imagenes;
        if (rawImages) {
            try {
                return typeof rawImages === 'string' ? JSON.parse(rawImages) : rawImages;
            } catch (e) {
                console.error("Error parsing images:", e);
            }
        }
        return [];
    });
    const [selectedImageId, setSelectedImageId] = useState(null);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, imageId: null });

    // --- Color Picker States ---
    const [colorPicker, setColorPicker] = useState({ isOpen: false, type: 'text', position: { top: 0, left: 0 } });
    const pickerButtonRef = useRef(null);
    const highlightButtonRef = useRef(null);

    // --- Variables Popover State ---
    const [variablesMenu, setVariablesMenu] = useState({ isOpen: false, position: { top: 0, left: 0 } });
    const variablesButtonRef = useRef(null);

    const pageRefs = useRef([]);
    const fileInputRef = useRef(null);
    const wordInputRef = useRef(null);
    const selectionRange = useRef(null);

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) selectionRange.current = sel.getRangeAt(0);
    };

    const restoreSelection = () => {
        const sel = window.getSelection();
        if (selectionRange.current) {
            sel.removeAllRanges();
            sel.addRange(selectionRange.current);
        }
    };

    const openColorPicker = (type, e) => {
        e.preventDefault();
        saveSelection();
        const rect = e.currentTarget.getBoundingClientRect();
        setColorPicker({
            isOpen: true,
            type,
            position: { top: rect.bottom, left: rect.left }
        });
    };

    const toggleVariablesMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        saveSelection();
        if (variablesMenu.isOpen) {
            setVariablesMenu({ ...variablesMenu, isOpen: false });
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setVariablesMenu({ isOpen: true, position: { top: rect.bottom, left: rect.left } });
        }
    };

    const insertVariable = (variable) => {
        restoreSelection();
        // Insert as text span with a specific class or style if needed, or just text
        // For simplicity, just text. Or a span to make it removable as a block potentially?
        // Let's stick to text for compatibility.
        // We can wrap it in a span with a specific style to indicate it's a variable.
        const html = `<span style="background-color: #e2e8f0; border-radius: 4px; padding: 2px 4px; font-family: monospace; font-size: 0.9em;">${variable}</span>&nbsp;`;
        document.execCommand('insertHTML', false, html);
        setVariablesMenu({ ...variablesMenu, isOpen: false });
        if (pageRefs.current[activePageIndex]) updatePageContent(activePageIndex, pageRefs.current[activePageIndex].innerHTML);
    };


    const handleContextMenuReq = (e, image) => {
        const menuX = Math.min(e.clientX, window.innerWidth - 250);
        const menuY = Math.min(e.clientY, window.innerHeight - 300);
        setContextMenu({ visible: true, x: menuX, y: menuY, imageId: image.id });
    };

    const updateImage = (id, newProps) => setImages(prev => prev.map(img => img.id === id ? { ...img, ...newProps } : img));

    const deleteImage = (id) => {
        setImages(prev => prev.filter(img => img.id !== id));
        setSelectedImageId(null);
        setContextMenu({ ...contextMenu, visible: false });
    };

    const convertImageToInline = (id) => {
        const img = images.find(i => i.id === id);
        if (!img) return;
        restoreSelection();
        const sel = window.getSelection();
        if (!sel.rangeCount && pageRefs.current[activePageIndex]) pageRefs.current[activePageIndex].focus();
        const imgHtml = `<img src="${img.src}" style="width:${img.width}px; height:auto; display: inline-block; vertical-align: bottom;" />`;
        document.execCommand('insertHTML', false, imgHtml);
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

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const newImage = { id: Date.now(), pageId: pages[activePageIndex].id, src: event.target.result, x: 100, y: 100, width: 200, height: 200, zIndex: 'front' };
                setImages([...images, newImage]);
                setSelectedImageId(newImage.id);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = null;
    };

    const handleWordUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            const arrayBuffer = event.target.result;
            mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
                .then(function (result) {
                    const html = result.value; // The generated HTML
                    // Replace content of current page or add new page?
                    // User said "copy exactly same", basically replace content.
                    updatePageContent(activePageIndex, html);
                })
                .catch(function (error) {
                    console.error("Error converting Word:", error);
                    alert("Error al importar Word: " + error.message);
                });
        };
        reader.readAsArrayBuffer(file);
        e.target.value = null;
    };

    const handlePaste = (e, pageId) => {
        if (e.clipboardData && e.clipboardData.items) {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const blob = items[i].getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const newImage = {
                            id: Date.now(),
                            pageId: pageId,
                            src: event.target.result,
                            x: 100,
                            y: 100,
                            width: 200,
                            height: 200,
                            zIndex: 'front'
                        };
                        setImages(prev => [...prev, newImage]);
                        setSelectedImageId(newImage.id);
                    };
                    reader.readAsDataURL(blob);
                    return;
                }
            }
        }
    };

    const handlePageOverflow = (pageIndex, contentToMove) => {
        setPages(prev => {
            const newPages = [...prev];
            if (pageIndex + 1 < newPages.length) newPages[pageIndex + 1].content = contentToMove + (newPages[pageIndex + 1].content || "");
            else newPages.push({ id: Date.now(), content: contentToMove });
            return newPages;
        });
        setTimeout(() => { setActivePageIndex(pageIndex + 1); pageRefs.current[pageIndex + 1]?.focus(); }, 50);
    };

    const handlePageUnderflow = (pageIndex) => {
        if (pageIndex + 1 >= pages.length) return;
        const currentPageEl = pageRefs.current[pageIndex];
        const nextPageEl = pageRefs.current[pageIndex + 1];
        if (!currentPageEl || !nextPageEl) return;

        let movedSomething = false;
        while (nextPageEl.firstChild) {
            const firstNode = nextPageEl.firstChild;
            currentPageEl.appendChild(firstNode);
            if (currentPageEl.scrollHeight > currentPageEl.clientHeight) {
                nextPageEl.insertBefore(firstNode, nextPageEl.firstChild);
                break;
            } else { movedSomething = true; }
        }

        if (movedSomething) {
            setPages(prev => {
                const newPages = [...prev];
                newPages[pageIndex].content = currentPageEl.innerHTML;
                newPages[pageIndex + 1].content = nextPageEl.innerHTML;
                const cleanContent = newPages[pageIndex + 1].content.replace(/<[^>]*>/g, '').trim();
                const hasImages = images.some(img => img.pageId === newPages[pageIndex + 1].id);
                if (!cleanContent && !hasImages) newPages.splice(pageIndex + 1, 1);
                return newPages;
            });
        }
    };

    const updatePageContent = (index, newContent) => {
        setPages(prev => { const copy = [...prev]; if (copy[index]) copy[index].content = newContent; return copy; });
        const text = pages.map(p => (p.content || "").replace(/<[^>]*>/g, ' ')).join(' ');
        setWordCount(text.trim().split(/\s+/).filter(w => w.length).length);
    };

    const executeCommand = (cmd, val) => { restoreSelection(); document.execCommand(cmd, false, val); if (pageRefs.current[activePageIndex]) pageRefs.current[activePageIndex].focus(); };

    const applyFontSize = (size) => {
        restoreSelection();
        const sel = window.getSelection();
        if (sel.rangeCount) {
            const selectedText = sel.toString();
            if (selectedText.length > 0) document.execCommand('insertHTML', false, `<span style="font-size: ${size}px">${selectedText}</span>`);
        }
    };

    const applyLineHeight = (val) => {
        restoreSelection();
        const sel = window.getSelection();
        if (sel.rangeCount && sel.anchorNode) {
            const parentBlock = sel.anchorNode.parentElement.closest('div, p, li') || sel.anchorNode.parentElement;
            if (parentBlock) {
                parentBlock.style.lineHeight = val;
                if (pageRefs.current[activePageIndex]) updatePageContent(activePageIndex, pageRefs.current[activePageIndex].innerHTML);
            }
        }
    };

    const addPage = () => setPages([...pages, { id: Date.now(), content: '' }]);
    const removePage = (index) => { if (pages.length > 1) setPages(prev => prev.filter((_, i) => i !== index)); };

    const handleSave = async () => {
        // 1. Sincronización Forzada: Leer del DOM para asegurar contenido más reciente
        const updatedPages = pages.map((p, index) => {
            const pageEl = pageRefs.current[index];
            return {
                ...p,
                content: pageEl ? pageEl.innerHTML : p.content
            };
        });

        // Actualizar estado local para consistencia UI
        setPages(updatedPages);

        const payload = {
            titulo: docTitle,
            name: docTitle,
            pages: updatedPages, // Unificado: Array directo
            images: images,      // Unificado: Array directo
            fecha: new Date().toISOString()
        };

        if (onSave) {
            await onSave({ ...initialData, ...payload });
        } else {
            localStorage.setItem('doc_full_v10', JSON.stringify({ pages: updatedPages, images, title: docTitle }));
            alert("¡Guardado localmente!");
        }
    };

    useEffect(() => {
        if (!initialData) {
            const saved = localStorage.getItem('doc_full_v10');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.pages) setPages(data.pages);
                if (data.images) setImages(data.images);
                if (data.title) setDocTitle(data.title);
            }
        }
        const closeMenu = () => {
            setContextMenu({ ...contextMenu, visible: false });
            setVariablesMenu({ ...variablesMenu, isOpen: false });
        };
        // We use a global click listener to close popups, but buttons need stopPropagation or this logic refinement
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, [initialData]);

    const ToolbarButton = ({ icon: Icon, cmd, val, onClick, active, title, color }) => (
        <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick ? onClick() : executeCommand(cmd, val); }} className={`p-1.5 rounded flex-shrink-0 relative transition-colors ${active ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-700'}`} title={title}>
            <Icon size={18} strokeWidth={2} style={{ color: color }} />
        </button>
    );

    return (
        <div className="flex flex-col h-screen bg-[#F3F4F6] overflow-hidden font-sans text-gray-800">
            <header className="bg-white border-b border-gray-300 px-4 py-2 flex items-center gap-4 shrink-0 z-50 shadow-sm relative">
                <div className="flex items-center gap-4">
                    {onCancel && (
                        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 mr-2">
                            <ArrowLeft size={24} />
                        </button>
                    )}
                    <div className="text-blue-600 p-2 bg-blue-50 rounded"><FileText size={28} /></div>
                </div>
                <div className="flex flex-col flex-grow min-w-0">
                    <input value={docTitle} onChange={e => setDocTitle(e.target.value)} className="text-lg font-medium outline-none truncate" />
                </div>

                <input type="file" ref={wordInputRef} onChange={handleWordUpload} accept=".docx" className="hidden" />
                <button onClick={() => wordInputRef.current.click()} className="text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded text-sm font-medium flex gap-2 items-center transition-colors border border-gray-200">
                    <Upload size={16} /> Importar Word
                </button>

                <button onClick={handleSave} className="bg-blue-600 text-white px-5 py-2 rounded-full font-medium hover:bg-blue-700 flex gap-2 shrink-0"><Save size={18} /> Guardar</button>
            </header>

            <div className="bg-white border-b border-gray-300 px-4 py-2 flex gap-4 overflow-x-auto shrink-0 z-40 items-center h-14 shadow-sm">
                <div className="flex gap-1 pr-2 border-r border-gray-200">
                    <ToolbarButton icon={Undo} cmd="undo" title="Deshacer" />
                    <ToolbarButton icon={Redo} cmd="redo" title="Rehacer" />
                </div>
                <div className="flex gap-2 px-2 border-r border-gray-200 items-center">
                    <select onMouseDown={saveSelection} onChange={e => executeCommand('fontName', e.target.value)} className="h-9 border border-gray-300 rounded px-2 text-sm bg-white shrink-0 w-32 cursor-pointer hover:border-blue-400 focus:border-blue-500 outline-none">
                        <option value="Arial">Arial</option> <option value="Calibri">Calibri</option> <option value="Times New Roman">Times New Roman</option> <option value="Verdana">Verdana</option>
                    </select>
                    <div className="relative flex items-center">
                        <select
                            onMouseDown={saveSelection}
                            onChange={e => applyFontSize(e.target.value)}
                            className="h-9 border border-gray-300 rounded px-2 text-sm bg-white shrink-0 w-20 cursor-pointer hover:border-blue-400 focus:border-blue-500 outline-none appearance-none pr-6"
                            defaultValue="11"
                        >
                            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72].map(s => <option key={s} value={s}>{s}px</option>)}
                        </select>
                        <span className="absolute right-2 text-gray-500 pointer-events-none text-xs">▼</span>
                    </div>
                </div>
                <div className="flex gap-1 px-2 border-r border-gray-200 bg-white rounded p-1">
                    <ToolbarButton icon={Bold} cmd="bold" title="Negrita (Ctrl+B)" />
                    <ToolbarButton icon={Italic} cmd="italic" title="Cursiva (Ctrl+I)" />
                    <ToolbarButton icon={Underline} cmd="underline" title="Subrayado (Ctrl+U)" />
                </div>

                {/* Custom Color Pickers */}
                <div className="flex gap-2 px-2 border-r border-gray-200">
                    {/* Text Color */}
                    <button
                        ref={pickerButtonRef}
                        onMouseDown={(e) => { e.preventDefault(); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openColorPicker('text', e); }}
                        className="flex flex-col items-center cursor-pointer group p-1 rounded hover:bg-gray-100"
                        title="Color de fuente"
                    >
                        <Baseline size={18} />
                        <div className="h-1 w-5 bg-black mt-0.5 rounded-full" />
                    </button>

                    {/* Highlight Color */}
                    <button
                        ref={highlightButtonRef}
                        onMouseDown={(e) => { e.preventDefault(); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openColorPicker('highlight', e); }}
                        className="flex flex-col items-center cursor-pointer group p-1 rounded hover:bg-gray-100"
                        title="Resaltado"
                    >
                        <Highlighter size={18} />
                        <div className="h-1 w-5 bg-yellow-400 mt-0.5 rounded-full" />
                    </button>
                </div>

                <div className="flex gap-1 px-2 border-r border-gray-200">
                    <ToolbarButton icon={AlignLeft} cmd="justifyLeft" title="Izquierda" />
                    <ToolbarButton icon={AlignCenter} cmd="justifyCenter" title="Centro" />
                    <ToolbarButton icon={AlignRight} cmd="justifyRight" title="Derecha" />
                    <ToolbarButton icon={AlignJustify} cmd="justifyFull" title="Justificar" />
                </div>
                <div className="flex gap-1 px-2 border-r border-gray-200">
                    <ToolbarButton icon={List} cmd="insertUnorderedList" title="Viñetas" />
                    <ToolbarButton icon={ListOrdered} cmd="insertOrderedList" title="Numeración" />
                </div>
                <div className="flex gap-1 px-2 border-r border-gray-200">
                    <ToolbarButton icon={Outdent} cmd="outdent" title="Reducir sangría" />
                    <ToolbarButton icon={Indent} cmd="indent" title="Aumentar sangría" />
                </div>

                {/* Insert Actions Group */}
                <div className="flex gap-2 items-center pl-2 relative">
                    {/* Variables Dropdown Button */}
                    <button
                        ref={variablesButtonRef}
                        onClick={toggleVariablesMenu}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-sm font-medium transition-colors"
                        title="Insertar Variable"
                    >
                        <Braces size={18} /><span>Variables</span>
                    </button>
                    {/* Variables Menu */}


                    <div className="h-6 w-px bg-gray-300 mx-1" />

                    <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-sm font-medium transition-colors" title="Insertar Imagen">
                        <ImageIcon size={18} /><span>Imagen</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

                    <button onClick={addPage} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-sm font-medium transition-colors">
                        <PlusSquare size={18} /><span>Página</span>
                    </button>
                </div>
            </div>

            {/* Color Picker Popup */}
            <ColorPickerPopup
                isOpen={colorPicker.isOpen}
                onClose={() => setColorPicker({ ...colorPicker, isOpen: false })}
                position={colorPicker.position}
                type={colorPicker.type}
                onSelect={(color) => executeCommand(colorPicker.type === 'text' ? 'foreColor' : 'hiliteColor', color)}
            />

            {/* Variables Menu Popup - Fixed Position */}
            {variablesMenu.isOpen && (
                <div
                    className="fixed z-[99999] bg-white rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 w-64"
                    style={{ top: variablesMenu.position.top + 5, left: variablesMenu.position.left }}
                    onClick={(e) => e.stopPropagation()} // Prevent close on inside click
                >
                    <div className="fixed inset-0 z-[-1]" onClick={() => setVariablesMenu({ ...variablesMenu, isOpen: false })}></div>
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <h4 className="font-bold text-xs uppercase text-gray-500 tracking-wider">Variables Dinámicas</h4>
                    </div>
                    <div className="p-1">
                        {VARIABLE_GROUPS.map((group, gIndex) => (
                            <div key={gIndex} className="mb-2">
                                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 mx-1 rounded">{group.title}</div>
                                {group.vars.map((v, i) => (
                                    <button
                                        key={`${gIndex}-${i}`}
                                        onClick={() => insertVariable(v.value)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 rounded mx-1 text-sm text-gray-700 transition-colors flex justify-between items-center group mb-0.5"
                                    >
                                        <span>{v.label}</span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <main className="flex-grow overflow-y-auto bg-[#F3F4F6] pt-8 pb-20 flex flex-col items-center" onClick={() => setSelectedImageId(null)}>
                {pages.map((page, index) => (
                    <Page
                        key={page.id} id={page.id} content={page.content} images={images.filter(img => img.pageId === page.id)} pageNumber={index + 1}
                        isActive={activePageIndex === index} onUpdate={(val) => updatePageContent(index, val)} onFocus={(idx) => setActivePageIndex(idx)}
                        onRemove={() => removePage(index)} showRemove={pages.length > 1} onOverflow={(content) => handlePageOverflow(index, content)}
                        onUnderflow={() => handlePageUnderflow(index)} onContextMenuReq={handleContextMenuReq}
                        inputRef={el => pageRefs.current[index] = el} selectedImageId={selectedImageId} onSelectImage={setSelectedImageId} onImageUpdate={updateImage} deleteImage={deleteImage}
                        onPaste={(e) => handlePaste(e, page.id)}
                    />
                ))}
                <div className="h-20 text-gray-400 text-xs flex items-center justify-center">Fin del documento - Jean Carlos</div>
            </main>

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
        </div>
    );
};

export default ContractTemplateEditor;
