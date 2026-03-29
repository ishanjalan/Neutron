import type { SEOFaq } from '@neutron/ui';

interface PageSEO {
	intro: string;
	faqs: SEOFaq[];
}

export const compressSEO: PageSEO = {
	intro:
		'Reduce PDF file size in your browser using Ghostscript — the same engine used by professional print workflows. Choose from four quality presets. No file ever leaves your device.',
	faqs: [
		{
			q: 'How much can I reduce my PDF file size?',
			a: 'Typically 50–90% depending on the content. The Screen preset reduces most PDFs to under 1 MB; eBook and Printer presets balance size against image quality.'
		},
		{
			q: 'Will compressing reduce image quality in my PDF?',
			a: 'The Screen and eBook presets downsample embedded images. The Printer and Prepress presets preserve higher resolution. Choose based on whether the PDF is for screen or print.'
		},
		{
			q: 'Is my PDF safe — do you upload it anywhere?',
			a: 'No upload ever. Smash processes your PDF entirely in your browser using Ghostscript compiled to WebAssembly. No file reaches a server.'
		},
		{
			q: "What's the maximum file size I can compress?",
			a: "There's no hard limit — processing runs in your browser's memory. PDFs over 100 MB may be slow depending on your device."
		},
		{
			q: 'Does it work without an internet connection?',
			a: 'Once the page has loaded, yes. All processing is local. You can bookmark Smash and use it fully offline.'
		}
	]
};

export const mergeSEO: PageSEO = {
	intro:
		'Combine multiple PDF files into a single document in seconds — drag to set the order, then download. No upload, no account, no file size limit.',
	faqs: [
		{
			q: 'Can I control the order of PDFs before merging?',
			a: 'Yes. Drag and drop the files in the list to set the order. Pages are merged exactly as shown.'
		},
		{
			q: 'Is there a limit on how many PDFs I can merge?',
			a: "No hard limit. You can merge as many files as your browser's memory allows."
		},
		{
			q: 'Will bookmarks and hyperlinks be preserved?',
			a: 'Internal links within each individual PDF are preserved. Cross-document bookmarks are not combined.'
		},
		{
			q: 'Can I merge password-protected PDFs?',
			a: "You'll need to unlock them first using Smash's Unlock PDF tool, then merge."
		},
		{
			q: 'Is this safe for confidential documents?',
			a: 'Yes — all processing happens in your browser. No file is ever uploaded to a server.'
		}
	]
};

export const splitSEO: PageSEO = {
	intro:
		'Extract specific pages from a PDF using a visual page picker — get exactly the pages you need without any upload or account.',
	faqs: [
		{
			q: 'Can I extract non-consecutive pages?',
			a: 'Yes. The visual page picker lets you select any combination of pages in any order.'
		},
		{
			q: 'What happens to the original PDF?',
			a: 'Nothing — the original file is never modified. Split creates a new PDF containing only your selected pages.'
		},
		{
			q: 'Can I split a PDF into multiple separate files at once?',
			a: 'Run the split operation multiple times with different page selections to produce separate files.'
		},
		{
			q: 'Is there a page count limit?',
			a: 'No limit. Smash handles PDFs of any length in the browser.'
		},
		{
			q: 'Do I need an account?',
			a: 'No account, no email, no sign-up. Drop a file and split.'
		}
	]
};

export const rotateSEO: PageSEO = {
	intro:
		'Rotate individual PDF pages or an entire document by 90, 180, or 270 degrees — changes are non-destructive until you download.',
	faqs: [
		{
			q: 'Can I rotate specific pages instead of the whole PDF?',
			a: 'Yes — select individual pages using the page picker and rotate only those.'
		},
		{
			q: 'Does rotating affect the file size?',
			a: 'Minimal impact. Rotation is stored as metadata without re-encoding any content.'
		},
		{
			q: 'Can I rotate a scanned PDF?',
			a: 'Yes — rotation works on all PDFs including scanned documents and image-only PDFs.'
		},
		{
			q: 'Is the rotation permanent?',
			a: "Not until you download. You can adjust rotations freely before saving the final file."
		},
		{
			q: 'Does it work on encrypted PDFs?',
			a: "You'll need to unlock the PDF first using Smash's Unlock tool."
		}
	]
};

