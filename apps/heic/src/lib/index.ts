// Library entry point
export { filesStore } from './stores/files.svelte';
export {
	processFiles,
	cancelProcessing,
	downloadFile,
	downloadAllAsZip,
	isCurrentlyProcessing,
} from './utils/convert';
