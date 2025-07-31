Hooks.once('init', () => {
  
  game.settings.register('npc-to-statblock', 'imageSide', {
    name: 'Image Side',
    hint: 'Choose the side where the NPC portrait is placed.',
    scope: 'world',
    config: true,
    type: String,
    choices: { left: 'Left', right: 'Right' },
    default: 'left'
  });
  game.settings.register('npc-to-statblock', 'includePortrait', {
    name: 'Include Portrait',
    hint: 'Toggle whether the NPC portrait appears in the PDF.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });
  game.settings.register('npc-to-statblock', 'titleFont', {
    name: 'Title Font',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      'Andada Pro': 'Andada Pro',
      'Open Sans': 'Open Sans'
    },
    default: 'Andada Pro'
  });
     game.settings.register('npc-to-statblock', 'bodyFont', {
    name: 'Body Font',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      'Andada Pro': 'Andada Pro',
      'Open Sans': 'Open Sans'
    },
    default: 'Andada Pro'
  });
  game.settings.register('npc-to-statblock', 'titleColor', {
    name: 'Title Color',
    scope: 'world',
    config: true,
    type: String,
    default: '#660000'
  });
  game.settings.register('npc-to-statblock', 'textColor', {
    name: 'Text Color',
    scope: 'world',
    config: true,
    type: String,
    default: '#000000'
  });
});

Hooks.on('renderActorSheet', (app, html) => {
  if (app.actor?.type !== 'npc') return;
  const button = $(`<a class="export-statblock" title="Export Statblock"><i class="fas fa-file-pdf"></i></a>`);
  html.closest('.app').find('.window-header .window-title').after(button);
  button.click(() => exportStatblock(app.actor));
});

async function exportStatblock(actor) {
  await ensureDependencies();
  if (!window.jspdf) {
    ui.notifications.error('jsPDF library not loaded.');
    return;
  }
  const missing = [];
  if (!window.html2canvas) missing.push('html2canvas');
  if (!window.DOMPurify) missing.push('DOMPurify');
  if (missing.length) {
    ui.notifications.error(`${missing.join(' and ')} not loaded.`);
    return;
  }
  const { jsPDF } = window.jspdf;
   const pdf = new jsPDF('p', 'pt', 'a4');
  const fontCss = await ensureFonts(pdf);


  const includePortrait = game.settings.get('npc-to-statblock', 'includePortrait');
  let portrait = null;
  if (includePortrait && actor.img) {
    try {
      portrait = await loadImageAsDataURL(actor.img);
    } catch (err) {
      console.error(err);
    }
  }

  const html = buildStatblockHtml(actor, portrait, fontCss);
  await pdf.html(html, {
    autoPaging: 'text',
    margin: 20,
    html2canvas: { scale: 0.57 },
    callback: pdf => {
      const blob = pdf.output('blob');
      saveDataToFile(blob, 'application/pdf', `${actor.name}-statblock.pdf`);
    }
  });
}


