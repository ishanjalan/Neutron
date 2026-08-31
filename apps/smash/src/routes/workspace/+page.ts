import type { PageLoad } from './$types';

/**
 * Query params (?tool=) aren't available during prerender.
 * The page reads `tool` from the URL in onMount instead.
 */
export const load: PageLoad = () => {
	return { initialTool: null as string | null };
};
