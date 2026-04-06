/**
 * Bendito Sur - Frontend Application Logic
 */


import { CONFIG } from './config.js';

// === MODAL SYSTEM ===

function _bsShowModal(message, icon, isConfirm) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('bs-modal-overlay');
        if (!overlay) { resolve(isConfirm ? window.confirm(message) : (window.alert(message), undefined)); return; }
        const iconEl = document.getElementById('bs-modal-icon');
        const msgEl = document.getElementById('bs-modal-message');
        const okBtn = document.getElementById('bs-modal-ok');
        const cancelBtn = document.getElementById('bs-modal-cancel');
        // Auto-detect icon from leading emoji
        const emojiMatch = message.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s?/u);
        iconEl.textContent = icon || (emojiMatch ? emojiMatch[1] : 'ℹ️');
        msgEl.textContent = emojiMatch ? message.slice(emojiMatch[0].length) : message;
        cancelBtn.style.display = isConfirm ? 'inline-block' : 'none';
        overlay.style.display = 'flex';
        const onOk = () => { overlay.style.display = 'none'; cleanup(); resolve(true); };
        const onCancel = () => { overlay.style.display = 'none'; cleanup(); resolve(false); };
        const cleanup = () => { okBtn.removeEventListener('click', onOk); cancelBtn.removeEventListener('click', onCancel); };
        okBtn.addEventListener('click', onOk);
        if (isConfirm) cancelBtn.addEventListener('click', onCancel);
    });
}

function BSAlert(message) { return _bsShowModal(message, null, false); }
function BSConfirm(message) { return _bsShowModal(message, '⚠️', true); }

// Exponer globalmente para uso en JSX inline
/** @type {any} */ (window).BSAlert = BSAlert;
/** @type {any} */ (window).BSConfirm = BSConfirm;

