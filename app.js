/* Shared navigation and progressive installation. */
(() => {
    const root = new URL('./', document.currentScript.src);
    let installPrompt;
    const toolbar = document.createElement('div');
    toolbar.className = 'app-toolbar';
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.id = 'app-navigation';
        const menu = document.createElement('button');
        menu.className = 'menu-button';
        menu.textContent = '☰ Menú';
        menu.setAttribute('aria-controls', sidebar.id);
        menu.setAttribute('aria-expanded', 'false');
        const shade = document.createElement('button');
        shade.className = 'menu-shade';
        shade.hidden = true;
        shade.tabIndex = -1;
        shade.setAttribute('aria-label', 'Cerrar menú');
        document.body.append(shade);
        const mobile = matchMedia('(max-width:700px)');
        function toggle(open) {
            document.body.classList.toggle('menu-open', open);
            menu.setAttribute('aria-expanded', String(open));
            shade.hidden = !open;
            sidebar.inert = mobile.matches && !open;
            if (open) sidebar.querySelector('a')?.focus();
            else menu.focus();
        }
        sidebar.inert = mobile.matches;
        menu.onclick = () => toggle(!document.body.classList.contains('menu-open'));
        shade.onclick = () => toggle(false);
        document.addEventListener('keydown', e => {
            if (!document.body.classList.contains('menu-open')) return;
            if (e.key === 'Escape') toggle(false);
            if (e.key === 'Tab') {
                const links = [...sidebar.querySelectorAll('a,button')];
                const first = links[0], last = links.at(-1);
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
        mobile.addEventListener('change', () => {
            document.body.classList.remove('menu-open');
            menu.setAttribute('aria-expanded', 'false');
            shade.hidden = true;
            sidebar.inert = mobile.matches;
        });
        toolbar.append(menu);
    }
    const install = document.createElement('button');
    install.className = 'install-button';
    install.textContent = 'Instalar app';
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    install.hidden = !!standalone;
    const dialog = document.createElement('dialog');
    dialog.className = 'install-help';
    dialog.innerHTML = '<h2>SystemSalud en tu celular</h2><p>En iPhone, abre el menú Compartir y elige “Agregar a pantalla de inicio”. En Android, abre el menú del navegador y busca “Instalar aplicación” o “Agregar a pantalla de inicio”.</p><p>Primera visita: necesitas conexión. Después podrás abrir los módulos guardados en este dispositivo.</p><form method="dialog"><button>Entendido</button></form>';
    document.body.append(dialog);
    install.onclick = async () => {
        if (!installPrompt) { dialog.showModal(); return; }
        const prompt = installPrompt;
        installPrompt = null;
        await prompt.prompt();
        const result = await prompt.userChoice;
        if (result.outcome === 'accepted') install.hidden = true;
    };
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
    window.addEventListener('appinstalled', () => { install.hidden = true; installPrompt = null; });
    const status = document.createElement('span');
    status.className = 'connection-status';
    status.setAttribute('role','status');
    function connection() {
        status.textContent = navigator.onLine ? 'Demo universitaria' : 'Sin conexión · datos locales';
        status.classList.toggle('offline', !navigator.onLine);
    }
    connection();
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    toolbar.append(install,status);
    (document.querySelector('.main,.login-box') || document.body).prepend(toolbar);
    if ('serviceWorker' in navigator && window.isSecureContext) {
        navigator.serviceWorker.register(new URL('sw.js',root), {scope:root.pathname})
            .catch(error => console.error('No se pudo preparar el modo sin conexión',error));
    }
})();
