import grapesjs from 'grapesjs';
import pluginBlocks from 'grapesjs-blocks-basic';
import pluginNavbar from 'grapesjs-navbar';
import pluginCountdown from 'grapesjs-component-countdown';
import pluginForms from 'grapesjs-plugin-forms';
import pluginExport from 'grapesjs-plugin-export';
import pluginAviary from 'grapesjs-aviary';
import pluginFilestack from 'grapesjs-plugin-filestack';

import commands from './commands';
import blocks from './blocks';
import components from './components';
import panels from './panels';
import styles from './styles';

const stopPropagation = e => e.stopPropagation();

export default grapesjs.plugins.add('gjs-preset-webpage','gjs-plugin-ckeditor', (editor, opts = {}) => {
  
  let config = opts;

  let defaults = {

    // CKEditor options
    options: {},

    // Which blocks to add
    blocks: ['link-block', 'quote', 'text-basic'],

    // Modal import title
    modalImportTitle: 'Import',

    // Modal import button text
    modalImportButton: 'Import',

    // Import description inside import modal
    modalImportLabel: '',

    // Default content to setup on import model open.
    // Could also be a function with a dynamic content return (must be a string)
    // eg. modalImportContent: editor => editor.getHtml(),
    modalImportContent: '',

    // Code viewer (eg. CodeMirror) options
    importViewerOptions: {},

    // Confirm text before cleaning the canvas
    textCleanCanvas: 'Are you sure to clean the canvas?',

    // Show the Style Manager on component change
    showStylesOnChange: 1,

    // Text for General sector in Style Manager
    textGeneral: 'General',

    // Text for Layout sector in Style Manager
    textLayout: 'Layout',

    // Text for Typography sector in Style Manager
    textTypography: 'Typography',

    // Text for Decorations sector in Style Manager
    textDecorations: 'Decorations',

    // Text for Extra sector in Style Manager
    textExtra: 'Extra',

    // Use custom set of sectors for the Style Manager
    customStyleManager: [],

    // `grapesjs-blocks-basic` plugin options
    // By setting this option to `false` will avoid loading the plugin
    blocksBasicOpts: {},

    // `grapesjs-navbar` plugin options
    // By setting this option to `false` will avoid loading the plugin
    navbarOpts: {},

    // `grapesjs-component-countdown` plugin options
    // By setting this option to `false` will avoid loading the plugin
    countdownOpts: {},

    // `grapesjs-plugin-forms` plugin options
    // By setting this option to `false` will avoid loading the plugin
    formsOpts: {},

    // `grapesjs-plugin-export` plugin options
    // By setting this option to `false` will avoid loading the plugin
    exportOpts: {},

    // `grapesjs-aviary` plugin options, disabled by default
    // Aviary library should be included manually
    // By setting this option to `false` will avoid loading the plugin
    aviaryOpts: 0,

    // `grapesjs-plugin-filestack` plugin options, disabled by default
    // Filestack library should be included manually
    // By setting this option to `false` will avoid loading the plugin
    filestackOpts: 0,

    // On which side of the element to position the toolbar
    // Available options: 'left|center|right'
    position: 'left',

  };

  // Load defaults
  for (let name in defaults) {
    if (!(name in config))
      config[name] = defaults[name];
  }

  if (!CKEDITOR) {
    throw new Error('CKEDITOR instance not found');
  }

  const {
    blocksBasicOpts,
    navbarOpts,
    countdownOpts,
    formsOpts,
    exportOpts,
    aviaryOpts,
    filestackOpts
  } = config;

  // Load plugins
  blocksBasicOpts && pluginBlocks(editor, blocksBasicOpts);
  navbarOpts && pluginNavbar(editor, navbarOpts);
  countdownOpts && pluginCountdown(editor, countdownOpts);
  formsOpts && pluginForms(editor, formsOpts);
  exportOpts && pluginExport(editor, exportOpts);
  aviaryOpts && pluginAviary(editor, aviaryOpts);
  filestackOpts && pluginFilestack(editor, filestackOpts);

  // Load components
  components(editor, config);

  // Load blocks
  blocks(editor, config);

  // Load commands
  commands(editor, config);

  // Load panels
  panels(editor, config);

  // Load styles
  styles(editor, config);

  editor.setCustomRte({
    enable(el, rte) {
      // If already exists I'll just focus on it
      if(rte && rte.status != 'destroyed') {
        this.focus(el, rte);
      	return rte;
      }

      el.contentEditable = true;

      // Seems like 'sharedspace' plugin doesn't work exactly as expected
      // so will help hiding other toolbars already created
      let rteToolbar = editor.RichTextEditor.getToolbarEl();
      [].forEach.call(rteToolbar.children, (child) => {
      	child.style.display = 'none';
      });

      // Check for the mandatory options
      var opt = config.options;
      var plgName = 'sharedspace';

      if (opt.extraPlugins) {
        if (typeof opt.extraPlugins === 'string')
          opt.extraPlugins += ',' + plgName;
        else
          opt.extraPlugins.push(plgName);
      } else {
        opt.extraPlugins = plgName;
      }

      if(!config.options.sharedSpaces) {
        config.options.sharedSpaces = {top: rteToolbar};
      }

      // Init CkEditors
      rte = CKEDITOR.inline(el, config.options);

      // Make click event propogate
      rte.on('contentDom', () => {
        var editable = rte.editable();
        editable.attachListener(editable, 'click', () => {
          el.click();
        });
      });

      // The toolbar is not immediatly loaded so will be wrong positioned.
      // With this trick we trigger an event which updates the toolbar position
      rte.on('instanceReady', e => {
        var toolbar = rteToolbar.querySelector('#cke_' + rte.name);
        if (toolbar) {
          toolbar.style.display = 'block';
        }
        editor.trigger('canvasScroll')
      });

      // Prevent blur when some of CKEditor's element is clicked
      rte.on('dialogShow', e => {
        const editorEls = grapesjs.$('.cke_dialog_background_cover, .cke_dialog');
        ['off', 'on'].forEach(m => editorEls[m]('mousedown', stopPropagation));
      });

      this.focus(el, rte);
      return rte;
    },

    disable(el, rte) {
      el.contentEditable = false;
      if(rte && rte.focusManager)
        rte.focusManager.blur(true);
    },

    focus(el, rte) {
      // Do nothing if already focused
      if (rte && rte.focusManager.hasFocus) {
        return;
      }
      el.contentEditable = true;
      rte && rte.focus();
    },
  });

  // Update RTE toolbar position
  editor.on('rteToolbarPosUpdate', (pos) => {
    // Update by position
    switch (config.position) {
      case 'center':
        let diff = (pos.elementWidth / 2) - (pos.targetWidth / 2);
        pos.left = pos.elementLeft + diff;
        break;
      case 'right':
        let width = pos.targetWidth;
        pos.left = pos.elementLeft + pos.elementWidth - width;
        break;
    }

    if (pos.top <= pos.canvasTop) {
      pos.top = pos.elementTop + pos.elementHeight;
    }

    // Check if not outside of the canvas
    if (pos.left < pos.canvasLeft) {
      pos.left = pos.canvasLeft;
    }
  });

});