function buildStatblockHtml(actor, portrait, fontCss = '') {
  const titleFont = game.settings.get('npc-to-statblock', 'titleFont');
  const bodyFont = game.settings.get('npc-to-statblock', 'bodyFont');
  const titleColor = game.settings.get('npc-to-statblock', 'titleColor');
  const textColor = game.settings.get('npc-to-statblock', 'textColor');
  const imageSide = game.settings.get('npc-to-statblock', 'imageSide');

  const data = actor.system || actor.data.data || {};
  const header = `${data.traits?.size || ''} (${data.details?.type?.value || data.details?.type || ''}), ${data.details?.alignment || ''}`.trim();

  const abilities = ['str','dex','con','int','wis','cha'].map(a => {
    const val = data.abilities?.[a]?.value ?? 10;
    const mod = Math.floor((val - 10) / 2);
    const modStr = mod >= 0 ? `+${mod}` : mod;
    return `<div><strong>${a.toUpperCase()}</strong> ${val} (${modStr})</div>`;
  }).join('');

  const getList = (obj) => Object.entries(obj || {})
    .map(([k, v]) => v?.proficient || v?.value ? `${k.toUpperCase()} ${v.total ?? v.mod ?? v.value}` : null)
    .filter(Boolean)
    .join(', ');

  const pb = data.attributes?.prof ?? 0;
  const saves = getSavingThrows(data.abilities, pb);
  const skills = getList(data.skills);
  const senses = getSensesString(data);
  const languages = getLanguagesString(data.traits?.languages);
  const challenge = data.details?.cr ? `${data.details.cr}` : '';

  const sections = {
    traits: [],
    actions: [],
    bonus: [],
    reactions: [],
    legendary: []
  };

  for (const i of actor.items) {
    if (i.type === 'spell') continue;
    const desc = htmlToText(i.system?.description?.value || '');
    const entry = `<strong>${i.name}.</strong> ${desc}`;
    const type = i.system?.activation?.type;
    switch (type) {
      case 'action':
        sections.actions.push(entry);
        break;
      case 'bonus':
        sections.bonus.push(entry);
        break;
      case 'reaction':
        sections.reactions.push(entry);
        break;
      case 'legendary':
        sections.legendary.push(entry);
        break;
      default:
        sections.traits.push(entry);
    }
  }

  const buildItems = list => list.join('<br><br>');

  return `<div style="font-family:${bodyFont}, sans-serif;background-color:#fdf5e6;color:${textColor};padding:20px;margin:auto;
width:450px;border:px solid #333;box-shadow:5px 5px 15px rgba(0,0,0,0.3);display:flow-root;">
    
  

<div class="grainy-background"></div>

    <style>
      .actor-name, h2{font-family:${titleFont}, serif;color:${titleColor};text-align:left;font-variant:small-caps;padding-bottom:3px;font-size: 25px;}
      .statblock-header{font-weight:Regular;font-size:0.9em;font-style: italic;text-transform:capitalize;margin-bottom:0.2em;padding-bottom:6px;}
      .statblock-section{;margin-top:px;padding-top:10px;padding-bottom:6px}
      .abilities,.saves,.skills,.senses,.languages,.challenge{display: flex;justify-content: flex-start; flex-wrap:wrap;gap:5px;font-weight:normal;}
      .abilities div,.saves span,.skills span,.senses span,.languages span,.challenge span{flex: 1 1 0;text-align:left;}
      .actions,.reactions{margin-top:1em;}
      .text-center {text-align: left;}
      img.portrait {max-width:250px;float:${imageSide};object-fit: contain;}
      .img-container {height:auto;display: flex;justify-content: center;}
      .flex-container {display: flex;flex-direction: row; gap: 20px;}
      .grow {flex-grow: 1;}
      .taper-right {height: 0em;border-top: 2px solid transparent;border-bottom: 2px solid transparent;border-left: 300px solid ${titleColor};}
      .abilitiesline{margin-bottom:10px;}
      .statblockline{;}
      .growline{margin-top:15px;}
      .traits{padding-top:25px;}
    </style>
    
    
    <div class="actor-name">${actor.name}</div>
    <div class="statblock-header text-center">${header}</div>
    
<div class="taper-right"></div>
    
     <div class="flex-container statblock-section">
    
    
    
    
    <div class="grow">
      <div>
        <strong>Armor Class</strong> ${data.attributes?.ac?.value || ''}<br>
        <strong>Hit Points</strong> ${data.attributes?.hp?.value || ''}<br>
        <strong>Speed</strong> ${getSpeedString(data.attributes)}
              <div class="tapered-line growline "></div>

<div class="taper-right"></div>

        <div class="statblock-section abilitiesline">${abilities}</div>
      </div>

<div class="taper-right"></div>


      <div class="statblock-section">
        <div class="saves"><strong>Saving Throws:</strong> ${saves}</div>
        <div class="skills"><strong>Skills:</strong> ${skills}</div>
        <div class="senses"><strong>Senses:</strong> ${senses}</div>
        <div class="languages"><strong>Languages:</strong> ${languages}</div>
        <div class="challenge"><strong>Challenge:</strong> ${challenge}</div>
      </div>
    </div>
  </div>
  
<div class="taper-right"></div>
  
${sections.traits.length ? `<div class="statblock-section traits">
    
    <h2>Traits</h2>${buildItems(sections.traits)}
  </div>` : ''}
  
  ${sections.actions.length ? `<div class="statblock-section actions">
    <h2>Actions</h2>${buildItems(sections.actions)}
  </div>` : ''}    
    ${sections.bonus.length ? `<div class="statblock-section bonus-actions"><h2>Bonus Actions</h2>${buildItems(sections.bonus)}</div>` : ''}
    ${sections.reactions.length ? `<div class="statblock-section reactions"><h2>Reactions</h2>${buildItems(sections.reactions)}</div>` : ''}
    ${sections.legendary.length ? `<div class="statblock-section legendary-actions"><h2>Legendary Actions</h2>${buildItems(sections.legendary)}</div>` : ''}
  </div>`;
}




