import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs';

interface PdfPreviewModalProps {
  file: File;
  onClose: () => void;
  onImageSelect: (image: { data: string; mimeType: string }) => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ file, onClose, onImageSelect }) => {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (processingRef.current) return;
    processingRef.current = true;

    const extractImages = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const numPages = pdf.numPages;
        const images: string[] = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            // FIX: The pdf.js v4 render method expects the canvas element directly via the `canvas` property, not the 2D context via `canvasContext`.
            await page.render({ canvas, viewport: viewport }).promise;
            images.push(canvas.toDataURL('image/jpeg'));
          }
        }
        setPageImages(images);
      } catch (err) {
        console.error("Error processing PDF:", err);
        setError("Failed to process PDF file. It might be corrupted or in an unsupported format.");
      } finally {
        setIsProcessing(false);
      }
    };

    extractImages();
  }, [file]);

  const handleImageSelect = (dataUrl: string) => {
    const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
    const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1);
    onImageSelect({ data: base64Data, mimeType });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-title"
    >
      <div
        className="bg-gray-800 text-gray-300 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 id="pdf-preview-title" className="text-xl font-semibold text-white">Select a Page as Image</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="Close PDF preview"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center h-64">
                <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              <p className="mt-4 text-lg">Processing PDF...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
                <p><strong>Error</strong></p>
                <p>{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pageImages.map((src, index) => (
                <button
                  key={index}
                  onClick={() => handleImageSelect(src)}
                  className="border-2 border-transparent hover:border-blue-500 focus:border-blue-500 rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  <img src={src} alt={`Page ${index + 1}`} className="w-full h-auto object-contain" />
                  <span className="block text-center text-xs bg-gray-900/50 p-1">Page {index + 1}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};