export const deleteSEO: PageSEO = {
	intro:
		'Remove unwanted pages from a PDF with a visual thumbnail picker — see every page before deleting, with no upload required.',
	faqs: [
		{
			q: 'Can I delete multiple pages at once?',
			a: 'Yes — select multiple pages in the picker and remove them all in one step.'
		},
		{
			q: 'What if I accidentally select the wrong page?',
			a: 'Deselect any page before downloading — no changes are applied until you save.'
		},
		{
			q: 'Does the page count affect processing speed?',
			a: 'For most PDFs under 200 pages, deletion is near-instant in the browser.'
		},
		{
			q: 'Can I preview pages before deleting?',
			a: 'Thumbnails are rendered for every page so you can confirm your selection visually.'
		},
		{
			q: 'Is this safe for confidential documents?',
			a: 'Yes — files are processed entirely in your browser. No data is ever sent to a server.'
		}
	]
};

export const reorderSEO: PageSEO = {
	intro:
		'Drag and drop to rearrange pages in a PDF — see thumbnail previews of every page as you reorder, then download the new version.',
	faqs: [
		{
			q: 'Is there a limit on how many pages I can reorder?',
			a: "No — Smash handles PDFs of any length. Very large PDFs may take a moment to render all thumbnails."
		},
		{
			q: 'Can I undo a reorder?',
			a: 'Drag pages back to their original positions before downloading to undo any change.'
		},
		{
			q: 'Does reordering affect content quality?',
			a: 'No — page content is never re-encoded. Only the page order changes.'
		},
		{
			q: 'Is the original file modified?',
			a: 'Never. Smash reads your file in the browser and creates a new PDF on download.'
		},
		{
			q: 'Can I combine reordering with other tools?',
			a: 'Download the reordered PDF and open it in any other Smash tool for further editing.'
		}
	]
};

export const reversePagesSEO: PageSEO = {
	intro:
		'Reverse the page order of any PDF in one click — useful for flipping a back-to-front scan or correcting print order.',
	faqs: [
		{
			q: 'What does reversing page order do exactly?',
			a: 'It outputs a new PDF with pages in the opposite order — the last page becomes the first, and so on.'
		},
		{
			q: 'When would I need to reverse a PDF?',
			a: 'Common uses: correcting a document scanned back-to-front, or printing a booklet that needs to be reversed for binding.'
		},
		{
			q: 'Can I reverse only part of a PDF?',
			a: "Use the Split tool to extract the pages you want, reverse them, then use Merge to recombine."
		},
		{
			q: 'Does reversing affect image quality?',
			a: 'No — page content is not modified, only the order.'
		},
		{
			q: 'Is there a file size limit?',
			a: 'No upload means no server-side file size limits. Processing is limited only by your browser memory.'
		}
	]
};

export const protectSEO: PageSEO = {
	intro:
		'Encrypt your PDF with AES-128 password protection — secure sensitive documents before sharing, without uploading them anywhere.',
	faqs: [
		{
			q: 'What encryption standard does Smash use?',
			a: 'AES-128, the same standard used by Adobe Acrobat and most professional PDF software.'
		},
		{
			q: 'Can I also restrict printing and copying?',
			a: 'Yes. Set an owner password to configure custom permissions — restrict printing, copying text, and editing independently.'
		},
		{
			q: 'Will all PDF readers accept the password protection?',
			a: 'Yes — AES-128 is supported by all major PDF viewers including Adobe Acrobat, macOS Preview, and browser-based PDF viewers.'
		},
		{
			q: 'What if I forget the password?',
			a: "There is no recovery option. Choose a password you'll remember or store it in a password manager."
		},
		{
			q: 'Is this strong enough for sensitive documents?',
			a: 'AES-128 is considered secure for typical use cases. For classified or legally sensitive material, consult your organisation\'s information security policy.'
		}
	]
};

