/* Danh sách skill Claude — đọc thẳng cấu trúc thư mục của repo.

   Không có file danh sách nào phải bảo trì: thêm một thư mục có SKILL.md vào
   repo là trang này tự hiện thêm một dòng.

   Cách lấy dữ liệu:
     1. MỘT lệnh gọi GitHub API lấy toàn bộ cây thư mục (giới hạn 60 lần/giờ
        cho mỗi IP, nên kết quả được nhớ đệm 15 phút).
     2. Phần mô tả từng skill tải qua raw.githubusercontent.com — địa chỉ này
        không tính vào giới hạn trên.
     3. Nút tải về gom các file của skill rồi nén .zip ngay trong trình duyệt.
*/
(function () {
  'use strict';

  const OWNER = 'brian261101';
  const REPO = 'All-of-50-Claude-Skill';
  const BRANCH = 'main';
  const DIR = 'skills/';
  // GitHub cho 60 lan goi moi gio cho mot IP. 3 phut la du thua an toan,
  // ma vua push xong khong phai cho lau moi thay.
  const TTL = 3 * 60 * 1000;

  const API = 'https://api.github.com/repos/' + OWNER + '/' + REPO +
              '/git/trees/' + BRANCH + '?recursive=1';
  const RAW = 'https://raw.githubusercontent.com/' + OWNER + '/' + REPO +
              '/' + BRANCH + '/';
  const WEB = 'https://github.com/' + OWNER + '/' + REPO;

  const $ = id => document.getElementById(id);
  const el = (t, a, k) => {
    const n = document.createElement(t);
    for (const x in (a || {})) {
      if (x === 'class') n.className = a[x];
      else if (x === 'text') n.textContent = a[x];
      else if (x === 'html') n.innerHTML = a[x];
      else n.setAttribute(x, a[x]);
    }
    for (const c of (k || [])) n.appendChild(c);
    return n;
  };
  const vi = () => document.documentElement.lang === 'vi';
  const t = (en, v) => (vi() ? v : en);

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); }
             catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- lấy cây thư mục ---------- */
  async function getTree() {
    const c = store.get('cskills.tree');
    if (c && Date.now() - c.at < TTL && Array.isArray(c.tree)) return c.tree;

    const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) {
      if (res.status === 403) {
        const e = new Error('rate');
        e.rate = true;
        throw e;
      }
      throw new Error('GitHub API ' + res.status);
    }
    const data = await res.json();
    const tree = (data.tree || []).filter(x => x.type === 'blob')
      .map(x => ({ path: x.path, size: x.size }));
    store.set('cskills.tree', { at: Date.now(), tree: tree });
    return tree;
  }

  /* ---------- gom theo thư mục skill ---------- */
  function group(tree) {
    const byDir = {};
    for (const f of tree) {
      if (f.path.indexOf(DIR) !== 0) continue;
      const rest = f.path.slice(DIR.length);
      const i = rest.indexOf('/');
      if (i < 0) continue;
      const dir = rest.slice(0, i);
      if (dir.charAt(0) === '_' || dir.charAt(0) === '.') continue;
      (byDir[dir] = byDir[dir] || []).push(f);
    }
    // chỉ giữ thư mục thật sự có SKILL.md
    const out = [];
    for (const dir in byDir) {
      const files = byDir[dir];
      const sk = files.find(f => /\/SKILL\.md$/i.test(f.path));
      if (!sk) continue;
      out.push({
        dir: dir,
        files: files.sort((a, b) => a.path.localeCompare(b.path)),
        skillPath: sk.path,
        bytes: files.reduce((s, f) => s + (f.size || 0), 0)
      });
    }
    return out.sort((a, b) => a.dir.localeCompare(b.dir, 'vi'));
  }

  /* ---------- đọc frontmatter ---------- */
  function frontmatter(txt) {
    const m = /^---\s*\n([\s\S]*?)\n---/.exec(txt);
    if (!m) return {};
    const out = {};
    let key = null;
    for (const line of m[1].split('\n')) {
      const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
      if (kv) { key = kv[1]; out[key] = kv[2].trim(); }
      else if (key && /^\s+\S/.test(line)) out[key] += ' ' + line.trim();
    }
    return out;
  }

  async function describe(sk) {
    try {
      const r = await fetch(RAW + sk.files.map(f => f.path)
        .find(p => /\/SKILL\.md$/i.test(p)).split('/').map(encodeURIComponent).join('/'));
      if (!r.ok) return {};
      return frontmatter(await r.text());
    } catch (e) { return {}; }
  }

  /* ---------- tải .zip ---------- */
  async function download(sk, btn) {
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = t('Packing…', 'Đang nén…');
    try {
      const files = [];
      for (const f of sk.files) {
        const url = RAW + f.path.split('/').map(encodeURIComponent).join('/');
        const r = await fetch(url);
        if (!r.ok) throw new Error(f.path + ' → HTTP ' + r.status);
        const buf = new Uint8Array(await r.arrayBuffer());
        // bỏ tiền tố skills/<dir>/ nhưng giữ lại tên thư mục skill trong zip
        files.push({ name: sk.dir + '/' + f.path.slice(DIR.length + sk.dir.length + 1),
                     data: buf });
      }
      const bytes = window.TinyZip.zip(files);
      const blob = new Blob([bytes], { type: 'application/zip' });
      const a = el('a', { href: URL.createObjectURL(blob), download: sk.dir + '.zip' });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      btn.textContent = t('Downloaded', 'Đã tải');
      setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1600);
    } catch (e) {
      btn.textContent = t('Failed', 'Lỗi');
      btn.disabled = false;
      setTimeout(() => { btn.textContent = old; }, 2200);
    }
  }

  /* ---------- hiển thị ---------- */
  function row(sk, meta) {
    const name = meta.name || sk.dir;
    const desc = meta.description || '';
    const kb = sk.bytes > 1024 ? (sk.bytes / 1024).toFixed(0) + ' KB'
                               : sk.bytes + ' B';

    const dl = el('button', { class: 'btn primary', text: t('Download .zip', 'Tải .zip') });
    dl.addEventListener('click', () => download(sk, dl));

    return el('article', { class: 'card skillrow' }, [
      el('div', { class: 'skillrow-head' }, [
        el('div', {}, [
          el('h3', { text: name }),
          el('div', { class: 'skillrow-meta',
            text: sk.files.length + ' ' +
              t(sk.files.length === 1 ? 'file' : 'files', 'tệp') + ' · ' + kb })
        ]),
        el('div', { class: 'skillrow-act' }, [
          dl,
          el('a', { class: 'btn', href: WEB + '/tree/' + BRANCH + '/' + DIR + sk.dir,
                    target: '_blank', rel: 'noopener',
                    text: t('Source', 'Mã nguồn') })
        ])
      ]),
      desc ? el('p', { class: 'skillrow-desc', text: desc }) : el('span')
    ]);
  }

  function msg(cls, title, body, link) {
    const kids = [el('div', { class: 't', text: title })];
    if (body) kids.push(el('div', { class: 'b', text: body }));
    if (link) kids.push(el('a', { class: 'btn', href: WEB, target: '_blank',
                                  rel: 'noopener', text: t('Open the repo', 'Mở repo') }));
    return el('div', { class: 'skillmsg ' + cls }, kids);
  }

  let rendered = false;

  async function render() {
    const box = $('skills-list');
    if (!box) return;
    box.innerHTML = '';
    box.appendChild(msg('load', t('Loading skill list…', 'Đang tải danh sách skill…'), ''));

    let tree;
    try {
      tree = await getTree();
    } catch (e) {
      box.innerHTML = '';
      box.appendChild(e.rate
        ? msg('warn', t('GitHub rate limit reached',
                        'GitHub tạm giới hạn số lần gọi'),
              t('The list reads the repository live and GitHub allows 60 requests per hour per IP. Try again in a few minutes, or open the repository directly.',
                'Danh sách đọc trực tiếp từ repo, mà GitHub chỉ cho 60 lần gọi mỗi giờ cho một IP. Thử lại sau vài phút, hoặc mở thẳng repo.'), true)
        : msg('warn', t('Could not load the list', 'Không tải được danh sách'),
              String(e.message || e), true));
      return;
    }

    const list = group(tree);
    box.innerHTML = '';
    if (!list.length) {
      box.appendChild(msg('empty', t('No skill published yet', 'Chưa có skill nào'),
        t('Drop a skill folder into the repository and it will appear here automatically.',
          'Ném một thư mục skill vào repo là nó tự hiện ở đây.'), true));
      const b = el('button', { class: 'btn ghost',
        text: t('Refresh list', 'Làm mới danh sách') });
      b.addEventListener('click', () => {
        try { localStorage.removeItem('cskills.tree'); } catch (e) {}
        render();
      });
      box.appendChild(el('div', { class: 'skills-refresh' }, [b]));
      return;
    }

    const metas = await Promise.all(list.map(describe));
    box.innerHTML = '';
    list.forEach((sk, i) => box.appendChild(row(sk, metas[i])));

    box.appendChild(el('div', { class: 'skills-refresh' }, [
      (function () {
        const b = el('button', { class: 'btn ghost',
          text: t('Refresh list', 'Làm mới danh sách') });
        b.addEventListener('click', () => {
          try { localStorage.removeItem('cskills.tree'); } catch (e) {}
          render();
        });
        return b;
      })(),
      el('span', { class: 'skills-hint',
        text: t('The list is cached for 3 minutes. Just pushed a skill? Refresh.',
                'Danh sách được nhớ đệm 3 phút. Vừa push skill xong thì bấm làm mới.') })
    ]));

    const c = $('skills-count');
    if (c) c.textContent = list.length;
    rendered = true;
  }

  /* Trước đây chỉ tải khi cuộn tới, nhưng IntersectionObserver không chạy khi
     tab bị ẩn hoặc nền, và khi đó mục này trống trơn không cả thông báo. Một
     lệnh gọi API mỗi lần mở trang, lại còn nhớ đệm 15 phút, là quá rẻ để đánh
     đổi lấy rủi ro đó. */
  function init() {
    if (!$('claude-skills')) return;
    render();
  }

  // đổi ngôn ngữ thì vẽ lại nhãn nút
  document.addEventListener('psat:lang', () => { if (rendered) render(); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();
})();
