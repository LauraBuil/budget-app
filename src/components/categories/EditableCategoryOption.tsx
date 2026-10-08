import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Category } from '../../types'

export function EditableCategoryOption({ category, selected, onSelect }: { category: Category; selected: boolean; onSelect: () => void }) {
  const { t, updateCategory, deleteCategory } = useApp()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  async function save() {
    if (saving.current) return
    if (!name.trim() || name.trim() === category.name) { setName(category.name); setEditing(false); return }
    saving.current = true; setBusy(true)
    try { await updateCategory(category.id,name); setEditing(false) }
    catch { setName(category.name) }
    finally { saving.current = false; setBusy(false) }
  }
  async function remove() {
    setBusy(true)
    try { await deleteCategory(category.id) } catch { /* The shared error toast explains why. */ }
    finally { setBusy(false) }
  }
  return <div className={`category-option${selected ? ' selected' : ''}`}>
    {editing ? <input autoFocus className="category-selector__input" aria-label={t('categoryName')} value={name} maxLength={60} disabled={busy} onChange={(event) => setName(event.target.value)} onBlur={() => void save()} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void save() } if (event.key === 'Escape') { event.preventDefault(); setEditing(false); setName(category.name) } }}/>
      : <button type="button" className="category-option__name" title={t('edit')} onClick={() => { setName(category.name); setEditing(true) }}>{category.name}</button>}
    <button type="button" className="category-option__select" aria-label={`${t('chooseCategory')} ${category.name}`} title={t('chooseCategory')} disabled={busy} onClick={onSelect}/>
    <button type="button" className="category-option__delete" aria-label={`${t('delete')} ${category.name}`} disabled={busy} onClick={() => void remove()}><Trash2 size={14}/></button>
  </div>
}