export const unlockSEO: PageSEO = {
	intro:
		'Remove password protection from a PDF you own — processed entirely in your browser, no file sent to a server.',
	faqs: [
		{
			q: 'Can Smash unlock any password-protected PDF?',
			a: 'Only if you know the password. Smash decrypts the file using your provided password — it cannot crack or guess unknown passwords.'
		},
		{
			q: "What's the difference between a user password and an owner password?",
			a: 'A user (open) password prevents the file from being opened. An owner password restricts editing, printing, and copying. Smash handles both types.'
		},
		{
			q: 'Is it legal to remove a PDF password?',
			a: 'Yes, if you own the document or have permission from the owner.'
		},
		{
			q: 'Does this work on PDFs with restrictions only and no open password?',
			a: 'Yes — enter the owner password to remove editing and printing restrictions while keeping the file openable.'
		},
		{
			q: 'Will the unlocked PDF be identical to the original?',
			a: 'Yes — content, formatting, images, and bookmarks are all preserved.'
		}
	]
};

export const editMetadataSEO: PageSEO = {
	intro:
		"Edit your PDF's document properties — title, author, subject, and keywords — directly in the browser. Useful for cleaning up scans or correcting attribution.",
	faqs: [
		{
			q: 'What metadata fields can I edit?',
			a: 'Title, author, subject, and keywords. These appear in PDF properties and are indexed by search engines if the PDF is published online.'
		},
		{
			q: 'Does editing metadata change the page content?',
			a: 'No — only the document properties are updated. Pages, images, text, and formatting are untouched.'
		},
		{
			q: 'Why would I edit PDF metadata?',
			a: 'Common uses: correcting author names on scanned documents, removing personal information before sharing, or adding keywords for online discoverability.'
		},
		{
			q: 'Does this remove hidden metadata like GPS or author info from Word?',
			a: 'Only the standard document property fields are modified. Embedded XMP metadata or author information baked in by Word or PowerPoint may persist.'
		},
		{
			q: 'Can I clear all metadata fields?',
			a: 'Leave any field blank and save — that removes the value for that property.'
		}
	]
};

export const watermarkSEO: PageSEO = {
	intro:
		'Add a diagonal text watermark to every page of your PDF — ideal for marking drafts, confidential documents, or proofs before sharing.',
	faqs: [
		{
			q: 'Can I customise the watermark text?',
			a: 'Yes — enter any text, adjust font size, and Smash applies it diagonally across every page.'
		},
		{
			q: 'Can I control the watermark colour or opacity?',
			a: 'The watermark uses a semi-transparent grey by default, readable on both light and dark page backgrounds.'
		},
		{
			q: 'Can I add an image watermark instead of text?',
			a: 'Text watermarks only for now. Image watermarks are a planned feature.'
		},
		{
			q: 'Will the watermark significantly increase file size?',
			a: 'Minimally — text watermarks add only a small amount of PDF vector content per page.'
		},
		{
			q: 'Can someone remove the watermark?',
			a: 'A user with PDF editing software could attempt removal. For stronger protection, combine watermarking with password encryption.'
		}
	]
};

export const ocrSEO: PageSEO = {
	intro:
		'Make scanned PDFs searchable by extracting text with Tesseract OCR — supports over 100 languages, runs entirely in your browser using WebAssembly.',
	faqs: [
		{
			q: 'What is OCR and why do I need it?',
			a: 'Optical Character Recognition reads text from scanned images and makes it selectable and searchable. Scanned PDFs without OCR are essentially images — you cannot search or copy their text.'
		},
		{
			q: 'How accurate is the OCR?',
			a: 'Very high for clean, well-lit scans of printed text. Handwriting, unusual fonts, low-resolution scans, and complex layouts may produce errors.'
		},
		{
			q: 'Which languages does OCR support?',
			a: '100+ languages including English, French, German, Spanish, Russian, Chinese, Arabic, Japanese, and many more.'
		},
		{
			q: 'Will OCR increase my PDF file size?',
			a: 'Yes — OCR adds a text layer on top of the existing scanned images. Expect a modest size increase.'
		},
		{
			q: 'How long does OCR take?',
			a: 'A 10-page scan typically takes 30–60 seconds in the browser depending on resolution and device speed.'
		}
	]
};

