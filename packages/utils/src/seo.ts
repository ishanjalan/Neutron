export type Locale =
	'en' | 'fr' | 'ru' | 'pl' | 'pt' | 'es' | 'de' | 'it' | 'nl' | 'tr' | 'uk' | 'ar' | 'id';

export interface AppMeta {
	title: string;
	description: string;
}

/**
 * Maps browser language codes to supported locales, falling back to 'en'.
 *
 * Only the page <title>/description are translated — the interface itself is English — so
 * callers must NOT set <html lang> from this: it would make screen readers pronounce English
 * text with the wrong voice (and Arabic would also need dir="rtl").
 */
export function detectLocale(): Locale {
	if (typeof navigator === 'undefined') return 'en';
	const lang = navigator.language.split('-')[0].toLowerCase();
	const map: Partial<Record<string, Locale>> = {
		fr: 'fr',
		ru: 'ru',
		pl: 'pl',
		pt: 'pt',
		es: 'es',
		de: 'de',
		it: 'it',
		nl: 'nl',
		tr: 'tr',
		uk: 'uk',
		ar: 'ar',
		id: 'id',
		in: 'id', // legacy code some browsers still report for Indonesian
	};
	return map[lang] ?? 'en';
}
