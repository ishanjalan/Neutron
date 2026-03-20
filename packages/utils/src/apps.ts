/**
 * Canonical registry of all Neutron apps.
 *
 * This is the SINGLE source of truth for app URLs, base paths, and metadata.
 * Update here when adding a new app or renaming a deployment path.
 * All Footers, layouts, and cross-app links should import from here.
 */

export type AppId = 'squish' | 'squash' | 'smash' | 'swirl';

export interface NeutronApp {
	id: AppId;
	name: string;
	/** GitHub Pages base path, e.g. "/Squish" */
	basePath: string;
	/** Full production URL (trailing slash) */
	url: string;
	/** GitHub source URL */
	github: string;
	/** Short description */
	description: string;
	/** Tailwind gradient class for the accent */
	gradient: string;
}

const GITHUB_OWNER = 'ishanjalan';
const REPO = 'Neutron';
const PAGES_BASE = `https://${GITHUB_OWNER}.github.io`;

export const NEUTRON_APPS: Record<AppId, NeutronApp> = {
	squish: {
		id: 'squish',
		name: 'Squish',
		basePath: '/Squish',
		url: `${PAGES_BASE}/Squish/`,
		github: `https://github.com/${GITHUB_OWNER}/${REPO}/tree/main/apps/squish`,
		description: 'Image compression',
		gradient: 'linear-gradient(135deg, rgb(16 185 129), rgb(20 184 166))',
	},
	squash: {
		id: 'squash',
		name: 'Squash',
		basePath: '/Squash',
		url: `${PAGES_BASE}/Squash/`,
		github: `https://github.com/${GITHUB_OWNER}/${REPO}/tree/main/apps/squash`,
		description: 'Video compression',
		gradient: 'linear-gradient(135deg, rgb(249 115 22), rgb(251 191 36))',
	},
	smash: {
		id: 'smash',
		name: 'Smash',
		basePath: '/Smash',
		url: `${PAGES_BASE}/Smash/`,
		github: `https://github.com/${GITHUB_OWNER}/${REPO}/tree/main/apps/smash`,
		description: 'PDF tools',
		gradient: 'linear-gradient(135deg, rgb(14 165 233), rgb(34 211 238))',
	},
	swirl: {
		id: 'swirl',
		name: 'Swirl',
		basePath: '/Swirl',
		url: `${PAGES_BASE}/Swirl/`,
		github: `https://github.com/${GITHUB_OWNER}/${REPO}/tree/main/apps/swirl`,
		description: 'GIF tools',
		gradient: 'linear-gradient(135deg, rgb(217 70 239), rgb(244 114 182))',
	},
};

/** Ordered list of all apps for display in Footers and nav */
export const NEUTRON_APPS_LIST: NeutronApp[] = [
	NEUTRON_APPS.squish,
	NEUTRON_APPS.squash,
	NEUTRON_APPS.smash,
	NEUTRON_APPS.swirl,
];
