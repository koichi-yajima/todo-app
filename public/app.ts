declare const Sortable: {
  new (el: HTMLElement, options: Record<string, unknown>): { destroy(): void };
};
declare const QRCode: new (el: HTMLElement, options: {
  text: string; width: number; height: number;
  colorDark: string; colorLight: string;
}) => void;

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  reminderTime?: string;
  notes?: string;
  listId?: string;
  subtasks?: SubTask[];
  order: number;
  createdAt: string;
}
interface List {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

class TodoApp {
  private todos: Todo[] = [];
  private lists: List[] = [];
  private filter = 'all';
  private reminderTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private sortableInstance: { destroy(): void } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private drawerEditMode = false;

  private currentTodo: Todo | null = null;
  private detailEditMode = false;
  private detailMoreVisible = false;
  private currentSubtaskId: string | null = null;
  private taskSort: 'default' | 'alpha' = 'default';

  constructor() { this.init(); }

  private async init(): Promise<void> {
    void this.requestNotificationPermission();
    this.loadTodos();
    this.loadLists();
    this.setupEventListeners();
    this.renderTabs();
    this.render();
    this.scheduleAllReminders();
  }

  // ── LocalStorage ──────────────────────────────────────────────────────────

  private loadTodos(): void {
    try {
      const raw = localStorage.getItem('todos');
      this.todos = raw ? JSON.parse(raw) as Todo[] : [];
    } catch { this.todos = []; }
  }

  private loadLists(): void {
    try {
      const raw = localStorage.getItem('lists');
      this.lists = raw ? JSON.parse(raw) as List[] : [];
    } catch { this.lists = []; }
  }

  private saveTodos(): void {
    localStorage.setItem('todos', JSON.stringify(this.todos));
  }

  private saveLists(): void {
    localStorage.setItem('lists', JSON.stringify(this.lists));
  }

  // ── CRUD: Todos ───────────────────────────────────────────────────────────

  private createTodo(data: Partial<Todo>): Todo {
    const todo: Todo = {
      id: crypto.randomUUID(),
      title: data.title ?? '',
      completed: false,
      listId: data.listId,
      subtasks: data.subtasks ?? [],
      order: this.todos.length,
      createdAt: new Date().toISOString(),
    };
    this.todos.push(todo);
    this.saveTodos();
    return todo;
  }

  private updateTodo(id: string, data: Partial<Todo>): Todo {
    const idx = this.todos.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('not found');
    this.todos[idx] = { ...this.todos[idx], ...data };
    this.saveTodos();
    return this.todos[idx];
  }

  private deleteTodo(id: string): void {
    this.todos = this.todos.filter(t => t.id !== id);
    this.saveTodos();
  }

  private reorderTodos(orderedIds: string[]): void {
    orderedIds.forEach((id, i) => {
      const t = this.todos.find(x => x.id === id);
      if (t) t.order = i;
    });
    this.saveTodos();
  }

  // ── CRUD: Lists ───────────────────────────────────────────────────────────

  private createList(name: string): List {
    const list: List = {
      id: crypto.randomUUID(),
      name,
      order: this.lists.length,
      createdAt: new Date().toISOString(),
    };
    this.lists.push(list);
    this.saveLists();
    return list;
  }

