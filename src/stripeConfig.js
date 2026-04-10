// Configuracion de Stripe Payment Links
// IMPORTANTE: Estos son enlaces de PRUEBA (test mode) de Stripe.
// Cuando vayas a produccion sustituye cada URL por la version "live".
//
// El orden asumido es: PRO {mensual, trimestral, semestral, anual},
// luego ELITE {mensual, trimestral, semestral, anual}.
// Si en Stripe los creaste en otro orden, intercambia los valores aqui.
//
// En cada Payment Link de Stripe DEBES configurar como "After payment > Redirect"
// la URL: https://benditosur.es/?payment=success&plan=pro&cycle=mensual
// (cambiando plan y cycle segun cada link). Asi la web sabe que el pago se ha
// completado y actualiza el plan del usuario automaticamente.

export const STRIPE_PAYMENT_LINKS = {
    pro: {
        mensual:    'https://buy.stripe.com/test_dRmaEW8oSfS28jNbSz1ZS00',
        trimestral: 'https://buy.stripe.com/test_8x228q20udJU8jN6yf1ZS01',
        semestral:  'https://buy.stripe.com/test_cNicN4gVoeNYbvZ6yf1ZS02',
        anual:      'https://buy.stripe.com/test_5kQ7sKax05do0RlbSz1ZS03',
    },
    elite: {
        mensual:    'https://buy.stripe.com/test_28E3cucF87lwdE709R1ZS04',
        trimestral: 'https://buy.stripe.com/test_bJe8wO0Wq21c6bF8Gn1ZS05',
        semestral:  'https://buy.stripe.com/test_9B6aEWbB4cFQgQj7Cj1ZS06',
        anual:      'https://buy.stripe.com/test_5kQ4gy34y9tE1Vp5ub1ZS07',
    },
};

// Precios para mostrar en el modal de seleccion de ciclo
export const STRIPE_PLAN_PRICES = {
    pro: {
        mensual:    { price: '19.00 €',  perMonth: '19.00 €', label: 'Mensual',    discount: null },
        trimestral: { price: '51.30 €',  perMonth: '17.10 €', label: 'Trimestral', discount: '-10%' },
        semestral:  { price: '96.90 €',  perMonth: '16.15 €', label: 'Semestral',  discount: '-15%' },
        anual:      { price: '182.40 €', perMonth: '15.20 €', label: 'Anual',      discount: '-20%' },
    },
    elite: {
        mensual:    { price: '29.00 €',  perMonth: '29.00 €', label: 'Mensual',    discount: null },
        trimestral: { price: '78.30 €',  perMonth: '26.10 €', label: 'Trimestral', discount: '-10%' },
        semestral:  { price: '147.90 €', perMonth: '24.65 €', label: 'Semestral',  discount: '-15%' },
        anual:      { price: '278.40 €', perMonth: '23.20 €', label: 'Anual',      discount: '-20%' },
    },
};

// Construye la URL final de Stripe con email pre-rellenado y client_reference_id
// (que Stripe nos devolvera en el webhook si lo conectamos algun dia)
export function buildStripeCheckoutUrl(plan, cycle, email) {
    const base = STRIPE_PAYMENT_LINKS?.[plan]?.[cycle];
    if (!base) return null;
    const params = new URLSearchParams();
    if (email) params.set('prefilled_email', email);
    if (email) params.set('client_reference_id', email);
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}${params.toString()}`;
}