function htmlToText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function getSpeedString(attributes = {}) {
  const move = attributes.movement || attributes.speed || {};
  const unit = move.units ? ` ${move.units}.` : ' ft.';
  const parts = [];
  if (move.walk) parts.push(`${move.walk}${unit}`);
  const others = ['burrow', 'climb', 'fly', 'swim'];
  for (const key of others) {
    if (!move[key]) continue;
    const name = key.charAt(0).toUpperCase() + key.slice(1);
    let text = `${name} ${move[key]}${unit}`;
    if (key === 'fly' && move.hover) text += ' (hover)';
    parts.push(text);
  }
  return parts.join(', ');
}

function getSavingThrows(abilities = {}, pb = 0) {
  const list = [];
  for (const [abbr, abil] of Object.entries(abilities)) {
    if (!abil?.proficient) continue;
    const val = abil.save ?? (Math.floor(((abil.value ?? 10) - 10) / 2) + pb);
    const sign = val >= 0 ? `+${val}` : `${val}`;
    list.push(`${abbr.toUpperCase()} ${sign}`);
  }
  return list.join(', ');
}

function getLanguagesString(trait) {
  if (!trait) return '';
  let values = [];
  const val = trait.value;
  if (val instanceof Set) values = Array.from(val);
  else if (Array.isArray(val)) values = val;
  else if (typeof val === 'string') values = val.split(/[,;]\s*/);
  if (trait.custom) values.push(trait.custom);
  return values.filter(Boolean).join(', ');
}

function getSensesString(data = {}) {
  const senses = data.attributes?.senses || data.traits?.senses;
  if (!senses) return '';
  if (typeof senses === 'string') return senses;
  const unit = senses.units ? ` ${senses.units}` : ' ft.';
  const parts = [];
  const order = ['blindsight', 'darkvision', 'tremorsense', 'truesight'];
  for (const sense of order) {
    const val = senses[sense];
    if (val) {
      const name = sense.charAt(0).toUpperCase() + sense.slice(1);
      parts.push(`${name} ${val}${unit}`);
    }
  }
  if (senses.special) parts.push(htmlToText(senses.special));
  const passive = senses.passive ?? data.skills?.prc?.passive;
  if (passive) parts.push(`passive Perception ${passive}`);
  return parts.join(', ');
}

function loadImageAsDataURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = err => reject(err);
    img.src = url;
  });
}

async function ensureDependencies() {
  const moduleData = game.modules.get('npc-to-statblock');
  const basePath = moduleData?.url || moduleData?.path || '';
  if (!window.html2canvas) {
    try {
      await loadScript(`${basePath}/scripts/html2canvas.min.js`);
    } catch (err) {
      console.error(err);
    }
  }
  if (!window.DOMPurify) {
    try {
      await loadScript(`${basePath}/scripts/dompurify.min.js`);
    } catch (err) {
      console.error(err);
    }
  }
}

async function ensureFonts(pdf) {
  const fonts = [
    { family: 'Andada Pro' },
    { family: 'Open Sans' }
  ];
  for (const font of fonts) {
    try {
      const fontData = await fetchGoogleFont(font.family);
      pdf.addFileToVFS(fontData.fileName, fontData.base64);
      pdf.addFont(fontData.fileName, font.family.replace(/\s+/g, ''), 'normal');
      injectFontStyle(font.family, fontData.base64, fontData.format);
    } catch (err) {
      console.error(err);
    }
  }
}

async function fetchGoogleFont(family) {
  const familyQuery = family.replace(/\s+/g, '+');
  const cssResp = await fetch(`https://fonts.googleapis.com/css2?family=Andada+Pro&display=swap`);
  if (!cssResp.ok) throw new Error(`Could not load font CSS for ${family}`);
  const css = await cssResp.text();
  const urlMatch = css.match(/src: url\(([^)]+)\) format\('([^']+)'\)/);
  if (!urlMatch) throw new Error(`No font URL found for ${family}`);
  const fontUrl = urlMatch[1];
  const format = urlMatch[2];
  const fontResp = await fetch(fontUrl);
  if (!fontResp.ok) throw new Error(`Could not load font file for ${family}`);
  const buffer = await fontResp.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const ext = fontUrl.split('.').pop().split('?')[0];
  return { fileName: `${family.replace(/\s+/g, '')}.${ext}`, base64, format };
}

function injectFontStyle(name, base64, format) {
  const mime = format.includes('woff2') ? 'font/woff2' : format.includes('woff') ? 'font/woff' : 'font/ttf';
  const style = document.createElement('style');
  style.textContent = `@font-face{font-family:'${name}';font-style:normal;font-weight:400;src:url(data:${mime};base64,${base64}) format('${format}');}`;
  document.head.appendChild(style);
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

