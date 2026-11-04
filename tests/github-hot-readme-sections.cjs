const assert=require('node:assert/strict'),{plainReadme}=require('../scripts/github-hot-collect.cjs');
const intro='# Tool\nA layered image editor.\n',sponsor='Sponsor showcase and feature material. '.repeat(220);
const html=intro+sponsor+'\n<h2 id="get-started">Get started</h2>\nDownload the official desktop package and open a small project.\n<h2>Downloads</h2>\nInstall the Windows package or the macOS package from Releases.\n';
const picked=plainReadme(html);assert(picked.includes('Download the official desktop package'));assert(picked.includes('Install the Windows package'));assert(picked.length<=6000);
const markdown=intro+sponsor+'\n## Quick Start\n### 1. Prerequisites\nPython installation notes. '.repeat(1)+'Environment preparation detail. '.repeat(150)+'\n### 2. Pick an Agent\nChoose a coding agent that can read project instructions.\n### 3. Set Up\nClone this repository and install the requirements.\n### 4. Create\nOpen the project in the agent, provide your document and request a deck.\n';
const steps=plainReadme(markdown);assert(steps.includes('install the requirements'));assert(steps.includes('provide your document'));assert(steps.length<=6000);
assert.equal(plainReadme('# Short\nUse this tool.'),'# Short\nUse this tool.');console.log('Long README preserves setup and usage, including HTML headings.');