export function initializeAppLogic() {
    // 1. Navigation Logic (SPA Routing)
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    function navigateTo(targetId) {
        views.forEach(view => {
            if (view.id === targetId) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        navItems.forEach(item => {
            if (item.getAttribute('data-target') === targetId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        if (window.scrollY > 0) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            if (targetId) {
                navigateTo(targetId);
            }
        });
    });

    // 2. Navbar scrolled class
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // 2b. Hamburger menu toggle
    const hamburger  = document.getElementById('nav-hamburger');
    const mobileNav  = document.getElementById('mobile-nav');
    const hamburgerIcon = hamburger.querySelector('i');

    hamburger.addEventListener('click', () => {
        const isOpen = mobileNav.classList.toggle('open');
        hamburgerIcon.className = isOpen ? 'ph ph-x' : 'ph ph-list';
    });

    // Close mobile nav when a link is clicked
    mobileNav.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            mobileNav.classList.remove('open');
            hamburgerIcon.className = 'ph ph-list';
        });
    });

    // 3. Audio Player Logic (Real HTML5)
    const globalPlayer = document.getElementById('global-player');
    const appContent = document.getElementById('app-content');
    const audio = document.getElementById('bs-audio');
    const playerTitle = document.getElementById('global-player') && globalPlayer.querySelector('.track-title');
    const playerArtist = globalPlayer && globalPlayer.querySelector('.track-artist');
    const playPauseBtn = document.getElementById('player-playpause');
    const prevBtn = document.getElementById('player-prev');
    const nextBtn = document.getElementById('player-next');
    const progressBar = document.getElementById('player-progress-bar');
    const progressFill = document.getElementById('player-progress');
    const currentTimeEl = document.getElementById('player-current');
    const totalTimeEl = document.getElementById('player-total');
    const downloadBtn = document.getElementById('player-download');

    let currentTrackIndex = -1;

    function getTrackRows() {
        return Array.from(document.querySelectorAll('.track-row[data-src]'));
    }

    function formatTime(s) {
        if (isNaN(s) || !isFinite(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    function loadTrack(row, autoplay = true) {
        const src = row.getAttribute('data-src');
        const title = row.getAttribute('data-title') || 'Sin título';
        const artist = row.getAttribute('data-artist') || '';
        if (!src) return;

        audio.src = src;
        if (playerTitle) playerTitle.textContent = title;
        if (playerArtist) playerArtist.textContent = artist;
        if (downloadBtn) downloadBtn.setAttribute('data-src', src);

        // Marcar fila activa
        document.querySelectorAll('.track-row').forEach(r => r.classList.remove('playing'));
        row.classList.add('playing');

        // Actualizar índice
        currentTrackIndex = getTrackRows().indexOf(row);

        // Mostrar player
        if (globalPlayer.classList.contains('hidden')) {
            globalPlayer.classList.remove('hidden');
            if (appContent) appContent.style.paddingBottom = '100px';
        }

        if (autoplay) {
            audio.play().catch(() => {});
        }
    }

    function setPlayIcon(playing) {
        if (!playPauseBtn) return;
        const i = playPauseBtn.querySelector('i');
        i.className = playing ? 'ph-fill ph-pause-circle' : 'ph-fill ph-play-circle';
    }

    // Eventos del audio
    if (audio) {
        audio.addEventListener('play', () => setPlayIcon(true));
        audio.addEventListener('pause', () => setPlayIcon(false));
        audio.addEventListener('ended', () => {
            const rows = getTrackRows();
            if (rows.length > 0 && currentTrackIndex < rows.length - 1) {
                loadTrack(rows[currentTrackIndex + 1]);
            } else {
                setPlayIcon(false);
            }
        });
        audio.addEventListener('timeupdate', () => {
            if (!audio.duration) return;
            const pct = (audio.currentTime / audio.duration) * 100;
            if (progressFill) progressFill.style.width = pct + '%';
            if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
        });
        audio.addEventListener('loadedmetadata', () => {
            if (totalTimeEl) totalTimeEl.textContent = formatTime(audio.duration);
        });
    }

    // Play / Pause
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (!audio.src) return;
            audio.paused ? audio.play().catch(() => {}) : audio.pause();
        });
    }

    // Anterior
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const rows = getTrackRows();
            if (rows.length === 0) return;
            const idx = currentTrackIndex > 0 ? currentTrackIndex - 1 : rows.length - 1;
            loadTrack(rows[idx]);
        });
    }

    // Siguiente
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const rows = getTrackRows();
            if (rows.length === 0) return;
            const idx = (currentTrackIndex + 1) % rows.length;
            loadTrack(rows[idx]);
        });
    }

    // Click en barra de progreso
    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            if (!audio.duration) return;
            const rect = progressBar.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            audio.currentTime = pct * audio.duration;
        });
    }

    // Botón descargar
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const src = downloadBtn.getAttribute('data-src');
            if (!src) return;
            const a = document.createElement('a');
            a.href = src;
            a.download = '';
            a.click();
        });
    }

    // Delegación de clicks en track-play-btn (incluye filas añadidas dinámicamente)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.track-play-btn');
        if (!btn) return;
        const row = btn.closest('tr.track-row');
        if (!row) return;
        const src = row.getAttribute('data-src');
        if (!src) {
            BSAlert('⚠️ Esta pista aún no tiene audio asignado.');
            return;
        }
        loadTrack(row, true);
    });

    // 4. Events Filter Logic (Community to Province)
    const communitySelect = document.getElementById('community-select');
    const provinceSelect = document.getElementById('province-select');

    const locationsData = {
        'andalucia': ['Sevilla', 'Malaga', 'Cadiz', 'Granada', 'Cordoba', 'Almeria', 'Jaen', 'Huelva'],
        'madrid': ['Madrid'],
        'cataluna': ['Barcelona', 'Girona', 'Lleida', 'Tarragona'],
        'valencia': ['Valencia', 'Alicante', 'Castellon'],
        'baleares': ['Ibiza', 'Mallorca', 'Menorca', 'Formentera']
    };

    if (communitySelect && provinceSelect) {
        communitySelect.addEventListener('change', (e) => {
            const selectedCommunity = e.target.value;

            provinceSelect.innerHTML = '<option value="">Selecciona Provincia</option>';

            if (selectedCommunity && locationsData[selectedCommunity]) {
                provinceSelect.disabled = false;

                locationsData[selectedCommunity].forEach(province => {
                    const option = document.createElement('option');
                    option.value = province.toLowerCase();
                    option.textContent = province;
                    provinceSelect.appendChild(option);
                });
            } else {
                provinceSelect.disabled = true;
            }
        });
    }

    // 5. Events Search Button (Mock)
    const searchEventsBtn = document.getElementById('search-events-btn');
    if (searchEventsBtn) {
        searchEventsBtn.addEventListener('click', () => {
            const community = communitySelect.value;
            const province = provinceSelect.value;
            const style = document.getElementById('style-select').value;

            searchEventsBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Buscando...';
            searchEventsBtn.disabled = true;

            setTimeout(() => {
                searchEventsBtn.innerHTML = '<i class="ph ph-magnifying-glass"></i> Buscar';
                searchEventsBtn.disabled = false;

                let msg = 'Mostrando resultados ';
                if (province) msg += `en ${province} `;
                else if (community) msg += `en la comunidad de ${community} `;

                if (style) msg += `para el estilo ${style}`;

                if (!community && !style) msg = 'Mostrando todos los eventos';

                BSAlert(msg);
            }, 800);
        });
    }

    // 6. Scroll Reveal — Intersection Observer
    // Excluir elementos del hero — ya tienen animacion CSS propia
    const heroEls = new Set(document.querySelectorAll(
        '.hero-kicker, .hero-title, .hero-description, .hero-actions, .hero-ring-wrap, .hero-stats'
    ));

    // Excluir dashboard-card del reveal: están en vistas SPA ocultas (display:none)
    // y el observer no detecta bien el cambio a visible en móvil, dejándolas opacity:0
    const revealTargets = [
        ...document.querySelectorAll('.benefit-row'),
        ...document.querySelectorAll('.dj-card'),
        ...document.querySelectorAll('.event-card'),
        ...document.querySelectorAll('.pricing-col'),
        ...document.querySelectorAll('.benefits-intro'),
        ...document.querySelectorAll('.pricing-intro'),
        ...document.querySelectorAll('.roster-head'),
        ...document.querySelectorAll('.events-head'),
        ...document.querySelectorAll('.library-head'),
    ].filter(el => !heroEls.has(el));

    revealTargets.forEach(el => el.classList.add('reveal'));

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach(el => revealObserver.observe(el));

    // 7. Contador animado para stats del hero
    function animateCounter(el, target, duration) {
        const span = el.querySelector('span');
        const suffix = span ? span.outerHTML : '';
        const startTime = performance.now();

        function tick(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
            el.innerHTML = Math.round(eased * target) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // Lanzar contadores tras el stagger del hero (0.72s + algo de margen)
    setTimeout(() => {
        document.querySelectorAll('.hero-stat-num').forEach(el => {
            const raw = (el.childNodes[0] && el.childNodes[0].textContent) || '';
            const num = parseInt(raw.trim(), 10);
            if (!isNaN(num)) animateCounter(el, num, 1600);
        });
    }, 800);

    // 8. Re-lanzar reveal al cambiar de vista (para elementos ya en pantalla)
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            setTimeout(() => {
                document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.top < window.innerHeight && rect.bottom > 0) {
                        el.classList.add('visible');
                    }
                });
            }, 60);
        });
    });

    // 9. Funcionalidades de Autenticación (Login / Register)
    
    const authView = document.getElementById('auth-view');
    
    // ----------------------------------------------------
    // STATE MANAGEMENT (Persistencia)
    // ----------------------------------------------------
    const UserSession = {
        get: () => localStorage.getItem('benditoSession'),
        set: (role) => {
            localStorage.setItem('benditoSession', role);
            updateNavbarState();
        },
        clear: () => {
            localStorage.removeItem('benditoSession');
            updateNavbarState();
        }
    };

    function updateNavbarState() {
        const role = UserSession.get();
        
        const loginBtns = document.querySelectorAll('.auth-btn-login');
        const registerBtns = document.querySelectorAll('.auth-btn-register');
        const dashBtns = document.querySelectorAll('.auth-btn-dash');
        const adminBtns = document.querySelectorAll('.auth-btn-admin');
        const logoutBtns = document.querySelectorAll('.auth-btn-logout');

        [loginBtns, registerBtns, dashBtns, adminBtns, logoutBtns].forEach(group => {
            group.forEach(btn => btn.classList.add('hidden'));
        });

        if (role === 'admin') {
            adminBtns.forEach(btn => btn.classList.remove('hidden'));
            logoutBtns.forEach(btn => btn.classList.remove('hidden'));
            document.querySelectorAll('.nav-item[data-target="dashboard-view"]').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.nav-item[data-target="pricing-view"]').forEach(el => el.classList.add('hidden'));

            const mainDesktopNav = document.getElementById('main-nav-links');
            const adminDesktopNav = document.getElementById('admin-nav-links');
            if(mainDesktopNav) mainDesktopNav.classList.add('hidden');
            if(adminDesktopNav) adminDesktopNav.classList.remove('hidden');

            const mainMobileNav = document.getElementById('mobile-main-nav-links');
            const adminMobileNav = document.getElementById('mobile-admin-nav-links');
            if(mainMobileNav) mainMobileNav.classList.add('hidden');
            if(adminMobileNav) adminMobileNav.classList.remove('hidden');

        } else if (role === 'user' || role === 'collab') {
            dashBtns.forEach(btn => btn.classList.remove('hidden'));
            logoutBtns.forEach(btn => btn.classList.remove('hidden'));
            document.querySelectorAll('.nav-item[data-target="dashboard-view"]').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.nav-item[data-target="pricing-view"]').forEach(el => el.classList.add('hidden'));

            const mainDesktopNav = document.getElementById('main-nav-links');
            const adminDesktopNav = document.getElementById('admin-nav-links');
            if(mainDesktopNav) mainDesktopNav.classList.remove('hidden');
            if(adminDesktopNav) adminDesktopNav.classList.add('hidden');

            const mainMobileNav = document.getElementById('mobile-main-nav-links');
            const adminMobileNav = document.getElementById('mobile-admin-nav-links');
            if(mainMobileNav) mainMobileNav.classList.remove('hidden');
            if(adminMobileNav) adminMobileNav.classList.add('hidden');

            if (role === 'collab') {
                document.querySelectorAll('.sub-status').forEach(el => {
                    el.innerHTML = `
                        <span class="status-badge" style="background: var(--gold); color: #000; border: none; font-weight: 700;">Activa</span>
                        <div class="sub-plan" style="color: var(--gold);"><i class="ph-fill ph-crown"></i> COLABORADOR</div>
                        <p class="sub-renewal" style="color: var(--gold);">Acceso Vitalicio Gratuito</p>
                    `;
                });
                document.querySelectorAll('.dashboard-actions button').forEach(el => el.classList.add('hidden'));
                
                const collabManager = document.getElementById('collab-manager');
                if(collabManager) collabManager.classList.remove('hidden');
            } else {
                document.querySelectorAll('.sub-status').forEach(el => {
                    el.innerHTML = `
                        <span class="status-badge active">Activa</span>
                        <div class="sub-plan">ELITE</div>
                        <p class="sub-renewal">Próxima renovación: Activa</p>
                    `;
                });
                document.querySelectorAll('.dashboard-actions button').forEach(el => el.classList.remove('hidden'));
                
                const collabManager = document.getElementById('collab-manager');
                if(collabManager) collabManager.classList.add('hidden');
            }

        } else {
            loginBtns.forEach(btn => btn.classList.remove('hidden'));
            registerBtns.forEach(btn => btn.classList.remove('hidden'));
            document.querySelectorAll('.nav-item[data-target="dashboard-view"]').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.nav-item[data-target="pricing-view"]').forEach(el => el.classList.remove('hidden'));

            const mainDesktopNav = document.getElementById('main-nav-links');
            const adminDesktopNav = document.getElementById('admin-nav-links');
            if(mainDesktopNav) mainDesktopNav.classList.remove('hidden');
            if(adminDesktopNav) adminDesktopNav.classList.add('hidden');

            const mainMobileNav = document.getElementById('mobile-main-nav-links');
            const adminMobileNav = document.getElementById('mobile-admin-nav-links');
            if(mainMobileNav) mainMobileNav.classList.remove('hidden');
            if(adminMobileNav) adminMobileNav.classList.add('hidden');
        }
    }

    // Inicializar estado al cargar
    updateNavbarState();

    // ----------------------------------------------------
    // ROUTING AUTENTICACION Y BOTONES
    // ----------------------------------------------------
    function navigateToAuth(isLogin) {
        if(window.innerWidth < 768) {
            const mobileMenu = document.getElementById('mobile-nav');
            if(mobileMenu) mobileMenu.classList.remove('open');
            const hamb = document.getElementById('nav-hamburger');
            if(hamb && hamb.querySelector('i')) hamb.querySelector('i').className = 'ph ph-list';
        }

        document.querySelectorAll('.view, .nav-item').forEach(v => v.classList.remove('active'));
        if (authView) authView.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        if (isLogin) {
            const loginTab = document.querySelector('[data-auth="login"]');
            const loginForm = document.getElementById('login-form');
            if(loginTab) loginTab.classList.add('active');
            if(loginForm) loginForm.classList.add('active');
        } else {
            const regTab = document.querySelector('[data-auth="register"]');
            const regForm = document.getElementById('register-form');
            if(regTab) regTab.classList.add('active');
            if(regForm) regForm.classList.add('active');
        }
    }

    document.querySelectorAll('.auth-btn-login').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); navigateToAuth(true); }));
    document.querySelectorAll('.auth-btn-register').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); navigateToAuth(false); }));
    
    document.querySelectorAll('.auth-btn-dash').forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Cerrar menú móvil si está abierto
        const mobileMenuEl = document.getElementById('mobile-nav');
        if (mobileMenuEl) mobileMenuEl.classList.remove('open');
        const hambEl = document.getElementById('nav-hamburger');
        if (hambEl && hambEl.querySelector('i')) hambEl.querySelector('i').className = 'ph ph-list';

        document.querySelectorAll('.view, .nav-item').forEach(v => v.classList.remove('active'));
        const target = document.getElementById('dashboard-view');
        if(target) target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Forzar reveal de tarjetas del dashboard
        setTimeout(() => {
            document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    el.classList.add('visible');
                }
            });
        }, 60);
    }));

    document.querySelectorAll('.auth-btn-admin').forEach(btn => btn.addEventListener('click', (e) => { 
        e.preventDefault(); 
        document.querySelectorAll('.view, .nav-item').forEach(v => v.classList.remove('active'));
        
        const target = document.getElementById('admin-view');
        if(target) target.classList.add('active');

        // Force 'Rentabilidad' to be active by default if none
        document.querySelectorAll('.admin-top-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.admin-top-tab[data-admin-target="admin-finances"]').forEach(t => t.classList.add('active'));
        const financeSection = document.getElementById('admin-finances');
        if(financeSection) financeSection.classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }));

    document.querySelectorAll('.auth-btn-logout, #admin-logout-btn').forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        UserSession.clear();
        BSAlert('✅ Sesión cerrada correctamente.');
        document.querySelectorAll('.view, .nav-item').forEach(v => v.classList.remove('active'));
        const homeNav = document.querySelector('.nav-item[data-target="home-view"]');
        if(homeNav) homeNav.classList.add('active');
        const homeTarget = document.getElementById('home-view');
        if(homeTarget) homeTarget.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }));

    // Pestañas (Tabs) dentro de la vista de Auth
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            
            tab.classList.add('active');
            const target = tab.getAttribute('data-auth');
            document.getElementById(`${target}-form`).classList.add('active');
        });
    });

    // Lógica de Submit LOGIN
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const pass = document.getElementById('login-password').value;
            const submitBtn = loginForm.querySelector('button');
            
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Entrando...';
            submitBtn.style.pointerEvents = 'none';

            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.style.pointerEvents = 'auto';
                
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

                // Condición para Admin
                if (email === 'admin@benditosur.es' && pass === 'admin123') {
                    UserSession.set('admin');
                    const view = document.getElementById('admin-view');
                    if(view) view.classList.add('active');
                    BSAlert('🔓 Acceso concedido al panel del Administrador.');
                } else if (email === 'collab@benditosur.es' && pass === 'collab') {
                    UserSession.set('collab');
                    const view = document.getElementById('dashboard-view');
                    if(view) view.classList.add('active');
                    BSAlert('👑 Acceso vitalicio completado. Bienvenido, Colaborador Permanente.');
                } else {
                    UserSession.set('user');
                    const view = document.getElementById('dashboard-view');
                    if(view) view.classList.add('active');
                }
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
                loginForm.reset();
                setTimeout(() => {
                    document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.top < window.innerHeight && rect.bottom > 0) {
                            el.classList.add('visible');
                        }
                    });
                }, 60);
            }, 800);
        });
    }

    // Lógica de Submit REGISTER
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = registerForm.querySelector('button');
            
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Creando...';
            submitBtn.style.pointerEvents = 'none';

            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.style.pointerEvents = 'auto';
                
                UserSession.set('user');
                BSAlert('✅ ¡Cuenta creada con éxito! Ya puedes escuchar lo mejor del sur.');
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                
                const view = document.getElementById('dashboard-view');
                if(view) view.classList.add('active');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
                registerForm.reset();
                setTimeout(() => {
                    document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.top < window.innerHeight && rect.bottom > 0) {
                            el.classList.add('visible');
                        }
                    });
                }, 60);
            }, 1200);
        });
    }

    // Pestañas internas de la vista de Administrador (Ahora en la Navbar)
    document.querySelectorAll('.admin-top-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            // Asegurarnos de estar en la vista admin
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('admin-view').classList.add('active');

            // Quitar clase active a todas las pestañas de admin
            document.querySelectorAll('.admin-top-tab').forEach(t => t.classList.remove('active'));
            // Quitar active a las secciones
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            
            // Activar la cruzada en todos los menus (mobil y escritorio)
            const target = tab.getAttribute('data-admin-target');
            document.querySelectorAll(`.admin-top-tab[data-admin-target="${target}"]`).forEach(t => t.classList.add('active'));
            document.getElementById(target).classList.add('active');

            // Cerrar menú móvil si está abierto
            if(window.innerWidth < 768) {
                const mobileMenu = document.getElementById('mobile-nav');
                if(mobileMenu) mobileMenu.classList.remove('open');
                const hamb = document.getElementById('nav-hamburger');
                if(hamb && hamb.querySelector('i')) hamb.querySelector('i').className = 'ph ph-list';
            }
        });
    });

    // Botones de Compra y Suscripción (Botones grandes que hacen acciones de pago)
    document.querySelectorAll('.pricing-col .btn, .event-details .btn, .dashboard-actions .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const originalText = btn.innerHTML;
            
            // Si es un botón de cancelar, mostramos confirmación
            if (btn.textContent.includes('Cancelar')) {
                BSConfirm('¿Estás seguro de que deseas cancelar tu suscripción?').then(ok => {
                    if (ok) {
                        BSAlert('✅ Suscripción cancelada.');
                        btn.closest('.dashboard-card').style.opacity = '0.5';
                    }
                });
                return;
            }

            // Animación de carga para el resto
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Procesando...';
            btn.style.pointerEvents = 'none';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.pointerEvents = 'auto';
                
                if (btn.textContent.includes('Entradas')) {
                    BSAlert('🎟️ Ticket reservado temporalmente. Te redirigiremos al pago. (Simulación)');
                } else if (btn.textContent.includes('Pro') || btn.textContent.includes('Elite')) {
                    BSAlert('💳 Redirigiendo a la pasarela segura de pago para procesar la suscripción.');
                } else if (btn.textContent.includes('Cambiar')) {
                    document.querySelector('[data-target="pricing-view"]').click();
                }
            }, 1000);
        });
    });

    // Botones de descarga (Presskit y pistas WAV/FLAC)
    // Delegación para botones de descarga (incluye filas dinámicas)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.library-table .btn-icon, .dj-link');
        if (!btn) return;
        e.preventDefault();

        const role = UserSession.get();
        if (!role) {
            BSAlert('🔒 Debes tener una cuenta activa para descargar. Serás redirigido al registro.');
            document.querySelector('.auth-btn-register').click();
            return;
        }

        if (btn.classList.contains('locked') && role !== 'collab' && role !== 'admin') {
            BSAlert('🔒 Este archivo requiere una suscripción ELITE activa para ser descargado.');
            document.querySelector('[data-target="pricing-view"]').click();
            return;
        }

        // Descarga real desde la URL del track
        const row = btn.closest('tr.track-row');
        const src = row ? row.getAttribute('data-src') : null;
        const title = row ? row.getAttribute('data-title') : 'track';
        if (src) {
            const a = document.createElement('a');
            a.href = src;
            a.download = title || 'track';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });

    // 10. Lógica de Perfil de DJ
    const djView = document.getElementById('dj-profile-view');
    const profileName = document.getElementById('profile-name');
    const profileGenre = document.getElementById('profile-genre');
    const profileTracks = document.getElementById('profile-tracks');
    const backToRosterBtn = document.getElementById('back-to-roster');

    // Click en la tarjeta del DJ (header o avatar)
    document.querySelectorAll('.dj-card').forEach(card => {
        // Mejorar feedback visual
        card.style.cursor = 'pointer';
        
        card.addEventListener('click', (e) => {
            // Evitar redirigir si se hizo clic en un enlace de descarga/instagram adentro de la card
            if(e.target.closest('a')) return;

            const name = card.querySelector('.dj-name').textContent;
            const genre = card.querySelector('.dj-genre').textContent;

            // Actualizar datos del perfil
            if(profileName) profileName.textContent = name;
            if(profileGenre) profileGenre.textContent = genre;

            // Generar canciones exclusivas de ejemplo
            if(profileTracks) {
                profileTracks.innerHTML = `
                    <tr class="track-row" data-title="${name} - Exclusive Edit" data-artist="${name}">
                        <td><button class="track-play-btn"><i class="ph-fill ph-play-circle" style="font-size: 1.5rem; color: var(--muted); transition: color var(--t-fast);"></i></button></td>
                        <td class="font-medium">${name} - Exclusive ID</td>
                        <td><span class="genre-tag">Promo Exclusiva</span></td>
                        <td class="text-secondary">128</td>
                        <td><button class="btn-icon locked" title="Descargar WAV"><i class="ph-fill ph-lock-key"></i></button></td>
                    </tr>
                    <tr class="track-row" data-title="Recomendación Residente" data-artist="Artistas Varios">
                        <td><button class="track-play-btn"><i class="ph-fill ph-play-circle" style="font-size: 1.5rem; color: var(--muted); transition: color var(--t-fast);"></i></button></td>
                        <td class="font-medium">Secret Weapon (Club Mix)</td>
                        <td><span class="genre-tag">Recomendación</span></td>
                        <td class="text-secondary">130</td>
                        <td><button class="btn-icon" title="Descargar WAV"><i class="ph ph-download-simple"></i></button></td>
                    </tr>
                `;
                
                // Re-inicializamos los event listeners de estos botones nuevos
                profileTracks.querySelectorAll('.btn-icon').forEach(btn => {
                    btn.addEventListener('click', (ev) => {
                        ev.stopPropagation();

                        // Verificamos si hay sesión
                        const role = UserSession.get();
                        if (!role) {
                            BSAlert('🔒 Debes tener una cuenta activa para descargar. Serás redirigido al registro.');
                            document.querySelector('.auth-btn-register').click();
                            return;
                        }

                        if (btn.classList.contains('locked') && role !== 'collab' && role !== 'admin') {
                            BSAlert('🔒 Este archivo requiere una suscripción ELITE activa para ser descargado.');
                            document.querySelector('[data-target="pricing-view"]').click();
                        } else {
                            BSAlert('⬇️ Se ha iniciado la descarga del archivo... (Simulación)');
                        }
                    });
                });

                profileTracks.querySelectorAll('.track-play-btn').forEach(btn => {
                    btn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        // Mock the play action
                        const row = ev.target.closest('tr');
                        const title = row.getAttribute('data-title');
                        const artist = row.getAttribute('data-artist');
                        
                        const globPlayer = document.getElementById('global-player');
                        if (globPlayer.classList.contains('hidden')) {
                            globPlayer.classList.remove('hidden');
                            document.getElementById('app-content').style.paddingBottom = '100px';
                        }
                        
                        document.querySelector('.track-title').textContent = title;
                        document.querySelector('.track-artist').textContent = artist;
                        
                        const mainPlayBtn = globPlayer.querySelector('.play-btn i');
                        mainPlayBtn.classList.remove('ph-play-circle');
                        mainPlayBtn.classList.add('ph-pause-circle');
                    });
                });
            }

            // Ocultar todas las vistas y mostrar el perfil
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            // Mantener activo el nav link de la comunidad 
            document.querySelectorAll('.nav-item').forEach(v => {
                if(v.getAttribute('data-target') === 'roster-view') {
                    v.classList.add('active');
                } else {
                    v.classList.remove('active');
                }
            });

            if(djView) {
                djView.classList.add('active');
                djView.style.animation = 'none';
                djView.offsetHeight; // trigger reflow
                djView.style.animation = 'fadeIn 0.26s ease';
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    if(backToRosterBtn) {
        backToRosterBtn.addEventListener('click', () => {
            document.querySelector('[data-target="roster-view"]').click();
        });
    }

    // 11. Extra Admin Logic: Export Tool and Inviting
    const adminSelectAll = document.getElementById('admin-select-all');
    const adminCheckboxes = document.querySelectorAll('.admin-track-select');
    const exportCountLabel = document.getElementById('export-count');
    const btnExport = document.getElementById('admin-btn-export');
    
    function updateExportCount() {
        if(!exportCountLabel) return;
        const checked = document.querySelectorAll('.admin-track-select:checked').length;
        exportCountLabel.textContent = `${checked} Seleccionadas`;
    }

    if (adminSelectAll) {
        adminSelectAll.addEventListener('change', (e) => {
            adminCheckboxes.forEach(cb => cb.checked = e.target.checked);
            updateExportCount();
        });
    }

    adminCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateExportCount);
    });

    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('.admin-track-select:checked');
            if (checkedBoxes.length === 0) {
                BSAlert('⚠️ Selecciona al menos una pista para exportar.');
                return;
            }
            
            const originalText = btnExport.innerHTML;
            btnExport.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Empaquetando...';
            btnExport.disabled = true;

            setTimeout(() => {
                btnExport.innerHTML = originalText;
                btnExport.disabled = false;
                BSAlert(`✅ Se han empaquetado y comenzado a descargar ${checkedBoxes.length} archivos (.zip). (Simulación)`);
                adminCheckboxes.forEach(cb => cb.checked = false);
                if(adminSelectAll) adminSelectAll.checked = false;
                updateExportCount();
            }, 1500);
        });
    }

    const inviteForm = document.getElementById('invite-collab-form');
    if (inviteForm) {
        inviteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = inviteForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                BSAlert('📩 Invitación VIP enviada con éxito. El usuario recibirá un enlace para activar su acceso vitalicio gratuito.');
                inviteForm.reset();
            }, 1000);
        });
    }

    // 12. Collab Import/Export Tools (Native & Supabase integration)
    const collabExportBtn = document.getElementById('collab-export-btn');
    const collabImportBtn = document.getElementById('collab-import-btn');
    const collabFileInput = document.getElementById('collab-file-input');

    // Inicializamos cliente Supabase de forma global para estas funciones
    let supabaseClient = null;
    try {
        if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_URL !== '') {
            supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        }
    } catch(e) { console.warn('Supabase init failed:', e.message); }

    if (collabExportBtn) {
        collabExportBtn.addEventListener('click', async () => {
            if (!supabaseClient) {
                BSAlert('⚠️ Backend no conectado.\nPara que el botón se comunique de verdad con la nube, reemplaza los datos en config.js con los de tu proyecto Supabase.');
                return;
            }

            const originalText = collabExportBtn.innerHTML;
            collabExportBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Sincronizando...';
            collabExportBtn.disabled = true;

            try {
                // Leer lista de archivos del bucket
                const { data, error } = await supabaseClient.storage.from(CONFIG.STORAGE_BUCKET).list('');
                if (error) throw error;

                if (!data || data.length === 0) {
                    BSAlert('📦 No se encontraron pistas asociadas a este catálogo en la nube.');
                } else {
                    const fileNames = data.map(f => f.name).join('\n - ');
                    BSAlert(`📦 Conexión OK. Tienes ${data.length} archivos en la nube:\n\n - ${fileNames}\n\n(Para exportar un .zip se requerirá usar Supabase Edge Functions).`);
                }
            } catch (err) {
                console.error(err);
                BSAlert('❌ Error descargando metadatos: ' + err.message);
            } finally {
                collabExportBtn.innerHTML = originalText;
                collabExportBtn.disabled = false;
            }
        });
    }

    if (collabImportBtn && collabFileInput) {
        collabImportBtn.addEventListener('click', () => {
            // Disparamos el selector de archivos nativo de Windows (oculto en el HTML)
            collabFileInput.click();
        });

        collabFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!supabaseClient) {
                BSAlert(`⚠️ (Simulación Local) Archivo físico "${file.name}" seleccionado desde tu PC correctamente.\nPara subirlo dinámicamente a la nube, completa los datos en config.js.`);
                return;
            }

            const originalText = collabImportBtn.innerHTML;
            collabImportBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Subiendo Track...';
            collabImportBtn.disabled = true;

            const filePath = `DJ_Uploads/${Date.now()}_${file.name}`;
            
            try {
                // Subida real a Supabase Storage
                const { error } = await supabaseClient.storage
                    .from(CONFIG.STORAGE_BUCKET)
                    .upload(filePath, file);
                
                if (error) throw error;
                
                BSAlert(`✅ ¡Aporte Exclusivo Guardado!\nEl archivo "${file.name}" se subió físicamente a tu servidor nube (Supabase).`);
            } catch (err) {
                console.error(err);
                BSAlert('❌ Falló la subida real a la nube: ' + err.message);
            } finally {
                collabImportBtn.innerHTML = originalText;
                collabImportBtn.disabled = false;
                collabFileInput.value = ''; // limpiar para forzar el evento change en próximos clicks
            }
        });
    }

    // 13. CATÁLOGO — Subida de pistas y carga de biblioteca
    initCatalog(supabaseClient);
}

