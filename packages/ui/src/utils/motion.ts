/**
 * Motion animation utilities for Neutron
 * Lightweight, performant animations with the Motion library
 * 
 * @example
 * ```ts
 * import { fadeIn, slideUp, staggerChildren, prefersReducedMotion } from '@neutron/ui/motion';
 * 
 * // Use in Svelte onMount
 * onMount(() => {
 *   if (!prefersReducedMotion()) {
 *     fadeIn('.hero-title');
 *     staggerChildren('.tool-card', { y: 20 });
 *   }
 * });
 * ```
 */

import { animate, stagger, spring, type AnimationOptions } from 'motion';

// ============================================
// Utility Functions
// ============================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Only run animation if user hasn't requested reduced motion
 */
export function safeAnimate(
	selector: string | Element | Element[],
	keyframes: Parameters<typeof animate>[1],
	options?: AnimationOptions
) {
	if (prefersReducedMotion()) return;
	return animate(selector, keyframes, options);
}

// ============================================
// Preset Animations
// ============================================

/**
 * Fade in animation
 */
export function fadeIn(
	selector: string | Element | Element[],
	options?: Partial<AnimationOptions>
) {
	return safeAnimate(
		selector,
		{ opacity: [0, 1] },
		{ duration: 0.3, easing: 'ease-out', ...options }
	);
}

/**
 * Fade out animation
 */
export function fadeOut(
	selector: string | Element | Element[],
	options?: Partial<AnimationOptions>
) {
	return safeAnimate(
		selector,
		{ opacity: [1, 0] },
		{ duration: 0.2, easing: 'ease-in', ...options }
	);
}

/**
 * Slide up and fade in
 */
export function slideUp(
	selector: string | Element | Element[],
	options?: Partial<AnimationOptions> & { distance?: number }
) {
	const { distance = 20, ...animOptions } = options || {};
	return safeAnimate(
		selector,
		{ opacity: [0, 1], y: [distance, 0] },
		{ duration: 0.4, easing: 'ease-out', ...animOptions }
	);
}

/**
 * Slide down and fade in
 */
export function slideDown(
	selector: string | Element | Element[],
	options?: Partial<AnimationOptions> & { distance?: number }
) {
	const { distance = 20, ...animOptions } = options || {};
	return safeAnimate(
		selector,
		{ opacity: [0, 1], y: [-distance, 0] },
		{ duration: 0.4, easing: 'ease-out', ...animOptions }
	);
}

/**
 * Scale up animation (for modals, popovers)
 */
export function scaleIn(
	selector: string | Element | Element[],
	options?: Partial<AnimationOptions>
) {
	return safeAnimate(
		selector,
		{ opacity: [0, 1], scale: [0.95, 1] },
		{ duration: 0.2, easing: 'ease-out', ...options }
	);
}

/**
 * Scale down animation
 */
export function scaleOut(
	selector: string | Element | Element[],
	options?: Partial<AnimationOptions>
) {
	return safeAnimate(
		selector,
		{ opacity: [1, 0], scale: [1, 0.95] },
		{ duration: 0.15, easing: 'ease-in', ...options }
	);
}

/**
 * Stagger children animations
 */
export function staggerChildren(
	selector: string,
	keyframes: Parameters<typeof animate>[1] = { opacity: [0, 1], y: [20, 0] },
	options?: Partial<AnimationOptions> & { staggerDelay?: number }
) {
	const { staggerDelay = 0.05, ...animOptions } = options || {};
	return safeAnimate(selector, keyframes, {
		duration: 0.4,
		easing: 'ease-out',
		delay: stagger(staggerDelay),
		...animOptions
	});
}

/**
 * Pulse animation (for attention)
 */
export function pulse(
	selector: string | Element | Element[],
	options?: Partial<AnimationOptions>
) {
	return safeAnimate(
		selector,
		{ scale: [1, 1.05, 1] },
		{ duration: 0.3, easing: 'ease-in-out', ...options }
	);
}

/**
 * Shake animation (for errors)
 */
