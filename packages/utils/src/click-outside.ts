/**
 * Svelte action: call `onclose` when the user presses outside the element or hits Escape.
 *
 * Use this for dropdowns instead of a `fixed inset-0` backdrop button — inside a
 * `.glass` card (backdrop-filter) `fixed` is positioned relative to the card, not
 * the viewport, so the backdrop only covered the card and outside clicks never closed it.
 */
export function clickOutside(node: HTMLElement, onclose: () => void) {
	let close = onclose;

	const onPointerDown = (e: PointerEvent) => {
		if (e.target instanceof Node && !node.contains(e.target)) close();
	};
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') close();
	};

	document.addEventListener('pointerdown', onPointerDown, true);
	document.addEventListener('keydown', onKeyDown);

	return {
		update(next: () => void) {
			close = next;
		},
		destroy() {
			document.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('keydown', onKeyDown);
		},
	};
}