// ─── CATALOG SYSTEM (Storage JSON — sin base de datos) ───────────────────────

const CATALOG_FILE = 'catalog.json';

async function loadCatalog(sb) {
    try {
        const { data: urlData } = sb.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(CATALOG_FILE);
        const res = await fetch(urlData.publicUrl + '?t=' + Date.now());
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

async function saveCatalog(sb, tracks) {
    const blob = new Blob([JSON.stringify(tracks, null, 2)], { type: 'application/json' });
    await sb.storage.from(CONFIG.STORAGE_BUCKET).upload(CATALOG_FILE, blob, { upsert: true, contentType: 'application/json' });
}

function renderTrackRow(track) {
    const tbody = document.getElementById('library-tracks-body');
    const emptyRow = document.getElementById('library-empty-row');
    if (emptyRow) emptyRow.remove();
    const tr = document.createElement('tr');
    tr.className = 'track-row';
    tr.setAttribute('data-title', track.title);
    tr.setAttribute('data-artist', track.artist);
    tr.setAttribute('data-src', track.audio_url);
    tr.setAttribute('data-id', track.id);
    tr.innerHTML = `
        <td><button class="track-play-btn"><i class="ph-fill ph-play-circle"></i></button></td>
        <td class="font-medium">${track.title}</td>
        <td class="text-secondary">${track.artist}</td>
        <td><span class="genre-tag">${track.genre || '—'}</span></td>
        <td class="text-secondary">${track.bpm || '—'}</td>
        <td class="text-secondary">${track.key || '—'}</td>
        <td>${track.locked
            ? '<button class="btn-icon locked" title="Requiere Suscripcion"><i class="ph-fill ph-lock-key"></i></button>'
            : '<button class="btn-icon" title="Descargar WAV"><i class="ph ph-download-simple"></i></button>'
        }</td>`;
    if (tbody) tbody.appendChild(tr);
}

function renderAdminCatalogRow(track, sb, allTracks) {
    const tbody = document.getElementById('admin-catalog-tbody');
    const emptyRow = document.getElementById('admin-catalog-empty');
    if (emptyRow) emptyRow.remove();
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', track.id);
    tr.innerHTML = `
        <td class="font-medium">${track.title}</td>
        <td class="text-secondary">${track.artist}</td>
        <td><span class="genre-tag">${track.genre || '—'}</span></td>
        <td class="text-secondary">${track.bpm || '—'}</td>
        <td class="text-secondary">${track.key || '—'}</td>
        <td>${track.locked ? '<span class="format-badge">Elite</span>' : '<span style="color:rgba(255,255,255,0.3);font-size:0.8rem">Libre</span>'}</td>
        <td><button class="btn-icon delete-track-btn" title="Eliminar" style="color:var(--red)"><i class="ph ph-trash"></i></button></td>`;
    tr.querySelector('.delete-track-btn').addEventListener('click', () => {
        BSConfirm('¿Eliminar esta pista del catálogo?').then(async ok => {
            if (!ok) return;
            const updated = allTracks.filter(t => t.id !== track.id);
            allTracks.length = 0; updated.forEach(t => allTracks.push(t));
            await saveCatalog(sb, allTracks);
            tr.remove();
            document.querySelector(`.track-row[data-id="${track.id}"]`)?.remove();
            BSAlert('✅ Pista eliminada del catálogo.');
        });
    });
    if (tbody) tbody.appendChild(tr);
}

async function initCatalog(supabaseClient) {
    if (!supabaseClient) return;

    // Cargar catálogo desde catalog.json
    const tracks = await loadCatalog(supabaseClient);
    tracks.forEach(t => {
        renderTrackRow(t);
        renderAdminCatalogRow(t, supabaseClient, tracks);
    });

    // Formulario de subida
    const form = document.getElementById('upload-track-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('upload-track-btn');
        const fileInput = document.getElementById('track-file-input');
        const file = fileInput.files[0];
        const title = document.getElementById('track-title').value.trim();
        const artist = document.getElementById('track-artist').value.trim();

        if (!file) { BSAlert('⚠️ Selecciona un archivo de audio.'); return; }
        if (!title || !artist) { BSAlert('⚠️ Título y artista son obligatorios.'); return; }

        const genre = document.getElementById('track-genre').value.trim();
        const bpm = document.getElementById('track-bpm').value.trim();
        const key = document.getElementById('track-key').value.trim();
        const locked = document.getElementById('track-locked').value === 'true';

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Subiendo...';
        btn.disabled = true;

        try {
            // 1. Subir archivo de audio
            const safeName = file.name
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9._-]/g, '_')
                .replace(/_+/g, '_');
            const filePath = `tracks/${Date.now()}_${safeName}`;
            const { error: uploadError } = await supabaseClient.storage
                .from(CONFIG.STORAGE_BUCKET).upload(filePath, file, { upsert: false });
            if (uploadError) throw uploadError;

            // 2. URL pública del audio
            const { data: urlData } = supabaseClient.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(filePath);

            // 3. Añadir al catálogo JSON
            const newTrack = { id: Date.now().toString(), title, artist, genre, bpm: bpm || null, key: key || null, locked, audio_url: urlData.publicUrl };
            tracks.push(newTrack);
            await saveCatalog(supabaseClient, tracks);

            // 4. Renderizar
            renderTrackRow(newTrack);
            renderAdminCatalogRow(newTrack, supabaseClient, tracks);

            BSAlert(`✅ "${title}" subida al catálogo correctamente.`);
            form.reset();
        } catch (err) {
            BSAlert('❌ Error al subir: ' + err.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