  private deleteList(id: string): void {
    this.lists = this.lists.filter(l => l.id !== id);
    this.todos.forEach(t => { if (t.listId === id) t.listId = undefined; });
    this.saveLists();
    this.saveTodos();
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  private async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  private scheduleReminder(todo: Todo): void {
    if (!todo.reminderTime || todo.completed) return;
    const delay = new Date(todo.reminderTime).getTime() - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(() => this.fireReminder(todo), delay);
    this.reminderTimers.set(todo.id, timer);
  }
  private cancelReminder(id: string): void {
    const t = this.reminderTimers.get(id);
    if (t !== undefined) { clearTimeout(t); this.reminderTimers.delete(id); }
  }
  private scheduleAllReminders(): void { this.todos.forEach(t => this.scheduleReminder(t)); }
  private fireReminder(todo: Todo): void {
    this.reminderTimers.delete(todo.id);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ToDoリスト リマインダー', { body: todo.title, tag: todo.id });
    }
    this.showToast(`🔔 リマインダー: ${todo.title}`);
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  private showToast(message: string, duration = 3000): void {
    const toast = document.getElementById('toast')!;
    toast.textContent = message;
    toast.classList.add('show');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  // ── Drawer ────────────────────────────────────────────────────────────────

  private openDrawer(): void {
    document.getElementById('drawer')!.classList.add('open');
    document.getElementById('drawer-overlay')!.classList.add('visible');
    document.body.classList.add('drawer-lock');
  }
  private closeDrawer(): void {
    document.getElementById('drawer')!.classList.remove('open');
    document.getElementById('drawer-overlay')!.classList.remove('visible');
    document.body.classList.remove('drawer-lock');
    this.drawerEditMode = false;
    this.updateDrawerLists();
  }
  private toggleQuickAdd(): void {
    const bar = document.getElementById('quick-add-bar')!;
    const v = bar.classList.toggle('visible');
    if (v) (document.getElementById('quick-add-input') as HTMLInputElement).focus();
  }

  // ── QR ────────────────────────────────────────────────────────────────────

  private openQR(): void {
    const installUrl = new URL('install.html', window.location.href).href;
    const canvas = document.getElementById('qr-canvas')!;
    canvas.innerHTML = '';
    new QRCode(canvas, { text: installUrl, width: 220, height: 220, colorDark: '#1A1A1A', colorLight: '#FFFFFF' });
    document.getElementById('qr-url')!.textContent = installUrl;
    document.getElementById('qr-overlay')!.classList.add('open');
  }

  private closeQR(): void {
    document.getElementById('qr-overlay')!.classList.remove('open');
  }

  // ── Detail view ───────────────────────────────────────────────────────────

  openDetail(todo: Todo): void {
    this.currentTodo = todo;
    this.detailEditMode = false;
    this.detailMoreVisible = false;
    document.getElementById('detail-title')!.textContent = todo.title;
    document.getElementById('btn-detail-edit')!.textContent = '';
    this.resetDetailEdit();
    this.renderDetailSubtasks();
    document.getElementById('detail-view')!.classList.add('open');
  }

  private closeDetail(): void {
    document.getElementById('detail-view')!.classList.remove('open');
    this.currentTodo = null;
    this.detailEditMode = false;
    this.hideDetailMore();
    const addRow = document.getElementById('detail-add-row')!;
    addRow.classList.remove('visible');
    (document.getElementById('detail-subtask-input') as HTMLInputElement).value = '';
  }

  private resetDetailEdit(): void {
    this.detailEditMode = false;
    document.getElementById('detail-content')!.classList.remove('detail-editing');
    const btn = document.getElementById('btn-detail-edit')!;
    btn.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none"><path d="M1 1h12M1 6h8M1 11h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> 編集`;
    btn.classList.remove('active');
  }

  private toggleDetailEditMode(): void {
    this.detailEditMode = !this.detailEditMode;
    document.getElementById('detail-content')!.classList.toggle('detail-editing', this.detailEditMode);
    const btn = document.getElementById('btn-detail-edit')!;
    if (this.detailEditMode) {
      btn.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none"><path d="M1 1h12M1 6h8M1 11h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> 完了`;
      btn.classList.add('active');
    } else {
      this.resetDetailEdit();
    }
  }

  private showDetailMore(): void {
    this.detailMoreVisible = true;
    document.getElementById('detail-more-menu')!.classList.add('visible');
  }
  private hideDetailMore(): void {
    this.detailMoreVisible = false;
    document.getElementById('detail-more-menu')!.classList.remove('visible');
  }
  private toggleDetailMore(): void {
    this.detailMoreVisible ? this.hideDetailMore() : this.showDetailMore();
  }

  private async handleDetailRename(): Promise<void> {
    if (!this.currentTodo) return;
    this.hideDetailMore();
    const name = prompt('タスク名を編集', this.currentTodo.title);
    if (!name?.trim() || name.trim() === this.currentTodo.title) return;
    const updated = this.updateTodo(this.currentTodo.id, { title: name.trim() });
    this.currentTodo = updated;
    document.getElementById('detail-title')!.textContent = updated.title;
    this.render();
    this.showToast('タスク名を更新しました');
  }

  private deleteCurrentTask(): void {
    if (!this.currentTodo) return;
    this.hideDetailMore();
    if (!confirm(`「${this.currentTodo.title}」を削除しますか？`)) return;
    this.cancelReminder(this.currentTodo.id);
    this.deleteTodo(this.currentTodo.id);
    this.closeDetail();
    this.renderTabs();
    this.render();
    this.showToast('タスクを削除しました');
  }

  private renderDetailSubtasks(): void {
    const todo = this.currentTodo;
    if (!todo) return;
    const container = document.getElementById('detail-content')!;
    const editClass = this.detailEditMode ? ' detail-editing' : '';
    const subs = todo.subtasks ?? [];
    const active    = subs.filter(s => !s.completed);
    const completed = subs.filter(s => s.completed);

    const itemHtml = (s: SubTask, done: boolean) => `
      <div class="detail-item${editClass}" data-sub="${s.id}">
        <button type="button" class="detail-check${done ? ' checked' : ''}" data-toggle="${s.id}">
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
            <path d="M1 5l3.5 3.5 7.5-8" stroke="${this.cssVar('--primary')}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <span class="detail-item-title${done ? ' done' : ''}" data-open="${s.id}">${this.esc(s.title)}</span>
        <button type="button" class="detail-item-del" data-del="${s.id}" aria-label="削除">−</button>
      </div>`;

    let html = '';
    active.forEach(s => { html += itemHtml(s, false); });
    if (completed.length > 0) {
      html += `<div class="detail-section-header">完了済み</div>`;
      completed.forEach(s => { html += itemHtml(s, true); });
    }

    container.innerHTML = html;
    if (this.detailEditMode) container.classList.add('detail-editing');
    else container.classList.remove('detail-editing');

    container.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => this.toggleDetailSubtask(btn.dataset.toggle!));
    });
    container.querySelectorAll<HTMLButtonElement>('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => this.deleteDetailSubtask(btn.dataset.del!));
    });
    container.querySelectorAll<HTMLElement>('[data-open]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => this.openSubtaskSheet(el.dataset.open!));
    });
  }

  private toggleDetailSubtask(subtaskId: string): void {
    const todo = this.currentTodo;
    if (!todo?.subtasks) return;
    const sub = todo.subtasks.find(s => s.id === subtaskId);
    if (!sub) return;
    sub.completed = !sub.completed;
    this.updateTodo(todo.id, { subtasks: todo.subtasks });
    this.renderDetailSubtasks();
    this.renderTabs();
    this.render();
  }

  private deleteDetailSubtask(subtaskId: string): void {
    const todo = this.currentTodo;
    if (!todo?.subtasks) return;
    todo.subtasks = todo.subtasks.filter(s => s.id !== subtaskId);
    this.updateTodo(todo.id, { subtasks: todo.subtasks });
    this.renderDetailSubtasks();
    this.renderTabs();
    this.render();
  }

  private toggleDetailAddRow(): void {
    const addRow = document.getElementById('detail-add-row')!;
    const visible = addRow.classList.toggle('visible');
    const input = document.getElementById('detail-subtask-input') as HTMLInputElement;
    if (visible) { input.focus(); } else { input.value = ''; }
  }

  private parseSubtaskTitles(raw: string): string[] {
    const s = raw.trim();
    const rangeMatch = s.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end   = parseInt(rangeMatch[2], 10);
      if (start <= end && end - start < 500) {
        return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
      }
    }
    if (/^\d+(\.\d+)+$/.test(s)) {
      return s.split('.').map(n => n.trim()).filter(Boolean);
    }
    return [s];
  }

  private submitDetailSubtask(): void {
    const input = document.getElementById('detail-subtask-input') as HTMLInputElement;
    const raw = input.value.trim();
    if (!raw || !this.currentTodo) return;
    input.value = '';
    const titles = this.parseSubtaskTitles(raw);
    const newSubs: SubTask[] = titles.map(t => ({ id: crypto.randomUUID(), title: t, completed: false }));
    const subtasks = [...(this.currentTodo.subtasks ?? []), ...newSubs];
    const updated = this.updateTodo(this.currentTodo.id, { subtasks });
    this.currentTodo = updated;
    this.renderDetailSubtasks();
    this.renderTabs();
    this.render();
    if (newSubs.length > 1) this.showToast(`${newSubs.length}件のサブタスクを追加しました`);
    input.focus();
  }

  // ── Subtask sheet ─────────────────────────────────────────────────────────

  openSubtaskSheet(subtaskId: string): void {
    const todo = this.currentTodo;
    if (!todo?.subtasks) return;
    const sub = todo.subtasks.find(s => s.id === subtaskId);
    if (!sub) return;
    this.currentSubtaskId = subtaskId;
    const input = document.getElementById('sheet-subtask-input') as HTMLInputElement;
    input.value = sub.title;
    const circle = document.getElementById('sheet-check-circle')!;
    if (sub.completed) circle.classList.add('checked'); else circle.classList.remove('checked');
    document.getElementById('sheet-overlay')!.classList.add('visible');
    document.getElementById('subtask-sheet')!.classList.add('open');
    input.focus();
  }

  private closeSubtaskSheet(save: boolean): void {
    if (!document.getElementById('subtask-sheet')!.classList.contains('open')) return;
    if (save) this.saveSubtaskFromSheet();
    document.getElementById('subtask-sheet')!.classList.remove('open');
    document.getElementById('sheet-overlay')!.classList.remove('visible');
    this.currentSubtaskId = null;
  }

  private saveSubtaskFromSheet(): void {
    const todo = this.currentTodo;
    if (!todo?.subtasks || !this.currentSubtaskId) return;
    const input = document.getElementById('sheet-subtask-input') as HTMLInputElement;
    const newTitle = input.value.trim();
    if (!newTitle) return;
    const sub = todo.subtasks.find(s => s.id === this.currentSubtaskId);
    if (!sub || sub.title === newTitle) return;
    sub.title = newTitle;
    const updated = this.updateTodo(todo.id, { subtasks: todo.subtasks });
    this.currentTodo = updated;
    this.renderDetailSubtasks();
    this.render();
  }

  private toggleSubtaskFromSheet(): void {
    const todo = this.currentTodo;
    if (!todo?.subtasks || !this.currentSubtaskId) return;
    const sub = todo.subtasks.find(s => s.id === this.currentSubtaskId);
    if (!sub) return;
    sub.completed = !sub.completed;
    const circle = document.getElementById('sheet-check-circle')!;
    if (sub.completed) circle.classList.add('checked'); else circle.classList.remove('checked');
    const updated = this.updateTodo(todo.id, { subtasks: todo.subtasks });
    this.currentTodo = updated;
    this.renderDetailSubtasks();
    this.renderTabs();
    this.render();
  }

  private deleteSubtaskFromSheet(): void {
    const todo = this.currentTodo;
    if (!todo?.subtasks || !this.currentSubtaskId) return;
    todo.subtasks = todo.subtasks.filter(s => s.id !== this.currentSubtaskId);
    document.getElementById('subtask-sheet')!.classList.remove('open');
    document.getElementById('sheet-overlay')!.classList.remove('visible');
    this.currentSubtaskId = null;
    const updated = this.updateTodo(todo.id, { subtasks: todo.subtasks });
    this.currentTodo = updated;
    this.renderDetailSubtasks();
    this.renderTabs();
    this.render();
    this.showToast('サブタスクを削除しました');
  }

  // ── Sort bar ──────────────────────────────────────────────────────────────

  private updateSortBar(): void {
    document.querySelectorAll<HTMLButtonElement>('#task-sort-bar .sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === this.taskSort);
    });
  }

  private setTaskSort(mode: 'default' | 'alpha'): void {
    this.taskSort = mode;
    this.updateSortBar();
    this.render();
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  private renderTabs(): void {
    const container = document.querySelector<HTMLElement>('.filter-tabs')!;
    container.innerHTML = this.lists.map(l => {
      const active = this.filter === l.id ? ' active' : '';
      const icon = `<svg width="12" height="11" viewBox="0 0 12 11" fill="none" style="margin-right:3px;vertical-align:-1px"><path d="M1 2h3.5l1.2 1.2H11V9H1V2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
      return `<button class="tab${active}" data-filter="${this.esc(l.id)}" role="tab">${icon}${this.esc(l.name)} <span class="tab-count" id="tab-count-${this.esc(l.id)}"></span></button>`;
    }).join('');
    this.updateCounts();
  }

  // ── Drawer lists ──────────────────────────────────────────────────────────

  private updateDrawerLists(): void {
    const container = document.getElementById('drawer-lists-container')!;
    if (this.lists.length === 0) {
      container.innerHTML = '<p class="drawer-lists-empty">リストがありません</p>';
      return;
    }
    const editClass = this.drawerEditMode ? ' drawer-editing' : '';
    container.innerHTML = this.lists.map(l => {
      const count = this.todos.filter(t => t.listId === l.id).length;
      return `
        <div class="drawer-item drawer-list-item${editClass}" data-list-id="${l.id}">
          <svg class="drawer-item-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4h5l1.5 1.5H16V14H2V4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
          <span class="drawer-label">${this.esc(l.name)}</span>
          ${count > 0 ? `<span class="drawer-badge">${count}</span>` : ''}
          <button class="drawer-list-delete" data-delete-list="${l.id}">✕</button>
          <svg class="item-chevron" width="7" height="12" viewBox="0 0 7 12" fill="none">
            <path d="M1 1l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>`;
    }).join('');
    container.querySelectorAll<HTMLElement>('[data-list-id]').forEach(el => {
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('[data-delete-list]')) return;
        if (this.drawerEditMode) return;
        this.setFilter(el.dataset.listId!);
        this.closeDrawer();
      });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-delete-list]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteList!;
        const list = this.lists.find(l => l.id === id);
        if (!list || !confirm(`「${list.name}」を削除しますか？`)) return;
        this.deleteList(id);
        if (this.filter === id) this.filter = 'all';
        this.renderTabs();
        this.updateDrawerLists();
        this.render();
      });
    });
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  private setupEventListeners(): void {
    document.getElementById('btn-menu')!.addEventListener('click', () => this.openDrawer());
    document.getElementById('btn-close-drawer')!.addEventListener('click', () => this.closeDrawer());
    document.getElementById('drawer-overlay')!.addEventListener('click', () => this.closeDrawer());
    document.getElementById('btn-drawer-add')!.addEventListener('click', () => this.handleCreateList());
    document.getElementById('btn-drawer-edit')!.addEventListener('click', () => {
      this.drawerEditMode = !this.drawerEditMode;
      document.getElementById('btn-drawer-edit')!.textContent = this.drawerEditMode ? '完了' : '編集';
      this.updateDrawerLists();
    });
    document.getElementById('btn-qr')!.addEventListener('click', () => this.openQR());
    document.getElementById('btn-close-qr')!.addEventListener('click', () => this.closeQR());
    document.getElementById('qr-overlay')!.addEventListener('click', (e) => {
      if (e.target === document.getElementById('qr-overlay')) this.closeQR();
    });

    document.querySelector('.tabs-wrapper')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-filter]');
      if (btn) this.setFilter(btn.dataset.filter!);
    });

    document.getElementById('btn-search-toggle')!.addEventListener('click', () => {
      const bar = document.getElementById('search-bar')!;
      const v = bar.classList.toggle('visible');
      if (v) (document.getElementById('search-input') as HTMLInputElement).focus();
    });

    document.getElementById('btn-quick-add-toggle')!.addEventListener('click', () => this.toggleQuickAdd());
    document.getElementById('quick-add-input')!.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleQuickAdd(e.currentTarget as HTMLInputElement);
    });

    document.getElementById('btn-open-modal')!.addEventListener('click', () => this.openModal());
    document.getElementById('btn-close-modal')!.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay')!.addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) this.closeModal();
    });
    document.getElementById('task-form')!.addEventListener('submit', (e) => {
      e.preventDefault(); this.handleFormSubmit();
    });

    document.getElementById('task-sort-bar')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.sort-btn');
      if (btn) this.setTaskSort(btn.dataset.sort as 'default' | 'alpha');
    });

    document.getElementById('btn-back')!.addEventListener('click', () => this.closeDetail());
    document.getElementById('btn-detail-edit')!.addEventListener('click', () => this.toggleDetailEditMode());
    document.getElementById('btn-detail-more')!.addEventListener('click', (e) => {
      e.stopPropagation(); this.toggleDetailMore();
    });
    document.getElementById('btn-detail-more-delete')!.addEventListener('click', () => this.deleteCurrentTask());
    document.getElementById('btn-detail-rename')!.addEventListener('click', () => void this.handleDetailRename());
    document.getElementById('btn-detail-trash')!.addEventListener('click', () => this.deleteCurrentTask());
    document.getElementById('btn-detail-add')!.addEventListener('click', () => this.toggleDetailAddRow());
    document.getElementById('detail-subtask-input')!.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitDetailSubtask();
    });
    document.addEventListener('click', (e) => {
      if (this.detailMoreVisible && !(e.target as HTMLElement).closest('.detail-more-wrap')) {
        this.hideDetailMore();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.closeSubtaskSheet(true); this.closeModal(); this.closeDetail(); }
    });

    document.getElementById('sheet-overlay')!.addEventListener('click', () => this.closeSubtaskSheet(true));
    document.getElementById('btn-sheet-close')!.addEventListener('click', () => this.closeSubtaskSheet(true));
    document.getElementById('btn-sheet-trash')!.addEventListener('click', () => this.deleteSubtaskFromSheet());
    document.getElementById('sheet-check-circle')!.addEventListener('click', () => this.toggleSubtaskFromSheet());
    document.getElementById('sheet-subtask-input')!.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.closeSubtaskSheet(true);
    });
  }

  private setFilter(f: string): void {
    this.filter = f;
    this.renderTabs();
    this.render();
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  private handleCreateList(): void {
    const name = prompt('フォルダ名を入力してください');
    if (!name?.trim()) return;
    const list = this.createList(name.trim());
    this.renderTabs();
    this.updateDrawerLists();
    this.setFilter(list.id);
    this.closeDrawer();
    this.showToast(`「${list.name}」を作成しました`);
  }

  private handleQuickAdd(input: HTMLInputElement): void {
    const title = input.value.trim();
    if (!title) return;
    input.value = '';
    const listId = this.isListFilter() ? this.filter : undefined;
    const todo = this.createTodo({ title, listId });
    this.scheduleReminder(todo);
    this.renderTabs();
    this.render();
    this.showToast(`「${title}」を追加しました`);
  }

  private handleFormSubmit(): void {
    const titleInput = document.getElementById('task-title') as HTMLInputElement;
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.classList.add('invalid');
      document.getElementById('title-error')!.classList.add('visible');
      titleInput.focus();
      return;
    }
    titleInput.classList.remove('invalid');
    document.getElementById('title-error')!.classList.remove('visible');
    const listId = this.isListFilter() ? this.filter : undefined;
    const todo = this.createTodo({ title, listId });
    this.scheduleReminder(todo);
    this.closeModal();
    this.renderTabs();
    this.render();
    this.showToast(`「${title}」を追加しました`);
  }

  private openModal(): void {
    const input = document.getElementById('task-title') as HTMLInputElement;
    input.value = '';
    input.classList.remove('invalid');
    document.getElementById('title-error')!.classList.remove('visible');
    document.getElementById('modal-overlay')!.classList.add('active');
    void input.offsetHeight; // iOSでキーボードを確実に開くためスタイル再計算を強制
    input.focus();
  }

  private closeModal(): void {
    document.getElementById('modal-overlay')!.classList.remove('active');
    (document.getElementById('task-title') as HTMLInputElement).value = '';
    document.getElementById('task-title')!.classList.remove('invalid');
    document.getElementById('title-error')!.classList.remove('visible');
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  private isListFilter(): boolean {
    return this.lists.some(l => l.id === this.filter);
  }

  private filteredTodos(): Todo[] {
    const base = [...this.todos].sort((a, b) => a.order - b.order);
    const filtered = this.isListFilter() ? base.filter(t => t.listId === this.filter) : base;
    if (this.taskSort === 'alpha') {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    }
    return filtered;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private render(): void {
    this.updateCounts();
    this.updateDrawerLists();
    const visible = this.filteredTodos();
    const list    = document.getElementById('todo-list')!;
    if (visible.length === 0) {
      if (this.sortableInstance) { this.sortableInstance.destroy(); this.sortableInstance = null; }
      list.innerHTML = this.emptyStateHtml();
      return;
    }
    list.innerHTML = visible.map(t => this.todoItemHtml(t)).join('');
    this.attachItemListeners(visible);
    this.initSortable(list);
  }

  private updateCounts(): void {
    const set = (id: string, n: number) => {
      const el = document.getElementById(id);
      if (el) el.textContent = n > 0 ? String(n) : '';
    };
    this.lists.forEach(l => {
      const c = this.todos.filter(t => t.listId === l.id).length;
      set(`tab-count-${l.id}`, c);
    });
  }

  private emptyStateHtml(): string {
    if (this.isListFilter()) {
      const list = this.lists.find(l => l.id === this.filter);
      return `<div class="empty-state"><div class="empty-icon">📁</div><p class="empty-title">「${list ? this.esc(list.name) : ''}」にタスクがありません</p><p class="empty-sub">右下の ＋ でタスクを追加しましょう</p></div>`;
    }
    return `<div class="empty-state"><div class="empty-icon">✓</div><p class="empty-title">タスクがありません</p><p class="empty-sub">右下の ＋ でタスクを追加しましょう</p></div>`;
  }

  private formatDate(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  private isOverdue(dateStr: string): boolean {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(`${dateStr}T00:00:00`) < today;
  }

  private todoItemHtml(todo: Todo): string {
    const overdue = todo.dueDate && !todo.completed && this.isOverdue(todo.dueDate);
    const meta: string[] = [];
    if (todo.dueDate) meta.push(`📅 ${this.formatDate(todo.dueDate)}`);
    if (todo.listId && !this.isListFilter()) {
      const list = this.lists.find(l => l.id === todo.listId);
      if (list) meta.push(`📁 ${this.esc(list.name)}`);
    }
    const metaHtml = meta.length > 0
      ? `<div class="todo-meta${overdue ? ' overdue' : ''}">${meta.join('　')}</div>`
      : '';
    const badge = this.subtaskBadgeHtml(todo);
    return `
      <div class="todo-item${todo.completed ? ' completed' : ''}" data-id="${todo.id}" role="listitem">
        <div class="drag-handle" title="並び替え">⠿</div>
        <button class="todo-checkbox${todo.completed ? ' checked' : ''}" aria-label="${todo.completed ? '未完了に戻す' : '完了にする'}">
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
            <path d="M1 4.5l3.5 3.5 6.5-7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="todo-content">
          <div class="todo-title">${this.esc(todo.title)}</div>
          ${metaHtml}
        </div>
        ${badge}
        <svg class="todo-chevron" width="7" height="12" viewBox="0 0 7 12" fill="none">
          <path d="M1 1l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>`;
  }

  private subtaskBadgeHtml(todo: Todo): string {
    const subs = todo.subtasks;
    if (!subs || subs.length === 0) return '';
    const done = subs.filter(s => s.completed).length;
    return `<span class="subtask-progress${done === subs.length ? ' all-done' : ''}">${done}/${subs.length}</span>`;
  }

  private attachItemListeners(todos: Todo[]): void {
    const list = document.getElementById('todo-list')!;
    todos.forEach(todo => {
      const item = list.querySelector<HTMLElement>(`[data-id="${todo.id}"]`)!;
      item.querySelector('.todo-checkbox')!.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleComplete(todo);
      });
      item.addEventListener('click', (e) => {
        const t = e.target as HTMLElement;
        if (!t.closest('.todo-checkbox') && !t.closest('.drag-handle')) {
          this.openDetail(todo);
        }
      });
    });
  }

  private toggleComplete(todo: Todo): void {
    const updated = this.updateTodo(todo.id, { completed: !todo.completed });
    if (updated.completed) { this.cancelReminder(todo.id); } else { this.scheduleReminder(updated); }
    this.renderTabs();
    this.render();
  }

  private initSortable(list: HTMLElement): void {
    if (this.sortableInstance) this.sortableInstance.destroy();
    this.sortableInstance = new Sortable(list, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: () => {
        const ids = Array.from(list.querySelectorAll<HTMLElement>('.todo-item'))
          .map(el => el.dataset.id!).filter(Boolean);
        this.reorderTodos(ids);
        this.updateCounts();
      },
    });
  }

  private esc(text: string): string {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }

  private cssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
}

document.addEventListener('DOMContentLoaded', () => new TodoApp());
