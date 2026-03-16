<script lang="ts">
	import { DropZone as SharedDropZone, type FormatBadge } from '@neutron/ui';
	import { Film } from 'lucide-svelte';

	const FORMAT_COLORS: Record<string, string> = {
		GIF: 'from-pink-500 to-rose-500',
		MP4: 'from-orange-500 to-amber-500',
		WebM: 'from-green-500 to-emerald-500',
		WebP: 'from-blue-500 to-cyan-500',
		PNG: 'from-purple-500 to-pink-500',
		JPG: 'from-orange-500 to-red-500',
		JPEG: 'from-orange-500 to-red-500',
		MOV: 'from-blue-500 to-indigo-500',
		AVI: 'from-cyan-500 to-teal-500',
		APNG: 'from-violet-500 to-purple-500',
	};

	interface Props {
		accept?: string;
		acceptLabel?: string;
		onfiles: (files: File[]) => void;
		compact?: boolean;
	}

	let {
		accept = '.gif,.mp4,.webm,.mov,.webp,.png,.apng',
		acceptLabel = 'GIF, MP4, WebM, MOV, WebP, PNG',
		onfiles,
		compact = false,
	}: Props = $props();

	// Derive formatBadges from acceptLabel (e.g. "PNG, JPG, WebP" or "GIF files only")
	const formatBadges = $derived.by((): FormatBadge[] => {
		const parts = acceptLabel.split(',').map((s) => s.trim());
		return parts.map((part) => {
			const name = part.split(/\s+/)[0] || part;
			const color = FORMAT_COLORS[name] ?? 'from-accent-start to-accent-end';
			return { name, color };
		});
	});
</script>

{#snippet iconSnippet(isDragging: boolean)}
	<Film
		class={isDragging
			? 'text-accent-start h-5 w-5 animate-pulse sm:h-8 sm:w-8'
			: 'text-surface-400 group-hover:text-accent-start h-5 w-5 transition-all sm:h-8 sm:w-8'}
	/>
{/snippet}

<SharedDropZone
	{accept}
	{compact}
	{onfiles}
	allowUrlInput={true}
	{formatBadges}
	title="Drop files here"
	subtitle="click to browse"
	compactLabel="Drop more files or click to browse"
	icon={iconSnippet}
/>
