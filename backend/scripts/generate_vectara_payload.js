const fs = require('fs');
const path = require('path');

const SPEC_FILE = path.join(__dirname, '../specification.md');
const OUTPUT_FILE = path.join(__dirname, '../fintwin_vectara_payload.json');

// Helper to clean text
const cleanText = (text) => {
  return text
    .replace(/\*\*\s*\[DOC_ANCHOR:[^\]]+\]\s*\*\*/g, '') // Remove anchor tags from body text
    .trim();
};

const generatePayload = () => {
  try {
    const rawContent = fs.readFileSync(SPEC_FILE, 'utf-8');
    const lines = rawContent.split('\n');
    
    const rootSection = {
      id: "fintwin-spec-v1.3",
      type: "structured", 
      title: "FinTwin Technical Specification & Logic",
      description: "Core Business Logic, Algorithms, and Financial Models for FinTwin Application.",
      metadata: {
        version: "1.3",
        scope: "Business Logic",
        audience: "AI Agents"
      },
      sections: []
    };

    let currentModule = null;
    let currentSubsection = null;
    let currentBuffer = []; 
    
    const MODULE_REGEX = /^##\s+(.+)/; 
    const SUBSECTION_REGEX = /^###\s+(.+)/; 
    const ANCHOR_REGEX = /\*\*\s*\[DOC_ANCHOR:\s*([^\]]+)\]\s*\*\*/; 

    // Helper: Safely add text to a container
    // Rule: If a container has 'sections', it CANNOT have 'text'.
    // If we need to add text to a container that will have subsections, 
    // we must create an 'Overview' subsection for it.
    const attachTextToContainer = (container, text) => {
        if (!text) return;

        // Special case: If container is null, we are at the Root level (Introduction)
        if (!container) {
             let intro = rootSection.sections.find(s => s.title === "Introduction");
             if (!intro) {
                 intro = {
                     title: "Introduction",
                     text: "",
                     metadata: { type: "intro" }
                 };
                 rootSection.sections.unshift(intro);
             }
             intro.text = (intro.text ? intro.text + "\n\n" : "") + text;
             return;
        }

        // If this is a leaf node (subsection), just add text
        if (container.metadata && container.metadata.type === 'subsection') {
            container.text = (container.text ? container.text + "\n\n" : "") + text;
            return;
        }

        // If this is a Module (which might have subsections later)
        if (container.metadata && container.metadata.type === 'module') {
            // We cannot add text directly if we plan to add sections later.
            // Best practice: Always put module-level text into an "Overview" section
            let overview = container.sections.find(s => s.title === "Overview");
            if (!overview) {
                overview = {
                    title: "Overview",
                    text: "",
                    metadata: { type: "overview" }
                };
                container.sections.unshift(overview);
            }
            overview.text = (overview.text ? overview.text + "\n\n" : "") + text;
            return;
        }
        
        // If Root (Introduction)
        let intro = rootSection.sections.find(s => s.title === "Introduction");
        if (!intro) {
            intro = {
                title: "Introduction",
                text: "",
                metadata: { type: "intro" }
            };
            rootSection.sections.unshift(intro);
        }
        intro.text = (intro.text ? intro.text + "\n\n" : "") + text;
    };

    const flushBuffer = () => {
      if (currentBuffer.length > 0) {
        const text = cleanText(currentBuffer.join('\n'));
        if (text) {
          const target = currentSubsection || currentModule; // Pass null if root
          attachTextToContainer(target, text);
        }
        currentBuffer = [];
      }
    };

    lines.forEach(line => {
      // 1. Detect Module
      const moduleMatch = line.match(MODULE_REGEX);
      if (moduleMatch) {
        flushBuffer();
        
        // Save previous subsection
        if (currentSubsection && currentModule) {
             currentModule.sections.push(currentSubsection);
             currentSubsection = null;
        }
        // Save previous module
        if (currentModule) {
            rootSection.sections.push(currentModule);
        }

        currentModule = {
          title: moduleMatch[1].trim(),
          text: "", // Vectara requires 'text' field even for container sections
          sections: [],
          metadata: { type: "module" }
        };
        return;
      }

      // 2. Detect Subsection
      const subMatch = line.match(SUBSECTION_REGEX);
      if (subMatch) {
        flushBuffer();
        
        if (currentSubsection && currentModule) {
            currentModule.sections.push(currentSubsection);
        }

        currentSubsection = {
          title: subMatch[1].trim(),
          text: "", // Initialize empty
          metadata: { type: "subsection" }
        };
        return;
      }

      // 3. Detect Anchors
      const anchorMatch = line.match(ANCHOR_REGEX);
      if (anchorMatch) {
        const anchorId = anchorMatch[1].trim();
        const target = currentSubsection || currentModule;
        
        if (target) {
            target.metadata = target.metadata || {};
            target.metadata.anchor_id = anchorId; 
        }
        if (line.replace(ANCHOR_REGEX, '').trim() === '') return; 
      }

      // 4. Regular Text
      currentBuffer.push(line);
    });

    // Final flush
    flushBuffer();
    if (currentSubsection && currentModule) currentModule.sections.push(currentSubsection);
    if (currentModule) rootSection.sections.push(currentModule);

    // Write output
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rootSection, null, 2));
    console.log(`✅ Successfully generated structured payload at: ${OUTPUT_FILE}`);

  } catch (err) {
    console.error('Error parsing markdown:', err);
  }
};

generatePayload();
