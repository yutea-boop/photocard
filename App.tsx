import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { 
  Upload, 
  Trash2, 
  X, 
  Image as ImageIcon, 
  Camera, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  Move, 
  Eye, 
  Download,
  Share2
} from 'lucide-react';

// === TypeScript Interfaces ===
interface BinderPageProps {
  cards: (string | null)[];
  pageIndex: number;
  isExporting?: boolean;
  readOnly?: boolean;
  onSlotClick?: (indexOnPage: number, e: React.MouseEvent | React.TouchEvent) => void;
  onDelete?: (indexOnPage: number) => void;
  draggedIndex?: number | null;
}

interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  draggedData: string | null;
  x: number;
  y: number;
}

// Declare html2canvas on window for TypeScript
declare global {
  interface Window {
    html2canvas: any;
  }
}

// === CSS Styles ===
const styles = `
  @keyframes pageFlipNext {
    0% { transform: rotateY(90deg); opacity: 0; }
    100% { transform: rotateY(0deg); opacity: 1; }
  }
  @keyframes pageFlipPrev {
    0% { transform: rotateY(-90deg); opacity: 0; }
    100% { transform: rotateY(0deg); opacity: 1; }
  }
  .animate-flip-next {
    transform-origin: left center;
    animation: pageFlipNext 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
  }
  .animate-flip-prev {
    transform-origin: left center;
    animation: pageFlipPrev 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
  }
  .perspective-container {
    perspective: 2000px;
  }
  
  /* Basic selection prevention for the UI */
  .no-select {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  /* === CRITICAL: Force allow save for generated images === */
  .force-allow-save {
    -webkit-touch-callout: default !important;
    -webkit-user-select: text !important;
    -khtml-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
    user-select: text !important;
    pointer-events: auto !important;
    touch-action: auto !important;
    cursor: context-menu !important;
    z-index: 9999 !important;
    position: relative;
  }
`;

