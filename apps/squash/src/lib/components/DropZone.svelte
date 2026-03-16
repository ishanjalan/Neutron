<script lang="ts">
	import { DropZone as SharedDropZone } from '@neutron/ui';
	import { Film } from 'lucide-svelte';

	interface Props {
		compact?: boolean;
		onfiles: (files: File[]) => void;
	}

	let { compact = false, onfiles }: Props = $props();

	const formatBadges = [
		{ name: 'MP4', color: 'from-orange-500 to-red-500' },
		{ name: 'WebM', color: 'from-green-500 to-emerald-500' },
		{ name: 'MOV', color: 'from-blue-500 to-indigo-500' },
		{ name: 'AVI', color: 'from-purple-500 to-pink-500' },
		{ name: 'MKV', color: 'from-cyan-500 to-teal-500' },
	];
</script>

{#snippet iconSnippet(isDragging: boolean)}
	<Film
		class={isDragging
			? 'text-accent-start h-5 w-5 animate-pulse sm:h-8 sm:w-8'
			: 'text-surface-400 group-hover:text-accent-start h-5 w-5 transition-all sm:h-8 sm:w-8'}
	/>
{/snippet}

<SharedDropZone
	accept=".mp4,.webm,.mov,.avi,.mkv"
	{compact}
	{onfiles}
	{formatBadges}
	title="Drop videos here"
	subtitle="click to browse"
	compactLabel="Drop more videos or click to browse"
	icon={iconSnippet}
/>
