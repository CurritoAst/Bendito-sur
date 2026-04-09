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
    let supabaseClient = null;
    try {
        if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_URL !== '') {
            supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        }
    } catch(e) { console.warn('Supabase init failed:', e.message); }

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

    // 3. Audio Player Logic (Real HTML5 + Web Audio API Preview)
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
    let isPreviewMode = false;
    let previewAudioCtx = null;
    let previewTimeout = null;
    let previewStartTime = 0;
    let previewDuration = 30; // 30 seconds preview
    let previewAnimFrame = null;
    let previewNodes = [];

    function getTrackRows() {
        return Array.from(document.querySelectorAll('tr.track-row'));
    }

    function formatTime(s) {
        if (isNaN(s) || !isFinite(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    // === Web Audio API Preview System ===
    function stopPreview() {
        if (previewAudioCtx) {
            previewNodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch {} });
            previewNodes = [];
            try { previewAudioCtx.close(); } catch {}
            previewAudioCtx = null;
        }
        if (previewTimeout) { clearTimeout(previewTimeout); previewTimeout = null; }
        if (previewAnimFrame) { cancelAnimationFrame(previewAnimFrame); previewAnimFrame = null; }
        isPreviewMode = false;
    }

    function generatePreviewBeat(bpmHint) {
        stopPreview();
        isPreviewMode = true;
        previewAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = previewAudioCtx;
        const bpm = bpmHint || 126;
        const beatInterval = 60 / bpm;
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.35;
        masterGain.connect(ctx.destination);

        // Generate a 30-second electronic loop
        const now = ctx.currentTime;
        previewDuration = 30;
        previewStartTime = now;

        // Kick drum synthesis
        for (let i = 0; i < bpm / 2; i++) {
            const t = now + i * beatInterval;
            if (t > now + previewDuration) break;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
            gain.gain.setValueAtTime(0.8, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.25);
            previewNodes.push(osc);
        }

        // Hi-hat synthesis (8th notes)
        for (let i = 0; i < bpm; i++) {
            const t = now + i * (beatInterval / 2);
            if (t > now + previewDuration) break;
            const bufferSize = ctx.sampleRate * 0.04;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let j = 0; j < bufferSize; j++) data[j] = (Math.random() * 2 - 1) * 0.3;
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const hihatGain = ctx.createGain();
            const hihatFilter = ctx.createBiquadFilter();
            hihatFilter.type = 'highpass';
            hihatFilter.frequency.value = 7000;
            hihatGain.gain.setValueAtTime(i % 2 === 0 ? 0.15 : 0.08, t);
            hihatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            noise.connect(hihatFilter);
            hihatFilter.connect(hihatGain);
            hihatGain.connect(masterGain);
            noise.start(t);
            noise.stop(t + 0.06);
            previewNodes.push(noise);
        }

        // Bass synth (every 2 beats)
        const bassNotes = [55, 65.41, 49, 61.74]; // A1, C2, G1, B1
        for (let i = 0; i < bpm / 4; i++) {
            const t = now + i * beatInterval * 2;
            if (t > now + previewDuration) break;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = bassNotes[i % bassNotes.length];
            const bassFilter = ctx.createBiquadFilter();
            bassFilter.type = 'lowpass';
            bassFilter.frequency.value = 300;
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.setValueAtTime(0.3, t + beatInterval * 1.5);
            gain.gain.exponentialRampToValueAtTime(0.001, t + beatInterval * 2);
            osc.connect(bassFilter);
            bassFilter.connect(gain);
            gain.connect(masterGain);
            osc.start(t);
            osc.stop(t + beatInterval * 2);
            previewNodes.push(osc);
        }

        // Update progress animation
        setPlayIcon(true);
        if (totalTimeEl) totalTimeEl.textContent = formatTime(previewDuration);

        function updatePreviewProgress() {
            if (!previewAudioCtx || previewAudioCtx.state === 'closed') return;
            const elapsed = previewAudioCtx.currentTime - previewStartTime;
            const pct = Math.min((elapsed / previewDuration) * 100, 100);
            if (progressFill) progressFill.style.width = pct + '%';
            if (currentTimeEl) currentTimeEl.textContent = formatTime(elapsed);
            if (elapsed < previewDuration) {
                previewAnimFrame = requestAnimationFrame(updatePreviewProgress);
            } else {
                // Preview ended
                stopPreview();
                setPlayIcon(false);
                if (progressFill) progressFill.style.width = '0%';
                if (currentTimeEl) currentTimeEl.textContent = '0:00';
                // Auto-next
                const rows = getTrackRows();
                if (rows.length > 0 && currentTrackIndex < rows.length - 1) {
                    loadTrack(rows[currentTrackIndex + 1]);
                }
            }
        }
        previewAnimFrame = requestAnimationFrame(updatePreviewProgress);

        // Safety stop after duration
        previewTimeout = setTimeout(() => {
            stopPreview();
            setPlayIcon(false);
        }, previewDuration * 1000 + 500);
    }

    function loadTrack(row, autoplay = true) {
        // Stop any preview in progress
        stopPreview();
        if (audio && !audio.paused) audio.pause();

        const src = row.getAttribute('data-src');
        const title = row.getAttribute('data-title') || 'Sin título';
        const artist = row.getAttribute('data-artist') || '';
        const bpmAttr = row.getAttribute('data-bpm') || row.querySelector('td:nth-child(5)')?.textContent?.trim();
        const bpm = parseInt(bpmAttr) || 126;

        if (playerTitle) playerTitle.textContent = title;
        if (playerArtist) playerArtist.textContent = artist;

        // Marcar fila activa
        document.querySelectorAll('.track-row').forEach(r => r.classList.remove('playing'));
        row.classList.add('playing');

        // Actualizar índice
        currentTrackIndex = getTrackRows().indexOf(row);

        // Mostrar player
        globalPlayer.style.display = 'flex';
        if (appContent) appContent.style.paddingBottom = '100px';

        if (src && src !== 'undefined' && src !== 'null') {
            // Real audio file
            isPreviewMode = false;
            audio.src = src;
            if (downloadBtn) downloadBtn.setAttribute('data-src', src);
            if (autoplay) {
                audio.play().catch(() => {});
            }
        } else {
            // No real file → generate preview beat
            if (downloadBtn) downloadBtn.removeAttribute('data-src');
            if (autoplay) {
                generatePreviewBeat(bpm);
            }
        }
    }

    function setPlayIcon(playing) {
        if (!playPauseBtn) return;
        playPauseBtn.textContent = playing ? '⏸' : '▶';
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
            if (isPreviewMode) return; // preview has its own progress
            if (!audio.duration) return;
            const pct = (audio.currentTime / audio.duration) * 100;
            if (progressFill) progressFill.style.width = pct + '%';
            if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
        });
        audio.addEventListener('loadedmetadata', () => {
            if (isPreviewMode) return;
            if (totalTimeEl) totalTimeEl.textContent = formatTime(audio.duration);
        });
    }

    // Play / Pause
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (isPreviewMode) {
                // Toggle preview
                if (previewAudioCtx && previewAudioCtx.state === 'running') {
                    previewAudioCtx.suspend();
                    setPlayIcon(false);
                } else if (previewAudioCtx && previewAudioCtx.state === 'suspended') {
                    previewAudioCtx.resume();
                    setPlayIcon(true);
                    // Resume progress animation
                    function resumeProgress() {
                        if (!previewAudioCtx || previewAudioCtx.state !== 'running') return;
                        const elapsed = previewAudioCtx.currentTime - previewStartTime;
                        const pct = Math.min((elapsed / previewDuration) * 100, 100);
                        if (progressFill) progressFill.style.width = pct + '%';
                        if (currentTimeEl) currentTimeEl.textContent = formatTime(elapsed);
                        if (elapsed < previewDuration) previewAnimFrame = requestAnimationFrame(resumeProgress);
                    }
                    previewAnimFrame = requestAnimationFrame(resumeProgress);
                }
                return;
            }
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
            if (isPreviewMode) {
                // Cannot seek in preview mode
                return;
            }
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
            if (!src) {
                BSAlert('🎧 Esta es una preview generada. No hay archivo descargable.');
                return;
            }
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
        // Always load the track — preview mode handles missing src
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

    // Auth State Listener para Login de Google, Spotify y Sesiones
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                const email = session.user?.email || '';
                let isAllowed = false;

                if (email === 'admin@benditosur.es') {
                    UserSession.set('admin');
                    isAllowed = true;
                } else if (email === 'collab@benditosur.es') {
                    UserSession.set('collab');
                    isAllowed = true;
                } else {
                    // Verificar si el usuario existe en nuestra base de datos (users.json)
                    try {
                        const usersList = await loadUsers(supabaseClient);
                        const userFound = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
                        if (userFound) {
                            UserSession.set('user');
                            isAllowed = true;
                        }
                    } catch(e) { console.error('Error cargando usuarios permitidos:', e); }
                }

                if (!isAllowed) {
                    await supabaseClient.auth.signOut();
                    UserSession.clear();
                    BSAlert(`❌ Acceso denegado: el correo ${email} no está registrado en Bendito Sur. Contacta con nosotros para obtener acceso.`);
                    return;
                }
                
                const authView = document.getElementById('auth-view');
                if (authView && authView.classList.contains('active')) {
                    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                    const dbView = document.getElementById(UserSession.get() === 'admin' ? 'admin-view' : 'dashboard-view');
                    if (dbView) dbView.classList.add('active');
                }
            } else if (event === 'SIGNED_OUT') {
                UserSession.clear();
            }
        });
    }

    // Renderización de Google Identity Services nativo (By-pass Supabase Redirect)
    const renderGoogleBtn = () => {
        const container = document.getElementById('google-login-container');
        if (!container || !supabaseClient || !window.google) return;
        
        window.google.accounts.id.initialize({
            client_id: '163528816692-v5phke0fgue2oljn4m5q8v2mqk3m6ec7.apps.googleusercontent.com',
            callback: async (response) => {
                try {
                    const { error } = await supabaseClient.auth.signInWithIdToken({
                        provider: 'google',
                        token: response.credential,
                    });
                    if (error) throw error;
                    // El onAuthStateChange listener se encargará de la redirección
                } catch (err) {
                    console.error('Error Google ID Token:', err);
                    BSAlert('❌ Error iniciando sesión con Google (Token inválido).');
                }
            }
        });
        window.google.accounts.id.renderButton(
            container,
            { theme: 'filled_black', size: 'large', type: 'standard', shape: 'rectangular', text: 'continue_with' }
        );
    };

    if (document.getElementById('google-login-container')) {
        if (!window.google) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = renderGoogleBtn;
            document.head.appendChild(script);
        } else {
            renderGoogleBtn();
        }
    }

    // Lógica de Submit LOGIN (Spotify)
    const spotifyLoginBtn = document.getElementById('spotify-login-btn');
    if (spotifyLoginBtn && supabaseClient) {
        spotifyLoginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalText = spotifyLoginBtn.innerHTML;
            spotifyLoginBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Conectando...';
            spotifyLoginBtn.style.pointerEvents = 'none';

            try {
                const { error } = await supabaseClient.auth.signInWithOAuth({
                    provider: 'spotify',
                    options: {
                        redirectTo: window.location.origin
                    }
                });
                if (error) throw error;
            } catch (err) {
                console.error(err);
                BSAlert('❌ Error iniciando sesión con Spotify.');
                spotifyLoginBtn.innerHTML = originalText;
                spotifyLoginBtn.style.pointerEvents = 'auto';
            }
        });
    }

    // Lógica de Submit LOGIN
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const pass = document.getElementById('login-password').value;
            const submitBtn = loginForm.querySelector('button');
            
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Entrando...';
            submitBtn.style.pointerEvents = 'none';

            // Condición para Admin/Collab
            if (email === 'admin@benditosur.es' && pass === 'admin123') {
                UserSession.set('admin');
                await recordAccess(supabaseClient, email, 'login', 'admin');
                const view = document.getElementById('admin-view');
                if(view) {
                    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                    view.classList.add('active');
                }
                BSAlert('🔓 Acceso concedido al panel del Administrador.');
                submitBtn.innerHTML = originalText;
                submitBtn.style.pointerEvents = 'auto';
                window.scrollTo({ top: 0, behavior: 'smooth' });
                loginForm.reset();
                return;
            } else if (email === 'collab@benditosur.es' && pass === 'collab') {
                UserSession.set('collab');
                await recordAccess(supabaseClient, email, 'login', 'collab');
                const view = document.getElementById('dashboard-view');
                if(view) {
                    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                    view.classList.add('active');
                }
                BSAlert('👑 Acceso vitalicio completado.');
                submitBtn.innerHTML = originalText;
                submitBtn.style.pointerEvents = 'auto';
                window.scrollTo({ top: 0, behavior: 'smooth' });
                loginForm.reset();
                return;
            }

            // Flujo Supabase Standard
            try {
                if (!supabaseClient) throw new Error("Supabase no está conectado.");
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
                if (error) {
                    if (error.message.includes('Email not confirmed')) {
                        throw new Error('Debes confirmar tu correo electrónico haciendo clic en el enlace que te enviamos.');
                    } else if (error.message.includes('Invalid login credentials')) {
                        throw new Error('Dirección de correo o contraseña incorrectos.');
                    }
                    throw error;
                }
                loginForm.reset();
            } catch (err) {
                console.error('Error logueando:', err);
                BSAlert('❌ ' + err.message);
            }

            submitBtn.innerHTML = originalText;
            submitBtn.style.pointerEvents = 'auto';
        });
    }

    // Lógica de Submit REGISTER
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = registerForm.querySelector('button');
            
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Creando...';
            submitBtn.style.pointerEvents = 'none';

            const regName = document.getElementById('reg-name')?.value?.trim() || '';
            const regEmail = document.getElementById('reg-email')?.value?.trim() || '';
            const regPassword = document.getElementById('reg-password')?.value || '';
            const regPlan = document.getElementById('reg-plan')?.value || 'pro';
            const regProvince = document.getElementById('reg-province')?.value?.trim() || '';

            try {
                if (!supabaseClient) throw new Error("Supabase no está conectado.");
                
                // 1. Usar Supabase Auth Integrado
                const { data, error } = await supabaseClient.auth.signUp({ 
                    email: regEmail, 
                    password: regPassword 
                });
                
                if (error) throw error;

                // 2. Anotar en historial de accesos
                await recordAccess(supabaseClient, regEmail, 'registro-oficial', 'user');
                
                // 3. Continuar guardando en users.json administrativo
                await registerUser(supabaseClient, regName, regEmail, regPlan, regProvince);
                
                BSAlert('✅ Registro guardado. Revisa tu correo electrónico para verificar la cuenta antes de entrar.');
                registerForm.reset();

            } catch (err) {
                console.error('Error registrando:', err);
                let msg = err.message;
                if (msg.includes('already registered')) msg = 'Este correo ya está registrado.';
                BSAlert('❌ Error al crear la cuenta: ' + msg);
            }

            submitBtn.innerHTML = originalText;
            submitBtn.style.pointerEvents = 'auto';
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
    // Delegación para botones de descarga (fetch blob — evita nueva pestaña)
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.track-download-btn');
        if (!btn) return;
        e.preventDefault();
        const row = btn.closest('tr.track-row');
        if (!row) return;
        const src = row.getAttribute('data-src');
        const title = row.getAttribute('data-title') || 'track';
        if (!src) return;
        const orig = btn.innerHTML;
        btn.innerHTML = '⏳';
        btn.disabled = true;
        try {
            const res = await fetch(src);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = title;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            BSAlert('❌ Error al descargar el archivo.');
        } finally {
            btn.innerHTML = orig;
            btn.disabled = false;
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

                // track-play-btn clicks are handled by the global delegated handler
                // which now supports preview mode for tracks without audio files
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

    // Cliente Supabase ya inicializado arriba

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

    // 14. PANEL DE SEGURIDAD — Registro de accesos
    initSecurityPanel(supabaseClient);

    // 15. PANEL DE USUARIOS — Lista de registrados
    initUsersPanel(supabaseClient);
}

