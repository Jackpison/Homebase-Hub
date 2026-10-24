// ZIP Creator: put any files into one ZIP, with the compression you choose.
import { zipSync } from 'fflate';
import { h, field, input, seg, button, download, dropzone, panel, note, bytes, busy, toast } from '../ui.js';

export default function (root) {
  let files = [];
  const list = h('ul', { class: 'flist' }), sum = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  const level = seg('Compression', [['0', 'None (fastest)'], ['3', 'Fast'], ['6', 'Normal'], ['9', 'Smallest']], '6');
  const name = input({ value: 'files.zip', 'aria-label': 'ZIP name' });
  function draw() {
    list.replaceChildren(...files.map((f, i) => h('li', {}, h('span', { text: f.path }), h('small', { text: bytes(f.file.size) }), h('button', { type: 'button', class: 'ib', 'aria-label': 'Remove ' + f.path, onClick: () => { files.splice(i, 1); draw(); } }, ...[]))));
    list.querySelectorAll('.ib').forEach((b) => b.append(document.createTextNode('×')));
    sum.textContent = files.length ? files.length + (files.length === 1 ? ' file, ' : ' files, ') + bytes(files.reduce((a, f) => a + f.file.size, 0)) : 'No files yet.';
  }
  const add = (fs) => { for (const f of fs) { let p = f.webkitRelativePath || f.name, n = 1; while (files.some((x) => x.path === p)) p = (f.webkitRelativePath || f.name).replace(/(\.[^./]+)?$/, ' (' + (++n) + ')$1'); files.push({ path: p, file: f }); } draw(); };
  const folder = h('input', { type: 'file', webkitdirectory: true, multiple: true, class: 'sr', id: 'zip-folder', onChange: () => { add([...folder.files]); folder.value = ''; } });
  const make = button('Create ZIP', { primary: true, icon: 'archive' });
  make.addEventListener('click', () => busy(make, async () => {
    if (!files.length) { toast('Add some files first.', true); return; }
    const tree = {};
    for (const f of files) tree[f.path] = [new Uint8Array(await f.file.arrayBuffer()), { mtime: f.file.lastModified ? new Date(f.file.lastModified) : new Date() }];
    await new Promise((r) => setTimeout(r, 30));
    const z = zipSync(tree, { level: +level.value });
    let n = name.value.trim() || 'files.zip'; if (!/\.zip$/i.test(n)) n += '.zip';
    download(new Blob([z], { type: 'application/zip' }), n);
    const total = files.reduce((a, f) => a + f.file.size, 0);
    out.replaceChildren(note('Made ' + n + ': ' + bytes(z.length) + (total ? ' (' + Math.round(z.length / total * 100) + '% of the original ' + bytes(total) + ')' : '') + '.'));
  }));
  root.append(dropzone({ multiple: true, label: 'Add files', onFiles: add }),
    h('div', { class: 'row' }, folder, h('label', { for: 'zip-folder', class: 'btn' }, 'Add a Folder'), button('Clear', { onClick: () => { files = []; draw(); out.replaceChildren(); } })),
    panel(list, sum, level.el, field('ZIP name', name), make, out));
  draw();
}
