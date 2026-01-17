// Re-export all UI components
export {
	default as Toast,
	toast,
	addToast,
	removeToast,
	type ToastType,
	type ToastAction,
	type ToastOptions,
} from './components/Toast.svelte';
export { default as ConfirmModal } from './components/ConfirmModal.svelte';
export { default as AnimatedNumber } from './components/AnimatedNumber.svelte';
export { default as CompareSlider } from './components/CompareSlider.svelte';
export { default as Footer } from './components/Footer.svelte';

// Motion animation utilities
export {
	// Utility functions
	prefersReducedMotion,
	safeAnimate,
	// Preset animations
	fadeIn,
	fadeOut,
	slideUp,
	slideDown,
	scaleIn,
	scaleOut,
	staggerChildren,
	pulse,
	shake,
	bounce,
	// Progress animations
	animateProgress,
	animateCounter,
	// List animations
	animateRemove,
	animateAdd,
	animateReorder,
	// Page transitions
	pageEnter,
	animateHero,
	// Motion primitives
	animate,
	stagger,
	spring,
} from './utils/motion';