// ─── CATALOG SYSTEM (Storage JSON — sin base de datos) ───────────────────────

const CATALOG_FILE = 'catalog.json';

async function loadCatalog(sb) {
    try {
        // Construir URL pública directamente sin depender del cliente
        const url = sb
            ? sb.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(CATALOG_FILE).data.publicUrl
            : `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${CONFIG.STORAGE_BUCKET}/${CATALOG_FILE}`;
        const res = await fetch(url + '?t=' + Date.now());
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
    if (!tbody) return;
    // Evitar duplicados
    if (tbody.querySelector(`tr[data-id="${track.id}"]`)) return;
    const emptyRow = document.getElementById('library-empty-row');
    if (emptyRow) emptyRow.remove();
    const tr = document.createElement('tr');
    tr.className = 'track-row';
    tr.setAttribute('data-title', track.title);
    tr.setAttribute('data-artist', track.artist);
    tr.setAttribute('data-src', track.audio_url);
    tr.setAttribute('data-id', track.id);
    const downloadBtn = track.locked
        ? `<button class="btn-icon locked-btn" title="Solo Elite" style="background:rgba(243,201,72,0.15);border:1px solid #f3c948;border-radius:4px;padding:4px 8px;color:#f3c948;font-size:0.75rem;letter-spacing:1px;cursor:pointer">🔒 ELITE</button>`
        : `<button class="track-download-btn" title="Descargar WAV" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);border-radius:4px;padding:4px 10px;color:#fff;font-size:0.8rem;letter-spacing:1px;cursor:pointer">⬇ WAV</button>`;
    tr.innerHTML = `
        <td><button class="track-play-btn" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.5);font-size:1.5rem">▶</button></td>
        <td class="font-medium">${track.title}</td>
        <td class="text-secondary">${track.artist}</td>
        <td><span class="genre-tag">${track.genre || '—'}</span></td>
        <td class="text-secondary">${track.bpm || '—'}</td>
        <td class="text-secondary">${track.key || '—'}</td>
        <td>${downloadBtn}</td>`;
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
        <td><button class="delete-track-btn" title="Eliminar" style="background:none;border:1px solid rgba(255,80,80,0.3);border-radius:4px;padding:4px 10px;color:#ff5050;font-size:0.9rem;cursor:pointer">🗑️</button></td>`;
    tr.querySelector('.delete-track-btn').addEventListener('click', () => {
        BSConfirm('¿Eliminar esta pista del catálogo?').then(async ok => {
            if (!ok) return;
            // Borrar archivo de audio de Supabase Storage
            if (sb && track.audio_url) {
                try {
                    const bucketBase = `/storage/v1/object/public/${CONFIG.STORAGE_BUCKET}/`;
                    const idx = track.audio_url.indexOf(bucketBase);
                    if (idx !== -1) {
                        const storagePath = decodeURIComponent(track.audio_url.slice(idx + bucketBase.length).split('?')[0]);
                        await sb.storage.from(CONFIG.STORAGE_BUCKET).remove([storagePath]);
                    }
                } catch (e) { console.warn('No se pudo borrar el archivo de storage:', e); }
            }
            const updated = allTracks.filter(t => t.id !== track.id);
            allTracks.length = 0; updated.forEach(t => allTracks.push(t));
            await saveCatalog(sb, allTracks);
            tr.remove();
            document.querySelector(`.track-row[data-id="${track.id}"]`)?.remove();
            BSAlert('✅ Pista eliminada del catálogo y del servidor.');
        });
    });
    if (tbody) tbody.appendChild(tr);
}

// Extraer título y artista del nombre de archivo
// Formatos: "Artista - Título.wav" → {artist, title} | "Título.wav" → {artist:'', title}
function parseFileName(fileName) {
    const nameOnly = fileName.replace(/\.[^.]+$/, '');
    if (nameOnly.includes(' - ')) {
        const parts = nameOnly.split(' - ');
        return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
    }
    return { artist: '', title: nameOnly.trim() };
}

// ─── AUDIO ANALYSIS: BPM + KEY DETECTION ────────────────────────────────────

// Camelot wheel mapping: index 0=C … 11=B, major(B)/minor(A)
const CAMELOT = {
    major: ['8B','3B','10B','5B','12B','7B','2B','9B','4B','11B','6B','1B'],
    minor: ['5A','12A','7A','2A','9A','4A','11A','6A','1A','8A','3A','10A']
};

// Krumhansl-Schmuckler key profiles
const KEY_PROFILES = {
    major: [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],
    minor: [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]
};

function detectKey(audioBuffer) {
    try {
        const sampleRate = audioBuffer.sampleRate;
        const data = audioBuffer.getChannelData(0);
        // Use first 30s max
        const len = Math.min(data.length, sampleRate * 30);
        const fftSize = 4096;
        const chroma = new Float32Array(12);

        // Manual DFT for pitch class energy (simplified chromagram)
        for (let bin = 0; bin < fftSize / 2; bin++) {
            const freq = bin * sampleRate / fftSize;
            if (freq < 60 || freq > 2000) continue;
            // Which pitch class?
            const midi = 12 * Math.log2(freq / 440) + 69;
            const pitchClass = Math.round(midi) % 12;
            if (pitchClass < 0) continue;

            // Compute energy at this frequency using Goertzel-like approach over a few windows
            let energy = 0;
            const step = fftSize;
            const numWindows = Math.min(Math.floor(len / step), 20);
            for (let w = 0; w < numWindows; w++) {
                let re = 0, im = 0;
                const offset = w * step;
                const omega = 2 * Math.PI * bin / fftSize;
                for (let n = 0; n < fftSize && (offset + n) < len; n++) {
                    re += data[offset + n] * Math.cos(omega * n);
                    im += data[offset + n] * Math.sin(omega * n);
                }
                energy += re * re + im * im;
            }
            chroma[pitchClass] += energy / numWindows;
        }

        // Normalize chroma
        const maxC = Math.max(...chroma);
        if (maxC === 0) return null;
        for (let i = 0; i < 12; i++) chroma[i] /= maxC;

        // Correlate with key profiles
        let bestKey = null, bestScore = -Infinity;
        for (let shift = 0; shift < 12; shift++) {
            for (const mode of ['major', 'minor']) {
                let score = 0;
                for (let i = 0; i < 12; i++) {
                    score += chroma[(i + shift) % 12] * KEY_PROFILES[mode][i];
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestKey = CAMELOT[mode][shift];
                }
            }
        }
        return bestKey;
    } catch { return null; }
}

function detectBPM(audioBuffer) {
    try {
        const sampleRate = audioBuffer.sampleRate;
        const data = audioBuffer.getChannelData(0);
        const len = Math.min(data.length, sampleRate * 30);

        // Low-pass filter simulation: downsample to ~200Hz to focus on beats
        const dsRate = 200;
        const ratio = Math.floor(sampleRate / dsRate);
        const dsLen = Math.floor(len / ratio);
        const ds = new Float32Array(dsLen);
        for (let i = 0; i < dsLen; i++) {
            let sum = 0;
            for (let j = 0; j < ratio; j++) sum += Math.abs(data[i * ratio + j]);
            ds[i] = sum / ratio;
        }

        // Normalize
        const maxVal = Math.max(...ds);
        if (maxVal === 0) return null;
        for (let i = 0; i < dsLen; i++) ds[i] /= maxVal;

        // Peak detection
        const threshold = 0.5;
        const minDist = Math.floor(dsRate * 0.25); // min 0.25s between beats (240 BPM max)
        const peaks = [];
        for (let i = 1; i < dsLen - 1; i++) {
            if (ds[i] > threshold && ds[i] > ds[i - 1] && ds[i] >= ds[i + 1]) {
                if (peaks.length === 0 || (i - peaks[peaks.length - 1]) >= minDist) {
                    peaks.push(i);
                }
            }
        }

        if (peaks.length < 4) return null;

        // Calculate intervals and find most common BPM
        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push((peaks[i] - peaks[i - 1]) / dsRate);
        }

        // Histogram of BPM values (rounded to nearest integer)
        const bpmCounts = {};
        for (const interval of intervals) {
            let bpm = Math.round(60 / interval);
            // Normalize to 60-180 range
            while (bpm > 180) bpm = Math.round(bpm / 2);
            while (bpm < 60) bpm *= 2;
            bpmCounts[bpm] = (bpmCounts[bpm] || 0) + 1;
        }

        // Find BPM with most votes (include neighbors ±1)
        let bestBPM = null, bestCount = 0;
        for (const [bpm, count] of Object.entries(bpmCounts)) {
            const b = parseInt(bpm);
            const total = count + (bpmCounts[b - 1] || 0) + (bpmCounts[b + 1] || 0);
            if (total > bestCount) {
                bestCount = total;
                bestBPM = b;
            }
        }

        return bestBPM;
    } catch { return null; }
}

async function analyzeAudioFile(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const bpm = detectBPM(audioBuffer);
        const key = detectKey(audioBuffer);
        audioCtx.close();
        return { bpm, key };
    } catch (err) {
        console.warn('Audio analysis failed for', file.name, err);
        return { bpm: null, key: null };
    }
}

// Store per-file analysis results
let fileAnalysis = [];

function renderFileList(files, analysisResults) {
    const container = document.getElementById('upload-file-list');
    if (!container) return;
    if (!files || files.length === 0) { container.innerHTML = ''; fileAnalysis = []; return; }
    const rows = Array.from(files).map((f, i) => {
        const { artist, title } = parseFileName(f.name);
        const a = (analysisResults && analysisResults[i]) || {};
        const bpmVal = a.bpm || '';
        const keyVal = a.key || '';
        const analyzing = !analysisResults || !analysisResults[i];
        return `<div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.7rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:3px;margin-bottom:4px;flex-wrap:wrap" data-file-idx="${i}">
            <span style="color:#f3c948;font-size:0.8rem;min-width:22px">${i + 1}.</span>
            <span style="color:#fff;font-size:0.85rem;flex:1;min-width:120px">${title}</span>
            <span style="color:rgba(255,255,255,0.4);font-size:0.8rem;min-width:80px">${artist || 'Sin artista'}</span>
            <span style="color:rgba(255,255,255,0.2);font-size:0.7rem;min-width:45px">${(f.size / 1048576).toFixed(1)} MB</span>
            <input type="number" class="file-bpm" data-idx="${i}" value="${bpmVal}" placeholder="${analyzing ? '...' : 'BPM'}" style="width:55px;background:rgba(255,255,255,0.06);border:1px solid rgba(243,201,72,0.3);border-radius:3px;padding:3px 6px;color:#f3c948;font-size:0.78rem;text-align:center;outline:none" />
            <input type="text" class="file-key" data-idx="${i}" value="${keyVal}" placeholder="${analyzing ? '...' : 'Key'}" style="width:45px;background:rgba(255,255,255,0.06);border:1px solid rgba(243,201,72,0.3);border-radius:3px;padding:3px 6px;color:#f3c948;font-size:0.78rem;text-align:center;outline:none" />
        </div>`;
    }).join('');
    container.innerHTML = `<div style="font-size:0.75rem;color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:uppercase;margin-bottom:0.4rem">${files.length} archivo${files.length > 1 ? 's' : ''} — analizando audio...</div>${rows}`;
}

async function analyzeAndRenderFiles(files) {
    fileAnalysis = new Array(files.length).fill(null);
    renderFileList(files, fileAnalysis);

    const container = document.getElementById('upload-file-list');
    let analyzed = 0;

    for (let i = 0; i < files.length; i++) {
        const result = await analyzeAudioFile(files[i]);
        fileAnalysis[i] = result;
        analyzed++;

        // Update individual row inputs
        const bpmInput = container.querySelector(`.file-bpm[data-idx="${i}"]`);
        const keyInput = container.querySelector(`.file-key[data-idx="${i}"]`);
        if (bpmInput && result.bpm) { bpmInput.value = result.bpm; bpmInput.placeholder = 'BPM'; }
        if (keyInput && result.key) { keyInput.value = result.key; keyInput.placeholder = 'Key'; }
        if (bpmInput && !result.bpm) bpmInput.placeholder = 'BPM';
        if (keyInput && !result.key) keyInput.placeholder = 'Key';

        // Update header
        const header = container.querySelector('div');
        if (header && analyzed < files.length) {
            header.textContent = `${files.length} archivos — analizado ${analyzed} de ${files.length}...`;
        } else if (header) {
            header.textContent = `${files.length} archivo${files.length > 1 ? 's' : ''} listo${files.length > 1 ? 's' : ''}`;
        }
    }
}

async function initCatalog(supabaseClient) {
    if (!CONFIG.SUPABASE_URL) return;

    // Cargar catálogo desde catalog.json
    const tracks = await loadCatalog(supabaseClient);
    tracks.forEach(t => {
        renderTrackRow(t);
        renderAdminCatalogRow(t, supabaseClient, tracks);
    });

    // Preview + análisis automático de archivos seleccionados
    const fileInput = document.getElementById('track-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', () => analyzeAndRenderFiles(fileInput.files));
    }

    // Formulario de subida múltiple
    const form = document.getElementById('upload-track-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('upload-track-btn');
        const progressText = document.getElementById('upload-progress-text');
        const files = fileInput.files;
        const container = document.getElementById('upload-file-list');

        if (!files || files.length === 0) { BSAlert('⚠️ Selecciona al menos un archivo de audio.'); return; }

        const genre = document.getElementById('track-genre').value.trim();
        const locked = document.getElementById('track-locked').value === 'true';

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Subiendo...';
        btn.disabled = true;

        let uploaded = 0;
        let errors = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const { artist, title } = parseFileName(file.name);
            if (progressText) progressText.textContent = `Subiendo ${i + 1} de ${files.length}: ${title}`;

            // Leer BPM y Key del input individual de cada fila (auto-detectado o editado por el usuario)
            const bpmInput = container && container.querySelector(`.file-bpm[data-idx="${i}"]`);
            const keyInput = container && container.querySelector(`.file-key[data-idx="${i}"]`);
            const fileBpm = bpmInput ? bpmInput.value.trim() : '';
            const fileKey = keyInput ? keyInput.value.trim() : '';

            try {
                const safeName = file.name
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9._-]/g, '_')
                    .replace(/_+/g, '_');
                const filePath = `tracks/${Date.now()}_${safeName}`;
                const { error: uploadError } = await supabaseClient.storage
                    .from(CONFIG.STORAGE_BUCKET).upload(filePath, file, { upsert: false });
                if (uploadError) throw uploadError;

                const { data: urlData } = supabaseClient.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(filePath);

                const newTrack = {
                    id: Date.now().toString() + '_' + i,
                    title: title || file.name,
                    artist: artist || '',
                    genre,
                    bpm: fileBpm || null,
                    key: fileKey || null,
                    locked,
                    audio_url: urlData.publicUrl
                };
                tracks.push(newTrack);
                renderTrackRow(newTrack);
                renderAdminCatalogRow(newTrack, supabaseClient, tracks);
                uploaded++;
            } catch (err) {
                console.error(`Error subiendo ${file.name}:`, err);
                errors++;
            }
        }

        // Guardar catálogo una sola vez al final
        if (uploaded > 0) {
            await saveCatalog(supabaseClient, tracks);
        }

        if (progressText) progressText.textContent = '';
        btn.innerHTML = originalText;
        btn.disabled = false;

        if (errors === 0) {
            BSAlert(`✅ ${uploaded} pista${uploaded > 1 ? 's' : ''} subida${uploaded > 1 ? 's' : ''} correctamente.`);
        } else {
            BSAlert(`⚠️ ${uploaded} subida${uploaded > 1 ? 's' : ''}, ${errors} error${errors > 1 ? 'es' : ''}.`);
        }

        form.reset();
        renderFileList(null);
    });
}

// ─── SECURITY LOG SYSTEM (sessions.json en Storage) ─────────────────────────

const SESSIONS_FILE = 'sessions.json';

async function getPublicIP() {
    const apis = [
        { url: 'https://api.ipify.org?format=json', parse: d => d.ip },
        { url: 'https://ipapi.co/json/', parse: d => d.ip },
        { url: 'https://api.seeip.org/jsonip', parse: d => d.ip },
    ];
    for (const api of apis) {
        try {
            const res = await fetch(api.url, { signal: AbortSignal.timeout(3000) });
            if (!res.ok) continue;
            const data = await res.json();
            const ip = api.parse(data);
            if (ip) return ip;
        } catch { /* try next */ }
    }
    return 'Desconocida';
}

function getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Otro';
}

async function loadSessionLog(sb) {
    try {
        const url = sb
            ? sb.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(SESSIONS_FILE).data.publicUrl
            : `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${CONFIG.STORAGE_BUCKET}/${SESSIONS_FILE}`;
        const res = await fetch(url + '?t=' + Date.now());
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

async function saveSessionLog(sb, log) {
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    await sb.storage.from(CONFIG.STORAGE_BUCKET).upload(SESSIONS_FILE, blob, { upsert: true, contentType: 'application/json' });
}

async function recordAccess(sb, email, type, role) {
    if (!sb || !CONFIG.SUPABASE_URL) return;
    try {
        const ip = await getPublicIP();
        const browser = getBrowserInfo();
        const log = await loadSessionLog(sb);
        log.unshift({
            date: new Date().toISOString(),
            email,
            type,
            role,
            ip,
            browser
        });
        // Mantener últimos 200 registros
        if (log.length > 200) log.length = 200;
        await saveSessionLog(sb, log);
    } catch (e) { console.warn('Error registrando acceso:', e); }
}

function renderSecurityLog(log) {
    const tbody = document.getElementById('security-log-tbody');
    const countEl = document.getElementById('security-count');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!log || log.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:rgba(255,255,255,0.25);font-size:0.85rem;letter-spacing:2px">SIN REGISTROS</td></tr>';
        if (countEl) countEl.textContent = '';
        return;
    }

    if (countEl) countEl.textContent = `${log.length} registro${log.length > 1 ? 's' : ''}`;

    log.forEach(entry => {
        const tr = document.createElement('tr');
        const d = new Date(entry.date);
        const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const typeBadge = entry.type === 'login'
            ? '<span style="background:rgba(243,201,72,0.15);color:#f3c948;padding:2px 8px;border-radius:3px;font-size:0.75rem">LOGIN</span>'
            : '<span style="background:rgba(80,200,120,0.15);color:#50c878;padding:2px 8px;border-radius:3px;font-size:0.75rem">REGISTRO</span>';
        const roleBadge = entry.role === 'admin'
            ? '<span style="color:#ff5050;font-weight:600">Admin</span>'
            : entry.role === 'collab'
            ? '<span style="color:#f3c948;font-weight:600">Collab</span>'
            : '<span style="color:rgba(255,255,255,0.5)">User</span>';
        tr.innerHTML = `
            <td class="text-secondary" style="white-space:nowrap">${dateStr}</td>
            <td class="font-medium">${entry.email || '—'}</td>
            <td>${typeBadge}</td>
            <td>${roleBadge}</td>
            <td style="font-family:monospace;color:rgba(255,255,255,0.6);font-size:0.82rem">${entry.ip || '—'}</td>
            <td class="text-secondary">${entry.browser || '—'}</td>`;
        tbody.appendChild(tr);
    });
}

async function initSecurityPanel(sb) {
    if (!CONFIG.SUPABASE_URL) return;

    const log = await loadSessionLog(sb);
    renderSecurityLog(log);

    const refreshBtn = document.getElementById('security-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.textContent = '⏳ Cargando...';
            refreshBtn.disabled = true;
            const freshLog = await loadSessionLog(sb);
            renderSecurityLog(freshLog);
            refreshBtn.textContent = '🔄 Actualizar';
            refreshBtn.disabled = false;
        });
    }

    const clearBtn = document.getElementById('security-clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            BSConfirm('¿Borrar todo el historial de accesos?').then(async ok => {
                if (!ok) return;
                await saveSessionLog(sb, []);
                renderSecurityLog([]);
                BSAlert('✅ Historial de accesos borrado.');
            });
        });
    }
}

// ─── REGISTERED USERS SYSTEM (users.json en Storage) ────────────────────────

const USERS_FILE = 'users.json';

async function loadUsers(sb) {
    try {
        const url = sb
            ? sb.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(USERS_FILE).data.publicUrl
            : `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${CONFIG.STORAGE_BUCKET}/${USERS_FILE}`;
        const res = await fetch(url + '?t=' + Date.now());
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

async function saveUsers(sb, users) {
    const blob = new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
    await sb.storage.from(CONFIG.STORAGE_BUCKET).upload(USERS_FILE, blob, { upsert: true, contentType: 'application/json' });
}

async function registerUser(sb, name, email, plan, province) {
    if (!sb || !CONFIG.SUPABASE_URL) return;
    try {
        const ip = await getPublicIP();
        const browser = getBrowserInfo();
        const users = await loadUsers(sb);
        users.unshift({
            id: Date.now().toString(),
            date: new Date().toISOString(),
            name: name || '',
            email: email || '',
            plan: plan || 'pro',
            province: province || '',
            ip,
            browser
        });
        await saveUsers(sb, users);
    } catch (e) { console.warn('Error registrando usuario:', e); }
}

function renderUsersList(users, sb) {
    const tbody = document.getElementById('users-list-tbody');
    const countEl = document.getElementById('users-count');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:rgba(255,255,255,0.25);font-size:0.85rem;letter-spacing:2px">SIN USUARIOS REGISTRADOS</td></tr>';
        if (countEl) countEl.textContent = '';
        return;
    }

    if (countEl) countEl.textContent = `${users.length} usuario${users.length > 1 ? 's' : ''}`;

    users.forEach(user => {
        const tr = document.createElement('tr');
        const d = new Date(user.date);
        const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const planBadge = user.plan === 'elite'
            ? '<span style="background:rgba(243,201,72,0.15);color:#f3c948;padding:2px 8px;border-radius:3px;font-size:0.75rem;font-weight:600">ELITE</span>'
            : '<span style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);padding:2px 8px;border-radius:3px;font-size:0.75rem;font-weight:600">PRO</span>';
        tr.setAttribute('data-user-id', user.id);
        tr.innerHTML = `
            <td class="text-secondary" style="white-space:nowrap">${dateStr}</td>
            <td class="font-medium">${user.name || '—'}</td>
            <td class="font-medium" style="color:rgba(255,255,255,0.7)">${user.email || '—'}</td>
            <td>${planBadge}</td>
            <td class="text-secondary">${user.province || '—'}</td>
            <td style="font-family:monospace;color:rgba(255,255,255,0.6);font-size:0.82rem">${user.ip || '—'}</td>
            <td class="text-secondary">${user.browser || '—'}</td>
            <td><button class="delete-user-btn" title="Eliminar usuario" style="background:none;border:1px solid rgba(255,80,80,0.3);border-radius:4px;padding:3px 8px;color:#ff5050;font-size:0.8rem;cursor:pointer">🗑️</button></td>`;
        tr.querySelector('.delete-user-btn').addEventListener('click', () => {
            BSConfirm(`¿Eliminar al usuario ${user.email || user.name}?`).then(async ok => {
                if (!ok) return;
                const current = await loadUsers(sb);
                const updated = current.filter(u => u.id !== user.id);
                await saveUsers(sb, updated);
                tr.remove();
                if (countEl) countEl.textContent = `${updated.length} usuario${updated.length > 1 ? 's' : ''}`;
                BSAlert('✅ Usuario eliminado.');
            });
        });
        tbody.appendChild(tr);
    });
}

async function initUsersPanel(sb) {
    if (!CONFIG.SUPABASE_URL) return;

    const users = await loadUsers(sb);
    renderUsersList(users, sb);

    const refreshBtn = document.getElementById('users-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.textContent = '⏳ Cargando...';
            refreshBtn.disabled = true;
            const freshUsers = await loadUsers(sb);
            renderUsersList(freshUsers, sb);
            refreshBtn.textContent = '🔄 Actualizar';
            refreshBtn.disabled = false;
        });
    }
}