// === Sub-component: Single Page View ===
const BinderPage = forwardRef<HTMLDivElement, BinderPageProps>(({ 
  cards, 
  pageIndex, 
  isExporting = false, 
  readOnly = false,
  onSlotClick,
  onDelete,
  draggedIndex
}, ref) => {

  const containerStyle: React.CSSProperties = {
    background: 'linear-gradient(to right, #e2e8f0 0%, #f1f5f9 10%, #e2e8f0 100%)',
    boxShadow: isExporting ? 'none' : undefined,
    // When exporting, force fixed width. When editing, use responsive width.
    ...(isExporting ? { width: '800px', height: '1100px', padding: '60px' } : {}),
    maxWidth: '100%'
  };

  return (
    <div 
      ref={ref}
      className={`relative bg-slate-200 rounded-r-2xl shadow-2xl flex border-l-8 border-slate-300 mx-auto overflow-hidden transition-transform duration-300
        ${readOnly ? 'shadow-[20px_20px_60px_rgba(0,0,0,0.5)]' : ''} 
        ${!isExporting ? 'no-select' : ''}
        ${isExporting ? '' : 'p-4 md:p-8 w-full md:w-[600px] aspect-[3/4]'}
      `}
      style={containerStyle}
    >
      {/* Binder Ring Holes */}
      <div className="absolute left-2 top-0 bottom-0 w-8 flex flex-col justify-evenly items-center z-10 pointer-events-none">
        {[1, 2, 3].map((_, i) => (
          <div key={i} className="w-5 h-5 rounded-full bg-slate-800 shadow-inner ring-1 ring-slate-400/50"></div>
        ))}
      </div>

      {/* Lighting overlay for realism */}
      <div className="absolute inset-0 pointer-events-none z-20 rounded-r-2xl bg-gradient-to-r from-white/20 to-transparent mix-blend-overlay"></div>

      {/* Grid Content */}
      <div className={`grid grid-cols-3 gap-3 ${isExporting ? 'gap-6' : 'gap-3'} pl-6 w-full h-full`}>
        {cards.map((cardImage, i) => {
          const currentGlobalIndex = (pageIndex * 9) + i;
          const isBeingDragged = draggedIndex === currentGlobalIndex;

          return (
            <div 
              key={i}
              data-slot-index={currentGlobalIndex}
              className={`relative aspect-[2/3] bg-white rounded-md shadow-sm overflow-hidden group border border-slate-200/60 transition-opacity duration-200
                ${isBeingDragged ? 'opacity-30' : 'opacity-100'}
              `}
              onClick={(e) => !readOnly && !isExporting && onSlotClick && onSlotClick(i, e)}
            >
              {cardImage ? (
                <>
                  <img 
                    src={cardImage} 
                    alt={`Card ${i + 1}`} 
                    className="w-full h-full object-cover pointer-events-none select-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/20 pointer-events-none z-10"></div>
                  
                  {!isExporting && !readOnly && !isBeingDragged && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete && onDelete(i);
                      }}
                      className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20 pointer-events-auto"
                      onTouchEnd={(e) => e.stopPropagation()}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </>
              ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center text-slate-300 transition-colors ${readOnly ? '' : 'hover:bg-slate-50 cursor-pointer'}`}>
                  {!readOnly && !isExporting && (
                    <>
                      <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                      <span className="text-xs font-medium">點擊上傳</span>
                    </>
                  )}
                </div>
              )}
              {/* Card glossy overlay */}
              <div className="absolute inset-0 border border-white/40 pointer-events-none z-10 rounded-md"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

BinderPage.displayName = 'BinderPage';

const BinderApp = () => {
  // === State ===
  const [allCards, setAllCards] = useState<(string | null)[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false, draggedIndex: null, draggedData: null, x: 0, y: 0
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');

  // === Refs ===
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const touchSwipeStartRef = useRef<number | null>(null);

  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.max(1, Math.ceil(allCards.length / ITEMS_PER_PAGE));
  const hasPhotos = allCards.some(card => card !== null);

  // === Effects ===

  // Lock body scroll during drag
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };

    if (dragState.isDragging) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.addEventListener('touchmove', preventDefault, { passive: false });
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.removeEventListener('touchmove', preventDefault);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.removeEventListener('touchmove', preventDefault);
    };
  }, [dragState.isDragging]);

  // === Helper Functions ===

  const getCardsForPage = (pageIdx: number) => {
    const startIndex = pageIdx * ITEMS_PER_PAGE;
    const pageCards = allCards.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    // Fill remaining slots with null
    return [...pageCards, ...Array(ITEMS_PER_PAGE - pageCards.length).fill(null)];
  };

  // === Handlers: Upload ===

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    // Process all files
    const newPhotos = await Promise.all(files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
    }));

    setAllCards(prev => {
      // Filter out nulls before appending if any
      const cleanedPrev = prev.filter(c => c !== null); 
      const updated = [...cleanedPrev, ...newPhotos];
      
      // Auto jump to the last page added
      const newLastPage = Math.max(0, Math.ceil(updated.length / ITEMS_PER_PAGE) - 1);
      setTimeout(() => setCurrentPage(newLastPage), 100);
      
      return updated;
    });
    e.target.value = '';
  };

  const handleSingleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // We store the target index in the dataset of the input
    const targetIndex = parseInt(e.target.dataset.uploadIndex || '0', 10);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setAllCards(prev => {
        const updated = [...prev];
        // Expand array if index is out of bounds
        while (updated.length <= targetIndex) {
            updated.push(null);
        }
        updated[targetIndex] = event.target?.result as string;
        return updated;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // === Handlers: Drag & Drop (Touch/Mouse Unified Logic) ===

  const startDrag = (clientX: number, clientY: number, indexOnPage: number) => {
    dragStartPosRef.current = { x: clientX, y: clientY };
    const globalIndex = currentPage * ITEMS_PER_PAGE + indexOnPage;
    
    // 500ms delay for "Long Press" detection
    touchTimerRef.current = setTimeout(() => {
      isDraggingRef.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      setDragState({ 
        isDragging: true, 
        draggedIndex: globalIndex, 
        draggedData: allCards[globalIndex] || null, 
        x: clientX, 
        y: clientY 
      });
    }, 400);
  };

  const handleTouchStart = (e: React.TouchEvent, indexOnPage: number) => {
    if (isPreviewMode) return;
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY, indexOnPage);
  };

  const handleMouseDown = (e: React.MouseEvent, indexOnPage: number) => {
    if (isPreviewMode) return;
    startDrag(e.clientX, e.clientY, indexOnPage);
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (isDraggingRef.current) {
      setDragState(prev => ({ ...prev, x: clientX, y: clientY }));
    } else {
      // Cancel long press if moved too much before timer fires
      const dx = Math.abs(clientX - dragStartPosRef.current.x);
      const dy = Math.abs(clientY - dragStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        if (touchTimerRef.current) { 
          clearTimeout(touchTimerRef.current); 
          touchTimerRef.current = null; 
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPreviewMode) return;
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    moveDrag(e.clientX, e.clientY);
  };

  const endDrag = (e: React.TouchEvent | React.MouseEvent | MouseEvent | TouchEvent) => {
    if (isPreviewMode) return;
    if (touchTimerRef.current) { 
      clearTimeout(touchTimerRef.current); 
      touchTimerRef.current = null; 
    }
    
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      
      let clientX, clientY;
      if ('changedTouches' in e) {
          clientX = e.changedTouches[0].clientX;
          clientY = e.changedTouches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }

      setDragState(prev => ({ ...prev, isDragging: false }));
      
      // Hit testing
      setTimeout(() => {
        const element = document.elementFromPoint(clientX, clientY);
        const slot = element?.closest('[data-slot-index]');
        
        if (slot) {
          const targetGlobalIndex = parseInt(slot.getAttribute('data-slot-index') || '-1', 10);
          const sourceGlobalIndex = dragState.draggedIndex;

          if (targetGlobalIndex !== -1 && sourceGlobalIndex !== null && targetGlobalIndex !== sourceGlobalIndex) {
            setAllCards(prev => {
              const updated = [...prev];
              const maxIndex = Math.max(sourceGlobalIndex, targetGlobalIndex);
              
              // Ensure array is large enough
              while (updated.length <= maxIndex) updated.push(null);
              
              // Swap
              const temp = updated[sourceGlobalIndex];
              updated[sourceGlobalIndex] = updated[targetGlobalIndex];
              updated[targetGlobalIndex] = temp;
              
              // Clean trailing nulls if we want, but keeping grid structure is usually better
              // Let's trim trailing nulls to keep count accurate
              let i = updated.length - 1;
              while (i >= 0 && updated[i] === null) { updated.pop(); i--; }
              
              return updated;
            });
          }
        }
        setDragState({ isDragging: false, draggedIndex: null, draggedData: null, x: 0, y: 0 });
      }, 50);
    }
  };

  const handleSlotClick = (indexOnPage: number, e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current) {
      const targetGlobalIndex = currentPage * ITEMS_PER_PAGE + indexOnPage;
      if (fileInputRef.current) {
        fileInputRef.current.dataset.uploadIndex = targetGlobalIndex.toString();
        fileInputRef.current.click();
      }
    }
  };

  const removeCard = (indexOnPage: number) => {
    const globalIndex = currentPage * ITEMS_PER_PAGE + indexOnPage;
    setAllCards(prev => {
      const updated = [...prev];
      updated.splice(globalIndex, 1);
      
      const newTotalPages = Math.max(1, Math.ceil(updated.length / ITEMS_PER_PAGE));
      if (currentPage >= newTotalPages) setCurrentPage(newTotalPages - 1);
      
      return updated;
    });
  };

  // === Handlers: Generation ===

  const handleGenerateAll = async () => {
    if (!window.html2canvas) { 
        alert('正在初始化，請稍後再試'); 
        return; 
    }
    if (allCards.length === 0) { 
        alert('請先新增圖片'); 
        return; 
    }

    setIsGenerating(true);
    try {
      // Wait for React to render the hidden export views
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const images: string[] = [];
      for (let i = 0; i < totalPages; i++) {
        const element = exportRefs.current[i];
        if (element) {
          const canvas = await window.html2canvas(element, {
            scale: 2, // High resolution
            backgroundColor: null,
            useCORS: true,
            logging: false,
            allowTaint: true
          });
          images.push(canvas.toDataURL('image/png', 0.9));
        }
      }
      setGeneratedImages(images);
    } catch (error) {
      console.error('失敗:', error);
      alert('失敗，請再試一次');
    } finally {
      setIsGenerating(false);
    }
  };

  // === Handlers: Sharing ===

  const handleShare = async (imgSrc: string, index: number) => {
    try {
      const response = await fetch(imgSrc);
      const blob = await response.blob();
      const file = new File([blob], `binder-page-${index + 1}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `我的卡冊 第 ${index + 1} 頁`,
          text: '你我本無緣，全靠我花錢✨',
          files: [file],
        });
      } else {
        // Fallback for desktop or unsupported browsers
        const link = document.createElement('a');
        link.href = imgSrc;
        link.download = `binder-page-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('此裝置不支援分享功能，將自動下載圖片。');
      // Fallback
      const link = document.createElement('a');
      link.href = imgSrc;
      link.download = `binder-page-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // === Handlers: Navigation & Preview ===

  const goToPrevPage = () => setCurrentPage(p => Math.max(0, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(totalPages - 1, p + 1));
  
  const openPreview = () => { 
      setPreviewPage(currentPage); 
      setIsPreviewMode(true); 
  };
  
  const closePreview = () => { 
      setIsPreviewMode(false); 
      setCurrentPage(previewPage); 
  };

  const handlePreviewSwipeStart = (e: React.TouchEvent) => { 
      touchSwipeStartRef.current = e.touches[0].clientX; 
  };
  
  const handlePreviewSwipeEnd = (e: React.TouchEvent) => {
    if (!touchSwipeStartRef.current) return;
    const diff = touchSwipeStartRef.current - e.changedTouches[0].clientX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0 && previewPage < totalPages - 1) { 
          setFlipDirection('next'); 
          setPreviewPage(p => p + 1); 
      } else if (diff < 0 && previewPage > 0) { 
          setFlipDirection('prev'); 
          setPreviewPage(p => p - 1); 
      }
    }
    touchSwipeStartRef.current = null;
  };

  return (
    <div 
      className={`min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4 font-sans text-slate-800 select-none`}
      // Global listeners for drag continuity
      onTouchMove={handleTouchMove}
      onTouchEnd={endDrag}
      onMouseMove={(e) => isDraggingRef.current && handleMouseMove(e)}
      onMouseUp={endDrag}
    >
      <style>{styles}</style>
      
      {/* Hidden Inputs */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleSingleUploadChange} 
        className="hidden" 
      />

      {/* Drag Ghost Element */}
      {dragState.isDragging && (
        <div 
          className="fixed z-[9999] pointer-events-none rounded-md shadow-2xl overflow-hidden ring-4 ring-pink-500 opacity-90"
          style={{ 
            left: dragState.x, 
            top: dragState.y, 
            width: '90px', 
            height: '135px', 
            transform: 'translate(-50%, -50%) rotate(5deg) scale(1.1)' 
          }}
        >
          {dragState.draggedData ? (
            <img src={dragState.draggedData} className="w-full h-full object-cover" alt="dragging" />
          ) : (
            <div className="w-full h-full bg-white flex items-center justify-center">
              <Move className="w-8 h-8 text-pink-500" />
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-2 mb-2 tracking-tight">
          <Camera className="w-8 h-8 text-pink-500" />
          你我本無緣，全靠我花錢
        </h1>
        <p className="text-slate-500 mb-2">已收集 {allCards.filter(Boolean).length} 張珍藏小卡</p>
        <p className="text-xs text-slate-500 bg-white/50 inline-block px-3 py-1 rounded-full border border-slate-200">
          💡 小撇步：長按照片後可「拖曳」交換位置
        </p>
      </header>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-8 justify-center w-full max-w-xl">
        <div className="relative group">
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleBatchUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
          />
          <button className="flex items-center gap-2 bg-blue-600 group-hover:bg-blue-700 text-white px-5 py-3 rounded-full font-medium shadow-lg transition-transform active:scale-95">
            <Upload className="w-5 h-5" /> 上傳
          </button>
        </div>
        
        <button 
          onClick={openPreview} 
          disabled={!hasPhotos}
          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-5 py-3 rounded-full font-medium shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye className="w-5 h-5" /> 預覽
        </button>
        
        <button 
          onClick={handleGenerateAll} 
          disabled={allCards.length === 0 || isGenerating} 
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-pink-200 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? <span className="animate-spin w-5 h-5 block border-2 border-white/30 border-t-white rounded-full"></span> : <CheckCircle className="w-5 h-5" />}
          {isGenerating ? '生成中...' : '生成圖片'}
        </button>
      </div>

      {/* Main Binder Display */}
      <div className="w-full max-w-4xl flex flex-col items-center">
        <div className="w-full flex justify-center p-2">
            <div 
              className="touch-none"
              // Only attach drag listeners to the container to detect which slot started the drag
              onTouchStart={(e) => { 
                const slot = (e.target as HTMLElement).closest('[data-slot-index]'); 
                if (slot) handleTouchStart(e, parseInt(slot.getAttribute('data-slot-index') || '0', 10) % 9); 
              }}
              onMouseDown={(e) => { 
                const slot = (e.target as HTMLElement).closest('[data-slot-index]'); 
                if (slot) handleMouseDown(e, parseInt(slot.getAttribute('data-slot-index') || '0', 10) % 9); 
              }}
            >
              <BinderPage 
                cards={getCardsForPage(currentPage)} 
                pageIndex={currentPage} 
                onSlotClick={handleSlotClick} 
                onDelete={removeCard} 
                draggedIndex={dragState.draggedIndex} 
              />
            </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-6 mt-8 bg-white px-6 py-3 rounded-full shadow-sm border border-slate-100">
            <button onClick={goToPrevPage} disabled={currentPage === 0} className="p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-slate-600">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="font-medium text-slate-600 min-w-[100px] text-center">
              第 {currentPage + 1} 頁 / 共 {totalPages} 頁
            </span>
            <button onClick={goToNextPage} disabled={currentPage === totalPages - 1} className="p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-slate-600">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Preview Overlay (Flip Book) */}
      {isPreviewMode && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center overflow-hidden touch-none"
          onTouchStart={handlePreviewSwipeStart} 
          onTouchEnd={handlePreviewSwipeEnd}
        >
          <button 
            onClick={closePreview} 
            className="absolute top-4 right-4 md:top-6 md:right-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-colors z-[110]"
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="perspective-container w-full h-full flex items-center justify-center p-4">
            {previewPage > 0 && (
              <div 
                className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-white pointer-events-auto cursor-pointer transition-colors"
                onClick={(e) => { e.stopPropagation(); setFlipDirection('prev'); setPreviewPage(p => p - 1); }}
              >
                <ChevronLeft className="w-10 h-10" />
              </div>
            )}
            
            <div key={previewPage} className={`transform-style-3d ${flipDirection === 'next' ? 'animate-flip-next' : 'animate-flip-prev'}`}>
              <BinderPage cards={getCardsForPage(previewPage)} pageIndex={previewPage} readOnly={true} />
            </div>
            
            {previewPage < totalPages - 1 && (
              <div 
                className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-white pointer-events-auto cursor-pointer transition-colors"
                onClick={(e) => { e.stopPropagation(); setFlipDirection('next'); setPreviewPage(p => p + 1); }}
              >
                <ChevronRight className="w-10 h-10" />
              </div>
            )}
            
            <div className="absolute bottom-10 text-white/60 font-medium tracking-wider bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
              第 {previewPage + 1} 頁 / 共 {totalPages} 頁
            </div>
          </div>
        </div>
      )}

      {/* Hidden Render Area for Generation */}
      {isGenerating && (
        <div className="fixed top-0 left-[200vw] pointer-events-none opacity-100 z-0">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <div key={idx} className="mb-10">
              <BinderPage 
                ref={el => { exportRefs.current[idx] = el; }} 
                cards={getCardsForPage(idx)} 
                pageIndex={idx} 
                isExporting={true} 
              />
            </div>
          ))}
        </div>
      )}

      {/* Result Modal - Improved with Share Buttons */}
      {generatedImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          // Isolate events to allow native browser context menu
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 flex-shrink-0 bg-white z-20">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                圖片已生成 ({generatedImages.length}張)
              </h3>
              <button onClick={() => setGeneratedImages([])} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col items-center gap-8">
              <div className="w-full bg-blue-50 text-blue-800 px-4 py-3 rounded-xl border border-blue-200 flex items-center justify-center gap-2 shadow-sm flex-shrink-0">
                <Share2 className="w-5 h-5" />
                <span className="font-bold">直接分享你的收藏成果！</span>
              </div>
              
              {generatedImages.map((imgSrc, idx) => (
                <div key={idx} className="w-full flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">第 {idx + 1} 頁</span>
                  <div className="w-full h-auto shadow-lg rounded-lg border border-slate-200 bg-white relative p-1">
                    <img 
                      src={imgSrc} 
                      alt={`Binder Page ${idx + 1}`} 
                      className="w-full h-auto block force-allow-save rounded" 
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-2 w-full max-w-[350px]">
                    <button 
                      onClick={() => handleShare(imgSrc, idx)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md transition-transform active:scale-95"
                    >
                      <Share2 className="w-5 h-5" /> 分享
                    </button>
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = imgSrc;
                        link.download = `binder-page-${idx + 1}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm transition-transform active:scale-95"
                    >
                      <Download className="w-5 h-5" /> 下載
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex-shrink-0 bg-white z-20">
              <button 
                onClick={() => setGeneratedImages([])} 
                className="w-full py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BinderApp;