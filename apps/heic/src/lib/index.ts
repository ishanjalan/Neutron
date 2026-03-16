// Library entry point
export { filesStore } from './stores/files.svelte';
export {
	processFiles,
	cancelProcessing,
	downloadFile,
	downloadAllAsZipFiles as downloadAllAsZip,
	isCurrentlyProcessing,
} from './utils/convert';
export { terminatePool } from './utils/worker-pool';