export const removeBlankPagesSEO: PageSEO = {
	intro:
		"Automatically detect and remove blank pages from a scanned PDF — save time cleaning up multi-page scans without manual page-by-page review.",
	faqs: [
		{
			q: 'How does Smash detect blank pages?',
			a: "It analyses each page's rendered pixel content. Pages with brightness above a configurable threshold are flagged as blank."
		},
		{
			q: 'What if a page has a faint watermark or light header?',
			a: 'Adjust the detection sensitivity slider. A lower threshold reduces false positives on pages with minimal content.'
		},
		{
			q: 'Can I review which pages will be removed before confirming?',
			a: 'Yes — a preview shows all flagged pages so you can deselect any that should be kept.'
		},
		{
			q: 'Does this work on PDFs with coloured backgrounds?',
			a: 'The detection is optimised for white or near-white backgrounds. Pages with dark or coloured backgrounds may not be detected as blank.'
		},
		{
			q: 'Can I undo after downloading?',
			a: 'Not from the downloaded file, but your original PDF is unchanged. Re-run the tool on the original at any time.'
		}
	]
};

export const addPageNumbersSEO: PageSEO = {
	intro:
		'Add page numbers to any PDF — choose position, starting number, font size, and which pages to include, all processed locally in your browser.',
	faqs: [
		{
			q: 'Can I start numbering from a number other than 1?',
			a: 'Yes — set any starting number. Useful when numbering a chapter that continues from a larger document.'
		},
		{
			q: 'Where can I position the page numbers?',
			a: 'Bottom-left, bottom-centre, bottom-right, top-left, top-centre, or top-right.'
		},
		{
			q: 'Can I skip the first page?',
			a: 'Yes — useful for title pages or cover pages that should not be numbered.'
		},
		{
			q: 'What font is used for page numbers?',
			a: 'Helvetica, which is available in all PDF readers. Font size is adjustable.'
		},
		{
			q: 'Will page numbers overlap my existing content?',
			a: 'Page numbers are placed in the margin area. If your PDF has content right at the edge, there may be overlap — increase the margin offset if needed.'
		}
	]
};

export const fromImagesSEO: PageSEO = {
	intro:
		'Create a PDF from JPG, PNG, or WebP images — drag images into order and download a ready-to-share PDF, no upload or account required.',
	faqs: [
		{
			q: 'What image formats are supported?',
			a: 'JPEG, PNG, and WebP. To use HEIC photos from an iPhone, convert them first with Squish.'
		},
		{
			q: 'Can I reorder images before creating the PDF?',
			a: 'Yes — drag to reorder images before hitting Create PDF.'
		},
		{
			q: 'Can I control the page size?',
			a: 'Each image fills an A4 page scaled to fit. Custom page sizing is not currently supported.'
		},
		{
			q: 'How many images can I combine?',
			a: "No hard limit — processing is constrained only by your device's available memory."
		},
		{
			q: 'Will image quality be preserved?',
			a: 'Yes — images are embedded without re-encoding, preserving their original resolution and quality.'
		}
	]
};

export const toImagesSEO: PageSEO = {
	intro:
		'Convert PDF pages to PNG, JPEG, or WebP images at up to 300 DPI — export every page or select specific ones, directly in your browser.',
	faqs: [
		{
			q: 'What resolution options are available?',
			a: '72 DPI (screen preview), 150 DPI (standard quality), and 300 DPI (print quality). Higher DPI produces larger files.'
		},
		{
			q: 'Which image format should I choose?',
			a: 'PNG for documents with text (lossless, sharp). JPEG for photo-heavy PDFs (smaller file). WebP for a modern balance of quality and size.'
		},
		{
			q: 'Can I export just one page?',
			a: 'Yes — use the page selector to choose specific pages before exporting.'
		},
		{
			q: 'How are multi-page PDFs delivered?',
			a: 'Each page becomes a separate image. Multiple images are delivered as a ZIP file.'
		},
		{
			q: 'Is this useful for presentations or social media?',
			a: 'Yes — converting a presentation PDF to images is a common use case. Use 150 DPI for screen use, 300 DPI if you need to print or zoom in.'
		}
	]
};
