<script lang="ts">
	import { Tooltip as UITooltip } from '@neutron/ui';

	interface Props {
		text: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
	}

	const { text, position = 'top' }: Props = $props();
</script>

<UITooltip content={text} {position} />
