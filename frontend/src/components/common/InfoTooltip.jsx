import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Info } from 'lucide-react'; // Added Info icon import
import { useHelp } from '../../context/HelpContext';

/**
 * A robust, stylish tooltip that uses React Portals to avoid clipping by parent containers.
 * Now integrated with AI Assistant.
 */
const InfoTooltip = ({ content, children, position = 'top', className = "", delay = 600, aiPrompt = null, anchor = null }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, bottom: 0 });
  const triggerRef = useRef(null);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const { openHelp } = useHelp();

  // Resolve the AI prompt from either the legacy string prop or the new anchor object
  const resolvedPrompt = anchor ? anchor.question : aiPrompt;
  // In the future, we can pass anchor.contextTag to openHelp to trigger specific RAG flows
  const resolvedAnchor = anchor;

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isVisible]);

  const handleMouseEnter = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isVisible) return; // Already visible

    showTimerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 300); // Small buffer to move mouse to tooltip
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const handleTooltipMouseLeave = () => {
    handleMouseLeave();
  };

  const handleAiClick = (e) => {
    e.stopPropagation();
    if (resolvedPrompt) {
      // Pass both the text question and the full anchor context (if available)
      openHelp(resolvedPrompt, resolvedAnchor ? { anchorId: resolvedAnchor.id, contextTag: resolvedAnchor.contextTag } : null);
      setIsVisible(false); 
    }
  };

  // Position-specific styles
  const getPositionStyles = () => {
    const gap = 10;
    if (position === 'top') {
      return {
        top: coords.top - gap,
        left: coords.left + coords.width / 2,
        transform: 'translate(-50%, -100%)'
      };
    }
    if (position === 'bottom') {
      return {
        top: coords.bottom + gap,
        left: coords.left + coords.width / 2,
        transform: 'translate(-50%, 0)'
      };
    }
    return {};
  };

  return (
    <>
      <div 
        ref={triggerRef}
        className={`inline-flex items-center cursor-help transition-colors text-slate-400 hover:text-indigo-500 ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children || <Info size={14} className="stroke-[2.5px]" />} {/* Render default Info icon if no children */}
      </div>
      
      {isVisible && (content || resolvedPrompt) && createPortal(
        <div 
          style={getPositionStyles()}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          className="fixed z-[9999] w-52 px-3.5 py-2.5 bg-slate-900 border border-white/10 text-white text-[10px] font-medium leading-relaxed rounded-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
        >
          <div className="flex flex-col gap-2">
            <div>{content}</div>
            
            {resolvedPrompt && (
              <button 
                onClick={handleAiClick}
                className="mt-1 flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors pointer-events-auto group/ai"
              >
                <Sparkles size={12} className="group-hover/ai:scale-110 transition-transform" />
                <span className="font-bold border-b border-indigo-400/30">Ask AI Assistant</span>
              </button>
            )}
          </div>
          
          {/* Decorative Arrow - Positioned exactly below/above bubble center */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-900 border-white/10 rotate-45 ${
              position === 'top' 
                ? 'top-full -mt-1.25 border-r border-b' 
                : 'bottom-full -mb-1.25 border-l border-t'
            }`}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default InfoTooltip;
