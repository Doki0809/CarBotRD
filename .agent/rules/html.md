---
trigger: always_on
---

1. IDENTIDAD VISUAL (BRAND GUIDELINES)
🎨 Paleta de Colores (Inmutable)

No usar otros colores fuera de esta lista sin autorización.

Color Primario (CarBot Red): #D10000 (Para botones principales, acciones de venta, alertas importantes).

Color Secundario (Dark): #1A1A1A (Para textos, barras laterales, encabezados).

Acentos/Bordes: #E5E7EB (Gris suave para líneas divisorias y bordes de tarjetas).

Fondo General (App): #F3F4F6 (Gris muy pálido, para evitar fatiga visual).

Fondo Documentos (PDF): #FFFFFF (Blanco Puro Absoluto - OBLIGATORIO).

🔠 Tipografía

Interfaz (App/Web): Inter, Roboto o San Francisco. (Estilo moderno, limpio, Sans-Serif).

Documentos Legales (PDF): Times New Roman o Arial. (Debe parecer un documento legal estándar, no una página web).

Tamaño Base Documento: 11pt o 12pt.

Color Texto Documento: #000000 (Negro Puro). Prohibido el gris en contratos.

⏹️ Formas y Botones

Botones: Border-radius: 8px (Ligeramente redondeados, no círculos completos ni cuadrados perfectos).

Tarjetas (Cards): Sombra suave (box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)). Fondo blanco.

Inputs (Campos de texto): Borde gris suave. Al hacer clic (focus), borde #D10000. 

2. REGLAS DE ORO: GENERACIÓN DE DOCUMENTOS (PDF)
Esta es la parte más crítica del sistema. Reglas de cumplimiento obligatorio:

Separación Iglesia/Estado:

Lo que se ve en el Editor (pantalla) NO es lo que sale en el PDF.

Editor: Puede tener "Chips" grises, colores de ayuda y bordes para facilitar la edición.

PDF Final: Debe ser TEXTO PLANO. Cero fondos grises, cero bordes, cero estilos de "botón".

La Regla de la Limpieza (Sanitization):

Antes de html2pdf o print, se debe ejecutar un script que elimine background-color, padding y border de las variables dinámicas.

EXCEPCIÓN: Nunca eliminar font-weight (negrita), font-style (cursiva) o text-decoration (subrayado). El formato legal se respeta.

Formato de Papel:

Siempre configurar la librería de PDF en US LETTER (Carta) o LEGAL (Oficio) según requiera el contrato.

Márgenes obligatorios: 0.5 inches (1.27 cm) por lado. Nunca pegar el texto al borde.

3. COMPORTAMIENTO Y CÓDIGO (HTML/CSS)
Mobile First:

Todo cambio debe probarse primero en resolución de iPhone 15 Pro (393px width). Si se rompe en el celular, el código se rechaza.

No "Hardcodear" Textos:

Nunca escribir "RD$ 765,000" directo en el código. Siempre usar variables {{precio}}.

Manejo de Errores:

Si una variable (ej: {{motor}}) está vacía en la base de datos, el PDF NO debe mostrar el espacio en blanco ni la palabra undefined. Debe mostrar un texto por defecto (ej: "N/A" o "Motor no especificado").

4. PROTOCOLO DE ENTREGA (QA)
Antes de decir "Ya está listo", Antigravity debe verificar:

[ ] Prueba de "La Abuela": ¿Se lee claro? (Contraste suficiente).

[ ] Prueba de Impresión: ¿Si le doy a descargar, sale idéntico a si lo imprimo?

[ ] Prueba de Móvil: ¿Puedo generar el contrato desde el celular sin hacer zoom raro?

[ ] Prueba de Datos: ¿Si el carro no tiene "Color", se rompe el contrato?