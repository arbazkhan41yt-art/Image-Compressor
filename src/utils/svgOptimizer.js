import { optimize } from 'svgo';

export const optimizeSVG = (svgContent, options = {}) => {
  const {
    removeDimensions = false,
    replaceFill = false,
    minify = true,
    prettify = false
  } = options;

  const plugins = [
    'preset-default',
    {
      name: 'removeViewBox',
      active: false
    },
    {
      name: 'removeDimensions',
      active: removeDimensions
    },
    {
      name: 'removeXMLNS',
      active: false
    },
    {
      name: 'removeXMLProcInst',
      active: minify
    },
    {
      name: 'removeComments',
      active: minify
    },
    {
      name: 'removeMetadata',
      active: minify
    },
    {
      name: 'removeTitle',
      active: minify
    },
    {
      name: 'removeDesc',
      active: minify
    },
    {
      name: 'removeUselessDefs',
      active: true
    },
    {
      name: 'removeEditorsNSData',
      active: true
    },
    {
      name: 'removeEmptyAttrs',
      active: true
    },
    {
      name: 'removeHiddenElems',
      active: true
    },
    {
      name: 'removeEmptyText',
      active: true
    },
    {
      name: 'removeEmptyContainers',
      active: true
    },
    {
      name: 'cleanupEnableBackground',
      active: true
    },
    {
      name: 'convertStyleToAttrs',
      active: true
    },
    {
      name: 'convertColors',
      active: true
    },
    {
      name: 'convertPathData',
      active: true
    },
    {
      name: 'convertTransform',
      active: true
    },
    {
      name: 'removeUnknownsAndDefaults',
      active: true
    },
    {
      name: 'removeNonInheritableGroupAttrs',
      active: true
    },
    {
      name: 'removeUselessStrokeAndFill',
      active: true
    },
    {
      name: 'removeUnusedNS',
      active: true
    },
    {
      name: 'cleanupNumericValues',
      active: true
    },
    {
      name: 'moveElemsAttrsToGroup',
      active: true
    },
    {
      name: 'moveGroupAttrsToElems',
      active: true
    },
    {
      name: 'collapseGroups',
      active: true
    },
    {
      name: 'mergePaths',
      active: true
    }
  ];

  try {
    const result = optimize(svgContent, {
      plugins,
      js2svg: {
        pretty: prettify,
        indent: prettify ? 2 : 0
      }
    });

    let optimizedSvg = result.data;

    // Replace fill with currentColor if requested
    if (replaceFill) {
      optimizedSvg = optimizedSvg.replace(/fill="[^"]*"/g, 'fill="currentColor"');
      optimizedSvg = optimizedSvg.replace(/fill='[^']*'/g, "fill='currentColor'");
    }

    return optimizedSvg;
  } catch (error) {
    console.error('SVG optimization error:', error);
    throw new Error('Failed to optimize SVG: ' + error.message);
  }
};

export const convertToReactComponent = (svgContent, componentName = 'Icon') => {
  let reactSvg = svgContent;

  // Replace SVG attributes with React-compatible ones
  reactSvg = reactSvg.replace(/class=/g, 'className=');
  reactSvg = reactSvg.replace(/stroke-linecap=/g, 'strokeLinecap=');
  reactSvg = reactSvg.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
  reactSvg = reactSvg.replace(/stroke-width=/g, 'strokeWidth=');
  reactSvg = reactSvg.replace(/fill-rule=/g, 'fillRule=');
  reactSvg = reactSvg.replace(/clip-rule=/g, 'clipRule=');
  reactSvg = reactSvg.replace(/clip-path=/g, 'clipPath=');
  reactSvg = reactSvg.replace(/stop-color=/g, 'stopColor=');
  reactSvg = reactSvg.replace(/stop-opacity=/g, 'stopOpacity=');
  reactSvg = reactSvg.replace(/stroke-dasharray=/g, 'strokeDasharray=');
  reactSvg = reactSvg.replace(/stroke-dashoffset=/g, 'strokeDashoffset=');
  reactSvg = reactSvg.replace(/stroke-opacity=/g, 'strokeOpacity=');
  reactSvg = reactSvg.replace(/stroke-miterlimit=/g, 'strokeMiterlimit=');
  reactSvg = reactSvg.replace(/text-anchor=/g, 'textAnchor=');
  reactSvg = reactSvg.replace(/marker-start=/g, 'markerStart=');
  reactSvg = reactSvg.replace(/marker-mid=/g, 'markerMid=');
  reactSvg = reactSvg.replace(/marker-end=/g, 'markerEnd=');
  reactSvg = reactSvg.replace(/fill-opacity=/g, 'fillOpacity=');
  reactSvg = reactSvg.replace(/xml:base=/g, 'xmlBase=');
  reactSvg = reactSvg.replace(/xml:lang=/g, 'xmlLang=');
  reactSvg = reactSvg.replace(/xml:space=/g, 'xmlSpace=');
  reactSvg = reactSvg.replace(/xmlns:xlink=/g, 'xmlnsXlink=');
  reactSvg = reactSvg.replace(/xlink:href=/g, 'xlinkHref=');
  reactSvg = reactSvg.replace(/xlink:show=/g, 'xlinkShow=');
  reactSvg = reactSvg.replace(/xlink:title=/g, 'xlinkTitle=');
  reactSvg = reactSvg.replace(/xlink:type=/g, 'xlinkType=');

  // Remove XML declaration and DOCTYPE
  reactSvg = reactSvg.replace(/<\?xml[^>]*>\n?/g, '');
  reactSvg = reactSvg.replace(/<!DOCTYPE[^>]*>\n?/g, '');

  // Remove comments
  reactSvg = reactSvg.replace(/<!--[\s\S]*?-->/g, '');

  // Extract SVG attributes
  const svgMatch = reactSvg.match(/<svg([^>]*)>/);
  if (svgMatch) {
    const svgAttributes = svgMatch[1];
    const svgContent = reactSvg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');

    // Create React component
    const component = `import React from 'react';

const ${componentName} = (props) => (
  <svg${svgAttributes} {...props}>
${svgContent}
  </svg>
);

export default ${componentName};`;

    return component;
  }

  return reactSvg;
};

export const convertToTailwindConfig = (svgContent) => {
  // This is a simplified version - in a real implementation,
  // you might want to extract more sophisticated styling rules
  const tailwindConfig = {
    svg: svgContent,
    suggestions: [
      'Use text-current for currentColor fill',
      'Use w-* and h-* for sizing',
      'Use stroke-* for stroke colors',
      'Use fill-* for fill colors'
    ]
  };

  return tailwindConfig;
};

export const getFileSize = (content) => {
  return new Blob([content]).size;
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};