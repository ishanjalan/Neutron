<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Toast, toast } from '@neutron/ui';
	import { protectPDF, getOutputFilename, generateThumbnail, getPageCount } from '$lib/utils/pdf';
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import { Lock, Upload, FileText, Download, Trash2, Loader2, CheckCircle, Settings, Eye, EyeOff, Shield } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	interface PDFFile {
		id: string;
		file: File;
		originalUrl: string;
		thumbnail?: string;
		pageCount?: number;
	}

	let pdfFile = $state<PDFFile | null>(null);
	let isProcessing = $state(false);
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let resultBlob = $state<Blob | null>(null);
	let progress = $state(0);
	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	const hasFile = $derived(pdfFile !== null);
	const passwordsMatch = $derived(password === confirmPassword);
	const canProtect = $derived(hasFile && password.length >= 4 && passwordsMatch);

	function generateId(): string {
		return `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function handleFiles(newFiles: File[]) {
		const file = newFiles.find(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
		if (!file) { toast.error('Please select a PDF file'); return; }
		if (pdfFile) URL.revokeObjectURL(pdfFile.originalUrl);

		const newPdf: PDFFile = { id: generateId(), file, originalUrl: URL.createObjectURL(file) };
		try {
			newPdf.thumbnail = await generateThumbnail(file);
			newPdf.pageCount = await getPageCount(file);
		} catch (e) { console.warn('Failed to get PDF metadata:', e); }

		pdfFile = newPdf;
		resultBlob = null;
		toast.success('PDF loaded');
	}

	function removeFile() {
		if (pdfFile) { URL.revokeObjectURL(pdfFile.originalUrl); pdfFile = null; resultBlob = null; }
	}

	async function handleProtect() {
		if (!pdfFile || !canProtect) return;

		isProcessing = true;
		progress = 0;

		try {
			const result = await protectPDF(pdfFile.file, {
				userPassword: password,
				onProgress: (p) => { progress = p; }
			});
			resultBlob = result;
			toast.success('PDF protected with AES-256 encryption!');
		} catch (error) {
			console.error('Protect error:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to protect PDF');
		} finally {
			isProcessing = false;
		}
	}

	function downloadResult() {
		if (!resultBlob || !pdfFile) return;
		const filename = getOutputFilename(pdfFile.file.name, 'protect');
		const url = URL.createObjectURL(resultBlob);
		const a = document.createElement('a');
		a.href = url; a.download = filename;
		document.body.appendChild(a); a.click(); document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handleDragEnter(e: DragEvent) { e.preventDefault(); isDragging = true; }
	function handleDragLeave(e: DragEvent) { e.preventDefault(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) isDragging = false; }
	function handleDragOver(e: DragEvent) { e.preventDefault(); }
	async function handleDrop(e: DragEvent) { e.preventDefault(); isDragging = false; if (e.dataTransfer?.files) await handleFiles(Array.from(e.dataTransfer.files)); }
	function openFilePicker() { fileInput?.click(); }
	async function handleFileInput(e: Event) { const target = e.target as HTMLInputElement; if (target.files) await handleFiles(Array.from(target.files)); target.value = ''; }
</script>

<svelte:head><title>Protect PDF - Smash</title></svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/10 blur-3xl"></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
		<div class="mx-auto max-w-4xl">
			<div class="text-center mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-400 mb-4">
					<Lock class="h-4 w-4" /> Protect PDF
				</div>
				<h1 class="text-3xl font-bold text-surface-100">Password protect your PDF</h1>
				<p class="mt-2 text-surface-500">Secure with AES-256 encryption</p>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<div>
					{#if !hasFile}
						<div role="button" tabindex="0" ondragenter={handleDragEnter} ondragleave={handleDragLeave} ondragover={handleDragOver} ondrop={handleDrop} onclick={openFilePicker} onkeydown={(e) => e.key === 'Enter' && openFilePicker()} class="relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer py-16 {isDragging ? 'border-accent-start bg-accent-start/10 scale-[1.02]' : 'border-surface-700 hover:border-surface-600 bg-surface-900/50'}">
							<input bind:this={fileInput} type="file" accept=".pdf,application/pdf" class="hidden" onchange={handleFileInput} />
							<div class="flex flex-col items-center justify-center gap-4 px-6">
								<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20"><Upload class="h-8 w-8 text-green-400" /></div>
								<p class="text-lg font-medium text-surface-200">Drop a PDF here or click to browse</p>
							</div>
						</div>
					{:else if pdfFile}
						<div class="glass rounded-2xl p-4" in:fly={{ y: 20, duration: 200 }}>
							<div class="flex items-start gap-4">
								<div class="h-24 w-20 rounded-lg bg-surface-800 overflow-hidden flex-shrink-0">
									{#if pdfFile.thumbnail}<img src={pdfFile.thumbnail} alt="" class="w-full h-full object-cover" />{:else}<div class="w-full h-full flex items-center justify-center"><FileText class="h-10 w-10 text-surface-500" /></div>{/if}
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-surface-200 truncate">{pdfFile.file.name}</p>
									<p class="text-sm text-surface-500 mt-1">{formatBytes(pdfFile.file.size)} • {pdfFile.pageCount} pages</p>
									<button onclick={removeFile} class="mt-2 text-sm text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 class="h-3 w-3" /> Remove</button>
								</div>
							</div>
							{#if isProcessing}<div class="mt-4"><div class="h-2 bg-surface-700 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all" style="width: {progress}%"></div></div></div>{/if}
						</div>
						{#if resultBlob}
							<div class="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30" in:fly={{ y: 10, duration: 200 }}>
								<div class="flex items-center justify-between">
									<div>
										<p class="text-green-400 font-medium flex items-center gap-2"><Shield class="h-4 w-4" /> PDF protected!</p>
										<p class="text-xs text-surface-500">Encrypted with AES-256</p>
									</div>
									<button onclick={downloadResult} class="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"><Download class="h-3 w-3" /> Download</button>
								</div>
							</div>
						{/if}
					{/if}
				</div>

				<div class="glass rounded-2xl p-6" in:fly={{ y: 20, delay: 100, duration: 200 }}>
					<h3 class="flex items-center gap-2 text-lg font-semibold text-surface-100 mb-6"><Settings class="h-5 w-5 text-accent-start" /> Password Settings</h3>
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-surface-300 mb-2">Password</label>
							<div class="relative">
								<input type={showPassword ? 'text' : 'password'} bind:value={password} placeholder="Enter password (min 4 characters)" class="w-full rounded-xl bg-surface-800 border border-surface-700 px-4 py-2.5 pr-10 text-surface-100 placeholder:text-surface-600 focus:border-accent-start focus:outline-none" />
								<button type="button" onclick={() => showPassword = !showPassword} class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
									{#if showPassword}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
								</button>
							</div>
						</div>
						<div>
							<label class="block text-sm font-medium text-surface-300 mb-2">Confirm Password</label>
							<input type={showPassword ? 'text' : 'password'} bind:value={confirmPassword} placeholder="Confirm password" class="w-full rounded-xl bg-surface-800 border {password && confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-surface-700'} px-4 py-2.5 text-surface-100 placeholder:text-surface-600 focus:border-accent-start focus:outline-none" />
							{#if password && confirmPassword && !passwordsMatch}
								<p class="text-xs text-red-400 mt-1">Passwords do not match</p>
							{/if}
						</div>
						<div class="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
							<p class="text-xs text-surface-400"><strong class="text-surface-300">Security:</strong> Your PDF will be encrypted with AES-256. Remember your password - it cannot be recovered!</p>
						</div>
					</div>
					<button onclick={handleProtect} disabled={!canProtect || isProcessing} class="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
						{#if isProcessing}<Loader2 class="h-5 w-5 animate-spin" /> Protecting...{:else}<Lock class="h-5 w-5" /> Protect PDF{/if}
					</button>
				</div>
			</div>
		</div>
	</main>
	<Footer />
</div>
<Toast />