export function shake(
	selector: string | Element | Element[],
	options?: Partial<AnimationOptions>
) {
	return safeAnimate(
		selector,
		{ x: [0, -10, 10, -10, 10, 0] },
		{ duration: 0.4, easing: 'ease-in-out', ...options }
	);
}

/**
 * Spring-based bounce animation
 */
export function bounce(
	selector: string | Element | Element[],
	options?: Partial<AnimationOptions>
) {
	return safeAnimate(
		selector,
		{ y: [0, -15, 0] },
		{
			duration: 0.5,
			easing: spring({ stiffness: 300, damping: 10 }),
			...options
		}
	);
}

// ============================================
// Progress Animations
// ============================================

/**
 * Animate a progress bar
 */
export function animateProgress(
	selector: string | Element,
	progress: number, // 0-100
	options?: Partial<AnimationOptions>
) {
	return safeAnimate(
		selector,
		{ width: `${Math.min(100, Math.max(0, progress))}%` },
		{ duration: 0.3, easing: 'ease-out', ...options }
	);
}

/**
 * Animate a number counter
 */
export function animateCounter(
	element: Element,
	from: number,
	to: number,
	options?: { duration?: number; format?: (n: number) => string }
) {
	const { duration = 1, format = (n) => Math.round(n).toString() } = options || {};

	if (prefersReducedMotion()) {
		element.textContent = format(to);
		return;
	}

	const startTime = performance.now();
	const diff = to - from;

	function update(currentTime: number) {
		const elapsed = (currentTime - startTime) / 1000;
		const progress = Math.min(elapsed / duration, 1);
		// Ease out cubic
		const eased = 1 - Math.pow(1 - progress, 3);
		const current = from + diff * eased;
		element.textContent = format(current);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

// ============================================
// List Animations (for drag & drop, reorder)
// ============================================

/**
 * Animate item removal from list
 */
export async function animateRemove(
	element: Element,
	options?: Partial<AnimationOptions>
): Promise<void> {
	if (prefersReducedMotion()) return;

	await animate(
		element,
		{ opacity: [1, 0], scale: [1, 0.8], height: ['auto', '0px'] },
		{ duration: 0.25, easing: 'ease-in', ...options }
	).finished;
}

/**
 * Animate item addition to list
 */
export function animateAdd(element: Element, options?: Partial<AnimationOptions>) {
	return safeAnimate(
		element,
		{ opacity: [0, 1], scale: [0.8, 1] },
		{ duration: 0.25, easing: 'ease-out', ...options }
	);
}

/**
 * Animate item reorder
 */
export function animateReorder(
	element: Element,
	deltaY: number,
	options?: Partial<AnimationOptions>
) {
	return safeAnimate(
		element,
		{ y: [deltaY, 0] },
		{ duration: 0.3, easing: spring({ stiffness: 400, damping: 25 }), ...options }
	);
}

// ============================================
// Page Transition Helpers
// ============================================

/**
 * Page enter animation
 */
export function pageEnter(selector: string = 'main') {
	return slideUp(selector, { distance: 10, duration: 0.3 });
}

/**
 * Animate hero section on page load
 */
export function animateHero(containerSelector: string = '.hero') {
	if (prefersReducedMotion()) return;

	const container = document.querySelector(containerSelector);
	if (!container) return;

	// Animate title
	const title = container.querySelector('h1');
	if (title) slideUp(title, { distance: 30, duration: 0.5 });

	// Animate description
	const desc = container.querySelector('p');
	if (desc) slideUp(desc, { distance: 20, duration: 0.4, delay: 0.1 });

	// Animate CTA buttons
	const buttons = container.querySelectorAll('button, a');
	if (buttons.length) {
		staggerChildren(
			`${containerSelector} button, ${containerSelector} a`,
			{ opacity: [0, 1], y: [15, 0] },
			{ staggerDelay: 0.05, delay: 0.2 }
		);
	}
}

// Re-export motion primitives for advanced usage
export { animate, stagger, spring } from 'motion';
