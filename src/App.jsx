
import { useEffect } from 'react';
import './index.css';
import { initializeAppLogic } from './legacyApp.js';

export default function App() {
    useEffect(() => {
        // Pantalla de bloqueo — Ctrl+Shift+9 (PC) o 5 toques en el logo (Móvil)
        const lockOverlay = document.getElementById('site-lock-overlay');

        const unlock = () => {
            sessionStorage.setItem('bs_unlocked', 'true');
            if (lockOverlay) {
                lockOverlay.style.opacity = '0';
                setTimeout(() => { lockOverlay.style.display = 'none'; }, 500);
            }
        };

        // Si ya está desbloqueado esta sesión, o si hay sesión de usuario → saltar pantalla
        const alreadyUnlocked = sessionStorage.getItem('bs_unlocked') === 'true';
        const hasSession = !!localStorage.getItem('benditoSession');
        if (alreadyUnlocked || hasSession) {
            if (lockOverlay) lockOverlay.style.display = 'none';
        }

        // Desbloqueo PC: Ctrl+Shift+9
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === '9') {
                e.preventDefault();
                unlock();
            }
        });

        // Desbloqueo Móvil: 5 toques rápidos en el logo
        let tapCount = 0;
        let tapTimer = null;
        const lockLogo = document.getElementById('site-lock-logo');
        const lockHint = document.getElementById('site-lock-hint');

        const handleUnlockTap = () => {
            tapCount++;
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => { tapCount = 0; }, 2000);
            // Feedback visual: muestra cuántos toques quedan
            if (lockHint && tapCount > 0 && tapCount < 5) {
                lockHint.textContent = `${5 - tapCount} toque${5 - tapCount !== 1 ? 's' : ''} más`;
                lockHint.style.opacity = '1';
            }
            if (tapCount >= 5) {
                tapCount = 0;
                unlock();
            }
        };

        if (lockLogo) {
            lockLogo.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleUnlockTap();
            }, { passive: false });
            lockLogo.addEventListener('click', handleUnlockTap);
        }

        // Botón visible de acceso con contraseña
        const lockBtn = document.getElementById('site-lock-btn');
        const lockPassword = document.getElementById('site-lock-password');
        const LOCK_PASSWORD = 'benditosur2024';

        const tryUnlock = () => {
            if (lockPassword && lockPassword.value === LOCK_PASSWORD) {
                unlock();
            } else if (lockHint) {
                lockHint.style.opacity = '1';
                if (lockPassword) {
                    lockPassword.style.borderColor = 'rgba(231,76,60,0.6)';
                    setTimeout(() => {
                        lockPassword.style.borderColor = 'rgba(247,168,0,0.3)';
                        lockHint.style.opacity = '0';
                    }, 2000);
                }
            }
        };

        if (lockBtn) {
            lockBtn.addEventListener('click', tryUnlock);
            lockBtn.addEventListener('touchend', (e) => { e.preventDefault(); tryUnlock(); });
        }
        if (lockPassword) {
            lockPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
        }

        // Ejecutar lógica antigua sobre el DOM una vez montado
        try { initializeAppLogic(); } catch(e) { console.error('App init error:', e); }

        // Auto-refresco cada 5 minutos
        const refreshInterval = setInterval(() => {
            window.location.reload();
        }, 5 * 60 * 1000);

        return () => clearInterval(refreshInterval);
    }, []);

    return (
        <>
            {/* === PANTALLA DE BLOQUEO === */}
            <div id="site-lock-overlay" style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'radial-gradient(ellipse at center, #0d0d0d 0%, #000000 100%)',
                zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', transition: 'opacity 0.5s ease'
            }}>
                <div style={{
                    textAlign: 'center', maxWidth: '420px', padding: '3rem 2rem',
                    border: '1px solid rgba(247,168,0,0.2)', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)'
                }}>
                    <div id="site-lock-logo" style={{ fontSize: '3rem', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '6px', color: '#fff', marginBottom: '0.25rem', cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent', padding: '1rem 0.5rem' }}>
                        BENDITO<em style={{ fontStyle: 'normal', color: 'transparent', WebkitTextStroke: '1px #f3c948' }}>SUR.</em>
                    </div>
                    <div style={{
                        fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase',
                        color: '#f3c948', marginBottom: '1.5rem', fontWeight: 600
                    }}>🔒 Plataforma en Desarrollo</div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.6', fontStyle: 'italic' }}>
                        Dentro de poco sabréis muchas cosas...
                    </p>
                    <input
                        id="site-lock-password"
                        type="password"
                        placeholder="Contraseña"
                        style={{
                            width: '100%', padding: '0.75rem 1rem', marginBottom: '0.75rem',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(247,168,0,0.3)',
                            borderRadius: '2px', color: '#fff', fontSize: '1rem',
                            letterSpacing: '2px', outline: 'none', boxSizing: 'border-box',
                            fontFamily: 'inherit'
                        }}
                    />
                    <button id="site-lock-btn" style={{
                        width: '100%', padding: '0.85rem 1.5rem',
                        background: 'transparent', border: '1px solid rgba(247,168,0,0.4)',
                        color: '#f3c948', fontFamily: 'Bebas Neue, sans-serif',
                        fontSize: '1.1rem', letterSpacing: '4px', cursor: 'pointer',
                        borderRadius: '2px', transition: 'all 0.2s'
                    }}>ACCEDER →</button>
                    <p id="site-lock-hint" style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '0.75rem', letterSpacing: '1px', opacity: 0, transition: 'opacity 0.2s', minHeight: '1.2em' }}>Contraseña incorrecta</p>
                    <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.65rem', marginTop: '0.75rem', letterSpacing: '1px' }}>
                        Solo personal autorizado · benditosur.es
                    </p>
                </div>
            </div>

            {/* === MODAL CUSTOM === */}
            <div id="bs-modal-overlay" style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'rgba(0,0,0,0.75)', zIndex: 999999,
                display: 'none', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)', padding: '1rem'
            }}>
                <div id="bs-modal-box" style={{
                    background: '#0d0d0d', border: '1px solid rgba(243,201,72,0.25)',
                    borderRadius: '8px', padding: '2.5rem 2rem', maxWidth: '420px', width: '100%',
                    textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
                }}>
                    <div id="bs-modal-icon" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}></div>
                    <p id="bs-modal-message" style={{
                        color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem',
                        lineHeight: '1.6', marginBottom: '2rem', whiteSpace: 'pre-line'
                    }}></p>
                    <div id="bs-modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <button id="bs-modal-cancel" style={{
                            display: 'none', padding: '0.7rem 1.5rem',
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                            color: 'rgba(255,255,255,0.5)', borderRadius: '3px', cursor: 'pointer',
                            fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '2px'
                        }}>CANCELAR</button>
                        <button id="bs-modal-ok" style={{
                            padding: '0.7rem 2rem',
                            background: '#f3c948', border: 'none', color: '#000',
                            borderRadius: '3px', cursor: 'pointer',
                            fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '2px',
                            fontWeight: '700'
                        }}>ACEPTAR</button>
                    </div>
                </div>
            </div>

    <nav className="navbar">
        <div className="nav-container">
            <div className="logo">
                <span>BENDITO SUR</span>
            </div>
            <div className="nav-links" id="main-nav-links">
                <a href="#" className="nav-item active" data-target="home-view">Inicio</a>
                <a href="#" className="nav-item" data-target="pricing-view">Planes</a>
                <a href="#" className="nav-item" data-target="library-view">Biblioteca</a>
                <a href="#" className="nav-item" data-target="roster-view">Comunidad</a>
                <a href="#" className="nav-item" data-target="events-view">Eventos</a>
                <a href="#" className="nav-item" data-target="dashboard-view">Mi Cuenta</a>
            </div>
            
            
            <div className="nav-links hidden" id="admin-nav-links">
                <a href="#" className="nav-item admin-top-tab active" data-admin-target="admin-finances">Rentabilidad</a>
                <a href="#" className="nav-item admin-top-tab" data-admin-target="admin-security">Seguridad</a>
                <a href="#" className="nav-item admin-top-tab" data-admin-target="admin-users">Usuarios y Altas</a>
                <a href="#" className="nav-item admin-top-tab" data-admin-target="admin-catalog"><i className="ph ph-music-notes-plus"></i> Catálogo</a>
                <a href="#" className="nav-item admin-top-tab" data-admin-target="admin-export"><i className="ph ph-package"></i> Exportación</a>
            </div>
            <div className="nav-actions">
                
                <button className="btn btn-outline btn-sm auth-btn-login">Iniciar Sesión</button>
                <button className="btn btn-primary btn-sm auth-btn-register">Únete</button>
                
                <button className="btn btn-primary btn-sm auth-btn-dash hidden"><i className="ph ph-headphones"></i> Mi Panel</button>
                
                <button className="btn btn-outline btn-sm auth-btn-admin hidden" style={{ "borderColor": "var(--red)", "color": "var(--red)" }}><i className="ph-fill ph-crown"></i> Panel Root</button>
                
                <button className="btn btn-outline btn-sm auth-btn-logout hidden" style={{ "borderWidth": "0" }}><i className="ph ph-sign-out" style={{ "fontSize": "1.2rem" }}></i></button>
            </div>
            <button className="nav-hamburger" id="nav-hamburger" aria-label="Menu">
                <i className="ph ph-list"></i>
            </button>
        </div>
    </nav>

    
    <div className="mobile-nav" id="mobile-nav">
        <div id="mobile-main-nav-links" style={{ "display": "contents" }}>
            <a href="#" className="nav-item active" data-target="home-view">Inicio</a>
            <a href="#" className="nav-item" data-target="pricing-view">Planes</a>
            <a href="#" className="nav-item" data-target="library-view">Biblioteca</a>
            <a href="#" className="nav-item" data-target="roster-view">Comunidad</a>
            <a href="#" className="nav-item" data-target="events-view">Eventos</a>
            <a href="#" className="nav-item" data-target="dashboard-view">Mi Cuenta</a>
        </div>
        <div id="mobile-admin-nav-links" className="hidden" style={{ "display": "contents" }}>
            <a href="#" className="nav-item admin-top-tab active" data-admin-target="admin-finances">Rentabilidad</a>
            <a href="#" className="nav-item admin-top-tab" data-admin-target="admin-security">Seguridad</a>
            <a href="#" className="nav-item admin-top-tab" data-admin-target="admin-users">Usuarios y Altas</a>
            <a href="#" className="nav-item admin-top-tab" data-admin-target="admin-catalog">Catálogo</a>
            <a href="#" className="nav-item admin-top-tab" data-admin-target="admin-export">Exportación</a>
        </div>
        <div className="mobile-nav-actions">
            
            <button className="btn btn-outline auth-btn-login">Iniciar Sesión</button>
            <button className="btn btn-primary auth-btn-register">Únete</button>
            
            <button className="btn btn-primary auth-btn-dash hidden"><i className="ph ph-headphones"></i> Mi Panel</button>
            
            <button className="btn btn-outline auth-btn-admin hidden" style={{ "borderColor": "var(--red)", "color": "var(--red)" }}><i className="ph-fill ph-crown"></i> Panel Root</button>
            
            <button className="btn btn-outline auth-btn-logout hidden"><i className="ph ph-sign-out"></i> Cerrar Sesión</button>
        </div>
    </div>

    
    <main id="app-content">

        
        <section id="auth-view" className="view">
            <div className="auth-wrap-split">
                
                
                <div className="auth-brand">
                    <div className="auth-brand-content">
                        <span className="hero-kicker" style={{ "marginBottom": "0.5rem" }}><i className="ph-fill ph-crown"></i> ACCESO DJ RESIDENTE</span>
                        <h2>BENDITO<em>SUR.</em></h2>
                        <p>Plataforma exclusiva para el talento de Andalucía. Sonido de club real, máxima resolución.</p>
                    </div>
                </div>

                
                <div className="auth-form-side">
                    <div className="auth-container-premium">
                        <div className="auth-header-mobile">
                            <h2 style={{ "fontSize": "2.2rem", "marginBottom": "2rem", "display": "none" }} className="mobile-only-title">BENDITO<em style={{ "fontStyle": "normal", "color": "transparent", "WebkitTextStroke": "1px var(--gold)" }}>SUR.</em></h2>
                        </div>

                        <div className="auth-tabs">
                            <button className="auth-tab active" data-auth="login">Iniciar Sesión</button>
                            <button className="auth-tab" data-auth="register">Crear Cuenta</button>
                        </div>

                        
                        <form id="login-form" className="auth-form active">
                            
                            <div className="social-logins">
                                <button type="button" className="btn btn-social"><i className="ph-fill ph-spotify-logo" style={{ "color": "#1ED760" }}></i> Continuar con Spotify</button>
                                <button type="button" className="btn btn-social"><i className="ph-fill ph-google-logo"></i> Continuar con Google</button>
                            </div>
                            
                            <div className="auth-divider"><span>O con tu email</span></div>

                            <div className="form-group-premium">
                                <input type="email" id="login-email" placeholder=" " required />
                                <label>Correo Electrónico</label>
                            </div>
                            <div className="form-group-premium">
                                <input type="password" id="login-password" placeholder=" " required />
                                <label>Contraseña</label>
                            </div>
                            
                            <div style={{ "textAlign": "right", "marginTop": "-0.5rem", "marginBottom": "2rem" }}>
                                <a href="#" style={{ "fontSize": "0.75rem", "color": "var(--gold)", "fontWeight": "600", "textTransform": "uppercase", "letterSpacing": "1px" }}>¿Olvidaste tu contraseña?</a>
                            </div>

                            <button type="submit" className="btn btn-primary w-100 btn-lg">Entrar al Club</button>
                        </form>

                        
                        <form id="register-form" className="auth-form">

                            <div className="social-logins pb-3">
                                <button type="button" className="btn btn-social"><i className="ph-fill ph-spotify-logo" style={{ "color": "#1ED760" }}></i> Registrarse con Spotify</button>
                            </div>
                            <div className="auth-divider"><span>Crear cuenta clásica</span></div>

                            <div className="form-group-premium">
                                <input type="text" id="reg-name" placeholder=" " required />
                                <label>Nombre de DJ / Nombre Artístico</label>
                            </div>
                            <div className="form-group-premium">
                                <input type="text" id="reg-province" placeholder=" " />
                                <label>Provincia (Ej. Málaga) - Opcional</label>
                            </div>
                            <div className="form-group-premium">
                                <input type="email" id="reg-email" placeholder=" " required />
                                <label>Correo Electrónico</label>
                            </div>
                            <div className="form-group-premium">
                                <input type="password" id="reg-password" placeholder=" " required />
                                <label>Crear Contraseña Fuerte</label>
                            </div>

                            <div className="auth-divider"><span>Elige tu Plan</span></div>

                            <div className="form-group-premium">
                                <select id="reg-plan" required style={{ "background": "transparent", "border": "1px solid rgba(255, 255, 255, 0.1)", "color": "#fff", "width": "100%", "padding": "1.2rem 1rem", "borderRadius": "4px", "outline": "none", "marginBottom": "1rem", "appearance": "none", "WebkitAppearance": "none" }}>
                                    <option value="" disabled selected style={{ "color": "#000" }}>Nivel de Acceso (Requerido)</option>
                                    <option value="pro" style={{ "color": "#000" }}>Suscripción PRO</option>
                                    <option value="elite" style={{ "color": "#000" }}>Suscripción ELITE</option>
                                </select>
                            </div>
                            
                            <div className="form-group-premium" style={{ "marginBottom": "2.5rem" }}>
                                <select id="reg-billing" required style={{ "background": "transparent", "border": "1px solid rgba(255, 255, 255, 0.1)", "color": "#fff", "width": "100%", "padding": "1.2rem 1rem", "borderRadius": "4px", "outline": "none", "appearance": "none", "WebkitAppearance": "none" }}>
                                    <option value="" disabled selected style={{ "color": "#000" }}>Ciclo de Facturación (Requerido)</option>
                                    <option value="mensual" style={{ "color": "#000" }}>Mensual</option>
                                    <option value="trimestral" style={{ "color": "#000" }}>Trimestral (Ahorra un 10%)</option>
                                    <option value="semestral" style={{ "color": "#000" }}>Semestral (Ahorra un 15%)</option>
                                    <option value="anual" style={{ "color": "#000" }}>Anual (Ahorra un 20%)</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary w-100 btn-lg">Solicitar Acceso y Pagar</button>
                        </form>
                    </div>
                </div>

            </div>
        </section>

        
        <section id="home-view" className="view active">

            
            <div className="sur-strip">
                <div className="sur-strip-inner">
                    <span className="hl">SEVILLA</span>
                    <span>MALAGA</span>
                    <span className="hl">GRANADA</span>
                    <span>CADIZ</span>
                    <span className="hl">CORDOBA</span>
                    <span>ALMERIA</span>
                    <span className="hl">HUELVA</span>
                    <span>JAEN</span>
                    <span className="hl">BENDITO SUR</span>
                    <span>MUSICA PREMIUM</span>
                    <span className="hl">CALIDAD REAL</span>
                    
                    <span className="hl">SEVILLA</span>
                    <span>MALAGA</span>
                    <span className="hl">GRANADA</span>
                    <span>CADIZ</span>
                    <span className="hl">CORDOBA</span>
                    <span>ALMERIA</span>
                    <span className="hl">HUELVA</span>
                    <span>JAEN</span>
                    <span className="hl">BENDITO SUR</span>
                    <span>MUSICA PREMIUM</span>
                    <span className="hl">CALIDAD REAL</span>
                </div>
            </div>

            
            <div className="hero-section">
                <div className="hero-left">
                    <span className="hero-kicker">Hecho en Andalucia</span>
                    <h1 className="hero-title">BENDITO<em>SUR.</em></h1>
                    <p className="hero-description">
                        La plataforma premium para DJs del sur. Musica exclusiva curada a mano,
                        calidad sin compromisos — WAV y FLAC — y una comunidad de verdad.
                        Desde Andalucia para el mundo.
                    </p>
                    <div className="hero-actions">
                        <button className="btn btn-primary btn-lg"
                            onClick={() => document.querySelector('[data-target="pricing-view"]').click()}>
                            <i className="ph ph-fire"></i> Ver Planes
                        </button>
                        <button className="btn btn-outline btn-lg"
                            onClick={() => document.querySelector('[data-target="library-view"]').click()}>
                            <i className="ph ph-music-notes"></i> Explorar Catalogo
                        </button>
                    </div>
                </div>

                <div className="hero-right">
                    
                    <div className="hero-ring-wrap">
                        <div className="ring-outer"><div className="ring-dot"></div></div>
                        <div className="ring-mid"></div>
                        <div className="ring-inner">DJ</div>
                    </div>

                    
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <div className="hero-stat-num">500<span>+</span></div>
                            <div className="hero-stat-label">Tracks</div>
                        </div>
                        <div className="hero-stat">
                            <div className="hero-stat-num">120<span>+</span></div>
                            <div className="hero-stat-label">DJs</div>
                        </div>
                        <div className="hero-stat">
                            <div className="hero-stat-num">8<span></span></div>
                            <div className="hero-stat-label">Provincias</div>
                        </div>
                        <div className="hero-stat">
                            <div className="hero-stat-num">WAV<span></span></div>
                            <div className="hero-stat-label">Lossless</div>
                        </div>
                    </div>
                </div>
            </div>

            
            <div className="benefits-section">
                <div className="benefits-intro">
                    <h2>Por Que Bendito Sur</h2>
                    <p>Tres razones por las que los mejores DJs del sur eligen nuestra plataforma.</p>
                </div>

                <div className="benefit-row">
                    <div className="benefit-num">01</div>
                    <div className="benefit-title-text">Calidad Lossless</div>
                    <p className="benefit-body">
                        Archivos WAV y FLAC sin compresion. La maxima fidelidad para los sistemas
                        de sonido mas exigentes de cualquier club. Nada de MP3 de baja calidad —
                        solo lo que suena de verdad en la pista.
                    </p>
                </div>

                <div className="benefit-row">
                    <div className="benefit-num">02</div>
                    <div className="benefit-title-text">Curaduria del Sur</div>
                    <p className="benefit-body">
                        Catalogo cerrado y seleccionado a mano por DJs andaluces con anos de
                        experiencia. Desde flamenco house hasta techno de alta intensidad —
                        cada track pasa por un filtro humano antes de entrar.
                    </p>
                </div>

                <div className="benefit-row">
                    <div className="benefit-num">03</div>
                    <div className="benefit-title-text">Descarga al Instante</div>
                    <p className="benefit-body">
                        Servidores de alta velocidad para que tengas la musica en tu USB en segundos.
                        Sin limites de descarga diarios, sin esperas, sin colas. Tu set, listo cuando
                        tu lo necesitas.
                    </p>
                </div>
            </div>

        </section>

        
        <section id="pricing-view" className="view">
            <div className="pricing-wrap">
                <div className="pricing-intro">
                    <h2>Planes de Acceso</h2>
                    <p>Música exclusiva en calidad sin compresión. Opción de facturación mensual, trimestral, semestral o anual de forma flexible.</p>
                </div>

                <div className="pricing-cols">
                    
                    <div className="pricing-col">
                        <div className="pricing-col-tag">Plan Basico</div>
                        <div className="pricing-plan-name">PRO</div>
                        <div className="pricing-price-line">Desde 19 € / MES</div>
                        <div style={{ "fontSize": "0.85rem", "color": "#a0a0a0", "marginBottom": "1.5rem", "textAlign": "left", "padding": "0.8rem", "background": "rgba(255,255,255,0.05)", "borderRadius": "4px", "border": "1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "0.3rem" }}><span>Mensual</span><span style={{ "color": "#fff" }}>19.00 € / mes</span></div>
                            <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "0.3rem" }}><span>Trimestral <span style={{ "fontSize": "0.7rem", "color": "var(--gold)" }}>-10%</span></span><span style={{ "color": "#fff" }}>17.10 € / mes</span></div>
                            <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "0.3rem" }}><span>Semestral <span style={{ "fontSize": "0.7rem", "color": "var(--gold)" }}>-15%</span></span><span style={{ "color": "#fff" }}>16.15 € / mes</span></div>
                            <div style={{ "display": "flex", "justifyContent": "space-between" }}><span>Anual <span style={{ "fontSize": "0.7rem", "color": "var(--gold)" }}>-20%</span></span><span style={{ "color": "#fff" }}>15.20 € / mes</span></div>
                        </div>
                        <ul className="pricing-features">
                            <li><i className="ph-fill ph-check-circle"></i> Acceso completo a la biblioteca</li>
                            <li><i className="ph-fill ph-check-circle"></i> Descargas ilimitadas</li>
                            <li><i className="ph-fill ph-check-circle"></i> Calidad HD — 320kbps MP3</li>
                            <li className="disabled"><i className="ph ph-x-circle"></i> Archivos Lossless (WAV / FLAC)</li>
                            <li className="disabled"><i className="ph ph-x-circle"></i> Acceso anticipado a Promos</li>
                            <li className="disabled"><i className="ph ph-x-circle"></i> Canal privado en comunidad</li>
                        </ul>
                        <button className="btn btn-outline btn-lg w-100">Seleccionar Pro</button>
                    </div>

                    
                    <div className="pricing-col featured">
                        <div className="pricing-col-tag">Recomendado</div>
                        <div className="pricing-plan-name">ELITE</div>
                        <div className="pricing-price-line">Desde 29 € / MES</div>
                        <div style={{ "fontSize": "0.85rem", "color": "#a0a0a0", "marginBottom": "1.5rem", "textAlign": "left", "padding": "0.8rem", "background": "rgba(255,255,255,0.05)", "borderRadius": "4px", "border": "1px solid rgba(247, 168, 0, 0.2)" }}>
                            <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "0.3rem" }}><span>Mensual</span><span style={{ "color": "#fff" }}>29.00 € / mes</span></div>
                            <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "0.3rem" }}><span>Trimestral <span style={{ "fontSize": "0.7rem", "color": "var(--gold)" }}>-10%</span></span><span style={{ "color": "#fff" }}>26.10 € / mes</span></div>
                            <div style={{ "display": "flex", "justifyContent": "space-between", "marginBottom": "0.3rem" }}><span>Semestral <span style={{ "fontSize": "0.7rem", "color": "var(--gold)" }}>-15%</span></span><span style={{ "color": "#fff" }}>24.65 € / mes</span></div>
                            <div style={{ "display": "flex", "justifyContent": "space-between" }}><span>Anual <span style={{ "fontSize": "0.7rem", "color": "var(--gold)" }}>-20%</span></span><span style={{ "color": "#fff" }}>23.20 € / mes</span></div>
                        </div>
                        <ul className="pricing-features">
                            <li><i className="ph-fill ph-check-circle"></i> Acceso completo a la biblioteca</li>
                            <li><i className="ph-fill ph-check-circle"></i> Descargas ilimitadas</li>
                            <li><i className="ph-fill ph-check-circle"></i> Calidad HD — 320kbps MP3</li>
                            <li><i className="ph-fill ph-check-circle"></i> Archivos Lossless (WAV / FLAC)</li>
                            <li><i className="ph-fill ph-check-circle"></i> Acceso anticipado a Promos</li>
                            <li><i className="ph-fill ph-check-circle"></i> Canal privado en comunidad</li>
                        </ul>
                        <button className="btn btn-primary btn-lg w-100">Seleccionar Elite</button>
                    </div>
                </div>

                <div className="payment-methods">
                    <p>Pago seguro a traves de Stripe. Sin permanencia — cancela en cualquier momento.</p>
                    <div className="payment-icons">
                        <i className="ph ph-credit-card"></i>
                        <i className="ph ph-paypal-logo"></i>
                        <i className="ph ph-lock-key"></i>
                    </div>
                </div>
            </div>
        </section>

        
        <section id="library-view" className="view">
            <div className="library-wrap">
                <div className="library-head">
                    <h2>Catalogo Exclusivo</h2>
                    <div className="library-filters">
                        <div className="filter-group">
                            <i className="ph ph-magnifying-glass"></i>
                            <input type="text" placeholder="Buscar artista o titulo..." className="filter-input" />
                        </div>
                        <select className="filter-select">
                            <option value="">Genero</option>
                            <option value="techno">Techno</option>
                            <option value="tech-house">Tech House</option>
                            <option value="minimal">Minimal</option>
                            <option value="flamenco-house">Flamenco House</option>
                            <option value="latin-house">Latin House</option>
                            <option value="breakbeat">Breakbeat</option>
                        </select>
                        <select className="filter-select">
                            <option value="">BPM</option>
                            <option value="120-125">120 – 125</option>
                            <option value="126-130">126 – 130</option>
                            <option value="130+">130+</option>
                        </select>
                        <select className="filter-select">
                            <option value="">Key</option>
                            <option value="8a">8A</option>
                            <option value="9a">9A</option>
                            <option value="10a">10A</option>
                            <option value="11b">11B</option>
                        </select>
                    </div>
                </div>

                <div className="library-table-container">
                    <table className="library-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Titulo</th>
                                <th>Artista</th>
                                <th>Genero</th>
                                <th>BPM</th>
                                <th>Key</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="library-tracks-body">
                            <tr id="library-empty-row">
                                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.9rem', letterSpacing: '2px' }}>
                                    CATÁLOGO EN PREPARACIÓN
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        
        <section id="roster-view" className="view">
            <div className="roster-wrap">
                <div className="roster-head">
                    <h2>Comunidad Sur</h2>
                    <p>Conecta con residentes de Bendito Sur. Descubre talento andaluz, comparte tu Presskit y encuentra fechas.</p>
                </div>

                <div className="roster-grid">

                    
                    <div className="dj-card">
                        <div className="dj-header">
                            <div className="dj-avatar"><i className="ph-fill ph-user-sound"></i></div>
                            <div className="dj-info">
                                <h3 className="dj-name">Alex Under</h3>
                                <p className="dj-genre">Techno / Minimal</p>
                            </div>
                        </div>
                        <div className="dj-links">
                            <a href="#" className="dj-link"><i className="ph ph-instagram-logo"></i> @alexunder_dj</a>
                            <a href="#" className="dj-link"><i className="ph ph-folder-open"></i> Descargar Presskit</a>
                        </div>
                        <div className="dj-dates">
                            <h4 className="dates-title"><i className="ph ph-calendar-blank"></i> Fechas Libres</h4>
                            <div className="dates-labels">
                                <span className="date-label">15 Nov</span>
                                <span className="date-label">22 Nov</span>
                                <span className="date-label">05 Dic</span>
                            </div>
                        </div>
                    </div>

                    
                    <div className="dj-card">
                        <div className="dj-header">
                            <div className="dj-avatar"><i className="ph-fill ph-user-sound"></i></div>
                            <div className="dj-info">
                                <h3 className="dj-name">DSJJ</h3>
                                <p className="dj-genre">Flamenco House / Latin</p>
                            </div>
                        </div>
                        <div className="dj-links">
                            <a href="#" className="dj-link"><i className="ph ph-instagram-logo"></i> @dsjj_sur</a>
                            <a href="#" className="dj-link"><i className="ph ph-folder-open"></i> Descargar Presskit</a>
                        </div>
                        <div className="dj-dates">
                            <h4 className="dates-title"><i className="ph ph-calendar-blank"></i> Fechas Libres</h4>
                            <div className="dates-labels">
                                <span className="date-label">10 Nov</span>
                                <span className="date-label">28 Nov</span>
                                <span className="date-label booked">20 Dic (Ocupado)</span>
                                <span className="date-label">31 Dic</span>
                            </div>
                        </div>
                    </div>

                    
                    <div className="dj-card">
                        <div className="dj-header">
                            <div className="dj-avatar"><i className="ph-fill ph-user-sound"></i></div>
                            <div className="dj-info">
                                <h3 className="dj-name">Mala Costumbre</h3>
                                <p className="dj-genre">Tech House / Breakbeat</p>
                            </div>
                        </div>
                        <div className="dj-links">
                            <a href="#" className="dj-link"><i className="ph ph-instagram-logo"></i> @malacostumbre</a>
                            <a href="#" className="dj-link"><i className="ph ph-folder-open"></i> Descargar Presskit</a>
                        </div>
                        <div className="dj-dates">
                            <h4 className="dates-title"><i className="ph ph-calendar-blank"></i> Fechas Libres</h4>
                            <div className="dates-labels">
                                <span className="date-label">08 Nov</span>
                                <span className="date-label">15 Nov</span>
                                <span className="date-label">22 Dic</span>
                            </div>
                        </div>
                    </div>

                    
                    <div className="dj-card">
                        <div className="dj-header">
                            <div className="dj-avatar"><i className="ph-fill ph-user-sound"></i></div>
                            <div className="dj-info">
                                <h3 className="dj-name">Andalucia Deep</h3>
                                <p className="dj-genre">Deep House / Latin</p>
                            </div>
                        </div>
                        <div className="dj-links">
                            <a href="#" className="dj-link"><i className="ph ph-instagram-logo"></i> @andaluciadeep</a>
                            <a href="#" className="dj-link"><i className="ph ph-folder-open"></i> Descargar Presskit</a>
                        </div>
                        <div className="dj-dates">
                            <h4 className="dates-title"><i className="ph ph-calendar-blank"></i> Fechas Libres</h4>
                            <div className="dates-labels">
                                <span className="date-label">01 Dic</span>
                                <span className="date-label booked">12 Dic (Ocupado)</span>
                                <span className="date-label">31 Dic</span>
                            </div>
                        </div>
                    </div>

                    
                    <div className="dj-card">
                        <div className="dj-header">
                            <div className="dj-avatar"><i className="ph-fill ph-user-sound"></i></div>
                            <div className="dj-info">
                                <h3 className="dj-name">Sur Colectivo</h3>
                                <p className="dj-genre">Experimental / Ambient</p>
                            </div>
                        </div>
                        <div className="dj-links">
                            <a href="#" className="dj-link"><i className="ph ph-instagram-logo"></i> @surcolectivo</a>
                            <a href="#" className="dj-link"><i className="ph ph-folder-open"></i> Descargar Presskit</a>
                        </div>
                        <div className="dj-dates">
                            <h4 className="dates-title"><i className="ph ph-calendar-blank"></i> Fechas Libres</h4>
                            <div className="dates-labels">
                                <span className="date-label">20 Nov</span>
                                <span className="date-label">14 Dic</span>
                            </div>
                        </div>
                    </div>

                    
                    <div className="dj-card">
                        <div className="dj-header">
                            <div className="dj-avatar"><i className="ph-fill ph-user-sound"></i></div>
                            <div className="dj-info">
                                <h3 className="dj-name">Giralda Nights</h3>
                                <p className="dj-genre">Techno / Hard Techno</p>
                            </div>
                        </div>
                        <div className="dj-links">
                            <a href="#" className="dj-link"><i className="ph ph-instagram-logo"></i> @giraladanights</a>
                            <a href="#" className="dj-link"><i className="ph ph-folder-open"></i> Descargar Presskit</a>
                        </div>
                        <div className="dj-dates">
                            <h4 className="dates-title"><i className="ph ph-calendar-blank"></i> Fechas Libres</h4>
                            <div className="dates-labels">
                                <span className="date-label">09 Nov</span>
                                <span className="date-label">07 Dic</span>
                                <span className="date-label booked">24 Dic (Ocupado)</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>

        
        <section id="events-view" className="view">
            <div className="events-wrap">
                <div className="events-head">
                    <h2>Agenda de Eventos</h2>
                    <div className="library-filters">
                        <select id="community-select" className="filter-select">
                            <option value="">Comunidad Autonoma</option>
                            <option value="andalucia">Andalucia</option>
                            <option value="madrid">Comunidad de Madrid</option>
                            <option value="cataluna">Cataluna</option>
                            <option value="valencia">Comunidad Valenciana</option>
                            <option value="baleares">Islas Baleares</option>
                        </select>
                        <select id="province-select" className="filter-select" disabled>
                            <option value="">Selecciona Provincia</option>
                        </select>
                        <select id="style-select" className="filter-select">
                            <option value="">Todos los Estilos</option>
                            <option value="techno">Techno</option>
                            <option value="house">House / Tech House</option>
                            <option value="hard-techno">Hard Techno</option>
                            <option value="minimal">Minimal / Deep</option>
                            <option value="flamenco-house">Flamenco House</option>
                            <option value="latin-house">Latin House</option>
                            <option value="breakbeat">Breakbeat</option>
                        </select>
                        <button className="btn btn-primary" id="search-events-btn">
                            <i className="ph ph-magnifying-glass"></i> Buscar
                        </button>
                    </div>
                </div>

                <div className="events-grid">

                    
                    <div className="event-card">
                        <div className="event-flyer" style={{  }}>
                            <span className="event-style-badge">Techno</span>
                        </div>
                        <div className="event-details">
                            <h3 className="event-title">Warehouse Sur</h3>
                            <p className="event-promoter">Sala Custom · Bendito Sur Events</p>
                            <div className="event-meta">
                                <span className="meta-item"><i className="ph ph-calendar-blank"></i> 21 Dic 2026</span>
                                <span className="meta-item"><i className="ph ph-map-pin"></i> Sevilla</span>
                            </div>
                            <a href="#" className="btn btn-primary w-100 mt-3"><i className="ph ph-ticket"></i> Comprar Entradas</a>
                        </div>
                    </div>

                    
                    <div className="event-card">
                        <div className="event-flyer" style={{  }}>
                            <span className="event-style-badge">Tech House</span>
                        </div>
                        <div className="event-details">
                            <h3 className="event-title">Terral Club — Nochevieja</h3>
                            <p className="event-promoter">Terral Events · Malaga</p>
                            <div className="event-meta">
                                <span className="meta-item"><i className="ph ph-calendar-blank"></i> 31 Dic 2026</span>
                                <span className="meta-item"><i className="ph ph-map-pin"></i> Malaga</span>
                            </div>
                            <a href="#" className="btn btn-primary w-100 mt-3"><i className="ph ph-ticket"></i> Comprar Entradas</a>
                        </div>
                    </div>

                    
                    <div className="event-card">
                        <div className="event-flyer" style={{  }}>
                            <span className="event-style-badge">Flamenco House</span>
                        </div>
                        <div className="event-details">
                            <h3 className="event-title">Alhambra Beats Festival</h3>
                            <p className="event-promoter">Sur Collective · Granada</p>
                            <div className="event-meta">
                                <span className="meta-item"><i className="ph ph-calendar-blank"></i> 10 Ene 2027</span>
                                <span className="meta-item"><i className="ph ph-map-pin"></i> Granada</span>
                            </div>
                            <a href="#" className="btn btn-primary w-100 mt-3"><i className="ph ph-ticket"></i> Comprar Entradas</a>
                        </div>
                    </div>

                    
                    <div className="event-card">
                        <div className="event-flyer" style={{  }}>
                            <span className="event-style-badge">Breakbeat</span>
                        </div>
                        <div className="event-details">
                            <h3 className="event-title">Oleaje Open Air</h3>
                            <p className="event-promoter">Oleaje Cadiz · Cadiz</p>
                            <div className="event-meta">
                                <span className="meta-item"><i className="ph ph-calendar-blank"></i> 14 Feb 2027</span>
                                <span className="meta-item"><i className="ph ph-map-pin"></i> Cadiz</span>
                            </div>
                            <a href="#" className="btn btn-primary w-100 mt-3"><i className="ph ph-ticket"></i> Comprar Entradas</a>
                        </div>
                    </div>

                    
                    <div className="event-card">
                        <div className="event-flyer" style={{  }}>
                            <span className="event-style-badge">Minimal</span>
                        </div>
                        <div className="event-details">
                            <h3 className="event-title">Patios Electronicos</h3>
                            <p className="event-promoter">Patios Sound · Cordoba</p>
                            <div className="event-meta">
                                <span className="meta-item"><i className="ph ph-calendar-blank"></i> 28 Feb 2027</span>
                                <span className="meta-item"><i className="ph ph-map-pin"></i> Cordoba</span>
                            </div>
                            <a href="#" className="btn btn-primary w-100 mt-3"><i className="ph ph-ticket"></i> Comprar Entradas</a>
                        </div>
                    </div>

                    
                    <div className="event-card">
                        <div className="event-flyer" style={{  }}>
                            <span className="event-style-badge">Hard Techno</span>
                        </div>
                        <div className="event-details">
                            <h3 className="event-title">Code 150 — Fabrik</h3>
                            <p className="event-promoter">Fabrik / Grupo Kapital · Madrid</p>
                            <div className="event-meta">
                                <span className="meta-item"><i className="ph ph-calendar-blank"></i> 14 Mar 2027</span>
                                <span className="meta-item"><i className="ph ph-map-pin"></i> Madrid</span>
                            </div>
                            <a href="#" className="btn btn-primary w-100 mt-3"><i className="ph ph-ticket"></i> Comprar Entradas</a>
                        </div>
                    </div>

                </div>
            </div>
        </section>

        
        <section id="dj-profile-view" className="view">
            <div className="profile-wrap">
                <button className="btn btn-outline btn-sm mb-4" id="back-to-roster">
                    <i className="ph ph-arrow-left"></i> Volver a Comunidad
                </button>
                
                <div className="profile-header">
                    <div className="profile-avatar"><i className="ph-fill ph-user-sound"></i></div>
                    <div className="profile-info">
                        <h2 id="profile-name">Nombre DJ</h2>
                        <p id="profile-genre" className="text-gold">Genero</p>
                        <p className="profile-bio">DJ Residente de Bendito Sur. Especialista en crear atmósferas envolventes para las mejores pistas de baile de Andalucía.</p>
                        <div className="profile-social">
                            <a href="#" className="btn-icon"><i className="ph ph-instagram-logo"></i></a>
                            <a href="#" className="btn-icon"><i className="ph ph-soundcloud-logo"></i></a>
                        </div>
                    </div>
                </div>

                <div className="profile-content">
                    <h3>Exclusivas y Recomendaciones <i className="ph-fill ph-star" style={{ "color": "var(--gold)" }}></i></h3>
                    <div className="library-table-container">
                        <table className="library-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Titulo</th>
                                    <th>Tipo</th>
                                    <th>BPM</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="profile-tracks">
                                
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>

        
        <section id="dashboard-view" className="view">
            <div className="dashboard-wrap">
                <h2>Mi Cuenta</h2>

                <div className="dashboard-grid">

                    
                    <div className="dashboard-card">
                        <h3 className="dashboard-card-title"><i className="ph ph-star"></i> Mi Suscripcion</h3>
                        <div className="sub-status">
                            <span className="status-badge active">Activa</span>
                            <div className="sub-plan">ELITE</div>
                            <p className="sub-renewal">Proxima renovacion: 15 de Octubre, 2026</p>
                        </div>
                        <div className="dashboard-actions">
                            <button className="btn btn-outline btn-sm">Cambiar Plan</button>
                            <button className="btn btn-outline btn-sm" style={{ "borderColor": "var(--red)", "color": "var(--red)" }}>Cancelar</button>
                        </div>
                    </div>

                    
                    <div className="dashboard-card">
                        <h3 className="dashboard-card-title"><i className="ph ph-chart-bar"></i> Actividad</h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <div className="stat-value">142</div>
                                <div className="stat-label">Descargas</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value">56</div>
                                <div className="stat-label">Favoritas</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value">8</div>
                                <div className="stat-label">Sets Subidos</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value">3</div>
                                <div className="stat-label">Meses Activo</div>
                            </div>
                        </div>
                    </div>

                </div>

                
                <div id="collab-manager" className="dashboard-section mt-4 hidden" style={{ "border": "1px solid rgba(247, 168, 0, 0.2)", "padding": "1.5rem", "borderRadius": "8px", "background": "rgba(247, 168, 0, 0.02)" }}>
                    <div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center", "marginBottom": "1rem", "flexWrap": "wrap", "gap": "1rem" }}>
                        <h3 className="dashboard-card-title" style={{ "margin": "0", "color": "var(--gold)" }}><i className="ph-fill ph-crown"></i> Mis Pistas (Gestión de Catálogo)</h3>
                        <div style={{ "display": "flex", "gap": "1rem", "flexWrap": "wrap" }}>
                            <input type="file" id="collab-file-input" className="hidden" accept="audio/*" />
                            <button className="btn btn-outline btn-sm" id="collab-export-btn" style={{ "borderColor": "var(--gold)", "color": "var(--gold)" }}><i className="ph ph-export"></i> Cargar Catálogo desde Nube</button>
                            <button className="btn btn-primary btn-sm" id="collab-import-btn" style={{ "background": "var(--gold)", "borderColor": "var(--gold)", "color": "#000" }}><i className="ph ph-upload-simple"></i> Seleccionar y Subir Track</button>
                        </div>
                    </div>
                    <p className="text-secondary" style={{ "fontSize": "0.9rem", "marginBottom": "0" }}>Sube tus ediciones exclusivas o stems en formato WAV/FLAC, o descarga un backup de tu discografía.</p>
                </div>

                
                <div className="dashboard-section mt-4">
                    <h3 className="dashboard-card-title">Historial de Descargas</h3>
                    <div className="library-table-container">
                        <table className="library-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Titulo</th>
                                    <th>Artista</th>
                                    <th>Formato</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="text-secondary">03 Oct 2026</td>
                                    <td className="font-medium">Deep Signals</td>
                                    <td className="text-secondary">Nina Kraviz (Edit)</td>
                                    <td><span className="format-badge">WAV</span></td>
                                    <td><button className="btn-icon" title="Volver a descargar"><i className="ph ph-download-simple"></i></button></td>
                                </tr>
                                <tr>
                                    <td className="text-secondary">01 Oct 2026</td>
                                    <td className="font-medium">Groove Elements</td>
                                    <td className="text-secondary">Marco Carola</td>
                                    <td><span className="format-badge">FLAC</span></td>
                                    <td><button className="btn-icon" title="Volver a descargar"><i className="ph ph-download-simple"></i></button></td>
                                </tr>
                                <tr>
                                    <td className="text-secondary">28 Sep 2026</td>
                                    <td className="font-medium">Noches del Sur</td>
                                    <td className="text-secondary">DSJJ</td>
                                    <td><span className="format-badge">WAV</span></td>
                                    <td><button className="btn-icon" title="Volver a descargar"><i className="ph ph-download-simple"></i></button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </section>

        
        <section id="admin-view" className="view">
            <div className="dashboard-wrap">
                <div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center", "marginBottom": "2.5rem", "flexWrap": "wrap", "gap": "1rem" }}>
                    <h2>Panel de Control <span style={{ "fontSize": "1rem", "color": "var(--red)", "verticalAlign": "middle", "marginLeft": "1rem", "letterSpacing": "2px" }}>PERMISOS ROOT</span></h2>
                    <button className="btn btn-outline btn-sm" id="admin-logout-btn" style={{ "borderColor": "var(--red)", "color": "var(--red)" }}><i className="ph ph-sign-out"></i> Cerrar Sesión</button>
                </div>

                <div className="admin-content-area">
                    
                    <div id="admin-finances" className="admin-section active">
                        <div className="stats-grid mb-4 mt-2">
                            <div className="stat-item">
                                <div className="stat-value text-gold" style={{ "fontSize": "2.5rem" }}>€ 4,250</div>
                                <div className="stat-label">MRR Estimado</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value text-gold" style={{ "fontSize": "2.5rem" }}>165</div>
                                <div className="stat-label">Suscriptores Activos</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value text-gold" style={{ "fontSize": "2.5rem" }}>+12</div>
                                <div className="stat-label">Altas este mes</div>
                            </div>
                            <div className="stat-item" style={{ "borderBottom": "2px solid var(--red)" }}>
                                <div className="stat-value" style={{ "color": "var(--red)", "fontSize": "2.5rem" }}>3</div>
                                <div className="stat-label">Alertas Seguridad</div>
                            </div>
                        </div>
                    </div>

                    
                    <div id="admin-security" className="admin-section mt-2">
                        <div className="dashboard-section">
                            <h3 className="dashboard-card-title"><i className="ph ph-warning-circle" style={{ "color": "var(--red)" }}></i> Control de Multicuentas y Sesiones</h3>
                            <div className="library-table-container">
                                <table className="library-table">
                                    <thead>
                                        <tr>
                                            <th>Usuario / Email</th>
                                            <th>Plan</th>
                                            <th>Sesiones Activas</th>
                                            <th>IPs Recientes (48h)</th>
                                            <th>Estado</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ "backgroundColor": "rgba(192, 40, 48, 0.1)" }}>
                                            <td className="font-medium">dj.jose@gmail.com</td>
                                            <td><span className="format-badge">ELITE</span></td>
                                            <td style={{ "color": "var(--red)", "fontWeight": "bold" }}>4 dispositivos</td>
                                            <td className="text-secondary">Sevilla, Madrid, Barcelona</td>
                                            <td><span className="status-badge" style={{ "background": "var(--red)", "color": "white", "border": "none" }}>Riesgo Alto</span></td>
                                            <td><button className="btn btn-outline btn-sm" style={{ "borderColor": "var(--red)", "color": "var(--red)" }} onClick={() => BSAlert('✅ Sesiones revocadas y usuario notificado.')}>Revocar</button></td>
                                        </tr>
                                        <tr>
                                            <td className="font-medium">alex.under@hotmail.com</td>
                                            <td><span className="format-badge">PRO</span></td>
                                            <td className="text-secondary">1 dispositivo</td>
                                            <td className="text-secondary">Málaga</td>
                                            <td><span className="status-badge active" style={{ "marginBottom": "0" }}>Limpio</span></td>
                                            <td><button className="btn btn-outline btn-sm">Ver</button></td>
                                        </tr>
                                        <tr style={{ "backgroundColor": "rgba(212, 137, 10, 0.1)" }}>
                                            <td className="font-medium">m.garcia_77@yahoo.es</td>
                                            <td><span className="format-badge">ELITE</span></td>
                                            <td className="text-secondary" style={{ "color": "var(--gold)" }}>2 dispositivos</td>
                                            <td className="text-secondary">Granada, Almería</td>
                                            <td><span className="status-badge" style={{ "background": "var(--gold)", "color": "var(--bg)", "border": "none" }}>Sospechoso</span></td>
                                            <td><button className="btn btn-outline btn-sm" style={{ "borderColor": "var(--gold)", "color": "var(--gold)" }} onClick={() => BSAlert('🔒 Iniciando verificación extra de identidad.')}>Verificar</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    
                    <div id="admin-users" className="admin-section mt-2">
                        <div className="dashboard-grid">
                            
                            <div className="dashboard-section">
                                <h3 className="dashboard-card-title"><i className="ph ph-users"></i> Últimas Suscripciones Activas</h3>
                                <div className="library-table-container">
                                    <table className="library-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha Alta</th>
                                                <th>Usuario</th>
                                                <th>Plan</th>
                                                <th>Facturación</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="text-secondary">Hoy, 10:45</td>
                                                <td className="font-medium">carlos.vamp@gmail.com</td>
                                                <td><span className="format-badge">ELITE</span></td>
                                                <td className="text-secondary">Stripe (Activo)</td>
                                            </tr>
                                            <tr>
                                                <td className="text-secondary">Ayer, 18:20</td>
                                                <td className="font-medium">dj_andaluz_99@outlook.com</td>
                                                <td><span className="format-badge">PRO</span></td>
                                                <td className="text-secondary">Stripe (Activo)</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            
                            <div className="dashboard-card" style={{ "height": "fit-content" }}>
                                <h3 className="dashboard-card-title"><i className="ph ph-user-plus text-gold"></i> Alta de Colaborador DJ</h3>
                                <p className="text-secondary mb-3" style={{ "fontSize": "0.9rem" }}>Invita a un artista para que obtenga una cuenta "Acceso Total / Vitalicio" sin coste en la plataforma.</p>
                                <form id="invite-collab-form" style={{ "display": "flex", "flexDirection": "column", "gap": "1rem" }}>
                                    <input type="email" placeholder="Correo Electrónico del DJ" required style={{ "background": "rgba(255,255,255,0.05)", "border": "1px solid rgba(255,255,255,0.1)", "color": "#fff", "padding": "0.8rem", "borderRadius": "4px", "outline": "none", "width": "100%" }} />
                                    <button type="submit" className="btn btn-outline" style={{ "borderColor": "var(--gold)", "color": "var(--gold)" }}>Enviar Invitación VIP</button>
                                </form>
                            </div>
                        </div>
                    </div>

                    
                    {/* === SECCIÓN CATÁLOGO === */}
                    <div id="admin-catalog" className="admin-section mt-2">
                        <div className="dashboard-section">
                            <h3 className="dashboard-card-title mb-3"><i className="ph ph-music-notes-plus"></i> Subir Pista al Catálogo</h3>
                            <form id="upload-track-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.75rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Archivo de Audio *</label>
                                    <input type="file" id="track-file-input" accept="audio/*" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(243,201,72,0.2)', borderRadius: '3px', padding: '0.6rem 0.8rem', color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }} />
                                </div>
                                {[
                                    { id: 'track-title', label: 'Título *', placeholder: 'Ej: Noches del Sur' },
                                    { id: 'track-artist', label: 'Artista *', placeholder: 'Ej: DSJJ' },
                                    { id: 'track-genre', label: 'Género', placeholder: 'Ej: Flamenco House' },
                                    { id: 'track-bpm', label: 'BPM', placeholder: 'Ej: 124', type: 'number' },
                                    { id: 'track-key', label: 'Key', placeholder: 'Ej: 7A' },
                                ].map(f => (
                                    <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label htmlFor={f.id} style={{ fontSize: '0.75rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{f.label}</label>
                                        <input type={f.type || 'text'} id={f.id} placeholder={f.placeholder} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px', padding: '0.6rem 0.8rem', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                                    </div>
                                ))}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                    <label style={{ fontSize: '0.75rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Acceso</label>
                                    <select id="track-locked" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px', padding: '0.6rem 0.8rem', color: '#fff', fontSize: '0.9rem', outline: 'none' }}>
                                        <option value="false">Libre</option>
                                        <option value="true">Solo Elite</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <button type="submit" className="btn btn-primary" id="upload-track-btn" style={{ background: 'var(--gold)', border: 'none', color: '#000', fontWeight: '700', minWidth: '180px' }}>
                                        <i className="ph ph-upload-simple"></i> Subir Pista
                                    </button>
                                </div>
                            </form>

                            <h3 className="dashboard-card-title mb-2"><i className="ph ph-list-music"></i> Pistas en el Catálogo</h3>
                            <div className="library-table-container">
                                <table className="library-table">
                                    <thead>
                                        <tr>
                                            <th>Título</th>
                                            <th>Artista</th>
                                            <th>Género</th>
                                            <th>BPM</th>
                                            <th>Key</th>
                                            <th>Acceso</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody id="admin-catalog-tbody">
                                        <tr id="admin-catalog-empty">
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', letterSpacing: '2px' }}>SIN PISTAS AÚN</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div id="admin-export" className="admin-section mt-2">
                        <div className="dashboard-section">
                            <div style={{ "display": "flex", "justifyContent": "space-between", "alignItems": "center", "marginBottom": "1.5rem", "flexWrap": "wrap", "gap": "1rem" }}>
                                <h3 className="dashboard-card-title" style={{ "margin": "0" }}><i className="ph ph-package"></i> Preparar Paquete de Exportación</h3>
                                <div style={{ "display": "flex", "gap": "1rem", "alignItems": "center" }}>
                                    <span id="export-count" style={{ "fontSize": "0.9rem", "fontWeight": "500", "color": "var(--gold)", "background": "rgba(247,168,0,0.1)", "padding": "0.5rem 1rem", "borderRadius": "4px" }}>0 Seleccionadas</span>
                                    <button id="admin-btn-export" className="btn btn-primary btn-sm"><i className="ph ph-download"></i> Empaquetar y Descargar (.zip)</button>
                                </div>
                            </div>
                            
                            <div className="library-table-container">
                                <table className="library-table" id="admin-export-table">
                                    <thead>
                                        <tr>
                                            <th style={{ "width": "50px" }}><input type="checkbox" id="admin-select-all" style={{ "cursor": "pointer", "width": "18px", "height": "18px", "accentColor": "var(--gold)" }} /></th>
                                            <th>Título</th>
                                            <th>Artista</th>
                                            <th>Género</th>
                                            <th>Disponibilidad</th>
                                            <th>Tamaño Est.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><input type="checkbox" className="admin-track-select" value="Midnight Rave" style={{ "cursor": "pointer", "width": "18px", "height": "18px", "accentColor": "var(--gold)" }} /></td>
                                            <td className="font-medium">Midnight Rave</td>
                                            <td className="text-secondary">Alex Under</td>
                                            <td><span className="genre-tag">Techno</span></td>
                                            <td className="text-gold"><i className="ph-fill ph-lock-key"></i> ELITE</td>
                                            <td className="text-secondary">58 MB (WAV)</td>
                                        </tr>
                                        <tr>
                                            <td><input type="checkbox" className="admin-track-select" value="Deep Signals" style={{ "cursor": "pointer", "width": "18px", "height": "18px", "accentColor": "var(--gold)" }} /></td>
                                            <td className="font-medium">Deep Signals</td>
                                            <td className="text-secondary">Nina Kraviz (Edit)</td>
                                            <td><span className="genre-tag">Acid Techno</span></td>
                                            <td><i className="ph ph-globe"></i> PRO</td>
                                            <td className="text-secondary">72 MB (WAV)</td>
                                        </tr>
                                        <tr>
                                            <td><input type="checkbox" className="admin-track-select" value="Noches del Sur" style={{ "cursor": "pointer", "width": "18px", "height": "18px", "accentColor": "var(--gold)" }} /></td>
                                            <td className="font-medium">Noches del Sur</td>
                                            <td className="text-secondary">DSJJ</td>
                                            <td><span className="genre-tag">Flamenco House</span></td>
                                            <td><i className="ph ph-globe"></i> PRO</td>
                                            <td className="text-secondary">41 MB (FLAC)</td>
                                        </tr>
                                        <tr>
                                            <td><input type="checkbox" className="admin-track-select" value="Patio de los Leones" style={{ "cursor": "pointer", "width": "18px", "height": "18px", "accentColor": "var(--gold)" }} /></td>
                                            <td className="font-medium">Patio de los Leones</td>
                                            <td className="text-secondary">Andalucia Deep</td>
                                            <td><span className="genre-tag">Latin House</span></td>
                                            <td className="text-gold"><i className="ph-fill ph-lock-key"></i> ELITE</td>
                                            <td className="text-secondary">65 MB (WAV)</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

    </main>

    
    <div id="global-player" className="audio-player hidden">
        <audio id="bs-audio" preload="metadata"></audio>
        <div className="player-container">
            <div className="track-info">
                <div className="track-artwork"></div>
                <div className="track-details">
                    <h4 className="track-title">Pista Seleccionada</h4>
                    <p className="track-artist">Artista</p>
                </div>
            </div>
            <div className="player-controls">
                <button className="ctrl-btn" id="player-prev"><i className="ph ph-skip-back-circle"></i></button>
                <button className="ctrl-btn play-btn" id="player-playpause"><i className="ph-fill ph-play-circle"></i></button>
                <button className="ctrl-btn" id="player-next"><i className="ph ph-skip-forward-circle"></i></button>
            </div>
            <div className="player-timeline">
                <span className="time current" id="player-current">0:00</span>
                <div className="progress-bar" id="player-progress-bar">
                    <div className="progress" id="player-progress"></div>
                </div>
                <span className="time total" id="player-total">0:00</span>
            </div>
            <div className="player-actions">
                <button className="action-btn" id="player-download"><i className="ph ph-download-simple"></i></button>
            </div>
        </div>
    </div>

    
    
        </>
    );
}
