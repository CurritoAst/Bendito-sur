// Configuracion de EmailJS para enviar invitaciones VIP a DJs colaboradores.
//
// === COMO CONFIGURAR EmailJS (5 minutos) ===
// 1. Crea una cuenta gratis en https://www.emailjs.com/ (200 correos/mes gratis)
// 2. Anade un "Email Service" (Gmail, Outlook, etc.) y copia el Service ID
// 3. Crea un "Email Template" con este contenido (copia/pega en el editor):
//
//      Asunto: Bienvenido/a a Bendito Sur VIP
//
//      Hola {{to_name}},
//
//      Has sido invitado/a como DJ colaborador en Bendito Sur.
//      Tu cuenta ya esta activa y tendras acceso total y vitalicio a la plataforma.
//
//      Accede aqui: {{login_url}}
//
//      Tus credenciales:
//        Email: {{to_email}}
//        Contrasena: {{password}}
//
//      IMPORTANTE: Guarda esta contrasena en un sitio seguro. Si la pierdes,
//      contactanos y te la reenviaremos.
//
//      Un abrazo,
//      El equipo de Bendito Sur
//
// 4. En el template, marca "To Email" = {{to_email}}, "To Name" = {{to_name}}
// 5. Copia el Template ID
// 6. Ve a "Account > API Keys" y copia el Public Key
// 7. Pega los 3 valores debajo y guarda.
// 8. ¡Listo! Las invitaciones VIP se enviaran de verdad al Gmail del DJ.

export const EMAILJS_CONFIG = {
    SERVICE_ID:  '',  // p.ej. 'service_abc1234'
    TEMPLATE_ID: '',  // p.ej. 'template_xyz5678'
    PUBLIC_KEY:  '',  // p.ej. 'abcDEF123456789'
};

export const isEmailJSConfigured = () => {
    const { SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY } = EMAILJS_CONFIG;
    return !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
};

// Envia la invitacion VIP al DJ usando EmailJS.
// Requiere que el script de EmailJS este cargado en index.html
export async function sendVipInviteEmail({ toEmail, toName, password, loginUrl }) {
    if (!isEmailJSConfigured()) {
        throw new Error('EmailJS no esta configurado. Edita src/emailConfig.js con tus IDs.');
    }
    /** @type {any} */
    const win = window;
    const emailjs = win.emailjs;
    if (!emailjs) {
        throw new Error('EmailJS no esta cargado. Verifica el script en index.html.');
    }
    emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY });
    const templateParams = {
        to_email: toEmail,
        to_name: toName || toEmail.split('@')[0],
        password: password,
        login_url: loginUrl || 'https://benditosur.es',
    };
    return emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, templateParams);
}

// Genera una contrasena aleatoria segura con prefijo BS-VIP- para que sea
// identificable como invitacion especial cuando el DJ la reciba.
export function generateVipPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I/O/0/1 para evitar confusion
    let out = '';
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    for (let i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
    // Formato: XXXX-XXXX-XXXX
    return `BS-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}
