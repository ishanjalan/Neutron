/** Minimum shape every file item must have */
export interface BaseFileItem {
	id: string;
	file: File;
	name: string;
	originalSize: number;
	originalUrl: string;
	status: 'pending' | 'processing' | 'completed' | 'error';
	progress: number;
}

export interface FileStoreOptions<TSettings> {
	/** localStorage key for settings persistence. Omit to disable. */
	settingsKey?: string;
	/** Default settings */
	defaultSettings: TSettings;
	/** Item fields containing object URLs to revoke on remove/clear. Default: ['originalUrl'] */
	urlFields?: string[];
	/** ID prefix, e.g. 'img_', 'vid_' */
	idPrefix?: string;
}

export function createFileStore<TItem extends BaseFileItem, TSettings>(
	options: FileStoreOptions<TSettings>
) {
	const { settingsKey, defaultSettings, urlFields = ['originalUrl'], idPrefix = 'file_' } = options;

	let items = $state<TItem[]>([]);
	let settings = $state<TSettings>(loadSettings());

	function loadSettings(): TSettings {
		if (settingsKey && typeof localStorage !== 'undefined') {
			try {
				const saved = localStorage.getItem(settingsKey);
				if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
			} catch {
				/* ignore */
			}
		}
		return { ...defaultSettings };
	}

	function saveSettings(s: TSettings) {
		if (settingsKey && typeof localStorage !== 'undefined') {
			try {
				localStorage.setItem(settingsKey, JSON.stringify(s));
			} catch {
				/* ignore */
			}
		}
	}

	function generateId(): string {
		return `${idPrefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	function revokeItemUrls(item: TItem) {
		for (const field of urlFields) {
			const url = (item as Record<string, unknown>)[field];
			if (url && typeof url === 'string' && url.startsWith('blob:')) {
				URL.revokeObjectURL(url);
			}
		}
	}

	return {
		get items() {
			return items;
		},
		get settings() {
			return settings;
		},

		// Lower-level helpers exposed for app stores to call
		_setItems(newItems: TItem[]) {
			items = newItems;
		},
		_getItems() {
			return items;
		},
		_getSettings() {
			return settings;
		},
		_setSettings(newSettings: TSettings) {
			settings = newSettings;
		},
		_generateId: generateId,
		_revokeItemUrls: revokeItemUrls,
		_saveSettings: saveSettings,

		updateItem(id: string, updates: Partial<TItem>) {
			items = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
		},

		removeItem(id: string) {
			const item = items.find((i) => i.id === id);
			if (item) revokeItemUrls(item);
			items = items.filter((i) => i.id !== id);
		},

		clearAll() {
			items.forEach((item) => revokeItemUrls(item));
			items = [];
		},

		updateSettings(updates: Partial<TSettings>) {
			settings = { ...settings, ...updates };
			saveSettings(settings);
		},

		getItemById(id: string): TItem | undefined {
			return items.find((i) => i.id === id);
		},
	};
}
