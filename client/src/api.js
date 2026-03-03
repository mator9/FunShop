const BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// List APIs
export function createList(name) {
  return request('/lists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function getList(id) {
  return request(`/lists/${id}`);
}

export function getListByShareCode(shareCode) {
  return request(`/lists/share/${shareCode}`);
}

export function updateListName(id, name) {
  return request(`/lists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export function deleteList(id) {
  return request(`/lists/${id}`, { method: 'DELETE' });
}

// Item APIs
export function addItem(listId, { name, quantity, addedBy }) {
  return request(`/lists/${listId}/items`, {
    method: 'POST',
    body: JSON.stringify({ name, quantity, addedBy }),
  });
}

export function updateItem(id, updates) {
  return request(`/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function reorderItems(listId, itemIds) {
  return request(`/lists/${listId}/items/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ itemIds }),
  });
}

export function deleteItem(id) {
  return request(`/items/${id}`, { method: 'DELETE' });
}
