<script lang="ts">
	/**
	 * Mobile-specific enhancements and utilities
	 * - Viewport height fix for iOS
	 * - Safe area detection
	 * - Haptic feedback wrapper
	 * - Pull-to-refresh indicator
	 */
	import { onMount } from 'svelte';

	// Fix for iOS viewport height (accounts for browser chrome)
	function setVhProperty() {
		const vh = window.innerHeight * 0.01;
		document.documentElement.style.setProperty('--vh', `${vh}px`);
	}

	// Haptic feedback for mobile interactions (iOS Safari only)
	export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
		if ('vibrate' in navigator) {
			const patterns = {
				light: [10],
				medium: [20],
				heavy: [30],
			};
			navigator.vibrate(patterns[style]);
		}
	}

	// Detect if device is mobile
	export const isMobile = $derived(
		typeof window !== 'undefined' &&
			(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
				window.innerWidth < 768)
	);

	// Detect if PWA/standalone mode
	export const isStandalone = $derived(
		typeof window !== 'undefined' &&
			(window.matchMedia('(display-mode: standalone)').matches ||
				(window.navigator as any).standalone === true)
	);

	onMount(() => {
		// Set initial vh
		setVhProperty();

		// Update on resize and orientation change
		window.addEventListener('resize', setVhProperty);
		window.addEventListener('orientationchange', setVhProperty);

		// Prevent default pull-to-refresh on main container
		let touchStartY = 0;
		document.addEventListener(
			'touchstart',
			(e) => {
				touchStartY = e.touches[0].clientY;
			},
			{ passive: true }
		);

		document.addEventListener(
			'touchmove',
			(e) => {
				const touchY = e.touches[0].clientY;
				const touchDelta = touchY - touchStartY;

				// If at top and pulling down, prevent default (disable browser pull-to-refresh)
				if (window.scrollY === 0 && touchDelta > 0) {
					const target = e.target as HTMLElement;
					// Only prevent if not in a scrollable container
					if (!target.closest('.mobile-scroll')) {
						e.preventDefault();
					}
				}
			},
			{ passive: false }
		);

		return () => {
			window.removeEventListener('resize', setVhProperty);
			window.removeEventListener('orientationchange', setVhProperty);
		};
	});
</script>

<!-- Hidden component - just sets up mobile optimizations -->
<svelte:head>
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="theme-color" content="#09090b" />
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover"
	/>
</svelte:head>

<style>
	:global(html) {
		/* iOS viewport height fix */
		height: 100vh;
		height: calc(var(--vh, 1vh) * 100);
	}

	:global(body) {
		/* Prevent overscroll on iOS */
		overscroll-behavior-y: none;
		/* Better text rendering on mobile */
		text-size-adjust: 100%;
		-webkit-text-size-adjust: 100%;
	}

	/* Prevent zooming on double-tap for buttons */
	:global(button),
	:global(a) {
		touch-action: manipulation;
	}
</style>
