import type { AppMeta, Locale } from '@neutron/utils/seo';

/** Used by +layout.svelte as the site-wide fallback title/description. */
export const smashLayoutMeta: Record<Locale, AppMeta> = {
	en: {
		title: 'Smash - Privacy-First PDF Tools',
		description:
			'Free online PDF tools — compress, merge, split, protect, OCR, and more. All 13 tools run instantly in your browser. 100% private, files never leave your device.'
	},
	fr: {
		title: 'Smash - Outils PDF respectueux de la vie privée',
		description:
			'Outils PDF gratuits en ligne — compresser, fusionner, diviser, protéger, OCR et plus encore. Les 13 outils fonctionnent instantanément dans votre navigateur. 100 % privé, sans téléchargement.'
	},
	ru: {
		title: 'Smash - Инструменты PDF с защитой приватности',
		description:
			'Бесплатные онлайн-инструменты для PDF — сжатие, объединение, разделение, защита, OCR и многое другое. Все 13 инструментов работают в браузере. Полная конфиденциальность.'
	},
	pl: {
		title: 'Smash - Narzędzia PDF z poszanowaniem prywatności',
		description:
			'Bezpłatne narzędzia PDF online — kompresuj, łącz, dziel, chroń, OCR i więcej. Wszystkie 13 narzędzi działa w przeglądarce. 100% prywatnie, pliki nie opuszczają urządzenia.'
	},
	pt: {
		title: 'Smash - Ferramentas PDF com privacidade',
		description:
			'Ferramentas PDF gratuitas online — comprimir, unir, dividir, proteger, OCR e mais. Todas as 13 ferramentas funcionam no navegador. 100% privado, sem uploads.'
	},
	es: {
		title: 'Smash - Herramientas PDF con privacidad',
		description:
			'Herramientas PDF gratuitas en línea — comprimir, fusionar, dividir, proteger, OCR y más. Las 13 herramientas funcionan al instante en tu navegador. 100% privado, sin subidas.'
	},
	de: {
		title: 'Smash - Datenschutzorientierte PDF-Tools',
		description:
			'Kostenlose Online-PDF-Tools — komprimieren, zusammenführen, teilen, schützen, OCR und mehr. Alle 13 Tools laufen sofort im Browser. 100% privat, Dateien verlassen nie dein Gerät.'
	},
	it: {
		title: 'Smash - Strumenti PDF rispettosi della privacy',
		description:
			'Strumenti PDF gratuiti online — comprimere, unire, dividere, proteggere, OCR e altro. Tutti i 13 strumenti funzionano istantaneamente nel browser. 100% privato, senza upload.'
	},
	nl: {
		title: 'Smash - Privacygerichte PDF-tools',
		description:
			'Gratis online PDF-tools — comprimeren, samenvoegen, splitsen, beveiligen, OCR en meer. Alle 13 tools werken direct in je browser. 100% privé, bestanden verlaten nooit je apparaat.'
	},
	tr: {
		title: 'Smash - Gizlilik Odaklı PDF Araçları',
		description:
			'Ücretsiz çevrimiçi PDF araçları — sıkıştır, birleştir, böl, koru, OCR ve daha fazlası. 13 aracın tamamı tarayıcınızda anında çalışır. %100 gizli, dosyalar cihazınızı asla terk etmez.'
	},
	uk: {
		title: 'Smash - Інструменти PDF із захистом приватності',
		description:
			'Безкоштовні онлайн-інструменти для PDF — стиснення, об\'єднання, розділення, захист, OCR та інше. Всі 13 інструментів працюють у браузері. Повна конфіденційність.'
	}
};

/** Used by the homepage (+page.svelte). */
export const smashHomeMeta: Record<Locale, AppMeta> = {
	en: {
		title: 'Smash - PDF Tools',
		description:
			'Free browser-based PDF tools. Compress, merge, split, protect, and convert PDFs - 100% private, works offline.'
	},
	fr: {
		title: 'Smash - Outils PDF',
		description:
			'Outils PDF gratuits dans le navigateur. Compressez, fusionnez, divisez, protégez et convertissez des PDF — 100 % privé, fonctionne hors ligne.'
	},
	ru: {
		title: 'Smash - Инструменты PDF',
		description:
			'Бесплатные инструменты для PDF в браузере. Сжимайте, объединяйте, разделяйте, защищайте и конвертируйте PDF — полная приватность, работает офлайн.'
	},
	pl: {
		title: 'Smash - Narzędzia PDF',
		description:
			'Bezpłatne narzędzia PDF w przeglądarce. Kompresuj, łącz, dziel, chroń i konwertuj pliki PDF — 100% prywatne, działa offline.'
	},
	pt: {
		title: 'Smash - Ferramentas PDF',
		description:
			'Ferramentas PDF gratuitas no navegador. Comprima, una, divida, proteja e converta PDFs — 100% privado, funciona offline.'
	},
	es: {
		title: 'Smash - Herramientas PDF',
		description:
			'Herramientas PDF gratuitas en el navegador. Comprime, fusiona, divide, protege y convierte PDF — 100% privado, funciona sin conexión.'
	},
	de: {
		title: 'Smash - PDF-Tools',
		description:
			'Kostenlose browserbasierte PDF-Tools. Komprimiere, füge zusammen, teile, schütze und konvertiere PDFs — 100% privat, funktioniert offline.'
	},
	it: {
		title: 'Smash - Strumenti PDF',
		description:
			'Strumenti PDF gratuiti nel browser. Comprimi, unisci, dividi, proteggi e converti PDF — 100% privato, funziona offline.'
	},
	nl: {
		title: 'Smash - PDF-tools',
		description:
			"Gratis browsergebaseerde PDF-tools. Comprimeer, voeg samen, splits, beveilig en converteer PDF's — 100% privé, werkt offline."
	},
	tr: {
		title: 'Smash - PDF Araçları',
		description:
			"PDF'leri sıkıştırın, birleştirin, bölün, koruyun ve dönüştürün — %100 gizli, çevrimdışı çalışır. Ücretsiz tarayıcı tabanlı PDF araçları."
	},
	uk: {
		title: 'Smash - Інструменти PDF',
		description:
			'Безкоштовні інструменти для PDF у браузері. Стискайте, об\'єднуйте, розділяйте, захищайте та конвертуйте PDF — повна приватність, працює офлайн.'
	}
};
