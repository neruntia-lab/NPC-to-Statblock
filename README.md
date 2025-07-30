# NPC to Statblock PDF

This Foundry VTT module adds a button to NPC actor sheets which exports the sheet as a statblock styled PDF. The layout mirrors the example in `Statblocks.pdf` using jsPDF's HTML renderer.

## Features

- Works with Foundry VTT v12 and v13.
- Adds an export button in the top right corner of NPC sheets.
- Compiles the actor's data, abilities and items into a PDF using **jsPDF**.
- Portrait can be aligned left or right and text wraps around it.
- Traits, actions, bonus actions, reactions and legendary actions are separated into their own sections.
- Colors and fonts are configurable in the module settings.
- Saving throws, senses, languages and movement speeds are pulled from the actor data.
- Spell items are omitted from the PDF export.

## Installation

1. Copy the contents of this repository into your Foundry `modules` directory.
2. Download `jspdf.umd.min.js`, `html2canvas.min.js` and DOMPurify's `purify.min.js` (rename it to `dompurify.min.js`) and place them in `scripts/` (replace the placeholder files). The module will try to load these scripts dynamically if they are missing.
3. Place `Andada.ttf` and `OpenSans.ttf` in the module's `fonts/` folder (replace the placeholder files). During export the module reads these files from that folder and embeds them into the PDF automatically. The font names in the settings must match exactly (`Andada` and `OpenSans`).
4. Enable **NPC to Statblock PDF** in the Foundry setup menu.

## Usage

Open any NPC sheet and click the new PDF icon in the header. A file dialog will allow you to save the generated statblock.

## License

The code in this repository is released under the MIT license.
