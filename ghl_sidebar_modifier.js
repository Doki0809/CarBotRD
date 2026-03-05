/**
 * CarBot System - GHL Sidebar Modifier
 * Inyectar este script en el apartado "Custom JS" del App en el Developer Portal de GoHighLevel.
 */
(function () {
    let observer = null;

    function moveCarbotMenu() {
        try {
            // Buscar todos los elementos del menú lateral. 
            // GHL cambia clases a veces, así que buscamos "a" tags dentro del sidebar o elementos nav.
            const menuLinks = document.querySelectorAll('a.nav-item, div.nav-item, #sidebar-v2 a, .sidebar-v2-location a, nav a');

            let carbotNode = null;
            let inventoryNode = null;

            // Buscamos los nodos por su texto interno
            menuLinks.forEach(node => {
                const text = node.textContent.trim().toLowerCase();
                // Identificar el custom link de CarBot
                if (text.includes('carbot system') || text.includes('carbot')) {
                    // GHL a menudo envuelve los links en contenedores (li o div parent).
                    // Subimos al padre más cercano que represente la fila entera si es necesario.
                    carbotNode = node.closest('li') || node.closest('.nav-item') || node;
                }
                // Identificar el menú de Inventario (Inventory en inglés, o variantes en español si aplican)
                if (text === 'inventory' || text === 'inventario' || text.includes('inventory')) {
                    inventoryNode = node.closest('li') || node.closest('.nav-item') || node;
                }
            });

            // Si encontramos ambos y CarBot no está ya debajo de Inventory
            if (carbotNode && inventoryNode) {
                if (inventoryNode.nextSibling !== carbotNode) {
                    inventoryNode.insertAdjacentElement('afterend', carbotNode);
                    console.log('[CarBot System] Custom Menu link movido exitosamente.');
                }
                return true; // Éxito, ya podemos detener la vigilancia
            }
            return false; // Aún no aparecen en el DOM
        } catch (e) {
            console.error('[CarBot System] Error al intentar mover el menú:', e);
            return true; // Retornamos true para desconectar el observer y fallar en silencio sin romper GHL
        }
    }

    // Utilizamos MutationObserver porque GHL es una SPA y carga las vistas dinámicamente
    function initObserver() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };

        observer = new MutationObserver((mutationsList, obs) => {
            const success = moveCarbotMenu();
            if (success) {
                obs.disconnect(); // Desconectar para no consumir memoria
            }
        });

        observer.observe(targetNode, config);

        // Intento inicial en caso de que ya estén renderizados
        if (moveCarbotMenu() && observer) {
            observer.disconnect();
        }

        // Limpieza de seguridad: si después de 15 segundos no se encontró, desconectar el observer.
        setTimeout(() => {
            if (observer) {
                observer.disconnect();
                console.log('[CarBot System] Modo vigilancia del menú finalizado (Timeout).');
            }
        }, 15000);
    }

    // Esperar a que el DOM base esté listo antes de iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initObserver);
    } else {
        initObserver();
    }
})();
