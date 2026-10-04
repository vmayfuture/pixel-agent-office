const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const zoneTitles = { board: '今日计划', meeting: '小队会议桌', shelf: '工作区书架', kitchen: '茶水间', lounge: '休息角' };

export function setupScene({ getState, request, refreshState, toast, setTaskDraft, submitTask, saveSceneTime }) {
  const dialog = $('#scene-dialog');
  const content = $('#scene-dialog-content');
  let current = '';
  let files = [];
  let preview = null;

  function renderBoard() {
    const state = getState();
    const notes = state.board || [];
    const recent = state.tasks.slice(0, 3);
    return `<p>把要记的事贴在黑板上。任务的当前进展也会放在这里。</p>
      <section><h3>计划便签</h3><ul class="scene-note-list">${notes.length ? notes.map(note => `<li class="${note.done ? 'done' : ''}"><input type="checkbox" data-note-toggle="${escapeHtml(note.id)}" ${note.done ? 'checked' : ''} aria-label="完成${escapeHtml(note.text)}"><span class="note-text">${escapeHtml(note.text)}</span><button type="button" class="small-action danger" data-note-remove="${escapeHtml(note.id)}" aria-label="删除便签">×</button></li>`).join('') : '<li class="scene-empty">黑板还是空的，写下第一条计划吧。</li>'}</ul></section>
      <form data-scene-form="note"><label class="settings-field">写一条新计划<input type="text" name="note" maxlength="160" placeholder="例如：周五前完成网页初稿" required></label><button type="submit" class="button button-primary" ${notes.length >= 24 ? 'disabled' : ''}>贴上黑板</button></form>
      <section><h3>最近任务</h3>${recent.length ? `<ul class="scene-note-list">${recent.map(task => `<li><span class="note-text">${escapeHtml(task.prompt.slice(0, 70))}</span><small>${task.status === 'done' ? '已完成' : task.status === 'running' ? '进行中' : '已结束'}</small></li>`).join('')}</ul>` : '<div class="scene-empty">还没有任务。</div>'}</section>`;
  }

  function renderMeeting() {
    return `<p>写下目标后，AI 会判断是否需要拆解和协作，并在任务卡片里说明原因。想亲自安排时，也可以指定方式。</p>
      <div class="scene-mini-grid"><button type="button" data-meeting-mode="auto">✦ AI 自动分工<small>根据任务决定人数与流程</small></button><button type="button" data-meeting-mode="relay">↪ 手动指定接力<small>一位完成后交给下一位</small></button><button type="button" data-meeting-mode="parallel">☷ 手动指定并行<small>同时处理，最后汇总</small></button></div>
      <section><h3>当前小队</h3><ul class="scene-agent-list">${getState().agents.map(agent => `<li><span>${escapeHtml(agent.name)} · ${escapeHtml(agent.expertise || agent.role)}</span><small>${escapeHtml(getState().settings?.providers.find(provider => provider.id === agent.providerId)?.name || '未绑定')}</small></li>`).join('')}</ul></section>`;
  }

  function renderShelf() {
    const recent = getState().tasks.filter(task => task.status === 'done').slice(0, 4);
    return `<p>这里放着 Agent 在工作区创建的文件。点击文件可以预览小型文本内容。</p><div class="scene-inline-actions"><button type="button" class="small-action" data-scene-action="refresh-files">刷新书架</button><button type="button" class="small-action" data-scene-action="copy-workspace">复制工作区路径</button></div>
      <section><h3>工作区文件</h3>${files.length ? `<ul class="scene-file-list">${files.map(file => `<li>▤ <button type="button" data-file="${escapeHtml(file)}">${escapeHtml(file)}</button></li>`).join('')}</ul>` : '<div class="scene-empty">还没有可浏览的文件。</div>'}</section>
      ${preview ? `<section><h3>${escapeHtml(preview.path)}</h3><div class="scene-file-preview">${escapeHtml(preview.content)}</div></section>` : ''}
      <section><h3>最近完成</h3>${recent.length ? `<ul class="scene-note-list">${recent.map(task => `<li><span class="note-text">${escapeHtml(task.prompt.slice(0, 60))}</span><small>${escapeHtml(task.agentName || '小队')}</small></li>`).join('')}</ul>` : '<div class="scene-empty">还没有完成的任务。</div>'}</section>`;
  }

  function renderLounge() {
    const agents = getState().agents;
    return `<p>选一位成员说句话。消息会作为一项真实任务交给它，答复会出现在右侧。</p><form data-scene-form="chat"><label class="settings-field">聊聊谁<select name="agentId">${agents.map(agent => `<option value="${escapeHtml(agent.id)}">${escapeHtml(agent.name)} · ${escapeHtml(agent.expertise || agent.role)}</option>`).join('')}</select></label><label class="settings-field">想说什么<textarea name="message" maxlength="2000" placeholder="例如：帮我想个让办公室更有趣的小点子" required></textarea></label><button type="submit" class="button button-primary" ${getState().activeTaskId ? 'disabled' : ''}>发送给成员</button></form>`;
  }

  function renderKitchen() {
    const time = getState().settings?.scene.time || 'auto';
    return `<p>在茶水间歇一会儿，顺手调整窗外的光线。选择会保存到办公室设置。</p><div class="scene-mini-grid"><button type="button" data-scene-time="auto" aria-pressed="${time === 'auto'}">◷ 跟随本机时间</button><button type="button" data-scene-time="day" aria-pressed="${time === 'day'}">☀ 一直是白天</button><button type="button" data-scene-time="night" aria-pressed="${time === 'night'}">☾ 一直是夜晚</button><button type="button" data-scene-action="tea-chat">☕ 找成员聊聊</button></div>`;
  }

  function renderAgent(id) {
    const state = getState();
    const agent = state.agents.find(person => person.id === id);
    if (!agent) return '<div class="scene-empty">这位成员暂时不在办公室。</div>';
    const provider = state.settings?.providers.find(item => item.id === agent.providerId);
    const tasks = state.tasks.filter(task => task.agentId === id || task.participants?.some(person => person.id === id)).slice(0, 4);
    return `<p>${escapeHtml(agent.name)} · ${escapeHtml(agent.role)}。${agent.status === 'working' ? '正在工位处理任务。' : '正在办公室自由活动。'}</p><div class="settings-card"><h3>擅长什么</h3><p>${escapeHtml(agent.expertise || '由你自由设定')}</p><h3>使用的 Agent</h3><p>${escapeHtml(provider?.name || '未绑定')}</p></div><div class="scene-inline-actions"><button type="button" class="button button-primary" data-agent-action="assign" data-agent-id="${escapeHtml(id)}">交任务给 TA</button><button type="button" class="button button-quiet" data-agent-action="meeting" data-agent-id="${escapeHtml(id)}">由 TA 牵头</button></div><section><h3>参与过的任务</h3>${tasks.length ? `<ul class="scene-note-list">${tasks.map(task => `<li><span class="note-text">${escapeHtml(task.prompt.slice(0, 65))}</span><small>${task.status === 'done' ? '完成' : task.status === 'running' ? '进行中' : '结束'}</small></li>`).join('')}</ul>` : '<div class="scene-empty">还没有参与过任务。</div>'}</section>`;
  }

  function render() {
    if (!current) return;
    const [zone, id] = current.split(':');
    $('#scene-dialog-title').textContent = zone === 'agent' ? getState().agents.find(agent => agent.id === id)?.name || '成员' : zoneTitles[zone] || '办公室';
    content.innerHTML = { board: renderBoard, meeting: renderMeeting, shelf: renderShelf, lounge: renderLounge, kitchen: renderKitchen }[zone]?.() || renderAgent(id);
  }

  async function open(zone) {
    current = zone;
    if (zone === 'shelf') {
      try { files = (await request('/api/workspace')).files || []; } catch (error) { files = []; toast(error.message); }
      preview = null;
    }
    render();
    dialog.showModal();
  }
  function openAgent(id) { return open(`agent:${id}`); }
  function close() { dialog.close(); current = ''; }
  $('#scene-dialog-close').addEventListener('click', close);
  dialog.addEventListener('close', () => { current = ''; });
  document.querySelectorAll('[data-zone]').forEach(button => button.addEventListener('click', () => void open(button.dataset.zone)));

  content.addEventListener('click', async event => {
    const noteRemove = event.target.closest('[data-note-remove]');
    if (noteRemove) { try { await request('/api/board', { method: 'PUT', body: JSON.stringify({ notes: (getState().board || []).filter(note => note.id !== noteRemove.dataset.noteRemove) }) }); await refreshState(); render(); } catch (error) { toast(error.message); } return; }
    const meeting = event.target.closest('[data-meeting-mode]');
    if (meeting) { setTaskDraft({ collaborationMode: meeting.dataset.meetingMode }); close(); $('#task-prompt').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#task-prompt').focus(); return; }
    const fileButton = event.target.closest('[data-file]');
    if (fileButton) { try { preview = await request(`/api/workspace/file?path=${encodeURIComponent(fileButton.dataset.file)}`); render(); } catch (error) { toast(error.message); } return; }
    const timeButton = event.target.closest('[data-scene-time]');
    if (timeButton) { try { await saveSceneTime(timeButton.dataset.sceneTime); render(); toast('窗外光线已调整。'); } catch (error) { toast(error.message); } return; }
    const agentButton = event.target.closest('[data-agent-action]');
    if (agentButton) { setTaskDraft({ agentId: agentButton.dataset.agentId, collaborationMode: 'auto' }); close(); $('#task-prompt').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#task-prompt').focus(); return; }
    const action = event.target.closest('[data-scene-action]')?.dataset.sceneAction;
    if (action === 'refresh-files') { try { files = (await request('/api/workspace')).files || []; render(); } catch (error) { toast(error.message); } }
    if (action === 'copy-workspace') { try { await navigator.clipboard.writeText(getState().workspace); toast('工作区路径已复制。'); } catch { toast('无法复制路径。'); } }
    if (action === 'tea-chat') { close(); await open('lounge'); }
  });
  content.addEventListener('change', async event => {
    const id = event.target.dataset.noteToggle;
    if (!id) return;
    try {
      await request('/api/board', { method: 'PUT', body: JSON.stringify({ notes: (getState().board || []).map(note => note.id === id ? { ...note, done: event.target.checked } : note) }) });
      await refreshState();
      render();
    } catch (error) { toast(error.message); event.target.checked = !event.target.checked; }
  });
  content.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    try {
      if (form.dataset.sceneForm === 'note') {
        const note = String(new FormData(form).get('note') || '').trim();
        if (!note) return;
        await request('/api/board', { method: 'PUT', body: JSON.stringify({ notes: [...(getState().board || []), { id: crypto.randomUUID(), text: note, done: false }] }) });
        await refreshState(); render();
      } else if (form.dataset.sceneForm === 'chat') {
        const data = new FormData(form);
        await submitTask({ prompt: String(data.get('message') || '').trim(), agentId: String(data.get('agentId') || ''), providerId: '', collaborationMode: 'auto', collaboratorIds: [] });
        close();
      }
    } catch (error) { toast(error.message); }
  });
  return { open, openAgent, refresh() { if (dialog.open && current && !content.contains(document.activeElement)) render(); } };
}
